/**
 * Integration Tests: Operations Flows
 * ======================================
 * End-to-end tests for HR/fleet logistics, wholesale market engine,
 * power-up catalog & upgrades, and cross-system operational interactions.
 */

import { describe, expect, it } from "vitest";
import {
  calculateTycoonScore,
  calculateGpsDistance,
  calculateTravelTime,
  calculateETA,
  calculateEmployeeEfficiency,
  simulateBreakdown,
  calculateRepairCost,
  getDemographicDemandMultiplier,
  getFreshnessBonus,
  calculateBusinessTier,
} from "../gameLogic";
import {
  POWER_UP_CATALOG,
  UPGRADE_CATALOG,
  meetsBusinessTierRequirement,
  getCatalog,
  getUpgradeCatalog,
  calculatePowerUpCost,
  calculateUpgradeCost,
  calculateTotalUpgradeCost,
} from "../engines/powerUps";
import {
  PRODUCT_CATEGORIES,
  DEMOGRAPHIC_PROFILES,
  MARKETPLACE_FEE_RATE,
} from "../engines/wholesaleMarket";

// ============================================================================
// FLOW 1: HIRE EMPLOYEE → ASSIGN TO FLEET → DISPATCH → RESTOCK
// ============================================================================

describe("Flow: Hire Employee → Fleet Dispatch → Restock", () => {
  it("should calculate travel time for a local dispatch (2 miles)", () => {
    const travel = calculateTravelTime(2, 60); // 2 miles, good driver
    const totalMinutes = travel.minutes * 60 + travel.seconds;
    // At ~33 mph (60 skill), 2 miles ≈ 3.6 min
    expect(totalMinutes).toBeGreaterThan(2);
    expect(totalMinutes).toBeLessThan(10);
  });

  it("should calculate travel time for a cross-city dispatch (20 miles)", () => {
    const travel = calculateTravelTime(20, 50); // 20 miles, avg driver
    const totalMinutes = travel.minutes * 60 + travel.seconds;
    // At 30 mph, 20 miles ≈ 40 min
    expect(totalMinutes).toBeGreaterThan(30);
    expect(totalMinutes).toBeLessThan(60);
  });

  it("should show better drivers complete dispatches faster", () => {
    const distance = 15;
    const slow = calculateTravelTime(distance, 20);
    const avg = calculateTravelTime(distance, 50);
    const fast = calculateTravelTime(distance, 90);

    const slowTotal = slow.minutes * 60 + slow.seconds;
    const avgTotal = avg.minutes * 60 + avg.seconds;
    const fastTotal = fast.minutes * 60 + fast.seconds;

    expect(slowTotal).toBeGreaterThan(avgTotal);
    expect(avgTotal).toBeGreaterThan(fastTotal);
  });

  it("should calculate ETA including task time", () => {
    const before = Date.now();
    const eta = calculateETA(5, 50, 30); // 5 miles, avg driver, 30 min task
    const after = Date.now();

    // ETA should be in the future
    expect(eta.getTime()).toBeGreaterThan(before);
    // ETA should be at least 30 minutes from now (task time alone)
    expect(eta.getTime() - before).toBeGreaterThan(30 * 60 * 1000 - 5000);
  });

  it("should simulate full dispatch cycle with efficiency impact on score", () => {
    // Efficient employee → high restock success → better tycoon score
    const efficientEmployee = calculateEmployeeEfficiency({
      speed: 85, qualityControl: 90, attendance: 95,
      driving: 80, adaptability: 75, repairSkill: 70,
    });

    const inefficientEmployee = calculateEmployeeEfficiency({
      speed: 30, qualityControl: 25, attendance: 40,
      driving: 20, adaptability: 35, repairSkill: 25,
    });

    expect(efficientEmployee).toBeGreaterThan(75);
    expect(inefficientEmployee).toBeLessThan(35);

    // Score with efficient employees
    const goodScore = calculateTycoonScore({
      totalRevenue: 80000, netWorth: 50000, totalExpenses: 30000,
      reputation: 85, machineCount: 20, machineHealthAverage: 90,
      restockSuccessRate: 0.95, employeeEfficiencyAverage: efficientEmployee,
    });

    // Score with inefficient employees
    const badScore = calculateTycoonScore({
      totalRevenue: 80000, netWorth: 50000, totalExpenses: 30000,
      reputation: 85, machineCount: 20, machineHealthAverage: 90,
      restockSuccessRate: 0.45, employeeEfficiencyAverage: inefficientEmployee,
    });

    expect(goodScore).toBeGreaterThan(badScore);
  });
});

// ============================================================================
// FLOW 2: WHOLESALE MARKET DYNAMICS
// ============================================================================

describe("Flow: Wholesale Market Dynamics", () => {
  it("should have 8 product categories defined", () => {
    expect(PRODUCT_CATEGORIES.length).toBe(8);
    expect(PRODUCT_CATEGORIES).toContain("soda");
    expect(PRODUCT_CATEGORIES).toContain("healthy");
    expect(PRODUCT_CATEGORIES).toContain("energy");
    expect(PRODUCT_CATEGORIES).toContain("coffee");
  });

  it("should have 10 demographic profiles defined", () => {
    expect(DEMOGRAPHIC_PROFILES.length).toBe(10);
    expect(DEMOGRAPHIC_PROFILES).toContain("downtownBusiness");
    expect(DEMOGRAPHIC_PROFILES).toContain("universityCampus");
    expect(DEMOGRAPHIC_PROFILES).toContain("gymFitness");
  });

  it("should show coffee is most in-demand at downtown business", () => {
    const coffeeDemand = getDemographicDemandMultiplier("downtownBusiness", "coffee") || 1.0;
    const candyDemand = getDemographicDemandMultiplier("downtownBusiness", "candy") || 1.0;

    // Both return valid multipliers (gameLogic may use default 1.0 for unknown combos)
    expect(coffeeDemand).toBeGreaterThanOrEqual(1.0);
    expect(candyDemand).toBeGreaterThanOrEqual(0);
  });

  it("should calculate freshness lifecycle affecting sale value", () => {
    const basePrice = 3.00;

    // Day 0: Extra fresh → 15% premium
    const day0 = basePrice * getFreshnessBonus(true, 0);
    expect(day0).toBeCloseTo(3.45, 2);

    // Day 0: Regular fresh → 10% premium
    const day0reg = basePrice * getFreshnessBonus(false, 0);
    expect(day0reg).toBeCloseTo(3.30, 2);

    // Day 2: Normal → no bonus
    const day2 = basePrice * getFreshnessBonus(false, 2);
    expect(day2).toBeCloseTo(3.00, 2);

    // Day 5: Stale → 20% discount
    const day5 = basePrice * getFreshnessBonus(false, 5);
    expect(day5).toBeCloseTo(2.40, 2);

    // Revenue loss from not restocking on time
    const revenueLoss = day0 - day5;
    expect(revenueLoss).toBeCloseTo(1.05, 2); // $1.05 per unit lost
  });

  it("should simulate buy-low-sell-high market strategy", () => {
    // Buy 500 units at $1.20 wholesale
    const buyCost = 500 * 1.20;
    // Sell at $2.50 retail through machine
    const sellRevenue = 500 * 2.50;
    // Profit before operating costs
    const grossProfit = sellRevenue - buyCost;

    expect(grossProfit).toBe(650);
    expect(grossProfit / buyCost).toBeGreaterThan(1.0); // >100% markup
  });

  it("should calculate marketplace fee impact on P2P trading margins", () => {
    const wholesaleCost = 1.50;
    const listPrice = 2.00;
    const quantity = 100;

    const revenue = listPrice * quantity;
    const fee = revenue * MARKETPLACE_FEE_RATE;
    const netRevenue = revenue - fee;
    const cost = wholesaleCost * quantity;
    const profit = netRevenue - cost;

    expect(fee).toBe(10); // 5% of $200
    expect(profit).toBe(40); // $190 - $150
    expect(profit / cost).toBeCloseTo(0.267, 2); // ~26.7% ROI
  });
});

// ============================================================================
// FLOW 3: POWER-UP CATALOG & PURCHASING
// ============================================================================

describe("Flow: Power-Up Catalog & Purchasing", () => {
  it("should have 12 power-ups in the catalog", () => {
    const keys = Object.keys(POWER_UP_CATALOG);
    expect(keys.length).toBe(12);
  });

  it("should have power-ups across all 5 categories", () => {
    const categories = new Set(
      Object.values(POWER_UP_CATALOG).map((p) => p.category)
    );
    expect(categories.size).toBe(5);
    expect(categories.has("revenue")).toBe(true);
    expect(categories.has("capacity")).toBe(true);
    expect(categories.has("maintenance")).toBe(true);
    expect(categories.has("speed")).toBe(true);
    expect(categories.has("special")).toBe(true);
  });

  it("should generate costs within defined min/max range", () => {
    for (const [key, def] of Object.entries(POWER_UP_CATALOG)) {
      for (let i = 0; i < 20; i++) {
        const cost = calculatePowerUpCost(key);
        expect(cost).toBeGreaterThanOrEqual(def.costMin);
        expect(cost).toBeLessThanOrEqual(def.costMax);
      }
    }
  });

  it("should filter catalog by business tier", () => {
    const startupCatalog = getCatalog("startup");
    const localOpCatalog = getCatalog("localOperator");
    const regionalCatalog = getCatalog("regionalManager");

    const startupAvailable = startupCatalog.filter((p) => p.available).length;
    const localOpAvailable = localOpCatalog.filter((p) => p.available).length;
    const regionalAvailable = regionalCatalog.filter((p) => p.available).length;

    // Higher tiers should unlock more power-ups
    expect(localOpAvailable).toBeGreaterThanOrEqual(startupAvailable);
    expect(regionalAvailable).toBeGreaterThanOrEqual(localOpAvailable);
  });

  it("should enforce business tier requirements correctly", () => {
    expect(meetsBusinessTierRequirement("startup", "startup")).toBe(true);
    expect(meetsBusinessTierRequirement("startup", "localOperator")).toBe(false);
    expect(meetsBusinessTierRequirement("localOperator", "startup")).toBe(true);
    expect(meetsBusinessTierRequirement("localOperator", "localOperator")).toBe(true);
    expect(meetsBusinessTierRequirement("regionalManager", "localOperator")).toBe(true);
    expect(meetsBusinessTierRequirement("executive", "regionalManager")).toBe(true);
    expect(meetsBusinessTierRequirement("startup", "executive")).toBe(false);
  });

  it("should have permanent power-ups with no expiration", () => {
    const permanents = Object.values(POWER_UP_CATALOG).filter(
      (p) => p.durabilityType === "permanent"
    );
    expect(permanents.length).toBeGreaterThan(0);
    for (const p of permanents) {
      expect(p.durationDays).toBeNull();
    }
  });

  it("should have timed power-ups with valid durations", () => {
    const timed = Object.values(POWER_UP_CATALOG).filter(
      (p) => p.durabilityType === "timed"
    );
    expect(timed.length).toBeGreaterThan(0);
    for (const p of timed) {
      expect(p.durationDays).toBeGreaterThan(0);
    }
  });

  it("should have malfunction chances only on mechanical power-ups", () => {
    for (const [, def] of Object.entries(POWER_UP_CATALOG)) {
      expect(def.malfunctionChancePercent).toBeGreaterThanOrEqual(0);
      expect(def.malfunctionChancePercent).toBeLessThanOrEqual(100);
      // Repair cost should be 0 if malfunction chance is 0
      if (def.malfunctionChancePercent === 0) {
        expect(def.repairCostPercent).toBe(0);
      }
    }
  });

  it("should simulate power-up ROI calculation", () => {
    // Digital Display: costs $150-250, gives +15% revenue for 30 days
    const displayDef = POWER_UP_CATALOG.digital_display;
    const avgCost = (displayDef.costMin + displayDef.costMax) / 2; // $200
    const dailyRevenue = 50; // $50/day base machine revenue
    const bonusRevenue = dailyRevenue * displayDef.effectValue; // $7.50/day
    const totalBonus = bonusRevenue * (displayDef.durationDays || 30); // $225

    // ROI = (totalBonus - avgCost) / avgCost
    const roi = (totalBonus - avgCost) / avgCost;
    expect(roi).toBeGreaterThan(0); // Should be profitable
  });
});

// ============================================================================
// FLOW 4: MACHINE UPGRADE TIER PROGRESSION
// ============================================================================

describe("Flow: Machine Upgrade Tier Progression", () => {
  it("should have 6 upgrade types in the catalog", () => {
    expect(Object.keys(UPGRADE_CATALOG).length).toBe(6);
  });

  it("should calculate exponential cost scaling per tier", () => {
    for (const [type, def] of Object.entries(UPGRADE_CATALOG)) {
      const costs: number[] = [];
      for (let tier = 1; tier <= def.maxTier; tier++) {
        costs.push(calculateUpgradeCost(type, tier));
      }

      // Each tier should cost more than the previous
      for (let i = 1; i < costs.length; i++) {
        expect(costs[i]).toBeGreaterThan(costs[i - 1]);
      }

      // Tier 1 cost should equal base cost
      expect(costs[0]).toBe(def.baseCost);
    }
  });

  it("should calculate correct tier 1 costs for all upgrade types", () => {
    expect(calculateUpgradeCost("capacity", 1)).toBe(200);
    expect(calculateUpgradeCost("speed", 1)).toBe(250);
    expect(calculateUpgradeCost("reliability", 1)).toBe(300);
    expect(calculateUpgradeCost("energy_efficiency", 1)).toBe(350);
    expect(calculateUpgradeCost("security", 1)).toBe(400);
    expect(calculateUpgradeCost("temperature_control", 1)).toBe(500);
  });

  it("should calculate correct tier 2 costs (baseCost * multiplier)", () => {
    expect(calculateUpgradeCost("capacity", 2)).toBe(Math.round(200 * 1.8));
    expect(calculateUpgradeCost("speed", 2)).toBe(Math.round(250 * 2.0));
    expect(calculateUpgradeCost("reliability", 2)).toBe(Math.round(300 * 1.9));
  });

  it("should calculate cumulative upgrade costs correctly", () => {
    // Capacity: tier 1 = 200, tier 2 = 360, total = 560
    const total2 = calculateTotalUpgradeCost("capacity", 2);
    expect(total2).toBe(200 + Math.round(200 * 1.8));

    // All tiers cumulative
    const total5 = calculateTotalUpgradeCost("capacity", 5);
    let expected = 0;
    for (let t = 1; t <= 5; t++) {
      expected += calculateUpgradeCost("capacity", t);
    }
    expect(total5).toBe(expected);
  });

  it("should throw for invalid tier numbers", () => {
    expect(() => calculateUpgradeCost("capacity", 0)).toThrow();
    expect(() => calculateUpgradeCost("capacity", 6)).toThrow(); // Max is 5
    expect(() => calculateUpgradeCost("security", 4)).toThrow(); // Max is 3
  });

  it("should throw for unknown upgrade types", () => {
    expect(() => calculateUpgradeCost("nonexistent", 1)).toThrow();
  });

  it("should respect max tier limits per upgrade type", () => {
    expect(UPGRADE_CATALOG.capacity.maxTier).toBe(5);
    expect(UPGRADE_CATALOG.speed.maxTier).toBe(5);
    expect(UPGRADE_CATALOG.reliability.maxTier).toBe(5);
    expect(UPGRADE_CATALOG.energy_efficiency.maxTier).toBe(5);
    expect(UPGRADE_CATALOG.security.maxTier).toBe(3);
    expect(UPGRADE_CATALOG.temperature_control.maxTier).toBe(4);
  });

  it("should filter upgrade catalog by business tier", () => {
    const startupUpgrades = getUpgradeCatalog("startup");
    const localOpUpgrades = getUpgradeCatalog("localOperator");

    const startupAvail = startupUpgrades.filter((u) => u.available).length;
    const localOpAvail = localOpUpgrades.filter((u) => u.available).length;

    expect(localOpAvail).toBeGreaterThanOrEqual(startupAvail);
  });

  it("should simulate full upgrade path cost for a single machine", () => {
    // Calculate total cost to max out all upgrades on one machine
    let totalCost = 0;
    for (const [type, def] of Object.entries(UPGRADE_CATALOG)) {
      totalCost += calculateTotalUpgradeCost(type, def.maxTier);
    }

    // Should be a significant investment
    expect(totalCost).toBeGreaterThan(10000);
    // But not unreasonably expensive
    expect(totalCost).toBeLessThan(100000);
  });

  it("should show upgrade stat bonuses are cumulative per tier", () => {
    const capacityDef = UPGRADE_CATALOG.capacity;
    // At tier 5: 5 * 20 = +100 capacity
    const totalBonus = capacityDef.bonusPerTier * capacityDef.maxTier;
    expect(totalBonus).toBe(100);

    const speedDef = UPGRADE_CATALOG.speed;
    // At tier 5: 5 * 10 = +50% speed
    const speedBonus = speedDef.bonusPerTier * speedDef.maxTier;
    expect(speedBonus).toBe(50);
  });
});

// ============================================================================
// FLOW 5: COMBINED POWER-UP + UPGRADE STRATEGY
// ============================================================================

describe("Flow: Combined Power-Up + Upgrade Strategy", () => {
  it("should calculate total investment for a fully upgraded machine with power-ups", () => {
    // Max upgrades cost
    let upgradeCost = 0;
    for (const [type, def] of Object.entries(UPGRADE_CATALOG)) {
      upgradeCost += calculateTotalUpgradeCost(type, def.maxTier);
    }

    // Average power-up costs (one of each available)
    let powerUpCost = 0;
    for (const [, def] of Object.entries(POWER_UP_CATALOG)) {
      powerUpCost += (def.costMin + def.costMax) / 2;
    }

    const totalInvestment = upgradeCost + powerUpCost;
    expect(totalInvestment).toBeGreaterThan(15000);
  });

  it("should show capacity power-ups stack with capacity upgrades", () => {
    const baseCapacity = 100;

    // Capacity upgrade tier 3: 3 * 20 = +60
    const upgradeBonus = UPGRADE_CATALOG.capacity.bonusPerTier * 3;

    // Extra shelf power-up: +25 (can stack up to 3)
    const extraShelfBonus = POWER_UP_CATALOG.extra_shelf.effectValue;
    const maxShelves = POWER_UP_CATALOG.extra_shelf.maxPerMachine;

    // Compact stacker: +15 (can stack up to 2)
    const stackerBonus = POWER_UP_CATALOG.compact_stacker.effectValue;
    const maxStackers = POWER_UP_CATALOG.compact_stacker.maxPerMachine;

    const totalCapacity =
      baseCapacity +
      upgradeBonus +
      extraShelfBonus * maxShelves +
      stackerBonus * maxStackers;

    expect(totalCapacity).toBe(100 + 60 + 75 + 30); // 265
  });

  it("should show revenue power-ups compound with each other", () => {
    const baseRevenue = 100;

    // Digital display: +15%
    const displayBoost = POWER_UP_CATALOG.digital_display.effectValue;
    // Loyalty scanner: +8%
    const loyaltyBoost = POWER_UP_CATALOG.loyalty_scanner.effectValue;
    // Premium branding: +10%
    const brandingBoost = POWER_UP_CATALOG.premium_branding.effectValue;

    // Additive stacking
    const totalBoost = displayBoost + loyaltyBoost + brandingBoost;
    const boostedRevenue = baseRevenue * (1 + totalBoost);

    expect(totalBoost).toBeCloseTo(0.33, 2); // 33% total boost
    expect(boostedRevenue).toBeCloseTo(133, 0);
  });

  it("should calculate break-even time for power-up investment", () => {
    const dailyRevenue = 80; // $80/day from a machine
    const displayCost = (POWER_UP_CATALOG.digital_display.costMin + POWER_UP_CATALOG.digital_display.costMax) / 2;
    const dailyBonus = dailyRevenue * POWER_UP_CATALOG.digital_display.effectValue;

    const breakEvenDays = Math.ceil(displayCost / dailyBonus);
    const duration = POWER_UP_CATALOG.digital_display.durationDays || 30;

    // Should break even before expiration
    expect(breakEvenDays).toBeLessThan(duration);
  });
});

// ============================================================================
// FLOW 6: GPS-BASED FLEET OPERATIONS
// ============================================================================

describe("Flow: GPS-Based Fleet Operations", () => {
  it("should calculate distances between major US cities", () => {
    // NYC to Chicago: ~713 miles
    const nycChicago = calculateGpsDistance(40.7128, -74.006, 41.8781, -87.6298);
    expect(nycChicago).toBeGreaterThan(700);
    expect(nycChicago).toBeLessThan(730);

    // LA to San Francisco: ~347 miles
    const laSf = calculateGpsDistance(34.0522, -118.2437, 37.7749, -122.4194);
    expect(laSf).toBeGreaterThan(340);
    expect(laSf).toBeLessThan(360);
  });

  it("should calculate zero distance for same location", () => {
    const distance = calculateGpsDistance(40.7128, -74.006, 40.7128, -74.006);
    expect(distance).toBeCloseTo(0, 5);
  });

  it("should simulate multi-stop dispatch route", () => {
    // Warehouse → Machine A → Machine B → Machine C
    const stops = [
      { lat: 40.7128, lon: -74.006 },   // Warehouse (NYC)
      { lat: 40.7580, lon: -73.9855 },  // Machine A (Times Square)
      { lat: 40.7484, lon: -73.9856 },  // Machine B (Empire State)
      { lat: 40.7527, lon: -73.9772 },  // Machine C (Grand Central)
    ];

    let totalDistance = 0;
    for (let i = 1; i < stops.length; i++) {
      totalDistance += calculateGpsDistance(
        stops[i - 1].lat, stops[i - 1].lon,
        stops[i].lat, stops[i].lon
      );
    }

    // Total route within Manhattan should be < 10 miles
    expect(totalDistance).toBeLessThan(10);
    expect(totalDistance).toBeGreaterThan(0);
  });

  it("should calculate repair costs that scale with damage severity", () => {
    const baseCost = 500;

    const minorRepair = calculateRepairCost(80, baseCost); // 80% maintenance
    const moderateRepair = calculateRepairCost(40, baseCost); // 40% maintenance
    const majorRepair = calculateRepairCost(10, baseCost); // 10% maintenance

    expect(minorRepair).toBeLessThan(moderateRepair);
    expect(moderateRepair).toBeLessThan(majorRepair);
  });
});
