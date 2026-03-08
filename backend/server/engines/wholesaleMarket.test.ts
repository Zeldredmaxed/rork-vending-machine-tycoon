import { describe, expect, it } from "vitest";
import {
  calculateNewPrice,
  applyEventMultiplier,
  getDemandMultiplier,
  calculateOptimalSellingPrice,
  calculateFreshnessMultiplier,
  isProductExpired,
  daysUntilExpiration,
  calculateProductAge,
  MARKETPLACE_FEE_RATE,
  PRODUCT_CATEGORIES,
  DEMOGRAPHIC_PROFILES,
  MARKET_EVENT_TEMPLATES,
} from "./wholesaleMarket";

// ============================================================================
// PRICE FLUCTUATION ENGINE
// ============================================================================

describe("calculateNewPrice", () => {
  it("returns a price within floor and ceiling bounds", () => {
    const baseCost = 2.0;
    for (let i = 0; i < 100; i++) {
      const { newPrice } = calculateNewPrice(baseCost, baseCost);
      expect(newPrice).toBeGreaterThanOrEqual(baseCost * 0.4); // floor
      expect(newPrice).toBeLessThanOrEqual(baseCost * 3.0); // ceiling
    }
  });

  it("returns a price close to base cost when current = base (mean reversion)", () => {
    const baseCost = 5.0;
    const results: number[] = [];
    for (let i = 0; i < 1000; i++) {
      const { newPrice } = calculateNewPrice(baseCost, baseCost);
      results.push(newPrice);
    }
    const avg = results.reduce((a, b) => a + b, 0) / results.length;
    // Average should be close to base cost (within 15%)
    expect(avg).toBeGreaterThan(baseCost * 0.85);
    expect(avg).toBeLessThan(baseCost * 1.15);
  });

  it("applies mean reversion when price is above base cost", () => {
    const baseCost = 2.0;
    const highPrice = 5.0; // 2.5x above base
    const results: number[] = [];
    for (let i = 0; i < 500; i++) {
      const { newPrice } = calculateNewPrice(highPrice, baseCost);
      results.push(newPrice);
    }
    const avg = results.reduce((a, b) => a + b, 0) / results.length;
    // Average should be pulled down from 5.0 toward 2.0
    expect(avg).toBeLessThan(highPrice);
  });

  it("applies mean reversion when price is below base cost", () => {
    const baseCost = 5.0;
    const lowPrice = 2.5;
    const results: number[] = [];
    for (let i = 0; i < 500; i++) {
      const { newPrice } = calculateNewPrice(lowPrice, baseCost);
      results.push(newPrice);
    }
    const avg = results.reduce((a, b) => a + b, 0) / results.length;
    // Average should be pulled up from 2.5 toward 5.0
    expect(avg).toBeGreaterThan(lowPrice);
  });

  it("returns correct direction metadata", () => {
    const { direction } = calculateNewPrice(2.0, 2.0, 0); // 0 volatility = no change
    expect(direction).toBe("stable");
  });

  it("rounds price to 2 decimal places", () => {
    for (let i = 0; i < 50; i++) {
      const { newPrice } = calculateNewPrice(3.33, 3.33);
      const decimals = newPrice.toString().split(".")[1]?.length || 0;
      expect(decimals).toBeLessThanOrEqual(2);
    }
  });

  it("enforces price floor", () => {
    const baseCost = 10.0;
    const { newPrice } = calculateNewPrice(0.01, baseCost, 0); // Very low price, no volatility
    expect(newPrice).toBeGreaterThanOrEqual(baseCost * 0.4);
  });
});

// ============================================================================
// EVENT MULTIPLIER
// ============================================================================

describe("applyEventMultiplier", () => {
  it("applies multiplier when category matches", () => {
    const events = [
      { affectedCategories: "soda,candy", priceMultiplier: 1.25 },
    ];
    const { adjustedPrice, appliedEvents } = applyEventMultiplier(2.0, "soda", events);
    expect(adjustedPrice).toBe(2.5);
    expect(appliedEvents).toHaveLength(1);
  });

  it("does not apply multiplier when category does not match", () => {
    const events = [
      { affectedCategories: "soda,candy", priceMultiplier: 1.25 },
    ];
    const { adjustedPrice, appliedEvents } = applyEventMultiplier(2.0, "healthy", events);
    expect(adjustedPrice).toBe(2.0);
    expect(appliedEvents).toHaveLength(0);
  });

  it("stacks multiple event multipliers", () => {
    const events = [
      { affectedCategories: "soda", priceMultiplier: 1.20 },
      { affectedCategories: "soda,candy", priceMultiplier: 1.10 },
    ];
    const { adjustedPrice } = applyEventMultiplier(2.0, "soda", events);
    // 2.0 * 1.20 * 1.10 = 2.64
    expect(adjustedPrice).toBe(2.64);
  });

  it("returns original price with no events", () => {
    const { adjustedPrice } = applyEventMultiplier(3.50, "soda", []);
    expect(adjustedPrice).toBe(3.50);
  });
});

// ============================================================================
// DEMAND MULTIPLIER
// ============================================================================

describe("getDemandMultiplier", () => {
  it("returns correct multiplier for known demographic + category", () => {
    const mult = getDemandMultiplier("gymFitness", "energy");
    expect(mult).toBe(1.8);
  });

  it("returns 1.0 for unknown demographic", () => {
    const mult = getDemandMultiplier("unknownPlace", "soda");
    expect(mult).toBe(1.0);
  });

  it("returns 1.0 for unknown category", () => {
    const mult = getDemandMultiplier("downtownBusiness", "unknownProduct");
    expect(mult).toBe(1.0);
  });

  it("downtownBusiness prefers coffee and healthy", () => {
    const coffee = getDemandMultiplier("downtownBusiness", "coffee");
    const healthy = getDemandMultiplier("downtownBusiness", "healthy");
    const candy = getDemandMultiplier("downtownBusiness", "candy");
    expect(coffee).toBeGreaterThan(1.0);
    expect(healthy).toBeGreaterThan(1.0);
    expect(candy).toBeLessThan(1.0);
  });

  it("universityCampus prefers energy and snacks", () => {
    const energy = getDemandMultiplier("universityCampus", "energy");
    const snacks = getDemandMultiplier("universityCampus", "snacks");
    expect(energy).toBeGreaterThan(1.3);
    expect(snacks).toBeGreaterThan(1.3);
  });
});

// ============================================================================
// FRESHNESS MULTIPLIER
// ============================================================================

describe("calculateFreshnessMultiplier", () => {
  it("extra fresh day 0 gives 20% premium", () => {
    expect(calculateFreshnessMultiplier(true, 0)).toBe(1.20);
  });

  it("extra fresh day 1 gives 20% premium", () => {
    expect(calculateFreshnessMultiplier(true, 1)).toBe(1.20);
  });

  it("extra fresh day 2 gives 10% premium", () => {
    expect(calculateFreshnessMultiplier(true, 2)).toBe(1.10);
  });

  it("extra fresh day 4 gives normal price", () => {
    expect(calculateFreshnessMultiplier(true, 4)).toBe(1.0);
  });

  it("extra fresh degrades after day 5", () => {
    const mult = calculateFreshnessMultiplier(true, 7);
    expect(mult).toBeLessThan(1.0);
  });

  it("standard day 0 gives 10% premium", () => {
    expect(calculateFreshnessMultiplier(false, 0)).toBe(1.10);
  });

  it("standard day 1 gives 5% premium", () => {
    expect(calculateFreshnessMultiplier(false, 1)).toBe(1.05);
  });

  it("standard day 2-3 gives normal price", () => {
    expect(calculateFreshnessMultiplier(false, 2)).toBe(1.0);
    expect(calculateFreshnessMultiplier(false, 3)).toBe(1.0);
  });

  it("standard day 4-5 gives 15% discount", () => {
    expect(calculateFreshnessMultiplier(false, 4)).toBe(0.85);
  });

  it("standard day 6+ gives steep decline", () => {
    const mult = calculateFreshnessMultiplier(false, 6);
    expect(mult).toBeLessThan(0.85);
  });

  it("never goes below 0.4 for standard", () => {
    const mult = calculateFreshnessMultiplier(false, 20);
    expect(mult).toBeGreaterThanOrEqual(0.4);
  });

  it("never goes below 0.5 for extra fresh", () => {
    const mult = calculateFreshnessMultiplier(true, 20);
    expect(mult).toBeGreaterThanOrEqual(0.5);
  });
});

// ============================================================================
// EXPIRATION HELPERS
// ============================================================================

describe("isProductExpired", () => {
  it("returns true for past date", () => {
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    expect(isProductExpired(pastDate)).toBe(true);
  });

  it("returns false for future date", () => {
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    expect(isProductExpired(futureDate)).toBe(false);
  });
});

describe("daysUntilExpiration", () => {
  it("returns positive for future date", () => {
    const futureDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const days = daysUntilExpiration(futureDate);
    expect(days).toBeGreaterThanOrEqual(2);
    expect(days).toBeLessThanOrEqual(3);
  });

  it("returns negative for past date", () => {
    const pastDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const days = daysUntilExpiration(pastDate);
    expect(days).toBeLessThan(0);
  });
});

describe("calculateProductAge", () => {
  it("returns 0 for today", () => {
    const today = new Date();
    expect(calculateProductAge(today)).toBe(0);
  });

  it("returns correct age for past date", () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const age = calculateProductAge(threeDaysAgo);
    expect(age).toBeGreaterThanOrEqual(2);
    expect(age).toBeLessThanOrEqual(3);
  });
});

// ============================================================================
// OPTIMAL SELLING PRICE
// ============================================================================

describe("calculateOptimalSellingPrice", () => {
  it("returns a price higher than market price (retail markup)", () => {
    const result = calculateOptimalSellingPrice({
      marketPrice: 2.0,
      demographic: "downtownBusiness",
      category: "coffee",
      isExtraFresh: false,
      daysOld: 0,
      activeEvents: [],
    });
    expect(result.suggestedPrice).toBeGreaterThan(2.0);
  });

  it("includes demand multiplier in calculation", () => {
    const highDemand = calculateOptimalSellingPrice({
      marketPrice: 2.0,
      demographic: "gymFitness",
      category: "energy",
      isExtraFresh: false,
      daysOld: 2,
      activeEvents: [],
    });

    const lowDemand = calculateOptimalSellingPrice({
      marketPrice: 2.0,
      demographic: "gymFitness",
      category: "candy",
      isExtraFresh: false,
      daysOld: 2,
      activeEvents: [],
    });

    expect(highDemand.suggestedPrice).toBeGreaterThan(lowDemand.suggestedPrice);
  });

  it("extra fresh products get higher suggested price", () => {
    const fresh = calculateOptimalSellingPrice({
      marketPrice: 2.0,
      demographic: "downtownBusiness",
      category: "healthy",
      isExtraFresh: true,
      daysOld: 0,
      activeEvents: [],
    });

    const normal = calculateOptimalSellingPrice({
      marketPrice: 2.0,
      demographic: "downtownBusiness",
      category: "healthy",
      isExtraFresh: false,
      daysOld: 3,
      activeEvents: [],
    });

    expect(fresh.suggestedPrice).toBeGreaterThan(normal.suggestedPrice);
  });

  it("includes event multiplier in calculation", () => {
    const withEvent = calculateOptimalSellingPrice({
      marketPrice: 2.0,
      demographic: "downtownBusiness",
      category: "soda",
      isExtraFresh: false,
      daysOld: 2,
      activeEvents: [{ affectedCategories: "soda", priceMultiplier: 1.25 }],
    });

    const withoutEvent = calculateOptimalSellingPrice({
      marketPrice: 2.0,
      demographic: "downtownBusiness",
      category: "soda",
      isExtraFresh: false,
      daysOld: 2,
      activeEvents: [],
    });

    expect(withEvent.suggestedPrice).toBeGreaterThan(withoutEvent.suggestedPrice);
  });

  it("returns a breakdown string", () => {
    const result = calculateOptimalSellingPrice({
      marketPrice: 2.0,
      demographic: "downtownBusiness",
      category: "coffee",
      isExtraFresh: false,
      daysOld: 0,
      activeEvents: [],
    });
    expect(result.breakdown).toContain("Base $2");
    expect(result.breakdown).toContain("demand");
    expect(result.breakdown).toContain("fresh");
    expect(result.breakdown).toContain("markup");
  });
});

// ============================================================================
// CONSTANTS & METADATA
// ============================================================================

describe("Market constants", () => {
  it("has marketplace fee rate of 5%", () => {
    expect(MARKETPLACE_FEE_RATE).toBe(0.05);
  });

  it("has at least 5 product categories", () => {
    expect(PRODUCT_CATEGORIES.length).toBeGreaterThanOrEqual(5);
  });

  it("has at least 5 demographic profiles", () => {
    expect(DEMOGRAPHIC_PROFILES.length).toBeGreaterThanOrEqual(5);
  });

  it("has at least 5 market event templates", () => {
    expect(MARKET_EVENT_TEMPLATES.length).toBeGreaterThanOrEqual(5);
  });

  it("all event templates have required fields", () => {
    for (const template of MARKET_EVENT_TEMPLATES) {
      expect(template.eventName).toBeTruthy();
      expect(template.description).toBeTruthy();
      expect(template.affectedCategories.length).toBeGreaterThan(0);
      expect(template.priceMultiplier).toBeGreaterThan(0);
      expect(template.durationDays).toBeGreaterThan(0);
    }
  });
});
