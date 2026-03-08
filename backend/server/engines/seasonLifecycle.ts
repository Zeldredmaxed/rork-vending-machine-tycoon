/**
 * VendFX Season Lifecycle Engine
 * 
 * Manages the complete lifecycle of competitive seasons:
 * 
 *   1. PRESEASON  — Season announced, lobby open for registration
 *   2. ACTIVE     — Season in progress, scores accumulating
 *   3. ENDING     — Final day, scores locked, rankings calculated
 *   4. PAYOUT     — Prizes distributed, ELO updated
 *   5. COMPLETED  — Season archived, results permanent
 * 
 * Payout Algorithm:
 *   - Top 40% of players receive prizes
 *   - 15% house rake deducted from total prize pool
 *   - Remaining 85% distributed exponentially (rank 1 gets most)
 *   - Distribution formula: share = (1 - normalizedRank)^2.5
 */

import { eq, and, sql, desc } from "drizzle-orm";
import { getDb } from "../db";
import {
  players,
  seasons,
  seasonBrackets,
  seasonLeaderboard,
  transactions,
} from "../../drizzle/schema";
import { calculateSeasonScores, updateSeasonLeaderboard } from "./tycoonScore";
import { processSeasonEloUpdates, getBracketTier } from "./eloMatchmaking";

// ============================================================================
// TYPES
// ============================================================================

export interface SeasonConfig {
  seasonNumber: number;
  entryFee: number;
  durationDays: number;
  startDate: Date;
}

export interface PayoutResult {
  playerId: number;
  rank: number;
  tycoonScore: number;
  payoutAmount: number;
  bracketTier: string;
}

export interface SeasonSummary {
  seasonId: number;
  seasonNumber: number;
  totalPlayers: number;
  totalPrizePool: number;
  houseRake: number;
  distributedAmount: number;
  winners: PayoutResult[];
  eloChanges: Array<{
    playerId: number;
    previousElo: number;
    newElo: number;
    eloChange: number;
  }>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const HOUSE_RAKE_PERCENT = 0.15; // 15%
const WINNER_PERCENT = 0.4; // Top 40% win
const PAYOUT_EXPONENT = 2.5; // Exponential curve steepness
const MIN_PLAYERS_FOR_SEASON = 2; // Minimum to start

// ============================================================================
// SEASON CREATION
// ============================================================================

/**
 * Create a new season and open registration
 */
export async function createNewSeason(config: SeasonConfig): Promise<any> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const endDate = new Date(config.startDate);
  endDate.setDate(endDate.getDate() + config.durationDays);

  await db
    .insert(seasons)
    .values({
      seasonNumber: config.seasonNumber,
      state: "preseason",
      entryFee: config.entryFee.toString(),
      startDate: config.startDate,
      endDate,
      totalPlayers: 0,
      prizePool: "0",
      houseRake: "0",
    });

  const result = await db
    .select()
    .from(seasons)
    .where(eq(seasons.seasonNumber, config.seasonNumber))
    .limit(1);

  return result[0];
}

// ============================================================================
// SEASON STATE TRANSITIONS
// ============================================================================

/**
 * Transition season from preseason to active
 */
export async function activateSeason(seasonId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const season = await db
    .select()
    .from(seasons)
    .where(eq(seasons.id, seasonId))
    .limit(1);

  if (!season[0]) throw new Error("Season not found");
  if (season[0].state !== "preseason") {
    throw new Error(`Cannot activate season in state: ${season[0].state}`);
  }

  // Count registered players
  const playerCount = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(seasonBrackets)
    .where(eq(seasonBrackets.seasonId, seasonId));

  const count = playerCount[0]?.count || 0;
  if (count < MIN_PLAYERS_FOR_SEASON) {
    throw new Error(
      `Need at least ${MIN_PLAYERS_FOR_SEASON} players to start (have ${count})`
    );
  }

  // Calculate prize pool from entry fees
  const totalEntryFees = await db
    .select({ sum: sql<string>`SUM(${seasonBrackets.entryFeeAmount})` })
    .from(seasonBrackets)
    .where(eq(seasonBrackets.seasonId, seasonId));

  const prizePool = parseFloat(totalEntryFees[0]?.sum || "0");
  const houseRake = prizePool * HOUSE_RAKE_PERCENT;

  await db
    .update(seasons)
    .set({
      state: "active",
      totalPlayers: count,
      prizePool: prizePool.toString(),
      houseRake: houseRake.toString(),
      updatedAt: new Date(),
    })
    .where(eq(seasons.id, seasonId));
}

/**
 * End a season: calculate final scores, rankings, payouts, and ELO changes
 */
export async function endSeason(seasonId: number): Promise<SeasonSummary> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const season = await db
    .select()
    .from(seasons)
    .where(eq(seasons.id, seasonId))
    .limit(1);

  if (!season[0]) throw new Error("Season not found");
  if (season[0].state !== "active") {
    throw new Error(`Cannot end season in state: ${season[0].state}`);
  }

  // Mark as ending
  await db
    .update(seasons)
    .set({ state: "ending", updatedAt: new Date() })
    .where(eq(seasons.id, seasonId));

  // Step 1: Calculate final Tycoon Scores and update leaderboard
  await updateSeasonLeaderboard(seasonId);

  // Step 2: Get final leaderboard
  const leaderboard = await db
    .select()
    .from(seasonLeaderboard)
    .where(eq(seasonLeaderboard.seasonId, seasonId))
    .orderBy(seasonLeaderboard.rank);

  // Step 3: Calculate and distribute payouts
  const totalPrizePool = parseFloat(season[0].prizePool || "0");
  const winners = await distributePayouts(seasonId, totalPrizePool, leaderboard);

  // Step 4: Process ELO updates
  const eloResults = await processSeasonEloUpdates(seasonId);

  // Step 5: Mark season as completed
  await db
    .update(seasons)
    .set({ state: "completed", updatedAt: new Date() })
    .where(eq(seasons.id, seasonId));

  return {
    seasonId,
    seasonNumber: season[0].seasonNumber,
    totalPlayers: season[0].totalPlayers || 0,
    totalPrizePool,
    houseRake: parseFloat(season[0].houseRake || "0"),
    distributedAmount: winners.reduce((sum, w) => sum + w.payoutAmount, 0),
    winners,
    eloChanges: eloResults.map((r) => ({
      playerId: r.playerId,
      previousElo: r.previousElo,
      newElo: r.newElo,
      eloChange: r.eloChange,
    })),
  };
}

// ============================================================================
// PAYOUT DISTRIBUTION
// ============================================================================

/**
 * Calculate and distribute payouts using exponential distribution.
 * 
 * The algorithm:
 * 1. Deduct 15% house rake from total prize pool
 * 2. Determine winner count (top 40%)
 * 3. Calculate each winner's share using exponential curve
 * 4. Normalize shares so they sum to the distribution pool
 * 5. Credit each winner's competition wallet
 */
async function distributePayouts(
  seasonId: number,
  totalPrizePool: number,
  leaderboard: any[]
): Promise<PayoutResult[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const houseRake = totalPrizePool * HOUSE_RAKE_PERCENT;
  const distributionPool = totalPrizePool - houseRake;
  const totalPlayers = leaderboard.length;
  const winnersCount = Math.max(1, Math.ceil(totalPlayers * WINNER_PERCENT));

  // Calculate raw exponential shares
  const rawShares: number[] = [];
  let totalRawShares = 0;

  for (let i = 0; i < winnersCount && i < leaderboard.length; i++) {
    const normalizedRank = i / winnersCount;
    const share = Math.pow(1 - normalizedRank, PAYOUT_EXPONENT);
    rawShares.push(share);
    totalRawShares += share;
  }

  // Normalize and distribute
  const results: PayoutResult[] = [];

  for (let i = 0; i < rawShares.length; i++) {
    const entry = leaderboard[i];
    const normalizedShare = rawShares[i] / totalRawShares;
    const payoutAmount = Math.round(distributionPool * normalizedShare * 100) / 100;

    // Get player's bracket tier
    const bracket = await db
      .select()
      .from(seasonBrackets)
      .where(
        and(
          eq(seasonBrackets.seasonId, seasonId),
          eq(seasonBrackets.playerId, entry.playerId)
        )
      )
      .limit(1);

    const bracketTier = bracket[0]?.bracketTier || "standard";

    // Credit player's competition wallet
    const player = await db
      .select()
      .from(players)
      .where(eq(players.id, entry.playerId))
      .limit(1);

    if (player[0]) {
      const currentBalance = parseFloat(
        player[0].competitionWalletBalance || "0"
      );
      const newBalance = (currentBalance + payoutAmount).toString();

      await db
        .update(players)
        .set({
          competitionWalletBalance: newBalance,
          allTimePrizeEarnings: (
            parseFloat(player[0].allTimePrizeEarnings || "0") + payoutAmount
          ).toString(),
          updatedAt: new Date(),
        })
        .where(eq(players.id, entry.playerId));

      // Record transaction
      const txId = `payout_${seasonId}_${entry.playerId}_${Date.now()}`;
      await db.insert(transactions).values({
        id: txId,
        playerId: entry.playerId,
        type: "payout",
        amount: payoutAmount.toString(),
        description: `Season ${seasonId} payout - Rank #${entry.rank}`,
        walletType: "competition",
        relatedEntityId: seasonId.toString(),
        relatedEntityType: "season",
      });

      // Update bracket with payout amount
      if (bracket[0]) {
        await db
          .update(seasonBrackets)
          .set({
            payoutAmount: payoutAmount.toString(),
            updatedAt: new Date(),
          })
          .where(eq(seasonBrackets.id, bracket[0].id));
      }
    }

    results.push({
      playerId: entry.playerId,
      rank: entry.rank,
      tycoonScore: entry.tycoonScore || 0,
      payoutAmount,
      bracketTier,
    });
  }

  return results;
}

// ============================================================================
// PAYOUT PREVIEW (for UI display before season ends)
// ============================================================================

/**
 * Preview what payouts would look like based on current standings.
 * Does NOT modify any data.
 */
export function previewPayouts(
  totalPrizePool: number,
  playerCount: number
): Array<{ rank: number; percentOfPool: number; estimatedPayout: number }> {
  const houseRake = totalPrizePool * HOUSE_RAKE_PERCENT;
  const distributionPool = totalPrizePool - houseRake;
  const winnersCount = Math.max(1, Math.ceil(playerCount * WINNER_PERCENT));

  // Calculate raw shares
  const rawShares: number[] = [];
  let totalRawShares = 0;

  for (let i = 0; i < winnersCount; i++) {
    const normalizedRank = i / winnersCount;
    const share = Math.pow(1 - normalizedRank, PAYOUT_EXPONENT);
    rawShares.push(share);
    totalRawShares += share;
  }

  return rawShares.map((share, i) => {
    const normalizedShare = share / totalRawShares;
    const payout = Math.round(distributionPool * normalizedShare * 100) / 100;
    return {
      rank: i + 1,
      percentOfPool: Math.round(normalizedShare * 10000) / 100,
      estimatedPayout: payout,
    };
  });
}

// ============================================================================
// SEASON QUERIES
// ============================================================================

/**
 * Get comprehensive season status including player count, prize pool, and time remaining
 */
export async function getSeasonStatus(seasonId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const season = await db
    .select()
    .from(seasons)
    .where(eq(seasons.id, seasonId))
    .limit(1);

  if (!season[0]) throw new Error("Season not found");

  const s = season[0];
  const now = new Date();
  const endDate = s.endDate ? new Date(s.endDate) : null;
  const timeRemainingMs = endDate ? endDate.getTime() - now.getTime() : 0;
  const daysRemaining = Math.max(
    0,
    Math.ceil(timeRemainingMs / (1000 * 60 * 60 * 24))
  );

  // Get bracket distribution
  const bracketCounts = await db
    .select({
      bracketTier: seasonBrackets.bracketTier,
      count: sql<number>`COUNT(*)`,
    })
    .from(seasonBrackets)
    .where(eq(seasonBrackets.seasonId, seasonId))
    .groupBy(seasonBrackets.bracketTier);

  return {
    seasonId: s.id,
    seasonNumber: s.seasonNumber,
    state: s.state,
    entryFee: s.entryFee,
    startDate: s.startDate,
    endDate: s.endDate,
    totalPlayers: s.totalPlayers,
    prizePool: s.prizePool,
    houseRake: s.houseRake,
    daysRemaining,
    isActive: s.state === "active",
    brackets: bracketCounts.map((b) => ({
      tier: b.bracketTier,
      playerCount: b.count,
    })),
  };
}

/**
 * Get player's season history with results
 */
export async function getPlayerSeasonHistory(playerId: number) {
  const db = await getDb();
  if (!db) return [];

  const brackets = await db
    .select()
    .from(seasonBrackets)
    .where(eq(seasonBrackets.playerId, playerId))
    .orderBy(desc(seasonBrackets.createdAt));

  const history = [];

  for (const bracket of brackets) {
    const season = await db
      .select()
      .from(seasons)
      .where(eq(seasons.id, bracket.seasonId))
      .limit(1);

    history.push({
      seasonId: bracket.seasonId,
      seasonNumber: season[0]?.seasonNumber,
      state: season[0]?.state,
      bracketTier: bracket.bracketTier,
      entryFee: bracket.entryFeeAmount,
      finalRank: bracket.finalRank,
      tycoonScore: bracket.tycoonScore,
      eloChange: bracket.eloChange,
      payoutAmount: bracket.payoutAmount,
    });
  }

  return history;
}
