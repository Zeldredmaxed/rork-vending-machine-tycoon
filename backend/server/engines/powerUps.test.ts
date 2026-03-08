/**
 * Power-Up & Machine Upgrade Engine Tests
 * ========================================
 * Tests for power-up catalog, cost calculations, business tier
 * requirements, upgrade tier progression, stacking rules,
 * malfunction simulation, and aggregated stat calculations.
 */

import { describe, expect, it } from "vitest";
import {
  POWER_UP_CATALOG,
  UPGRADE_CATALOG,
  meetsBusinessTierRequirement,
  calculatePowerUpCost,
  calculateUpgradeCost,
  calculateTotalUpgradeCost,
  getCatalog,
  getUpgradeCatalog,
} from "./powerUps";

// ============================================================================
// POWER-UP CATALOG TESTS
// ============================================================================

describe("Power-Up Catalog", () => {
  it("should have at least 10 power-up definitions", () => {
    const keys = Object.keys(POWER_UP_CATALOG);
    expect(keys.length).toBeGreaterThanOrEqual(10);
  });

  it("should have all required fields for each power-up", () => {
    for (const [key, def] of Object.entries(POWER_UP_CATALOG)) {
      expect(def.name).toBeTruthy();
      expect(def.description).toBeTruthy();
      expect(def.category).toBeTruthy();
      expect(def.costMin).toBeGreaterThan(0);
      expect(def.costMax).toBeGreaterThanOrEqual(def.costMin);
      expect(def.effectDescription).toBeTruthy();
      expect(def.iconName).toBeTruthy();
      expect(["timed", "permanent", "uses"]).toContain(def.durabilityType);
      expect(def.maxPerMachine).toBeGreaterThanOrEqual(1);
      expect(def.requiredTier).toBeTruthy();
    }
  });

  it("should have valid categories", () => {
    const validCategories = ["revenue", "capacity", "maintenance", "speed", "special"];
    for (const def of Object.values(POWER_UP_CATALOG)) {
      expect(validCategories).toContain(def.category);
    }
  });

  it("should have duration for timed power-ups", () => {
    for (const def of Object.values(POWER_UP_CATALOG)) {
      if (def.durabilityType === "timed") {
        expect(def.durationDays).toBeGreaterThan(0);
      }
    }
  });

  it("should have null duration for permanent power-ups", () => {
    for (const def of Object.values(POWER_UP_CATALOG)) {
      if (def.durabilityType === "permanent") {
        expect(def.durationDays).toBeNull();
      }
    }
  });

  it("should have specific power-ups defined", () => {
    expect(POWER_UP_CATALOG.digital_display).toBeDefined();
    expect(POWER_UP_CATALOG.loyalty_scanner).toBeDefined();
    expect(POWER_UP_CATALOG.extra_shelf).toBeDefined();
    expect(POWER_UP_CATALOG.auto_cleaner).toBeDefined();
    expect(POWER_UP_CATALOG.turbo_dispenser).toBeDefined();
    expect(POWER_UP_CATALOG.golden_facade).toBeDefined();
    expect(POWER_UP_CATALOG.lucky_charm).toBeDefined();
    expect(POWER_UP_CATALOG.frost_guard).toBeDefined();
  });

  it("digital_display should be a revenue booster with 15% effect", () => {
    const dd = POWER_UP_CATALOG.digital_display;
    expect(dd.category).toBe("revenue");
    expect(dd.effectValue).toBe(0.15);
    expect(dd.durabilityType).toBe("timed");
    expect(dd.durationDays).toBe(30);
  });

  it("extra_shelf should be a permanent capacity booster", () => {
    const es = POWER_UP_CATALOG.extra_shelf;
    expect(es.category).toBe("capacity");
    expect(es.durabilityType).toBe("permanent");
    expect(es.effectValue).toBe(25);
    expect(es.maxPerMachine).toBe(3);
  });

  it("golden_facade should be the most expensive power-up", () => {
    const gf = POWER_UP_CATALOG.golden_facade;
    expect(gf.costMin).toBeGreaterThanOrEqual(1000);
    expect(gf.requiredTier).toBe("regionalManager");
  });

  it("turbo_dispenser should have high malfunction chance", () => {
    const td = POWER_UP_CATALOG.turbo_dispenser;
    expect(td.malfunctionChancePercent).toBeGreaterThanOrEqual(5);
    expect(td.repairCostPercent).toBeGreaterThan(0);
  });
});

// ============================================================================
// UPGRADE CATALOG TESTS
// ============================================================================

describe("Upgrade Catalog", () => {
  it("should have 6 upgrade types", () => {
    const keys = Object.keys(UPGRADE_CATALOG);
    expect(keys.length).toBe(6);
  });

  it("should have all required upgrade types", () => {
    expect(UPGRADE_CATALOG.capacity).toBeDefined();
    expect(UPGRADE_CATALOG.speed).toBeDefined();
    expect(UPGRADE_CATALOG.reliability).toBeDefined();
    expect(UPGRADE_CATALOG.energy_efficiency).toBeDefined();
    expect(UPGRADE_CATALOG.security).toBeDefined();
    expect(UPGRADE_CATALOG.temperature_control).toBeDefined();
  });

  it("should have valid fields for each upgrade", () => {
    for (const def of Object.values(UPGRADE_CATALOG)) {
      expect(def.name).toBeTruthy();
      expect(def.description).toBeTruthy();
      expect(def.maxTier).toBeGreaterThanOrEqual(3);
      expect(def.maxTier).toBeLessThanOrEqual(5);
      expect(def.baseCost).toBeGreaterThan(0);
      expect(def.costMultiplier).toBeGreaterThan(1);
      expect(def.bonusPerTier).toBeGreaterThan(0);
      expect(def.statAffected).toBeTruthy();
      expect(def.requiredTier).toBeTruthy();
    }
  });

  it("security should have max tier 3", () => {
    expect(UPGRADE_CATALOG.security.maxTier).toBe(3);
  });

  it("temperature_control should have max tier 4", () => {
    expect(UPGRADE_CATALOG.temperature_control.maxTier).toBe(4);
  });

  it("capacity should give +20 per tier", () => {
    expect(UPGRADE_CATALOG.capacity.bonusPerTier).toBe(20);
  });
});

// ============================================================================
// BUSINESS TIER REQUIREMENT TESTS
// ============================================================================

describe("Business Tier Requirements", () => {
  it("startup should meet startup requirement", () => {
    expect(meetsBusinessTierRequirement("startup", "startup")).toBe(true);
  });

  it("localOperator should meet startup requirement", () => {
    expect(meetsBusinessTierRequirement("localOperator", "startup")).toBe(true);
  });

  it("regionalManager should meet localOperator requirement", () => {
    expect(meetsBusinessTierRequirement("regionalManager", "localOperator")).toBe(true);
  });

  it("executive should meet all requirements", () => {
    expect(meetsBusinessTierRequirement("executive", "startup")).toBe(true);
    expect(meetsBusinessTierRequirement("executive", "localOperator")).toBe(true);
    expect(meetsBusinessTierRequirement("executive", "regionalManager")).toBe(true);
    expect(meetsBusinessTierRequirement("executive", "executive")).toBe(true);
  });

  it("startup should NOT meet localOperator requirement", () => {
    expect(meetsBusinessTierRequirement("startup", "localOperator")).toBe(false);
  });

  it("startup should NOT meet regionalManager requirement", () => {
    expect(meetsBusinessTierRequirement("startup", "regionalManager")).toBe(false);
  });

  it("localOperator should NOT meet regionalManager requirement", () => {
    expect(meetsBusinessTierRequirement("localOperator", "regionalManager")).toBe(false);
  });

  it("unknown tier should return false", () => {
    expect(meetsBusinessTierRequirement("unknown", "startup")).toBe(false);
    expect(meetsBusinessTierRequirement("startup", "unknown")).toBe(false);
  });
});

// ============================================================================
// POWER-UP COST CALCULATION TESTS
// ============================================================================

describe("Power-Up Cost Calculations", () => {
  it("should calculate cost within min/max range", () => {
    for (let i = 0; i < 50; i++) {
      const cost = calculatePowerUpCost("digital_display");
      const def = POWER_UP_CATALOG.digital_display;
      expect(cost).toBeGreaterThanOrEqual(def.costMin);
      expect(cost).toBeLessThanOrEqual(def.costMax);
    }
  });

  it("should calculate cost for all power-ups", () => {
    for (const key of Object.keys(POWER_UP_CATALOG)) {
      const cost = calculatePowerUpCost(key);
      expect(cost).toBeGreaterThan(0);
    }
  });

  it("should throw for unknown power-up", () => {
    expect(() => calculatePowerUpCost("nonexistent")).toThrow("Unknown power-up");
  });

  it("golden_facade should cost between 1000 and 1500", () => {
    for (let i = 0; i < 20; i++) {
      const cost = calculatePowerUpCost("golden_facade");
      expect(cost).toBeGreaterThanOrEqual(1000);
      expect(cost).toBeLessThanOrEqual(1500);
    }
  });
});

// ============================================================================
// UPGRADE COST CALCULATION TESTS
// ============================================================================

describe("Upgrade Cost Calculations", () => {
  it("should calculate tier 1 cost equal to base cost", () => {
    for (const def of Object.values(UPGRADE_CATALOG)) {
      const cost = calculateUpgradeCost(def.type, 1);
      expect(cost).toBe(def.baseCost);
    }
  });

  it("should scale cost exponentially per tier", () => {
    const type = "capacity";
    const def = UPGRADE_CATALOG[type];
    const tier1 = calculateUpgradeCost(type, 1);
    const tier2 = calculateUpgradeCost(type, 2);
    const tier3 = calculateUpgradeCost(type, 3);

    expect(tier2).toBe(Math.round(def.baseCost * def.costMultiplier));
    expect(tier3).toBe(Math.round(def.baseCost * Math.pow(def.costMultiplier, 2)));
    expect(tier2).toBeGreaterThan(tier1);
    expect(tier3).toBeGreaterThan(tier2);
  });

  it("should throw for invalid tier", () => {
    expect(() => calculateUpgradeCost("capacity", 0)).toThrow("Invalid tier");
    expect(() => calculateUpgradeCost("capacity", 6)).toThrow("Invalid tier");
    expect(() => calculateUpgradeCost("security", 4)).toThrow("Invalid tier");
  });

  it("should throw for unknown upgrade type", () => {
    expect(() => calculateUpgradeCost("nonexistent", 1)).toThrow("Unknown upgrade type");
  });

  it("should calculate total cumulative cost correctly", () => {
    const type = "speed";
    const total3 = calculateTotalUpgradeCost(type, 3);
    const t1 = calculateUpgradeCost(type, 1);
    const t2 = calculateUpgradeCost(type, 2);
    const t3 = calculateUpgradeCost(type, 3);
    expect(total3).toBe(t1 + t2 + t3);
  });

  it("total cost should increase with each tier", () => {
    const type = "reliability";
    const total1 = calculateTotalUpgradeCost(type, 1);
    const total2 = calculateTotalUpgradeCost(type, 2);
    const total3 = calculateTotalUpgradeCost(type, 3);
    expect(total2).toBeGreaterThan(total1);
    expect(total3).toBeGreaterThan(total2);
  });

  it("capacity tier 5 total cost should be significant", () => {
    const total = calculateTotalUpgradeCost("capacity", 5);
    expect(total).toBeGreaterThan(2000);
  });

  it("security max tier 3 total cost", () => {
    const total = calculateTotalUpgradeCost("security", 3);
    const t1 = 400;
    const t2 = Math.round(400 * 2.2);
    const t3 = Math.round(400 * Math.pow(2.2, 2));
    expect(total).toBe(t1 + t2 + t3);
  });
});

// ============================================================================
// CATALOG QUERY TESTS
// ============================================================================

describe("Catalog Queries", () => {
  it("getCatalog should return all power-ups with availability", () => {
    const catalog = getCatalog("startup");
    expect(catalog.length).toBe(Object.keys(POWER_UP_CATALOG).length);
    for (const item of catalog) {
      expect(item.key).toBeTruthy();
      expect(item.name).toBeTruthy();
      expect(typeof item.available).toBe("boolean");
    }
  });

  it("startup tier should have some unavailable power-ups", () => {
    const catalog = getCatalog("startup");
    const unavailable = catalog.filter((c) => !c.available);
    expect(unavailable.length).toBeGreaterThan(0);
  });

  it("executive tier should have all power-ups available", () => {
    const catalog = getCatalog("executive");
    const unavailable = catalog.filter((c) => !c.available);
    expect(unavailable.length).toBe(0);
  });

  it("golden_facade should be unavailable for startup tier", () => {
    const catalog = getCatalog("startup");
    const gf = catalog.find((c) => c.key === "golden_facade");
    expect(gf).toBeDefined();
    expect(gf!.available).toBe(false);
  });

  it("golden_facade should be available for regionalManager tier", () => {
    const catalog = getCatalog("regionalManager");
    const gf = catalog.find((c) => c.key === "golden_facade");
    expect(gf).toBeDefined();
    expect(gf!.available).toBe(true);
  });

  it("getUpgradeCatalog should return all upgrades with availability", () => {
    const catalog = getUpgradeCatalog("startup");
    expect(catalog.length).toBe(Object.keys(UPGRADE_CATALOG).length);
    for (const item of catalog) {
      expect(item.key).toBeTruthy();
      expect(item.name).toBeTruthy();
      expect(typeof item.available).toBe("boolean");
    }
  });

  it("startup should not have security upgrade available", () => {
    const catalog = getUpgradeCatalog("startup");
    const sec = catalog.find((c) => c.key === "security");
    expect(sec).toBeDefined();
    expect(sec!.available).toBe(false);
  });

  it("regionalManager should have security upgrade available", () => {
    const catalog = getUpgradeCatalog("regionalManager");
    const sec = catalog.find((c) => c.key === "security");
    expect(sec).toBeDefined();
    expect(sec!.available).toBe(true);
  });
});

// ============================================================================
// POWER-UP STACKING RULES TESTS
// ============================================================================

describe("Power-Up Stacking Rules", () => {
  it("most power-ups should have maxPerMachine of 1", () => {
    const singleStack = Object.values(POWER_UP_CATALOG).filter(
      (d) => d.maxPerMachine === 1
    );
    expect(singleStack.length).toBeGreaterThan(5);
  });

  it("extra_shelf should allow stacking up to 3", () => {
    expect(POWER_UP_CATALOG.extra_shelf.maxPerMachine).toBe(3);
  });

  it("compact_stacker should allow stacking up to 2", () => {
    expect(POWER_UP_CATALOG.compact_stacker.maxPerMachine).toBe(2);
  });
});

// ============================================================================
// MALFUNCTION CHANCE TESTS
// ============================================================================

describe("Malfunction Mechanics", () => {
  it("premium_branding should have 0% malfunction chance", () => {
    expect(POWER_UP_CATALOG.premium_branding.malfunctionChancePercent).toBe(0);
  });

  it("turbo_dispenser should have highest malfunction chance", () => {
    const td = POWER_UP_CATALOG.turbo_dispenser;
    const maxChance = Math.max(
      ...Object.values(POWER_UP_CATALOG).map((d) => d.malfunctionChancePercent)
    );
    expect(td.malfunctionChancePercent).toBe(maxChance);
  });

  it("permanent power-ups with 0 malfunction should have 0 repair cost", () => {
    for (const def of Object.values(POWER_UP_CATALOG)) {
      if (def.malfunctionChancePercent === 0) {
        expect(def.repairCostPercent).toBe(0);
      }
    }
  });

  it("power-ups with malfunction chance should have repair cost", () => {
    for (const def of Object.values(POWER_UP_CATALOG)) {
      if (def.malfunctionChancePercent > 0) {
        expect(def.repairCostPercent).toBeGreaterThan(0);
      }
    }
  });
});

// ============================================================================
// UPGRADE TIER PROGRESSION TESTS
// ============================================================================

describe("Upgrade Tier Progression", () => {
  it("stat bonus should increase linearly with tier", () => {
    const def = UPGRADE_CATALOG.capacity;
    for (let tier = 1; tier <= def.maxTier; tier++) {
      const expectedBonus = tier * def.bonusPerTier;
      expect(expectedBonus).toBe(tier * 20);
    }
  });

  it("max tier 5 capacity should give +100 bonus", () => {
    const def = UPGRADE_CATALOG.capacity;
    expect(def.maxTier * def.bonusPerTier).toBe(100);
  });

  it("max tier 5 speed should give +50% bonus", () => {
    const def = UPGRADE_CATALOG.speed;
    expect(def.maxTier * def.bonusPerTier).toBe(50);
  });

  it("max tier 5 reliability should give +40% breakdown reduction", () => {
    const def = UPGRADE_CATALOG.reliability;
    expect(def.maxTier * def.bonusPerTier).toBe(40);
  });

  it("max tier 3 security should give +45% vandalism reduction", () => {
    const def = UPGRADE_CATALOG.security;
    expect(def.maxTier * def.bonusPerTier).toBe(45);
  });

  it("cost should roughly double or more each tier", () => {
    for (const def of Object.values(UPGRADE_CATALOG)) {
      const t1 = calculateUpgradeCost(def.type, 1);
      const t2 = calculateUpgradeCost(def.type, 2);
      expect(t2 / t1).toBeGreaterThanOrEqual(1.5);
    }
  });
});

// ============================================================================
// EFFECT VALUE VALIDATION TESTS
// ============================================================================

describe("Effect Value Validation", () => {
  it("revenue power-ups should have positive effect values", () => {
    for (const def of Object.values(POWER_UP_CATALOG)) {
      if (def.category === "revenue") {
        expect(def.effectValue).toBeGreaterThan(0);
        expect(def.effectValue).toBeLessThanOrEqual(0.5);
      }
    }
  });

  it("capacity power-ups should have integer effect values", () => {
    for (const def of Object.values(POWER_UP_CATALOG)) {
      if (def.category === "capacity") {
        expect(Number.isInteger(def.effectValue)).toBe(true);
        expect(def.effectValue).toBeGreaterThan(0);
      }
    }
  });

  it("maintenance power-ups should reduce degradation", () => {
    for (const def of Object.values(POWER_UP_CATALOG)) {
      if (def.category === "maintenance") {
        expect(def.effectValue).toBeGreaterThan(0);
        expect(def.effectValue).toBeLessThanOrEqual(1);
      }
    }
  });

  it("speed power-ups should have reasonable speed bonuses", () => {
    for (const def of Object.values(POWER_UP_CATALOG)) {
      if (def.category === "speed") {
        expect(def.effectValue).toBeGreaterThan(0);
        expect(def.effectValue).toBeLessThanOrEqual(0.5);
      }
    }
  });
});

// ============================================================================
// COST BALANCE TESTS
// ============================================================================

describe("Cost Balance", () => {
  it("special category should be more expensive than revenue", () => {
    const specialAvg =
      Object.values(POWER_UP_CATALOG)
        .filter((d) => d.category === "special")
        .reduce((sum, d) => sum + (d.costMin + d.costMax) / 2, 0) /
      Object.values(POWER_UP_CATALOG).filter((d) => d.category === "special").length;

    const revenueAvg =
      Object.values(POWER_UP_CATALOG)
        .filter((d) => d.category === "revenue")
        .reduce((sum, d) => sum + (d.costMin + d.costMax) / 2, 0) /
      Object.values(POWER_UP_CATALOG).filter((d) => d.category === "revenue").length;

    expect(specialAvg).toBeGreaterThan(revenueAvg);
  });

  it("upgrade costs should be affordable at tier 1 but expensive at max tier", () => {
    for (const def of Object.values(UPGRADE_CATALOG)) {
      const tier1Cost = calculateUpgradeCost(def.type, 1);
      const maxTierCost = calculateUpgradeCost(def.type, def.maxTier);
      expect(tier1Cost).toBeLessThan(1000);
      expect(maxTierCost).toBeGreaterThan(tier1Cost * 2);
    }
  });

  it("total upgrade investment should be substantial at max tier", () => {
    for (const def of Object.values(UPGRADE_CATALOG)) {
      const total = calculateTotalUpgradeCost(def.type, def.maxTier);
      expect(total).toBeGreaterThan(1000);
    }
  });
});

// ============================================================================
// DURATION & EXPIRATION TESTS
// ============================================================================

describe("Duration & Expiration", () => {
  it("timed power-ups should have durations between 7 and 90 days", () => {
    for (const def of Object.values(POWER_UP_CATALOG)) {
      if (def.durabilityType === "timed" && def.durationDays !== null) {
        expect(def.durationDays).toBeGreaterThanOrEqual(7);
        expect(def.durationDays).toBeLessThanOrEqual(90);
      }
    }
  });

  it("lucky_charm should have shortest duration (7 days)", () => {
    expect(POWER_UP_CATALOG.lucky_charm.durationDays).toBe(7);
  });

  it("premium_branding should have longest duration (90 days)", () => {
    expect(POWER_UP_CATALOG.premium_branding.durationDays).toBe(90);
  });
});

// ============================================================================
// ICON VALIDATION TESTS
// ============================================================================

describe("Icon Names", () => {
  it("all power-ups should have unique icon names", () => {
    const icons = Object.values(POWER_UP_CATALOG).map((d) => d.iconName);
    const uniqueIcons = new Set(icons);
    expect(uniqueIcons.size).toBe(icons.length);
  });

  it("icon names should be lowercase kebab-case or single words", () => {
    for (const def of Object.values(POWER_UP_CATALOG)) {
      expect(def.iconName).toMatch(/^[a-z][a-z0-9-]*$/);
    }
  });
});
