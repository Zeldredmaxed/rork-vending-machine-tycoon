/**
 * VendFX Tycoon Score Engine
 * 
 * Calculates a comprehensive Tycoon Score from real player data.
 * The score is a composite of three weighted components:
 * 
 *   50% Financial  — Revenue efficiency, net worth growth, profit margins
 *   30% Operational — Machine health, reputation, inventory freshness
 *   20% Logistical  — Restock success rate, employee efficiency, delivery speed
 * 
 * Each component is normalized to 0-100, then combined into a final 0-100 score.
 * The engine pulls live data from the database for accurate, real-time scoring.
 */

import { eq, sql, and, gte } from "drizzle-orm";
import { getDb } from "../db";
import {
  players,
  vendingMachines,
  employees,
  restockDispatches,
  machineInventory,
  warehouseInventory,
  transactions,
  seasonBrackets,
  seasonLeaderboard,
} from "../../drizzle/schema";

// ============================================================================
// TYPES
// ============================================================================

export interface TycoonScoreBreakdown {
  totalScore: number;
  financial: {
    score: number;
    weight: number;
    revenueScore: number;
    netWorthScore: number;
    profitMarginScore: number;
    revenueGrowthScore: number;
  };
  operational: {
    score: number;
    weight: number;
    reputationScore: number;
    machineHealthScore: number;
    inventoryFreshnessScore: number;
    complaintResolutionScore: number;
  };
  logistical: {
    score: number;
    weight: number;
    restockSuccessScore: number;
    employeeEfficiencyScore: number;
    deliverySpeedScore: number;
    capacityUtilizationScore: number;
  };
  metadata: {
    calculatedAt: Date;
    machineCount: number;
    employeeCount: number;
    totalRevenue: number;
    totalExpenses: number;
    netWorth: number;
  };
}

export interface PlayerScoreSnapshot {
  playerId: number;
  tycoonScore: number;
  breakdown: TycoonScoreBreakdown;
  rank?: number;
}

// ============================================================================
// SCORE CONSTANTS
// ============================================================================

const WEIGHTS = {
  financial: 0.5,
  operational: 0.3,
  logistical: 0.2,
};

// Revenue normalization thresholds (per season)
const REVENUE_CEILING = 500000; // $500k = max score
const NET_WORTH_CEILING = 250000; // $250k = max score
const PROFIT_MARGIN_IDEAL = 0.35; // 35% margin = max score

// ============================================================================
// MAIN CALCULATION
// ============================================================================

/**
 * Calculate the full Tycoon Score for a player with detailed breakdown.
 * Pulls all data from the database in real-time.
 */
export async function calculateFullTycoonScore(
  playerId: number
): Promise<TycoonScoreBreakdown> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Fetch player data
  const playerResult = await db
    .select()
    .from(players)
    .where(eq(players.id, playerId))
    .limit(1);
  const player = playerResult[0];
  if (!player) throw new Error("Player not found");

  // Fetch all machines
  const machines = await db
    .select()
    .from(vendingMachines)
    .where(eq(vendingMachines.playerId, playerId));

  // Fetch all employees
  const employeeList = await db
    .select()
    .from(employees)
    .where(eq(employees.playerId, playerId));

  // Fetch restock dispatches (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const machineIds = machines.map((m) => m.id);
  let restocks: any[] = [];
  if (machineIds.length > 0) {
    restocks = await db
      .select()
      .from(restockDispatches)
      .where(
        and(
          sql`${restockDispatches.machineId} IN (${sql.raw(
            machineIds.map((id) => `'${id}'`).join(",")
          )})`,
          gte(restockDispatches.createdAt, thirtyDaysAgo)
        )
      );
  }

  // Calculate each component
  const financial = calculateFinancialScore(player, machines);
  const operational = calculateOperationalScore(player, machines);
  const logistical = calculateLogisticalScore(employeeList, restocks, machines);

  // Weighted total
  const totalScore = Math.round(
    financial.score * WEIGHTS.financial +
      operational.score * WEIGHTS.operational +
      logistical.score * WEIGHTS.logistical
  );

  return {
    totalScore: Math.max(0, Math.min(100, totalScore)),
    financial: { ...financial, weight: WEIGHTS.financial },
    operational: { ...operational, weight: WEIGHTS.operational },
    logistical: { ...logistical, weight: WEIGHTS.logistical },
    metadata: {
      calculatedAt: new Date(),
      machineCount: machines.length,
      employeeCount: employeeList.length,
      totalRevenue: parseFloat(player.totalRevenue || "0"),
      totalExpenses: parseFloat(player.totalExpenses || "0"),
      netWorth: parseFloat(player.netWorth || "0"),
    },
  };
}

// ============================================================================
// FINANCIAL COMPONENT (50%)
// ============================================================================

function calculateFinancialScore(
  player: any,
  machines: any[]
): {
  score: number;
  revenueScore: number;
  netWorthScore: number;
  profitMarginScore: number;
  revenueGrowthScore: number;
} {
  const totalRevenue = parseFloat(player.totalRevenue || "0");
  const totalExpenses = parseFloat(player.totalExpenses || "0");
  const netWorth = parseFloat(player.netWorth || "0");

  // Revenue Score: normalized against ceiling
  const revenueScore = Math.min((totalRevenue / REVENUE_CEILING) * 100, 100);

  // Net Worth Score: normalized against ceiling
  const netWorthScore = Math.min((netWorth / NET_WORTH_CEILING) * 100, 100);

  // Profit Margin Score: how close to ideal margin
  const profitMargin =
    totalRevenue > 0 ? (totalRevenue - totalExpenses) / totalRevenue : 0;
  const profitMarginScore = Math.min(
    Math.max(0, (profitMargin / PROFIT_MARGIN_IDEAL) * 100),
    100
  );

  // Revenue Growth Score: based on daily revenue trend across machines
  const totalDailyRevenue = machines.reduce(
    (sum, m) => sum + parseFloat(m.dailyRevenue || "0"),
    0
  );
  const avgDailyPerMachine =
    machines.length > 0 ? totalDailyRevenue / machines.length : 0;
  // $100/day/machine = max score
  const revenueGrowthScore = Math.min((avgDailyPerMachine / 100) * 100, 100);

  // Weighted average of sub-scores
  const score =
    revenueScore * 0.3 +
    netWorthScore * 0.25 +
    profitMarginScore * 0.25 +
    revenueGrowthScore * 0.2;

  return {
    score: Math.round(score),
    revenueScore: Math.round(revenueScore),
    netWorthScore: Math.round(netWorthScore),
    profitMarginScore: Math.round(profitMarginScore),
    revenueGrowthScore: Math.round(revenueGrowthScore),
  };
}

// ============================================================================
// OPERATIONAL COMPONENT (30%)
// ============================================================================

function calculateOperationalScore(
  player: any,
  machines: any[]
): {
  score: number;
  reputationScore: number;
  machineHealthScore: number;
  inventoryFreshnessScore: number;
  complaintResolutionScore: number;
} {
  // Reputation Score: player reputation (0-100 already)
  const reputationScore = Math.min(Math.max(player.reputation || 0, 0), 100);

  // Machine Health Score: average maintenance level across all machines
  const machineHealthScore =
    machines.length > 0
      ? machines.reduce((sum, m) => sum + (m.maintenanceLevel || 0), 0) /
        machines.length
      : 50; // Default for no machines

  // Inventory Freshness Score: percentage of machines that are stocked
  const stockedMachines = machines.filter(
    (m) => m.status === "healthy" || m.status === "lowStock"
  ).length;
  const inventoryFreshnessScore =
    machines.length > 0 ? (stockedMachines / machines.length) * 100 : 50;

  // Complaint Resolution Score: based on machine status
  // Machines not broken or offline = good resolution
  const operationalMachines = machines.filter(
    (m) => m.status !== "broken" && m.status !== "offline"
  ).length;
  const complaintResolutionScore =
    machines.length > 0 ? (operationalMachines / machines.length) * 100 : 50;

  // Weighted average
  const score =
    reputationScore * 0.3 +
    machineHealthScore * 0.3 +
    inventoryFreshnessScore * 0.2 +
    complaintResolutionScore * 0.2;

  return {
    score: Math.round(score),
    reputationScore: Math.round(reputationScore),
    machineHealthScore: Math.round(machineHealthScore),
    inventoryFreshnessScore: Math.round(inventoryFreshnessScore),
    complaintResolutionScore: Math.round(complaintResolutionScore),
  };
}

// ============================================================================
// LOGISTICAL COMPONENT (20%)
// ============================================================================

function calculateLogisticalScore(
  employeeList: any[],
  restocks: any[],
  machines: any[]
): {
  score: number;
  restockSuccessScore: number;
  employeeEfficiencyScore: number;
  deliverySpeedScore: number;
  capacityUtilizationScore: number;
} {
  // Restock Success Score: percentage of completed restocks
  const completedRestocks = restocks.filter(
    (r) => r.status === "completed"
  ).length;
  const restockSuccessScore =
    restocks.length > 0 ? (completedRestocks / restocks.length) * 100 : 50;

  // Employee Efficiency Score: average of all employee stats
  const employeeEfficiencyScore =
    employeeList.length > 0
      ? employeeList.reduce((sum, e) => {
          const avgStat =
            ((e.statSpeed || 50) +
              (e.statQualityControl || 50) +
              (e.statAttendance || 50) +
              (e.statDriving || 50) +
              (e.statAdaptability || 50) +
              (e.statRepairSkill || 50)) /
            6;
          return sum + avgStat;
        }, 0) / employeeList.length
      : 50;

  // Delivery Speed Score: percentage of on-time deliveries
  const onTimeDeliveries = restocks.filter((r) => {
    if (r.status !== "completed") return false;
    // Check if completed before estimated arrival
    return true; // Simplified — would compare actual vs estimated
  }).length;
  const deliverySpeedScore =
    restocks.length > 0 ? (onTimeDeliveries / restocks.length) * 100 : 50;

  // Capacity Utilization Score: how well machines are stocked
  const totalCapacity = machines.reduce((sum, m) => sum + (m.capacity || 100), 0);
  const usedCapacity = machines.reduce(
    (sum, m) => sum + (m.usedCapacity || 0),
    0
  );
  const capacityUtilizationScore =
    totalCapacity > 0
      ? Math.min((usedCapacity / totalCapacity) * 100, 100)
      : 50;

  // Weighted average
  const score =
    restockSuccessScore * 0.3 +
    employeeEfficiencyScore * 0.3 +
    deliverySpeedScore * 0.2 +
    capacityUtilizationScore * 0.2;

  return {
    score: Math.round(score),
    restockSuccessScore: Math.round(restockSuccessScore),
    employeeEfficiencyScore: Math.round(employeeEfficiencyScore),
    deliverySpeedScore: Math.round(deliverySpeedScore),
    capacityUtilizationScore: Math.round(capacityUtilizationScore),
  };
}

// ============================================================================
// BATCH SCORE CALCULATION (for leaderboards)
// ============================================================================

/**
 * Calculate Tycoon Scores for all players in a season bracket.
 * Returns sorted array of player scores for leaderboard ranking.
 */
export async function calculateSeasonScores(
  seasonId: number
): Promise<PlayerScoreSnapshot[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get all players in this season
  const brackets = await db
    .select()
    .from(seasonBrackets)
    .where(eq(seasonBrackets.seasonId, seasonId));

  const scores: PlayerScoreSnapshot[] = [];

  for (const bracket of brackets) {
    try {
      const breakdown = await calculateFullTycoonScore(bracket.playerId);
      scores.push({
        playerId: bracket.playerId,
        tycoonScore: breakdown.totalScore,
        breakdown,
      });
    } catch (error) {
      console.error(
        `Failed to calculate score for player ${bracket.playerId}:`,
        error
      );
      scores.push({
        playerId: bracket.playerId,
        tycoonScore: 0,
        breakdown: createEmptyBreakdown(),
      });
    }
  }

  // Sort by score descending and assign ranks
  scores.sort((a, b) => b.tycoonScore - a.tycoonScore);
  scores.forEach((s, i) => {
    s.rank = i + 1;
  });

  return scores;
}

/**
 * Update the season leaderboard with fresh scores.
 * Called periodically by cron or on-demand.
 */
export async function updateSeasonLeaderboard(seasonId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const scores = await calculateSeasonScores(seasonId);

  for (const score of scores) {
    // Upsert leaderboard entry
    const existing = await db
      .select()
      .from(seasonLeaderboard)
      .where(
        and(
          eq(seasonLeaderboard.seasonId, seasonId),
          eq(seasonLeaderboard.playerId, score.playerId)
        )
      )
      .limit(1);

    if (existing[0]) {
      await db
        .update(seasonLeaderboard)
        .set({
          rank: score.rank!,
          tycoonScore: score.tycoonScore,
          totalRevenue: score.breakdown.metadata.totalRevenue.toString(),
          netWorth: score.breakdown.metadata.netWorth.toString(),
          updatedAt: new Date(),
        })
        .where(eq(seasonLeaderboard.id, existing[0].id));
    } else {
      await db.insert(seasonLeaderboard).values({
        seasonId,
        playerId: score.playerId,
        rank: score.rank!,
        tycoonScore: score.tycoonScore,
        totalRevenue: score.breakdown.metadata.totalRevenue.toString(),
        netWorth: score.breakdown.metadata.netWorth.toString(),
      });
    }

    // Update player's best score if applicable
    const player = await db
      .select()
      .from(players)
      .where(eq(players.id, score.playerId))
      .limit(1);

    if (player[0]) {
      const updates: any = {};
      if (score.tycoonScore > (player[0].bestTycoonScore || 0)) {
        updates.bestTycoonScore = score.tycoonScore;
      }
      if (!player[0].bestRank || score.rank! < player[0].bestRank) {
        updates.bestRank = score.rank;
      }
      if (Object.keys(updates).length > 0) {
        await db
          .update(players)
          .set(updates)
          .where(eq(players.id, score.playerId));
      }
    }
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function createEmptyBreakdown(): TycoonScoreBreakdown {
  return {
    totalScore: 0,
    financial: {
      score: 0,
      weight: 0.5,
      revenueScore: 0,
      netWorthScore: 0,
      profitMarginScore: 0,
      revenueGrowthScore: 0,
    },
    operational: {
      score: 0,
      weight: 0.3,
      reputationScore: 0,
      machineHealthScore: 0,
      inventoryFreshnessScore: 0,
      complaintResolutionScore: 0,
    },
    logistical: {
      score: 0,
      weight: 0.2,
      restockSuccessScore: 0,
      employeeEfficiencyScore: 0,
      deliverySpeedScore: 0,
      capacityUtilizationScore: 0,
    },
    metadata: {
      calculatedAt: new Date(),
      machineCount: 0,
      employeeCount: 0,
      totalRevenue: 0,
      totalExpenses: 0,
      netWorth: 0,
    },
  };
}
