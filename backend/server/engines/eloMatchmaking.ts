/**
 * VendFX ELO Matchmaking Engine
 * 
 * Implements a modified ELO rating system for seasonal bracket assignment.
 * Players are grouped into brackets based on their ELO rating, ensuring
 * competitive balance within each bracket.
 * 
 * Bracket Tiers:
 *   Bronze    — ELO < 1000
 *   Silver    — ELO 1000-1199
 *   Gold      — ELO 1200-1399
 *   Platinum  — ELO 1400-1599
 *   Diamond   — ELO 1600-1799
 *   Champion  — ELO 1800+
 * 
 * ELO changes are calculated at season end based on final Tycoon Score
 * rankings within each bracket.
 */

import { eq, and, sql, desc, asc } from "drizzle-orm";
import { getDb } from "../db";
import {
  players,
  seasonBrackets,
  seasonLeaderboard,
} from "../../drizzle/schema";

// ============================================================================
// TYPES
// ============================================================================

export interface BracketTier {
  name: string;
  minElo: number;
  maxElo: number;
  entryFeeMultiplier: number;
  prizePoolMultiplier: number;
}

export interface MatchmakingResult {
  playerId: number;
  currentElo: number;
  assignedBracket: string;
  bracketPlayers: number;
  estimatedPrizePool: number;
}

export interface EloUpdateResult {
  playerId: number;
  previousElo: number;
  newElo: number;
  eloChange: number;
  rank: number;
  tycoonScore: number;
}

// ============================================================================
// BRACKET TIER DEFINITIONS
// ============================================================================

export const BRACKET_TIERS: BracketTier[] = [
  {
    name: "bronze",
    minElo: 0,
    maxElo: 999,
    entryFeeMultiplier: 0.5,
    prizePoolMultiplier: 0.5,
  },
  {
    name: "silver",
    minElo: 1000,
    maxElo: 1199,
    entryFeeMultiplier: 0.75,
    prizePoolMultiplier: 0.75,
  },
  {
    name: "gold",
    minElo: 1200,
    maxElo: 1399,
    entryFeeMultiplier: 1.0,
    prizePoolMultiplier: 1.0,
  },
  {
    name: "platinum",
    minElo: 1400,
    maxElo: 1599,
    entryFeeMultiplier: 1.5,
    prizePoolMultiplier: 1.5,
  },
  {
    name: "diamond",
    minElo: 1600,
    maxElo: 1799,
    entryFeeMultiplier: 2.0,
    prizePoolMultiplier: 2.0,
  },
  {
    name: "champion",
    minElo: 1800,
    maxElo: 9999,
    entryFeeMultiplier: 3.0,
    prizePoolMultiplier: 3.0,
  },
];

// ============================================================================
// ELO CONSTANTS
// ============================================================================

const BASE_ELO = 1200;
const K_FACTOR_BASE = 32;
const K_FACTOR_NEW_PLAYER = 48; // Higher K for new players (< 10 seasons)
const K_FACTOR_VETERAN = 24; // Lower K for veterans (> 50 seasons)
const MIN_ELO = 100; // Floor
const MAX_ELO = 3000; // Ceiling

// ============================================================================
// BRACKET ASSIGNMENT
// ============================================================================

/**
 * Determine which bracket tier a player belongs to based on ELO
 */
export function getBracketTier(elo: number): BracketTier {
  for (const tier of BRACKET_TIERS) {
    if (elo >= tier.minElo && elo <= tier.maxElo) {
      return tier;
    }
  }
  // Fallback to gold
  return BRACKET_TIERS[2];
}

/**
 * Assign a player to a bracket for a season
 */
export async function assignPlayerToBracket(
  playerId: number,
  seasonId: number,
  baseEntryFee: number
): Promise<MatchmakingResult> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get player's current ELO
  const playerResult = await db
    .select()
    .from(players)
    .where(eq(players.id, playerId))
    .limit(1);
  const player = playerResult[0];
  if (!player) throw new Error("Player not found");

  const currentElo = player.lifetimeElo || BASE_ELO;
  const bracket = getBracketTier(currentElo);

  // Calculate adjusted entry fee
  const adjustedEntryFee = (baseEntryFee * bracket.entryFeeMultiplier).toFixed(2);

  // Count players already in this bracket for this season
  const bracketCount = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(seasonBrackets)
    .where(
      and(
        eq(seasonBrackets.seasonId, seasonId),
        eq(seasonBrackets.bracketTier, bracket.name)
      )
    );

  return {
    playerId,
    currentElo,
    assignedBracket: bracket.name,
    bracketPlayers: (bracketCount[0]?.count || 0) + 1,
    estimatedPrizePool: 0, // Will be calculated when season starts
  };
}

// ============================================================================
// ELO CALCULATION
// ============================================================================

/**
 * Get the K-factor for a player based on their experience
 */
function getKFactor(seasonsPlayed: number): number {
  if (seasonsPlayed < 10) return K_FACTOR_NEW_PLAYER;
  if (seasonsPlayed > 50) return K_FACTOR_VETERAN;
  return K_FACTOR_BASE;
}

/**
 * Calculate ELO change for a player based on their season performance.
 * 
 * The ELO change is determined by comparing the player's actual rank
 * against their expected rank (based on current ELO relative to bracket).
 * 
 * Formula:
 *   expectedPerformance = (bracketSize - expectedRank) / bracketSize
 *   actualPerformance = (bracketSize - actualRank) / bracketSize
 *   eloChange = K * (actualPerformance - expectedPerformance)
 */
export function calculateSeasonEloChange(
  currentElo: number,
  actualRank: number,
  bracketSize: number,
  seasonsPlayed: number,
  bracketAvgElo: number
): number {
  const K = getKFactor(seasonsPlayed);

  // Expected performance based on ELO difference from bracket average
  const eloDiff = currentElo - bracketAvgElo;
  const expectedPerformance = 1 / (1 + Math.pow(10, -eloDiff / 400));

  // Actual performance based on rank (1st = 1.0, last = 0.0)
  const actualPerformance = (bracketSize - actualRank) / (bracketSize - 1);

  // ELO change
  const eloChange = Math.round(K * (actualPerformance - expectedPerformance));

  return eloChange;
}

/**
 * Process ELO updates for all players in a completed season.
 * Returns array of ELO changes for each player.
 */
export async function processSeasonEloUpdates(
  seasonId: number
): Promise<EloUpdateResult[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get all brackets for this season
  const brackets = await db
    .select()
    .from(seasonBrackets)
    .where(eq(seasonBrackets.seasonId, seasonId));

  // Get leaderboard
  const leaderboard = await db
    .select()
    .from(seasonLeaderboard)
    .where(eq(seasonLeaderboard.seasonId, seasonId))
    .orderBy(asc(seasonLeaderboard.rank));

  // Group players by bracket tier
  const bracketGroups = new Map<string, typeof brackets>();
  for (const bracket of brackets) {
    const tier = bracket.bracketTier || "standard";
    if (!bracketGroups.has(tier)) {
      bracketGroups.set(tier, []);
    }
    bracketGroups.get(tier)!.push(bracket);
  }

  const results: EloUpdateResult[] = [];

  // Process each bracket group
  const bracketEntries = Array.from(bracketGroups.entries());
  for (const [tier, bracketPlayers] of bracketEntries) {
    const bracketSize = bracketPlayers.length;
    if (bracketSize < 2) continue; // Need at least 2 players

    // Get average ELO for this bracket
    const playerIds = bracketPlayers.map((b: any) => b.playerId);
    const playerData = await db
      .select()
      .from(players)
      .where(sql`${players.id} IN (${sql.raw(playerIds.join(","))})`);

    const avgElo =
      playerData.reduce((sum, p) => sum + (p.lifetimeElo || BASE_ELO), 0) /
      playerData.length;

    // Calculate ELO changes for each player
    for (const bracket of bracketPlayers) {
      const player = playerData.find((p: any) => p.id === bracket.playerId);
      if (!player) continue;

      const leaderboardEntry = leaderboard.find(
        (l) => l.playerId === bracket.playerId
      );
      const rank = leaderboardEntry?.rank || bracketSize;
      const tycoonScore = leaderboardEntry?.tycoonScore || 0;

      const currentElo = player.lifetimeElo || BASE_ELO;
      const eloChange = calculateSeasonEloChange(
        currentElo,
        rank,
        bracketSize,
        player.seasonsPlayed || 0,
        avgElo
      );

      const newElo = Math.max(
        MIN_ELO,
        Math.min(MAX_ELO, currentElo + eloChange)
      );

      // Update player ELO in database
      await db
        .update(players)
        .set({
          lifetimeElo: newElo,
          seasonsPlayed: (player.seasonsPlayed || 0) + 1,
          updatedAt: new Date(),
        })
        .where(eq(players.id, player.id));

      // Update bracket with ELO change
      await db
        .update(seasonBrackets)
        .set({
          eloChange,
          finalRank: rank,
          tycoonScore,
          updatedAt: new Date(),
        })
        .where(eq(seasonBrackets.id, bracket.id));

      results.push({
        playerId: bracket.playerId,
        previousElo: currentElo,
        newElo,
        eloChange,
        rank,
        tycoonScore,
      });
    }
  }

  return results.sort((a, b) => a.rank - b.rank);
}

// ============================================================================
// MATCHMAKING QUERIES
// ============================================================================

/**
 * Get bracket distribution for a season (how many players per tier)
 */
export async function getBracketDistribution(
  seasonId: number
): Promise<Map<string, number>> {
  const db = await getDb();
  if (!db) return new Map();

  const result = await db
    .select({
      bracketTier: seasonBrackets.bracketTier,
      count: sql<number>`COUNT(*)`,
    })
    .from(seasonBrackets)
    .where(eq(seasonBrackets.seasonId, seasonId))
    .groupBy(seasonBrackets.bracketTier);

  const distribution = new Map<string, number>();
  for (const row of result) {
    distribution.set(row.bracketTier || "standard", row.count);
  }

  return distribution;
}

/**
 * Get ELO distribution across all players
 */
export async function getEloDistribution(): Promise<
  Array<{ tier: string; count: number; avgElo: number }>
> {
  const db = await getDb();
  if (!db) return [];

  const allPlayers = await db.select().from(players);

  const tierCounts = new Map<string, { count: number; totalElo: number }>();

  for (const player of allPlayers) {
    const elo = player.lifetimeElo || BASE_ELO;
    const tier = getBracketTier(elo);

    if (!tierCounts.has(tier.name)) {
      tierCounts.set(tier.name, { count: 0, totalElo: 0 });
    }

    const entry = tierCounts.get(tier.name)!;
    entry.count++;
    entry.totalElo += elo;
  }

  return Array.from(tierCounts.entries()).map(([tier, data]) => ({
    tier,
    count: data.count,
    avgElo: Math.round(data.totalElo / data.count),
  }));
}

/**
 * Find potential opponents for a player based on ELO proximity
 */
export async function findMatchmakingOpponents(
  playerId: number,
  seasonId: number,
  maxResults: number = 10
): Promise<
  Array<{
    playerId: number;
    brandName: string;
    elo: number;
    eloDifference: number;
    expectedWinProbability: number;
  }>
> {
  const db = await getDb();
  if (!db) return [];

  // Get player's ELO
  const playerResult = await db
    .select()
    .from(players)
    .where(eq(players.id, playerId))
    .limit(1);
  const player = playerResult[0];
  if (!player) return [];

  const playerElo = player.lifetimeElo || BASE_ELO;
  const bracket = getBracketTier(playerElo);

  // Get all players in the same bracket for this season
  const bracketEntries = await db
    .select()
    .from(seasonBrackets)
    .where(
      and(
        eq(seasonBrackets.seasonId, seasonId),
        eq(seasonBrackets.bracketTier, bracket.name)
      )
    );

  const opponentIds = bracketEntries
    .map((b) => b.playerId)
    .filter((id) => id !== playerId);

  if (opponentIds.length === 0) return [];

  // Get opponent player data
  const opponents = await db
    .select()
    .from(players)
      .where(sql`${players.id} IN (${sql.raw(opponentIds.join(","))})`);

  // Calculate matchmaking info and sort by ELO proximity
  const results = opponents
    .map((opp) => {
      const oppElo = opp.lifetimeElo || BASE_ELO;
      const eloDiff = Math.abs(playerElo - oppElo);
      const expectedWin = 1 / (1 + Math.pow(10, (oppElo - playerElo) / 400));

      return {
        playerId: opp.id,
        brandName: opp.brandName,
        elo: oppElo,
        eloDifference: eloDiff,
        expectedWinProbability: Math.round(expectedWin * 100) / 100,
      };
    })
    .sort((a, b) => a.eloDifference - b.eloDifference)
    .slice(0, maxResults);

  return results;
}
