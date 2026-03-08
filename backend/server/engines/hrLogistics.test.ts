/**
 * Tests for HR Logistics Engine
 * Covers applicant generation, hiring capacity, task efficiency,
 * attendance simulation, and employee rating calculations.
 */

import { describe, expect, it } from "vitest";
import {
  generateApplicantPool,
  canHireMore,
  calculateTaskEfficiency,
  calculateOverallRating,
  simulateAttendance,
} from "./hrLogistics";

// ============================================================================
// APPLICANT GENERATION
// ============================================================================

describe("generateApplicantPool", () => {
  it("generates the correct number of applicants", () => {
    const applicants = generateApplicantPool(1, "startup", 5);
    expect(applicants).toHaveLength(5);
  });

  it("generates applicants with valid stat ranges (0-100)", () => {
    const applicants = generateApplicantPool(1, "startup", 20);

    for (const app of applicants) {
      expect(app.statSpeed).toBeGreaterThanOrEqual(1);
      expect(app.statSpeed).toBeLessThanOrEqual(100);
      expect(app.statQualityControl).toBeGreaterThanOrEqual(1);
      expect(app.statQualityControl).toBeLessThanOrEqual(100);
      expect(app.statAttendance).toBeGreaterThanOrEqual(1);
      expect(app.statAttendance).toBeLessThanOrEqual(100);
      expect(app.statDriving).toBeGreaterThanOrEqual(1);
      expect(app.statDriving).toBeLessThanOrEqual(100);
      expect(app.statAdaptability).toBeGreaterThanOrEqual(1);
      expect(app.statAdaptability).toBeLessThanOrEqual(100);
      expect(app.statRepairSkill).toBeGreaterThanOrEqual(1);
      expect(app.statRepairSkill).toBeLessThanOrEqual(100);
    }
  });

  it("generates applicants with valid wage range", () => {
    const applicants = generateApplicantPool(1, "startup", 20);

    for (const app of applicants) {
      const wage = parseFloat(app.wagePerRestock);
      expect(wage).toBeGreaterThanOrEqual(8);
      expect(wage).toBeLessThanOrEqual(60);
    }
  });

  it("generates unique IDs for each applicant", () => {
    const applicants = generateApplicantPool(1, "startup", 10);
    const ids = applicants.map((a) => a.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(10);
  });

  it("generates names with first and last name", () => {
    const applicants = generateApplicantPool(1, "startup", 10);

    for (const app of applicants) {
      expect(app.name).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/);
    }
  });

  it("higher tier applicants have better average stats", () => {
    // Run multiple times to get statistical significance
    const startupApplicants = generateApplicantPool(1, "startup", 100);
    const executiveApplicants = generateApplicantPool(1, "executive", 100);

    const avgStartup =
      startupApplicants.reduce(
        (sum, a) =>
          sum +
          (a.statSpeed + a.statQualityControl + a.statAttendance + a.statDriving + a.statAdaptability + a.statRepairSkill) / 6,
        0
      ) / startupApplicants.length;

    const avgExecutive =
      executiveApplicants.reduce(
        (sum, a) =>
          sum +
          (a.statSpeed + a.statQualityControl + a.statAttendance + a.statDriving + a.statAdaptability + a.statRepairSkill) / 6,
        0
      ) / executiveApplicants.length;

    // Executive applicants should have meaningfully higher average stats
    expect(avgExecutive).toBeGreaterThan(avgStartup);
  });

  it("assigns correct playerId to all applicants", () => {
    const applicants = generateApplicantPool(42, "startup", 5);
    for (const app of applicants) {
      expect(app.playerId).toBe(42);
    }
  });

  it("capacity cost scales with stat quality (3-8 range)", () => {
    const applicants = generateApplicantPool(1, "startup", 50);
    for (const app of applicants) {
      expect(app.capacityCost).toBeGreaterThanOrEqual(3);
      expect(app.capacityCost).toBeLessThanOrEqual(8);
    }
  });
});

// ============================================================================
// HIRING CAPACITY
// ============================================================================

describe("canHireMore", () => {
  it("allows hiring when under capacity for startup", () => {
    const result = canHireMore(0, "startup");
    expect(result.allowed).toBe(true);
    expect(result.maxCapacity).toBe(3);
    expect(result.current).toBe(0);
  });

  it("blocks hiring when at capacity for startup", () => {
    const result = canHireMore(3, "startup");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("capacity reached");
  });

  it("allows more employees for higher tiers", () => {
    expect(canHireMore(5, "localOperator").allowed).toBe(true);
    expect(canHireMore(5, "startup").allowed).toBe(false);
  });

  it("has correct capacity limits per tier", () => {
    expect(canHireMore(0, "startup").maxCapacity).toBe(3);
    expect(canHireMore(0, "localOperator").maxCapacity).toBe(8);
    expect(canHireMore(0, "regionalManager").maxCapacity).toBe(20);
    expect(canHireMore(0, "executive").maxCapacity).toBe(50);
  });

  it("defaults to startup capacity for unknown tiers", () => {
    const result = canHireMore(0, "unknownTier");
    expect(result.maxCapacity).toBe(3);
  });
});

// ============================================================================
// TASK EFFICIENCY
// ============================================================================

describe("calculateTaskEfficiency", () => {
  const highStatEmployee = {
    statSpeed: 90,
    statQualityControl: 90,
    statAttendance: 90,
    statDriving: 90,
    statAdaptability: 90,
    statRepairSkill: 90,
  };

  const lowStatEmployee = {
    statSpeed: 10,
    statQualityControl: 10,
    statAttendance: 10,
    statDriving: 10,
    statAdaptability: 10,
    statRepairSkill: 10,
  };

  const repairSpecialist = {
    statSpeed: 30,
    statQualityControl: 50,
    statAttendance: 50,
    statDriving: 20,
    statAdaptability: 40,
    statRepairSkill: 95,
  };

  it("returns higher efficiency for high-stat employees", () => {
    const highEff = calculateTaskEfficiency(highStatEmployee, "restock");
    const lowEff = calculateTaskEfficiency(lowStatEmployee, "restock");
    expect(highEff).toBeGreaterThan(lowEff);
  });

  it("weights driving higher for restock tasks", () => {
    const driverEmployee = {
      statSpeed: 50, statQualityControl: 50, statAttendance: 50,
      statDriving: 100, statAdaptability: 50, statRepairSkill: 50,
    };
    const nonDriverEmployee = {
      statSpeed: 50, statQualityControl: 50, statAttendance: 50,
      statDriving: 0, statAdaptability: 50, statRepairSkill: 50,
    };

    const driverEff = calculateTaskEfficiency(driverEmployee, "restock");
    const nonDriverEff = calculateTaskEfficiency(nonDriverEmployee, "restock");
    expect(driverEff).toBeGreaterThan(nonDriverEff);
  });

  it("weights repair skill higher for maintenance tasks", () => {
    const repairEff = calculateTaskEfficiency(repairSpecialist, "maintenance");
    const restockEff = calculateTaskEfficiency(repairSpecialist, "restock");
    // Repair specialist should score higher on maintenance than restock
    expect(repairEff).toBeGreaterThan(restockEff);
  });

  it("handles null stats gracefully (defaults to 50)", () => {
    const nullEmployee = {
      statSpeed: null,
      statQualityControl: null,
      statAttendance: null,
      statDriving: null,
      statAdaptability: null,
      statRepairSkill: null,
    };

    const efficiency = calculateTaskEfficiency(nullEmployee, "restock");
    expect(efficiency).toBe(50); // All stats default to 50
  });

  it("returns value between 0 and 100", () => {
    const efficiency = calculateTaskEfficiency(highStatEmployee, "restock");
    expect(efficiency).toBeGreaterThanOrEqual(0);
    expect(efficiency).toBeLessThanOrEqual(100);
  });

  it("defaults to 50 for unknown task types", () => {
    const efficiency = calculateTaskEfficiency(highStatEmployee, "unknown" as any);
    expect(efficiency).toBe(50);
  });
});

// ============================================================================
// OVERALL RATING
// ============================================================================

describe("calculateOverallRating", () => {
  it("returns average of all stats", () => {
    const employee = {
      statSpeed: 60,
      statQualityControl: 80,
      statAttendance: 70,
      statDriving: 50,
      statAdaptability: 40,
      statRepairSkill: 90,
    };

    const rating = calculateOverallRating(employee);
    const expectedAvg = Math.round((60 + 80 + 70 + 50 + 40 + 90) / 6);
    expect(rating).toBe(expectedAvg);
  });

  it("handles null stats as 0", () => {
    const employee = {
      statSpeed: null,
      statQualityControl: null,
      statAttendance: null,
      statDriving: null,
      statAdaptability: null,
      statRepairSkill: null,
    };

    expect(calculateOverallRating(employee)).toBe(0);
  });

  it("returns 100 for max stats", () => {
    const employee = {
      statSpeed: 100,
      statQualityControl: 100,
      statAttendance: 100,
      statDriving: 100,
      statAdaptability: 100,
      statRepairSkill: 100,
    };

    expect(calculateOverallRating(employee)).toBe(100);
  });
});

// ============================================================================
// ATTENDANCE SIMULATION
// ============================================================================

describe("simulateAttendance", () => {
  it("high attendance stat almost always shows up", () => {
    let showCount = 0;
    const trials = 1000;

    for (let i = 0; i < trials; i++) {
      if (simulateAttendance(100)) showCount++;
    }

    // 100 attendance = 99% show rate, expect >95% in 1000 trials
    expect(showCount / trials).toBeGreaterThan(0.95);
  });

  it("low attendance stat shows up roughly half the time", () => {
    let showCount = 0;
    const trials = 1000;

    for (let i = 0; i < trials; i++) {
      if (simulateAttendance(0)) showCount++;
    }

    // 0 attendance = 50% show rate, expect between 40-60% in 1000 trials
    expect(showCount / trials).toBeGreaterThan(0.35);
    expect(showCount / trials).toBeLessThan(0.65);
  });

  it("returns a boolean", () => {
    const result = simulateAttendance(50);
    expect(typeof result).toBe("boolean");
  });
});
