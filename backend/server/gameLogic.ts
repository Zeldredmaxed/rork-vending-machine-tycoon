/**
 * VendFX Game Logic Calculations
 * Implements Tycoon Score, ELO, payouts, and other game mechanics
 */

// ============================================================================
// TYCOON SCORE CALCULATION
// ============================================================================

/**
 * Calculate Tycoon Score based on:
 * - 50% Financial (revenue, net worth, profit margin)
 * - 30% Operational (reputation, machine health, inventory management)
 * - 20% Logistical (restock success rate, employee efficiency, delivery times)
 */
export function calculateTycoonScore(playerStats: {
  totalRevenue: number;
  netWorth: number;
  totalExpenses: number;
  reputation: number;
  machineCount: number;
  machineHealthAverage: number;
  restockSuccessRate: number;
  employeeEfficiencyAverage: number;
}): number {
  // Financial Component (50%)
  const profitMargin =
    playerStats.totalExpenses > 0
      ? (playerStats.totalRevenue - playerStats.totalExpenses) / playerStats.totalRevenue
      : 0;

  const revenueScore = Math.min(playerStats.totalRevenue / 100000, 100); // Normalize to 0-100
  const netWorthScore = Math.min(playerStats.netWorth / 50000, 100);
  const profitMarginScore = Math.max(0, Math.min(profitMargin * 100, 100));

  const financialScore = (revenueScore + netWorthScore + profitMarginScore) / 3;

  // Operational Component (30%)
  const reputationScore = playerStats.reputation; // Already 0-100
  const machineHealthScore = playerStats.machineHealthAverage; // Already 0-100
  const operationalScore = (reputationScore + machineHealthScore) / 2;

  // Logistical Component (20%)
  const restockScore = playerStats.restockSuccessRate * 100; // Convert to 0-100
  const employeeScore = playerStats.employeeEfficiencyAverage; // Already 0-100
  const logisticalScore = (restockScore + employeeScore) / 2;

  // Weighted total
  const tycoonScore =
    financialScore * 0.5 + operationalScore * 0.3 + logisticalScore * 0.2;

  return Math.round(tycoonScore);
}

// ============================================================================
// ELO RATING SYSTEM
// ============================================================================

const ELO_K_FACTOR = 32; // Standard K-factor for chess-like games
const ELO_BASE = 1200; // Base rating for new players

/**
 * Calculate ELO change based on match result
 * @param playerElo Current player ELO
 * @param opponentElo Opponent ELO
 * @param playerWon Whether the player won
 * @returns ELO change (can be negative)
 */
export function calculateEloChange(
  playerElo: number,
  opponentElo: number,
  playerWon: boolean
): number {
  const expectedScore = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
  const actualScore = playerWon ? 1 : 0;
  const eloChange = Math.round(ELO_K_FACTOR * (actualScore - expectedScore));

  return eloChange;
}

/**
 * Calculate expected win probability based on ELO ratings
 */
export function getExpectedWinProbability(playerElo: number, opponentElo: number): number {
  return 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
}

// ============================================================================
// SEASON PAYOUT ALGORITHM
// ============================================================================

/**
 * Calculate exponential payout distribution
 * Top 40% of players win prizes, bottom 60% get nothing
 * 15% house rake from total prize pool
 */
export function calculatePayouts(
  totalPrizePool: number,
  playerRankings: Array<{ rank: number; tycoonScore: number }>
): Map<number, number> {
  const houseRake = totalPrizePool * 0.15;
  const distributionPool = totalPrizePool - houseRake;
  const totalPlayers = playerRankings.length;
  const winnersCount = Math.ceil(totalPlayers * 0.4); // Top 40%

  const payouts = new Map<number, number>();

  // Exponential distribution: higher ranks get exponentially more
  // Using formula: payout = pool * (1 - rank/totalWinners)^2
  let totalDistributed = 0;

  for (let i = 0; i < winnersCount && i < playerRankings.length; i++) {
    const rank = playerRankings[i].rank;
    const normalizedRank = i / winnersCount;
    const exponentialMultiplier = Math.pow(1 - normalizedRank, 2);
    const payout = (distributionPool / winnersCount) * (1 + exponentialMultiplier);

    payouts.set(rank, Math.round(payout * 100) / 100); // Round to 2 decimals
    totalDistributed += payout;
  }

  return payouts;
}

/**
 * Calculate house rake from prize pool
 */
export function calculateHouseRake(totalPrizePool: number): number {
  return Math.round(totalPrizePool * 0.15 * 100) / 100;
}

// ============================================================================
// TRAVEL TIME & LOGISTICS
// ============================================================================

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * Returns distance in miles
 */
export function calculateGpsDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate estimated travel time based on distance and employee driving skill
 * Base speed: 30 mph, modified by driving stat (50 = base, 100 = +50% speed, 0 = -50% speed)
 */
export function calculateTravelTime(
  distanceMiles: number,
  drivingSkill: number
): { minutes: number; seconds: number } {
  const baseSpeed = 30; // mph
  const speedModifier = 1 + (drivingSkill - 50) / 100; // -50% to +50%
  const actualSpeed = baseSpeed * speedModifier;
  const hours = distanceMiles / actualSpeed;
  const minutes = Math.round(hours * 60);

  return {
    minutes: Math.floor(minutes / 60),
    seconds: minutes % 60,
  };
}

/**
 * Calculate total ETA including travel time and task completion time
 */
export function calculateETA(
  distanceMiles: number,
  drivingSkill: number,
  taskMinutes: number = 30
): Date {
  const travelTime = calculateTravelTime(distanceMiles, drivingSkill);
  const totalMinutes = travelTime.minutes * 60 + travelTime.seconds + taskMinutes * 60;

  const eta = new Date();
  eta.setSeconds(eta.getSeconds() + totalMinutes * 60);

  return eta;
}

// ============================================================================
// EMPLOYEE EFFICIENCY
// ============================================================================

/**
 * Calculate employee efficiency score based on stats
 * Returns 0-100 score
 */
export function calculateEmployeeEfficiency(stats: {
  speed: number;
  qualityControl: number;
  attendance: number;
  driving: number;
  adaptability: number;
  repairSkill: number;
}): number {
  const weights = {
    speed: 0.2,
    qualityControl: 0.25,
    attendance: 0.2,
    driving: 0.15,
    adaptability: 0.1,
    repairSkill: 0.1,
  };

  const weighted =
    stats.speed * weights.speed +
    stats.qualityControl * weights.qualityControl +
    stats.attendance * weights.attendance +
    stats.driving * weights.driving +
    stats.adaptability * weights.adaptability +
    stats.repairSkill * weights.repairSkill;

  return Math.round(weighted);
}

// ============================================================================
// MACHINE BREAKDOWN SIMULATION
// ============================================================================

/**
 * Simulate machine breakdown probability based on maintenance level
 * Returns true if breakdown occurs
 */
export function simulateBreakdown(maintenanceLevel: number): boolean {
  // Breakdown chance increases exponentially as maintenance decreases
  // At 100% maintenance: 0% chance
  // At 50% maintenance: ~5% chance
  // At 0% maintenance: ~50% chance
  const breakdownChance = Math.pow(1 - maintenanceLevel / 100, 2);

  return Math.random() < breakdownChance;
}

/**
 * Calculate repair cost based on damage severity
 */
export function calculateRepairCost(maintenanceLevel: number, baseCost: number): number {
  // Cost increases as maintenance decreases
  const damageMultiplier = Math.pow(1 - maintenanceLevel / 100, 1.5);
  const repairCost = baseCost * (0.5 + damageMultiplier); // 50% to 150% of base cost

  return Math.round(repairCost * 100) / 100;
}

// ============================================================================
// PRODUCT PRICING & DEMAND
// ============================================================================

/**
 * Calculate product demand multiplier based on demographic profile
 */
export function getDemographicDemandMultiplier(
  demographicProfile: string,
  productCategory: string
): number {
  const demandMap: Record<string, Record<string, number>> = {
    urbanJapan: { soda: 1.3, snacks: 1.2, healthy: 0.8 },
    ruralUS: { soda: 1.1, snacks: 1.3, healthy: 0.7 },
    universityCampus: { soda: 1.4, snacks: 1.5, healthy: 0.9 },
    downtownBusiness: { soda: 0.9, snacks: 1.1, healthy: 1.3 },
    touristDistrict: { soda: 1.5, snacks: 1.4, healthy: 0.8 },
    suburbanFamily: { soda: 1.0, snacks: 1.2, healthy: 1.2 },
  };

  return demandMap[demographicProfile]?.[productCategory] || 1.0;
}

/**
 * Calculate freshness bonus for products
 * Extra fresh products sell at premium
 */
export function getFreshnessBonus(isExtraFresh: boolean, daysOld: number): number {
  if (isExtraFresh) {
    return 1.15; // 15% premium
  }

  if (daysOld === 0) {
    return 1.1; // 10% premium for fresh
  }

  if (daysOld > 3) {
    return 0.8; // 20% discount for old
  }

  return 1.0; // No bonus
}

// ============================================================================
// BUSINESS TIER CALCULATION
// ============================================================================

export function calculateBusinessTier(machineCount: number): string {
  if (machineCount >= 50) return "executive";
  if (machineCount >= 15) return "regionalManager";
  if (machineCount >= 5) return "localOperator";
  return "startup";
}

// ============================================================================
// SPENDING LIMIT CHECKS
// ============================================================================

/**
 * Check if player has exceeded spending limits
 */
export function checkSpendingLimits(
  dailySpent: number,
  weeklySpent: number,
  monthlySpent: number,
  limits: {
    daily?: number;
    weekly?: number;
    monthly?: number;
  }
): { allowed: boolean; reason?: string } {
  if (limits.daily && dailySpent > limits.daily) {
    return { allowed: false, reason: "Daily spending limit exceeded" };
  }

  if (limits.weekly && weeklySpent > limits.weekly) {
    return { allowed: false, reason: "Weekly spending limit exceeded" };
  }

  if (limits.monthly && monthlySpent > limits.monthly) {
    return { allowed: false, reason: "Monthly spending limit exceeded" };
  }

  return { allowed: true };
}
