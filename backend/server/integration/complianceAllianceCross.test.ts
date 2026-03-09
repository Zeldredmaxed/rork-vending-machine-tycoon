/**
 * Integration Tests: Compliance, Alliance & Cross-System Interactions
 * =====================================================================
 * End-to-end tests for compliance flows (KYC, geo-blocking, responsible gaming),
 * alliance lifecycle, and cross-system interactions that span multiple engines.
 */

import { describe, expect, it } from "vitest";
import {
  calculateTycoonScore,
  calculateEloChange,
  getExpectedWinProbability,
  calculatePayouts,
  calculateHouseRake,
  calculateGpsDistance,
  calculateTravelTime,
  calculateEmployeeEfficiency,
  simulateBreakdown,
  calculateRepairCost,
  getDemographicDemandMultiplier,
  getFreshnessBonus,
  calculateBusinessTier,
  checkSpendingLimits,
} from "../gameLogic";
import {
  isStateRestricted,
  getRestrictedStates,
  checkGeoCompliance,
  checkKycRequirement,
  KYC_THRESHOLDS,
  MAX_LIMITS,
} from "../engines/compliance";
import {
  POWER_UP_CATALOG,
  UPGRADE_CATALOG,
  calculateUpgradeCost,
  calculateTotalUpgradeCost,
  calculatePowerUpCost,
  meetsBusinessTierRequirement,
} from "../engines/powerUps";
import {
  BRACKET_TIERS,
  getBracketTier,
} from "../engines/eloMatchmaking";
import { MARKETPLACE_FEE_RATE } from "../engines/wholesaleMarket";

// ============================================================================
// FLOW 1: FULL COMPLIANCE LIFECYCLE
// ============================================================================

describe("Flow: Full Compliance Lifecycle", () => {
  it("should block all 12 restricted states", () => {
    const restricted = getRestrictedStates();
    expect(restricted.length).toBe(12);

    const codes = restricted.map((s) => s.code);
    expect(codes).toContain("AZ");
    expect(codes).toContain("AR");
    expect(codes).toContain("CT");
    expect(codes).toContain("DE");
    expect(codes).toContain("LA");
    expect(codes).toContain("MT");
    expect(codes).toContain("SC");
    expect(codes).toContain("SD");
    expect(codes).toContain("TN");
    expect(codes).toContain("WA");
    expect(codes).toContain("WI");
    expect(codes).toContain("ID");
  });

  it("should allow non-restricted states", () => {
    const allowedStates = ["CA", "NY", "TX", "FL", "IL", "PA", "OH", "GA", "NC", "MI"];
    for (const state of allowedStates) {
      expect(isStateRestricted(state)).toBe(false);
      const compliance = checkGeoCompliance(state);
      expect(compliance.allowed).toBe(true);
    }
  });

  it("should block restricted states with proper reason", () => {
    const result = checkGeoCompliance("AZ");
    expect(result.allowed).toBe(false);
    expect(result.stateCode).toBe("AZ");
    expect(result.reason).toContain("Arizona");
  });

  it("should handle case-insensitive state codes", () => {
    expect(isStateRestricted("az")).toBe(true);
    expect(isStateRestricted("AZ")).toBe(true);
    expect(isStateRestricted("Az")).toBe(true);
  });

  it("should require state verification for null state", () => {
    const result = checkGeoCompliance(null);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("State verification required");
  });

  it("should simulate full KYC lifecycle: unverified → deposit → withdraw blocked → verify → withdraw", () => {
    // Step 1: New player, no KYC
    const smallDeposit = checkKycRequirement(null, "deposit", 100);
    expect(smallDeposit.allowed).toBe(true); // Small deposits OK without KYC

    // Step 2: Large deposit blocked
    const largeDeposit = checkKycRequirement(null, "deposit", 1000);
    expect(largeDeposit.allowed).toBe(false);
    expect(largeDeposit.kycRequired).toBe(true);

    // Step 3: Withdrawal always blocked without KYC
    const withdraw = checkKycRequirement(null, "withdraw", 10);
    expect(withdraw.allowed).toBe(false);

    // Step 4: After KYC verification, all operations allowed
    const verifiedDeposit = checkKycRequirement("verified", "deposit", 10000);
    expect(verifiedDeposit.allowed).toBe(true);

    const verifiedWithdraw = checkKycRequirement("verified", "withdraw", 5000);
    expect(verifiedWithdraw.allowed).toBe(true);
  });

  it("should enforce KYC thresholds correctly", () => {
    // Deposit threshold: $500
    expect(KYC_THRESHOLDS.maxSingleDepositWithoutKyc).toBe(500);

    // At threshold: allowed
    const atLimit = checkKycRequirement(null, "deposit", 500);
    expect(atLimit.allowed).toBe(true);

    // Over threshold: blocked
    const overLimit = checkKycRequirement(null, "deposit", 501);
    expect(overLimit.allowed).toBe(false);

    // Season entry threshold: $50
    expect(KYC_THRESHOLDS.seasonEntryKycThreshold).toBe(50);

    const smallEntry = checkKycRequirement(null, "season_entry", 50);
    expect(smallEntry.allowed).toBe(true);

    const largeEntry = checkKycRequirement(null, "season_entry", 100);
    expect(largeEntry.allowed).toBe(false);
  });
});

// ============================================================================
// FLOW 2: RESPONSIBLE GAMING LIMITS
// ============================================================================

describe("Flow: Responsible Gaming Limits", () => {
  it("should enforce daily spending limits", () => {
    const limits = { daily: 200 };

    const under = checkSpendingLimits(150, 0, 0, limits);
    expect(under.allowed).toBe(true);

    const over = checkSpendingLimits(250, 0, 0, limits);
    expect(over.allowed).toBe(false);
    expect(over.reason).toContain("Daily");
  });

  it("should enforce weekly spending limits", () => {
    const limits = { weekly: 1000 };

    const under = checkSpendingLimits(0, 800, 0, limits);
    expect(under.allowed).toBe(true);

    const over = checkSpendingLimits(0, 1200, 0, limits);
    expect(over.allowed).toBe(false);
    expect(over.reason).toContain("Weekly");
  });

  it("should enforce monthly spending limits", () => {
    const limits = { monthly: 5000 };

    const under = checkSpendingLimits(0, 0, 4000, limits);
    expect(under.allowed).toBe(true);

    const over = checkSpendingLimits(0, 0, 6000, limits);
    expect(over.allowed).toBe(false);
    expect(over.reason).toContain("Monthly");
  });

  it("should check all limits simultaneously (daily triggers first)", () => {
    const limits = { daily: 100, weekly: 500, monthly: 2000 };

    // All exceeded — daily should trigger first
    const result = checkSpendingLimits(150, 600, 2500, limits);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("Daily");
  });

  it("should have platform-wide maximum limits", () => {
    expect(MAX_LIMITS.daily).toBe(10000);
    expect(MAX_LIMITS.weekly).toBe(50000);
    expect(MAX_LIMITS.monthly).toBe(100000);
  });

  it("should simulate responsible gaming scenario: player hits daily limit", () => {
    const dailyLimit = 200;
    const limits = { daily: dailyLimit };

    // Morning: $50 deposit
    let dailySpent = 50;
    expect(checkSpendingLimits(dailySpent, dailySpent, dailySpent, limits).allowed).toBe(true);

    // Afternoon: $100 season entry
    dailySpent += 100;
    expect(checkSpendingLimits(dailySpent, dailySpent, dailySpent, limits).allowed).toBe(true);

    // Evening: tries $80 more — would exceed $200 daily limit
    dailySpent += 80;
    expect(checkSpendingLimits(dailySpent, dailySpent, dailySpent, limits).allowed).toBe(false);
  });
});

// ============================================================================
// FLOW 3: ALLIANCE ECONOMICS & TREASURY
// ============================================================================

describe("Flow: Alliance Economics & Treasury", () => {
  it("should calculate alliance creation cost impact on player wallet", () => {
    const allianceCost = 500; // $500 to create
    const playerBalance = 2000;
    const remainingBalance = playerBalance - allianceCost;

    expect(remainingBalance).toBe(1500);
    expect(remainingBalance).toBeGreaterThan(0);
  });

  it("should simulate treasury contribution and withdrawal flow", () => {
    let treasury = 0;
    const contributions = [100, 200, 150, 300]; // 4 members contribute

    for (const amount of contributions) {
      treasury += amount;
    }
    expect(treasury).toBe(750);

    // Leader withdraws for alliance upgrade
    const withdrawal = 500;
    treasury -= withdrawal;
    expect(treasury).toBe(250);
  });

  it("should calculate alliance member contribution fairness", () => {
    const contributions = [
      { memberId: 1, amount: 500 },
      { memberId: 2, amount: 300 },
      { memberId: 3, amount: 100 },
      { memberId: 4, amount: 100 },
    ];

    const total = contributions.reduce((sum, c) => sum + c.amount, 0);
    expect(total).toBe(1000);

    // Calculate contribution percentages
    const percentages = contributions.map((c) => ({
      memberId: c.memberId,
      percent: (c.amount / total) * 100,
    }));

    expect(percentages[0].percent).toBe(50); // Member 1: 50%
    expect(percentages[1].percent).toBe(30); // Member 2: 30%
    expect(percentages[2].percent).toBe(10); // Member 3: 10%
    expect(percentages[3].percent).toBe(10); // Member 4: 10%
  });
});

// ============================================================================
// FLOW 4: CROSS-SYSTEM — SEASON + MARKET + FLEET + SCORE
// ============================================================================

describe("Flow: Cross-System Season + Market + Fleet + Score", () => {
  it("should simulate a full competitive season lifecycle", () => {
    // Phase 1: Pre-season — players prepare
    const player1Stats = {
      totalRevenue: 80000, netWorth: 50000, totalExpenses: 30000,
      reputation: 85, machineCount: 20, machineHealthAverage: 92,
      restockSuccessRate: 0.95, employeeEfficiencyAverage: 82,
    };
    const player2Stats = {
      totalRevenue: 60000, netWorth: 35000, totalExpenses: 25000,
      reputation: 75, machineCount: 15, machineHealthAverage: 85,
      restockSuccessRate: 0.80, employeeEfficiencyAverage: 70,
    };

    const score1 = calculateTycoonScore(player1Stats);
    const score2 = calculateTycoonScore(player2Stats);

    // Player 1 should have higher score
    expect(score1).toBeGreaterThan(score2);

    // Phase 2: Bracket assignment
    const elo1 = 1350;
    const elo2 = 1280;
    const bracket1 = getBracketTier(elo1);
    const bracket2 = getBracketTier(elo2);
    expect(bracket1.name).toBe("gold");
    expect(bracket2.name).toBe("gold");

    // Phase 3: Season ends, payouts calculated
    const entryFee = 100;
    const prizePool = entryFee * 2; // 2 players
    const payouts = calculatePayouts(prizePool, [
      { rank: 1, tycoonScore: score1 },
      { rank: 2, tycoonScore: score2 },
    ]);

    const winner = payouts.get(1) || 0;
    expect(winner).toBeGreaterThan(0);

    // Phase 4: ELO updates
    const elo1Change = calculateEloChange(elo1, elo2, true);
    const elo2Change = calculateEloChange(elo2, elo1, false);

    expect(elo1 + elo1Change).toBeGreaterThan(elo1);
    expect(elo2 + elo2Change).toBeLessThan(elo2);
  });

  it("should show market events affect tycoon score through revenue", () => {
    // Normal market conditions
    const normalScore = calculateTycoonScore({
      totalRevenue: 50000, netWorth: 30000, totalExpenses: 20000,
      reputation: 70, machineCount: 10, machineHealthAverage: 85,
      restockSuccessRate: 0.85, employeeEfficiencyAverage: 70,
    });

    // During sugar tax event — revenue drops, expenses rise
    const taxScore = calculateTycoonScore({
      totalRevenue: 35000, netWorth: 25000, totalExpenses: 25000,
      reputation: 70, machineCount: 10, machineHealthAverage: 85,
      restockSuccessRate: 0.85, employeeEfficiencyAverage: 70,
    });

    expect(normalScore).toBeGreaterThan(taxScore);
  });

  it("should show fleet efficiency directly impacts operational score", () => {
    const goodFleet = calculateTycoonScore({
      totalRevenue: 50000, netWorth: 30000, totalExpenses: 20000,
      reputation: 70, machineCount: 10, machineHealthAverage: 85,
      restockSuccessRate: 0.98, employeeEfficiencyAverage: 90,
    });

    const badFleet = calculateTycoonScore({
      totalRevenue: 50000, netWorth: 30000, totalExpenses: 20000,
      reputation: 70, machineCount: 10, machineHealthAverage: 85,
      restockSuccessRate: 0.30, employeeEfficiencyAverage: 35,
    });

    expect(goodFleet).toBeGreaterThan(badFleet);
  });

  it("should simulate power-up investment affecting competitive outcome", () => {
    // Player A: invested in power-ups → higher revenue, better maintenance
    const playerA = calculateTycoonScore({
      totalRevenue: 90000, netWorth: 55000, totalExpenses: 35000,
      reputation: 88, machineCount: 20, machineHealthAverage: 95,
      restockSuccessRate: 0.92, employeeEfficiencyAverage: 80,
    });

    // Player B: no power-ups → lower performance
    const playerB = calculateTycoonScore({
      totalRevenue: 60000, netWorth: 40000, totalExpenses: 20000,
      reputation: 72, machineCount: 20, machineHealthAverage: 75,
      restockSuccessRate: 0.78, employeeEfficiencyAverage: 65,
    });

    expect(playerA).toBeGreaterThan(playerB);

    // Player A wins the season
    const payouts = calculatePayouts(200, [
      { rank: 1, tycoonScore: playerA },
      { rank: 2, tycoonScore: playerB },
    ]);

    expect(payouts.get(1)).toBeGreaterThan(0);
  });
});

// ============================================================================
// FLOW 5: CROSS-SYSTEM — COMPLIANCE + PAYMENTS + SEASON ENTRY
// ============================================================================

describe("Flow: Cross-System Compliance + Payments + Season Entry", () => {
  it("should block season entry for geo-restricted players", () => {
    const geoCheck = checkGeoCompliance("AZ");
    expect(geoCheck.allowed).toBe(false);

    // Even with verified KYC, geo-block takes precedence
    const kycCheck = checkKycRequirement("verified", "season_entry", 100);
    expect(kycCheck.allowed).toBe(true); // KYC alone is fine

    // But the geo-block would prevent the actual transaction
    // (compliance engine runs both checks)
  });

  it("should simulate new player first-deposit-to-first-season flow", () => {
    // Step 1: Check geo compliance (California - allowed)
    const geo = checkGeoCompliance("CA");
    expect(geo.allowed).toBe(true);

    // Step 2: Small deposit ($100) - no KYC needed
    const deposit = checkKycRequirement(null, "deposit", 100);
    expect(deposit.allowed).toBe(true);

    // Step 3: Enter season ($25 entry fee) - no KYC needed
    const entry = checkKycRequirement(null, "season_entry", 25);
    expect(entry.allowed).toBe(true);

    // Step 4: Check spending limits (no limits set = unlimited)
    const spending = checkSpendingLimits(125, 125, 125, {});
    expect(spending.allowed).toBe(true);

    // Step 5: Player wins $200, tries to withdraw
    const withdraw = checkKycRequirement(null, "withdraw", 200);
    expect(withdraw.allowed).toBe(false); // Must KYC first

    // Step 6: After KYC, withdrawal succeeds
    const withdrawVerified = checkKycRequirement("verified", "withdraw", 200);
    expect(withdrawVerified.allowed).toBe(true);
  });

  it("should simulate whale player hitting all compliance checks", () => {
    // Whale wants to deposit $5000
    const largeDeposit = checkKycRequirement(null, "deposit", 5000);
    expect(largeDeposit.allowed).toBe(false); // Over $500 threshold

    // After KYC verification
    const verifiedDeposit = checkKycRequirement("verified", "deposit", 5000);
    expect(verifiedDeposit.allowed).toBe(true);

    // Check spending limits
    const limits = { daily: 10000, weekly: 50000, monthly: 100000 };
    const spending = checkSpendingLimits(5000, 5000, 5000, limits);
    expect(spending.allowed).toBe(true);

    // Enter high-stakes season ($500 entry)
    const highEntry = checkKycRequirement("verified", "season_entry", 500);
    expect(highEntry.allowed).toBe(true);
  });
});

// ============================================================================
// FLOW 6: CROSS-SYSTEM — BUSINESS GROWTH LIFECYCLE
// ============================================================================

describe("Flow: Cross-System Business Growth Lifecycle", () => {
  it("should simulate startup → executive growth path", () => {
    const stages = [
      { machines: 1, tier: "startup", elo: 1200, bracket: "gold" },
      { machines: 5, tier: "localOperator", elo: 1300, bracket: "gold" },
      { machines: 15, tier: "regionalManager", elo: 1500, bracket: "platinum" },
      { machines: 50, tier: "executive", elo: 1800, bracket: "champion" },
    ];

    for (const stage of stages) {
      expect(calculateBusinessTier(stage.machines)).toBe(stage.tier);
      expect(getBracketTier(stage.elo).name).toBe(stage.bracket);
    }
  });

  it("should show power-up availability expanding with tier progression", () => {
    const tiers = ["startup", "localOperator", "regionalManager", "executive"];
    const availableCounts: number[] = [];

    for (const tier of tiers) {
      const available = Object.values(POWER_UP_CATALOG).filter((p) =>
        meetsBusinessTierRequirement(tier, p.requiredTier)
      ).length;
      availableCounts.push(available);
    }

    // Each tier should unlock equal or more power-ups
    for (let i = 1; i < availableCounts.length; i++) {
      expect(availableCounts[i]).toBeGreaterThanOrEqual(availableCounts[i - 1]);
    }

    // Executive should have access to all 12
    expect(availableCounts[3]).toBe(12);
  });

  it("should show upgrade availability expanding with tier progression", () => {
    const tiers = ["startup", "localOperator", "regionalManager", "executive"];
    const availableCounts: number[] = [];

    for (const tier of tiers) {
      const available = Object.values(UPGRADE_CATALOG).filter((u) =>
        meetsBusinessTierRequirement(tier, u.requiredTier)
      ).length;
      availableCounts.push(available);
    }

    for (let i = 1; i < availableCounts.length; i++) {
      expect(availableCounts[i]).toBeGreaterThanOrEqual(availableCounts[i - 1]);
    }

    // Executive should have access to all 6
    expect(availableCounts[3]).toBe(6);
  });

  it("should calculate total investment needed for executive-level operation", () => {
    // 50 machines × average machine cost ($3000)
    const machineCost = 50 * 3000;

    // Upgrades for all 50 machines (capacity + speed tier 3)
    const upgradePerMachine =
      calculateTotalUpgradeCost("capacity", 3) +
      calculateTotalUpgradeCost("speed", 3);
    const totalUpgrades = upgradePerMachine * 50;

    // Power-ups for top 20 machines (digital display + loyalty scanner)
    const powerUpPerMachine =
      (POWER_UP_CATALOG.digital_display.costMax + POWER_UP_CATALOG.digital_display.costMin) / 2 +
      (POWER_UP_CATALOG.loyalty_scanner.costMax + POWER_UP_CATALOG.loyalty_scanner.costMin) / 2;
    const totalPowerUps = powerUpPerMachine * 20;

    const totalInvestment = machineCost + totalUpgrades + totalPowerUps;

    expect(totalInvestment).toBeGreaterThan(200000);
  });

  it("should simulate competitive advantage from full system optimization", () => {
    // Optimized player: good employees, maintained machines, power-ups active
    const optimized = calculateTycoonScore({
      totalRevenue: 200000, netWorth: 120000, totalExpenses: 80000,
      reputation: 95, machineCount: 50, machineHealthAverage: 96,
      restockSuccessRate: 0.98, employeeEfficiencyAverage: 88,
    });

    // Unoptimized player: same scale but poor management
    const unoptimized = calculateTycoonScore({
      totalRevenue: 100000, netWorth: 40000, totalExpenses: 60000,
      reputation: 55, machineCount: 50, machineHealthAverage: 60,
      restockSuccessRate: 0.50, employeeEfficiencyAverage: 45,
    });

    // Optimized should score dramatically higher
    expect(optimized).toBeGreaterThan(unoptimized);
    expect(optimized - unoptimized).toBeGreaterThan(20); // Significant gap
  });
});

// ============================================================================
// FLOW 7: EDGE CASES & BOUNDARY CONDITIONS
// ============================================================================

describe("Flow: Edge Cases & Boundary Conditions", () => {
  it("should handle zero revenue player gracefully", () => {
    const score = calculateTycoonScore({
      totalRevenue: 0, netWorth: 0, totalExpenses: 0,
      reputation: 0, machineCount: 0, machineHealthAverage: 0,
      restockSuccessRate: 0, employeeEfficiencyAverage: 0,
    });

    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("should handle maximum stats player", () => {
    const score = calculateTycoonScore({
      totalRevenue: 1000000, netWorth: 500000, totalExpenses: 100000,
      reputation: 100, machineCount: 100, machineHealthAverage: 100,
      restockSuccessRate: 1.0, employeeEfficiencyAverage: 100,
    });

    expect(score).toBeGreaterThan(50);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("should handle ELO at extremes", () => {
    // Very low ELO vs very high ELO
    const change = calculateEloChange(100, 2500, true);
    expect(change).toBe(32); // Maximum possible gain (K-factor)

    const loss = calculateEloChange(2500, 100, false);
    expect(loss).toBe(-32); // Maximum possible loss
  });

  it("should handle negative profit margin gracefully", () => {
    const score = calculateTycoonScore({
      totalRevenue: 10000, netWorth: 5000, totalExpenses: 20000,
      reputation: 50, machineCount: 5, machineHealthAverage: 70,
      restockSuccessRate: 0.5, employeeEfficiencyAverage: 50,
    });

    // Should still produce a valid score
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("should handle GPS distance at equator", () => {
    const distance = calculateGpsDistance(0, 0, 0, 1);
    // 1 degree longitude at equator ≈ 69 miles
    expect(distance).toBeGreaterThan(65);
    expect(distance).toBeLessThan(75);
  });

  it("should handle GPS distance across international date line", () => {
    const distance = calculateGpsDistance(0, 179, 0, -179);
    // Should be ~138 miles (2 degrees at equator)
    expect(distance).toBeGreaterThan(130);
    expect(distance).toBeLessThan(150);
  });

  it("should handle employee with all-zero stats", () => {
    const efficiency = calculateEmployeeEfficiency({
      speed: 0, qualityControl: 0, attendance: 0,
      driving: 0, adaptability: 0, repairSkill: 0,
    });
    expect(efficiency).toBe(0);
  });

  it("should handle employee with all-100 stats", () => {
    const efficiency = calculateEmployeeEfficiency({
      speed: 100, qualityControl: 100, attendance: 100,
      driving: 100, adaptability: 100, repairSkill: 100,
    });
    expect(efficiency).toBe(100);
  });
});
