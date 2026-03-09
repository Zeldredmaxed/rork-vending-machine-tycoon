/**
 * Integration Tests: Core Game Flows
 * ====================================
 * End-to-end tests for player lifecycle, machine operations,
 * inventory management, and business tier progression.
 * Tests verify that multiple engines interact correctly.
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
  calculateETA,
  calculateEmployeeEfficiency,
  simulateBreakdown,
  calculateRepairCost,
  getDemographicDemandMultiplier,
  getFreshnessBonus,
  calculateBusinessTier,
  checkSpendingLimits,
} from "../gameLogic";

// ============================================================================
// FLOW 1: NEW PLAYER ONBOARDING → FIRST MACHINE → FIRST SALE
// ============================================================================

describe("Flow: New Player Onboarding → First Machine → First Sale", () => {
  it("should calculate correct initial tycoon score for a brand-new player", () => {
    const score = calculateTycoonScore({
      totalRevenue: 0,
      netWorth: 0,
      totalExpenses: 0,
      reputation: 50, // Default starting reputation
      machineCount: 0,
      machineHealthAverage: 100,
      restockSuccessRate: 0,
      employeeEfficiencyAverage: 0,
    });

    // New player should have a low but non-zero score (reputation contributes)
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(50);
  });

  it("should assign startup tier for a player with 0 machines", () => {
    expect(calculateBusinessTier(0)).toBe("startup");
  });

  it("should assign startup tier for a player with 1-4 machines", () => {
    expect(calculateBusinessTier(1)).toBe("startup");
    expect(calculateBusinessTier(4)).toBe("startup");
  });

  it("should simulate a player buying first machine and getting initial score", () => {
    // After buying 1 machine at $2000, placing it, and stocking it
    const score = calculateTycoonScore({
      totalRevenue: 0,
      netWorth: 2000,
      totalExpenses: 2000,
      reputation: 50,
      machineCount: 1,
      machineHealthAverage: 100,
      restockSuccessRate: 0,
      employeeEfficiencyAverage: 0,
    });

    // Should have some score from net worth and machine health
    expect(score).toBeGreaterThan(0);
  });

  it("should simulate first day of sales improving score", () => {
    const beforeSales = calculateTycoonScore({
      totalRevenue: 0,
      netWorth: 2000,
      totalExpenses: 2000,
      reputation: 50,
      machineCount: 1,
      machineHealthAverage: 100,
      restockSuccessRate: 0,
      employeeEfficiencyAverage: 0,
    });

    const afterSales = calculateTycoonScore({
      totalRevenue: 500,
      netWorth: 2500,
      totalExpenses: 2000,
      reputation: 55,
      machineCount: 1,
      machineHealthAverage: 95,
      restockSuccessRate: 1.0,
      employeeEfficiencyAverage: 60,
    });

    expect(afterSales).toBeGreaterThan(beforeSales);
  });
});

// ============================================================================
// FLOW 2: BUSINESS TIER PROGRESSION
// ============================================================================

describe("Flow: Business Tier Progression", () => {
  it("should progress through all tiers as machine count grows", () => {
    const progression = [
      { machines: 1, expected: "startup" },
      { machines: 4, expected: "startup" },
      { machines: 5, expected: "localOperator" },
      { machines: 14, expected: "localOperator" },
      { machines: 15, expected: "regionalManager" },
      { machines: 49, expected: "regionalManager" },
      { machines: 50, expected: "executive" },
      { machines: 100, expected: "executive" },
    ];

    for (const step of progression) {
      expect(calculateBusinessTier(step.machines)).toBe(step.expected);
    }
  });

  it("should show score improvement as player scales from 1 to 50 machines", () => {
    const scores: number[] = [];
    const machineSteps = [1, 5, 15, 30, 50];

    for (const count of machineSteps) {
      const revenue = count * 5000;
      const expenses = count * 3000;
      const score = calculateTycoonScore({
        totalRevenue: revenue,
        netWorth: revenue - expenses + count * 2000,
        totalExpenses: expenses,
        reputation: 50 + count,
        machineCount: count,
        machineHealthAverage: 90,
        restockSuccessRate: 0.85,
        employeeEfficiencyAverage: 70,
      });
      scores.push(score);
    }

    // Each step should be higher than the previous
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeGreaterThanOrEqual(scores[i - 1]);
    }
  });
});

// ============================================================================
// FLOW 3: MACHINE HEALTH DEGRADATION → BREAKDOWN → REPAIR
// ============================================================================

describe("Flow: Machine Health Degradation → Breakdown → Repair", () => {
  it("should have low breakdown chance at high maintenance", () => {
    let breakdowns = 0;
    const trials = 1000;
    for (let i = 0; i < trials; i++) {
      if (simulateBreakdown(100)) breakdowns++;
    }
    // At 100% maintenance, breakdown chance should be 0%
    expect(breakdowns).toBe(0);
  });

  it("should have moderate breakdown chance at 50% maintenance", () => {
    let breakdowns = 0;
    const trials = 10000;
    for (let i = 0; i < trials; i++) {
      if (simulateBreakdown(50)) breakdowns++;
    }
    // At 50% maintenance, ~25% chance (0.5^2 = 0.25)
    const rate = breakdowns / trials;
    expect(rate).toBeGreaterThan(0.15);
    expect(rate).toBeLessThan(0.35);
  });

  it("should have very high breakdown chance at 0% maintenance", () => {
    let breakdowns = 0;
    const trials = 10000;
    for (let i = 0; i < trials; i++) {
      if (simulateBreakdown(0)) breakdowns++;
    }
    // At 0% maintenance, ~100% chance
    const rate = breakdowns / trials;
    expect(rate).toBeGreaterThan(0.9);
  });

  it("should calculate escalating repair costs as maintenance drops", () => {
    const baseCost = 200;
    const costs = [
      calculateRepairCost(90, baseCost),
      calculateRepairCost(50, baseCost),
      calculateRepairCost(20, baseCost),
      calculateRepairCost(0, baseCost),
    ];

    // Each should be more expensive
    for (let i = 1; i < costs.length; i++) {
      expect(costs[i]).toBeGreaterThan(costs[i - 1]);
    }

    // At 0% maintenance, cost should be near max (baseCost * 1.5)
    expect(costs[3]).toBeCloseTo(baseCost * 1.5, 0);
  });

  it("should show tycoon score drop when machines break down", () => {
    const healthyScore = calculateTycoonScore({
      totalRevenue: 50000,
      netWorth: 30000,
      totalExpenses: 20000,
      reputation: 80,
      machineCount: 10,
      machineHealthAverage: 95,
      restockSuccessRate: 0.9,
      employeeEfficiencyAverage: 75,
    });

    const brokenScore = calculateTycoonScore({
      totalRevenue: 50000,
      netWorth: 30000,
      totalExpenses: 20000,
      reputation: 60, // Reputation drops from breakdowns
      machineCount: 10,
      machineHealthAverage: 40, // Many machines degraded
      restockSuccessRate: 0.5, // Can't restock broken machines
      employeeEfficiencyAverage: 75,
    });

    expect(brokenScore).toBeLessThan(healthyScore);
  });
});

// ============================================================================
// FLOW 4: EMPLOYEE LIFECYCLE → TASK ASSIGNMENT → EFFICIENCY
// ============================================================================

describe("Flow: Employee Lifecycle → Task Assignment → Efficiency", () => {
  it("should calculate efficiency for a well-rounded employee", () => {
    const efficiency = calculateEmployeeEfficiency({
      speed: 80,
      qualityControl: 85,
      attendance: 90,
      driving: 70,
      adaptability: 75,
      repairSkill: 65,
    });

    expect(efficiency).toBeGreaterThan(70);
    expect(efficiency).toBeLessThanOrEqual(100);
  });

  it("should show quality control has highest weight", () => {
    const highQC = calculateEmployeeEfficiency({
      speed: 50, qualityControl: 100, attendance: 50,
      driving: 50, adaptability: 50, repairSkill: 50,
    });

    const highSpeed = calculateEmployeeEfficiency({
      speed: 100, qualityControl: 50, attendance: 50,
      driving: 50, adaptability: 50, repairSkill: 50,
    });

    // Quality control weight (0.25) > speed weight (0.20)
    expect(highQC).toBeGreaterThan(highSpeed);
  });

  it("should calculate travel time based on distance and driving skill", () => {
    const distance = 10; // miles

    const slowDriver = calculateTravelTime(distance, 20); // Poor driving
    const avgDriver = calculateTravelTime(distance, 50); // Average driving
    const fastDriver = calculateTravelTime(distance, 80); // Good driving

    // Better drivers should be faster
    const slowTotal = slowDriver.minutes * 60 + slowDriver.seconds;
    const avgTotal = avgDriver.minutes * 60 + avgDriver.seconds;
    const fastTotal = fastDriver.minutes * 60 + fastDriver.seconds;

    expect(slowTotal).toBeGreaterThan(avgTotal);
    expect(avgTotal).toBeGreaterThan(fastTotal);
  });

  it("should calculate GPS distance correctly (NYC to LA ~2450 miles)", () => {
    // NYC: 40.7128, -74.0060
    // LA: 34.0522, -118.2437
    const distance = calculateGpsDistance(40.7128, -74.006, 34.0522, -118.2437);
    expect(distance).toBeGreaterThan(2400);
    expect(distance).toBeLessThan(2500);
  });

  it("should calculate GPS distance for short trip (1-2 miles)", () => {
    // Two points ~1 mile apart in Manhattan
    const distance = calculateGpsDistance(40.7580, -73.9855, 40.7484, -73.9856);
    expect(distance).toBeGreaterThan(0.5);
    expect(distance).toBeLessThan(2);
  });

  it("should calculate ETA that includes travel + task time", () => {
    const now = new Date();
    const eta = calculateETA(5, 50, 30); // 5 miles, avg driver, 30 min task

    // ETA should be in the future
    expect(eta.getTime()).toBeGreaterThan(now.getTime());
  });

  it("should show employee efficiency affects tycoon score", () => {
    const lowEfficiency = calculateTycoonScore({
      totalRevenue: 50000, netWorth: 30000, totalExpenses: 20000,
      reputation: 70, machineCount: 10, machineHealthAverage: 80,
      restockSuccessRate: 0.7, employeeEfficiencyAverage: 30,
    });

    const highEfficiency = calculateTycoonScore({
      totalRevenue: 50000, netWorth: 30000, totalExpenses: 20000,
      reputation: 70, machineCount: 10, machineHealthAverage: 80,
      restockSuccessRate: 0.7, employeeEfficiencyAverage: 90,
    });

    expect(highEfficiency).toBeGreaterThan(lowEfficiency);
  });
});

// ============================================================================
// FLOW 5: PRODUCT DEMAND & FRESHNESS LIFECYCLE
// ============================================================================

describe("Flow: Product Demand & Freshness Lifecycle", () => {
  it("should show different demand by demographic", () => {
    // University campus should have high soda demand
    const campusSoda = getDemographicDemandMultiplier("universityCampus", "soda");
    // Downtown business should have low soda demand
    const downtownSoda = getDemographicDemandMultiplier("downtownBusiness", "soda");

    expect(campusSoda).toBeGreaterThan(downtownSoda);
  });

  it("should show healthy products in demand at business districts", () => {
    const businessHealthy = getDemographicDemandMultiplier("downtownBusiness", "healthy");
    const campusHealthy = getDemographicDemandMultiplier("universityCampus", "healthy");

    expect(businessHealthy).toBeGreaterThan(campusHealthy);
  });

  it("should calculate freshness bonus lifecycle", () => {
    const extraFresh = getFreshnessBonus(true, 0);
    const dayOld = getFreshnessBonus(false, 0);
    const twoDaysOld = getFreshnessBonus(false, 2);
    const fourDaysOld = getFreshnessBonus(false, 4);

    expect(extraFresh).toBe(1.15); // 15% premium
    expect(dayOld).toBe(1.1); // 10% premium
    expect(twoDaysOld).toBe(1.0); // No bonus
    expect(fourDaysOld).toBe(0.8); // 20% discount
  });

  it("should show freshness degradation impacts revenue potential", () => {
    const basePrice = 2.50;
    const freshRevenue = basePrice * getFreshnessBonus(true, 0);
    const staleRevenue = basePrice * getFreshnessBonus(false, 5);

    expect(freshRevenue).toBeGreaterThan(staleRevenue);
    expect(freshRevenue / staleRevenue).toBeGreaterThan(1.3); // >30% difference
  });
});
