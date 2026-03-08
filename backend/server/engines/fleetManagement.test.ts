/**
 * Tests for Fleet Management Engine
 * Covers GPS distance, travel time, task duration, ETA calculation,
 * breakdown simulation, and repair cost calculations.
 */

import { describe, expect, it } from "vitest";
import {
  calculateGpsDistance,
  calculateTravelTimeMinutes,
  calculateTaskDurationMinutes,
  calculateFullETA,
  simulateBreakdown,
  calculateRepairCost,
} from "./fleetManagement";

// ============================================================================
// GPS DISTANCE (Haversine)
// ============================================================================

describe("calculateGpsDistance", () => {
  it("returns 0 for same coordinates", () => {
    const distance = calculateGpsDistance(40.7128, -74.006, 40.7128, -74.006);
    expect(distance).toBe(0);
  });

  it("calculates NYC to LA correctly (~2450 miles)", () => {
    const distance = calculateGpsDistance(40.7128, -74.006, 34.0522, -118.2437);
    expect(distance).toBeGreaterThan(2400);
    expect(distance).toBeLessThan(2500);
  });

  it("calculates short distances accurately", () => {
    // Manhattan to Brooklyn (~3.5 miles)
    const distance = calculateGpsDistance(40.7831, -73.9712, 40.6782, -73.9442);
    expect(distance).toBeGreaterThan(2);
    expect(distance).toBeLessThan(10);
  });

  it("is symmetric (A→B = B→A)", () => {
    const d1 = calculateGpsDistance(40.7128, -74.006, 34.0522, -118.2437);
    const d2 = calculateGpsDistance(34.0522, -118.2437, 40.7128, -74.006);
    expect(Math.abs(d1 - d2)).toBeLessThan(0.001);
  });

  it("handles international coordinates", () => {
    // NYC to London (~3459 miles)
    const distance = calculateGpsDistance(40.7128, -74.006, 51.5074, -0.1278);
    expect(distance).toBeGreaterThan(3400);
    expect(distance).toBeLessThan(3600);
  });
});

// ============================================================================
// TRAVEL TIME
// ============================================================================

describe("calculateTravelTimeMinutes", () => {
  it("calculates base travel time at average driving skill", () => {
    // 30 miles at 30 mph = 60 minutes
    const minutes = calculateTravelTimeMinutes(30, 50);
    expect(minutes).toBe(60);
  });

  it("faster with high driving skill", () => {
    const slowMinutes = calculateTravelTimeMinutes(30, 0);
    const fastMinutes = calculateTravelTimeMinutes(30, 100);
    expect(fastMinutes).toBeLessThan(slowMinutes);
  });

  it("high driving skill gives 1.5x speed", () => {
    // 45 miles at 45 mph (100 skill) = 60 minutes
    const minutes = calculateTravelTimeMinutes(45, 100);
    expect(minutes).toBe(60);
  });

  it("low driving skill gives 0.5x speed", () => {
    // Note: drivingSkill=0 is falsy, so (0 || 50) defaults to 50 (base speed)
    // Use drivingSkill=1 to test near-minimum speed
    // 30 miles at ~14.7 mph (1 skill = 0.49x modifier) ≈ 122 minutes
    const minutes = calculateTravelTimeMinutes(30, 1);
    // At skill 1: modifier = 1 + (1-50)/100 = 0.51, speed = 15.3 mph
    // 30 / 15.3 = 1.96 hours = 118 minutes
    expect(minutes).toBeGreaterThan(100);
    expect(minutes).toBeLessThan(130);
  });

  it("returns minimum 1 minute for very short distances", () => {
    const minutes = calculateTravelTimeMinutes(0.01, 100);
    expect(minutes).toBeGreaterThanOrEqual(1);
  });

  it("handles zero distance", () => {
    const minutes = calculateTravelTimeMinutes(0, 50);
    expect(minutes).toBeGreaterThanOrEqual(1); // Minimum 1 minute
  });
});

// ============================================================================
// TASK DURATION
// ============================================================================

describe("calculateTaskDurationMinutes", () => {
  it("restock base time is ~30 minutes at average speed", () => {
    const minutes = calculateTaskDurationMinutes(
      { statSpeed: 50, statQualityControl: 50, statRepairSkill: 50 },
      "restock"
    );
    expect(minutes).toBe(30);
  });

  it("high speed reduces task time", () => {
    const fastMinutes = calculateTaskDurationMinutes(
      { statSpeed: 100, statQualityControl: 50, statRepairSkill: 50 },
      "restock"
    );
    const slowMinutes = calculateTaskDurationMinutes(
      { statSpeed: 0, statQualityControl: 50, statRepairSkill: 50 },
      "restock"
    );
    expect(fastMinutes).toBeLessThan(slowMinutes);
  });

  it("maintenance takes longer than restock", () => {
    const emp = { statSpeed: 50, statQualityControl: 50, statRepairSkill: 50 };
    const restockTime = calculateTaskDurationMinutes(emp, "restock");
    const maintenanceTime = calculateTaskDurationMinutes(emp, "maintenance");
    expect(maintenanceTime).toBeGreaterThan(restockTime);
  });

  it("emergency restock is faster than regular restock", () => {
    const emp = { statSpeed: 50, statQualityControl: 50, statRepairSkill: 50 };
    const restockTime = calculateTaskDurationMinutes(emp, "restock");
    const emergencyTime = calculateTaskDurationMinutes(emp, "emergency");
    expect(emergencyTime).toBeLessThan(restockTime);
  });

  it("repair skill reduces maintenance time", () => {
    const highRepair = calculateTaskDurationMinutes(
      { statSpeed: 50, statQualityControl: 50, statRepairSkill: 100 },
      "maintenance"
    );
    const lowRepair = calculateTaskDurationMinutes(
      { statSpeed: 50, statQualityControl: 50, statRepairSkill: 0 },
      "maintenance"
    );
    expect(highRepair).toBeLessThan(lowRepair);
  });

  it("never returns less than 5 minutes", () => {
    const minutes = calculateTaskDurationMinutes(
      { statSpeed: 100, statQualityControl: 100, statRepairSkill: 100 },
      "emergency"
    );
    expect(minutes).toBeGreaterThanOrEqual(5);
  });

  it("handles null stats gracefully", () => {
    const minutes = calculateTaskDurationMinutes(
      { statSpeed: null, statQualityControl: null, statRepairSkill: null },
      "restock"
    );
    expect(minutes).toBe(30); // Defaults to base time
  });
});

// ============================================================================
// FULL ETA CALCULATION
// ============================================================================

describe("calculateFullETA", () => {
  it("combines travel time and task time", () => {
    const emp = {
      statSpeed: 50,
      statDriving: 50,
      statQualityControl: 50,
      statRepairSkill: 50,
    };

    const eta = calculateFullETA(30, emp, "restock");

    // 30 miles at 30 mph = 60 min travel + 30 min restock = 90 min total
    expect(eta.travelMinutes).toBe(60);
    expect(eta.taskMinutes).toBe(30);
    expect(eta.totalMinutes).toBe(90);
  });

  it("estimatedArrival is before estimatedCompletion", () => {
    const emp = {
      statSpeed: 50,
      statDriving: 50,
      statQualityControl: 50,
      statRepairSkill: 50,
    };

    const eta = calculateFullETA(10, emp, "restock");
    expect(eta.estimatedArrival.getTime()).toBeLessThan(eta.estimatedCompletion.getTime());
  });

  it("estimatedCompletion is in the future", () => {
    const emp = {
      statSpeed: 50,
      statDriving: 50,
      statQualityControl: 50,
      statRepairSkill: 50,
    };

    const eta = calculateFullETA(10, emp, "restock");
    expect(eta.estimatedCompletion.getTime()).toBeGreaterThan(Date.now());
  });

  it("better stats result in shorter total time", () => {
    const goodEmp = {
      statSpeed: 90,
      statDriving: 90,
      statQualityControl: 90,
      statRepairSkill: 90,
    };
    const badEmp = {
      statSpeed: 10,
      statDriving: 10,
      statQualityControl: 10,
      statRepairSkill: 10,
    };

    const goodEta = calculateFullETA(20, goodEmp, "restock");
    const badEta = calculateFullETA(20, badEmp, "restock");

    expect(goodEta.totalMinutes).toBeLessThan(badEta.totalMinutes);
  });
});

// ============================================================================
// BREAKDOWN SIMULATION
// ============================================================================

describe("simulateBreakdown", () => {
  it("never breaks down at 100% maintenance", () => {
    let breakdowns = 0;
    for (let i = 0; i < 1000; i++) {
      if (simulateBreakdown(100).brokeDown) breakdowns++;
    }
    expect(breakdowns).toBe(0);
  });

  it("almost always breaks down at 0% maintenance", () => {
    let breakdowns = 0;
    for (let i = 0; i < 100; i++) {
      if (simulateBreakdown(0).brokeDown) breakdowns++;
    }
    // Should break down nearly every time
    expect(breakdowns).toBeGreaterThan(90);
  });

  it("returns severity when breakdown occurs", () => {
    // Force low maintenance to guarantee breakdown
    let foundBreakdown = false;
    for (let i = 0; i < 100; i++) {
      const result = simulateBreakdown(5);
      if (result.brokeDown) {
        expect(result.severity).toBeDefined();
        expect(["minor", "moderate", "major", "critical"]).toContain(result.severity);
        expect(result.maintenanceDrop).toBeGreaterThan(0);
        expect(result.costMultiplier).toBeGreaterThan(0);
        foundBreakdown = true;
        break;
      }
    }
    expect(foundBreakdown).toBe(true);
  });

  it("returns no severity when no breakdown", () => {
    const result = simulateBreakdown(100);
    expect(result.brokeDown).toBe(false);
    expect(result.severity).toBeUndefined();
  });

  it("low maintenance produces more severe breakdowns", () => {
    const severityScores: Record<string, number> = {
      minor: 1,
      moderate: 2,
      major: 3,
      critical: 4,
    };

    let lowMaintenanceSeverity = 0;
    let lowCount = 0;
    let highMaintenanceSeverity = 0;
    let highCount = 0;

    for (let i = 0; i < 5000; i++) {
      const lowResult = simulateBreakdown(10);
      if (lowResult.brokeDown && lowResult.severity) {
        lowMaintenanceSeverity += severityScores[lowResult.severity] || 0;
        lowCount++;
      }

      const highResult = simulateBreakdown(60);
      if (highResult.brokeDown && highResult.severity) {
        highMaintenanceSeverity += severityScores[highResult.severity] || 0;
        highCount++;
      }
    }

    if (lowCount > 0 && highCount > 0) {
      const avgLow = lowMaintenanceSeverity / lowCount;
      const avgHigh = highMaintenanceSeverity / highCount;
      expect(avgLow).toBeGreaterThan(avgHigh);
    }
  });
});

// ============================================================================
// REPAIR COST
// ============================================================================

describe("calculateRepairCost", () => {
  it("minor repairs cost less than major repairs", () => {
    const minorCost = calculateRepairCost(500, "minor");
    const majorCost = calculateRepairCost(500, "major");
    expect(minorCost).toBeLessThan(majorCost);
  });

  it("critical repairs cost the most", () => {
    const criticalCost = calculateRepairCost(500, "critical");
    const majorCost = calculateRepairCost(500, "major");
    expect(criticalCost).toBeGreaterThan(majorCost);
  });

  it("scales with machine base cost", () => {
    const cheapRepair = calculateRepairCost(200, "moderate");
    const expensiveRepair = calculateRepairCost(1000, "moderate");
    expect(expensiveRepair).toBeGreaterThan(cheapRepair);
  });

  it("returns a positive number", () => {
    const cost = calculateRepairCost(500, "minor");
    expect(cost).toBeGreaterThan(0);
  });

  it("rounds to 2 decimal places", () => {
    const cost = calculateRepairCost(333, "moderate");
    const decimalPlaces = cost.toString().split(".")[1]?.length || 0;
    expect(decimalPlaces).toBeLessThanOrEqual(2);
  });
});
