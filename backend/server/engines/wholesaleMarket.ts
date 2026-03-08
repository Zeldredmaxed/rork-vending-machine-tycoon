/**
 * VendFX Wholesale Market Engine
 *
 * Handles dynamic pricing, global market events, demographic-based demand,
 * product expiration/freshness mechanics, and daily price fluctuation cycles.
 *
 * Key mechanics:
 * - Base prices fluctuate daily using a mean-reverting random walk
 * - Global events (Sugar Tax, Supply Shortage, etc.) apply multipliers
 * - Demographics drive demand affinity per product category
 * - Freshness degrades over time, affecting sale price and demand
 * - Price history is tracked for charts and analytics
 */

import { eq, and, lte, gte, desc, sql, inArray } from "drizzle-orm";
import { getDb } from "../db";
import {
  products,
  productMarketPrices,
  priceHistory,
  marketEvents,
  warehouseInventory,
  machineInventory,
} from "../../drizzle/schema";
import { nanoid } from "nanoid";

// ============================================================================
// CONSTANTS
// ============================================================================

/** Maximum daily price swing as a percentage (e.g., 0.15 = ±15%) */
const MAX_DAILY_SWING = 0.15;

/** Mean-reversion strength: how quickly prices pull back toward base cost */
const MEAN_REVERSION_STRENGTH = 0.1;

/** Minimum price floor as a fraction of base cost (never below 40%) */
const PRICE_FLOOR_RATIO = 0.4;

/** Maximum price ceiling as a fraction of base cost (never above 300%) */
const PRICE_CEILING_RATIO = 3.0;

/** Platform fee on player marketplace trades (5%) */
export const MARKETPLACE_FEE_RATE = 0.05;

// ============================================================================
// PRODUCT CATEGORIES & DEMOGRAPHICS
// ============================================================================

/**
 * Product categories used in the game.
 * Each category has different demand profiles per demographic.
 */
export const PRODUCT_CATEGORIES = [
  "soda",
  "snacks",
  "healthy",
  "energy",
  "water",
  "candy",
  "coffee",
  "juice",
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

/**
 * Demographic profiles for vending machine locations.
 * Each demographic has different demand multipliers per product category.
 */
export const DEMOGRAPHIC_PROFILES = [
  "downtownBusiness",
  "universityCampus",
  "suburbanFamily",
  "touristDistrict",
  "urbanJapan",
  "ruralUS",
  "hospitalMedical",
  "gymFitness",
  "airportTerminal",
  "factoryIndustrial",
] as const;

export type DemographicProfile = (typeof DEMOGRAPHIC_PROFILES)[number];

/**
 * Demand affinity matrix: demographic → category → multiplier.
 * Values > 1.0 = higher demand, < 1.0 = lower demand.
 */
const DEMAND_AFFINITY: Record<string, Record<string, number>> = {
  downtownBusiness: {
    soda: 0.8, snacks: 0.9, healthy: 1.5, energy: 1.4,
    water: 1.3, candy: 0.6, coffee: 1.6, juice: 1.2,
  },
  universityCampus: {
    soda: 1.4, snacks: 1.5, healthy: 0.7, energy: 1.6,
    water: 1.1, candy: 1.3, coffee: 1.2, juice: 0.9,
  },
  suburbanFamily: {
    soda: 1.1, snacks: 1.3, healthy: 1.2, energy: 0.7,
    water: 1.2, candy: 1.4, coffee: 0.8, juice: 1.3,
  },
  touristDistrict: {
    soda: 1.5, snacks: 1.4, healthy: 0.8, energy: 1.0,
    water: 1.6, candy: 1.3, coffee: 1.1, juice: 1.2,
  },
  urbanJapan: {
    soda: 1.3, snacks: 1.2, healthy: 1.0, energy: 1.1,
    water: 1.0, candy: 0.9, coffee: 1.5, juice: 1.4,
  },
  ruralUS: {
    soda: 1.2, snacks: 1.4, healthy: 0.6, energy: 1.0,
    water: 0.9, candy: 1.3, coffee: 1.1, juice: 0.7,
  },
  hospitalMedical: {
    soda: 0.6, snacks: 0.7, healthy: 1.6, energy: 0.5,
    water: 1.5, candy: 0.4, coffee: 1.3, juice: 1.5,
  },
  gymFitness: {
    soda: 0.3, snacks: 0.4, healthy: 1.7, energy: 1.8,
    water: 1.8, candy: 0.2, coffee: 0.6, juice: 1.4,
  },
  airportTerminal: {
    soda: 1.2, snacks: 1.3, healthy: 1.1, energy: 1.3,
    water: 1.5, candy: 1.1, coffee: 1.4, juice: 1.2,
  },
  factoryIndustrial: {
    soda: 1.3, snacks: 1.2, healthy: 0.5, energy: 1.7,
    water: 1.4, candy: 1.0, coffee: 1.5, juice: 0.6,
  },
};

// ============================================================================
// GLOBAL MARKET EVENTS
// ============================================================================

/**
 * Predefined global market events that can affect prices.
 * These are randomly triggered or scheduled by the season lifecycle.
 */
export const MARKET_EVENT_TEMPLATES = [
  {
    eventName: "Sugar Tax",
    description: "Government imposes a sugar tax. Sugary drinks and candy prices increase.",
    affectedCategories: ["soda", "candy", "juice"],
    priceMultiplier: 1.25,
    durationDays: 7,
  },
  {
    eventName: "Supply Chain Disruption",
    description: "Global supply chain issues cause shortages across all categories.",
    affectedCategories: ["soda", "snacks", "healthy", "energy", "water", "candy", "coffee", "juice"],
    priceMultiplier: 1.35,
    durationDays: 5,
  },
  {
    eventName: "Health Craze",
    description: "A viral health trend boosts demand for healthy products and water.",
    affectedCategories: ["healthy", "water", "juice"],
    priceMultiplier: 1.20,
    durationDays: 10,
  },
  {
    eventName: "Energy Drink Recall",
    description: "Major energy drink brand recalled. Remaining stock prices spike.",
    affectedCategories: ["energy"],
    priceMultiplier: 1.50,
    durationDays: 3,
  },
  {
    eventName: "Summer Heatwave",
    description: "Record temperatures drive demand for cold beverages.",
    affectedCategories: ["soda", "water", "juice", "energy"],
    priceMultiplier: 1.15,
    durationDays: 14,
  },
  {
    eventName: "Harvest Season Surplus",
    description: "Bumper crop leads to lower prices on juice and healthy products.",
    affectedCategories: ["juice", "healthy"],
    priceMultiplier: 0.75,
    durationDays: 10,
  },
  {
    eventName: "Coffee Bean Shortage",
    description: "Poor harvest in Brazil causes coffee prices to surge.",
    affectedCategories: ["coffee"],
    priceMultiplier: 1.60,
    durationDays: 7,
  },
  {
    eventName: "Back to School Rush",
    description: "Students returning to campus drive up snack and energy drink demand.",
    affectedCategories: ["snacks", "energy", "candy"],
    priceMultiplier: 1.20,
    durationDays: 14,
  },
  {
    eventName: "Vending Machine Boom",
    description: "Positive media coverage increases foot traffic. All prices stabilize.",
    affectedCategories: ["soda", "snacks", "healthy", "energy", "water", "candy", "coffee", "juice"],
    priceMultiplier: 0.95,
    durationDays: 7,
  },
  {
    eventName: "Import Tariff Hike",
    description: "New tariffs on imported goods raise costs for specialty items.",
    affectedCategories: ["coffee", "energy", "juice"],
    priceMultiplier: 1.30,
    durationDays: 14,
  },
] as const;

// ============================================================================
// PRICE FLUCTUATION ENGINE
// ============================================================================

/**
 * Calculate a new market price using a mean-reverting random walk.
 *
 * The price drifts randomly each day but is pulled back toward the base cost.
 * This creates realistic market behavior: prices fluctuate but don't diverge forever.
 *
 * @param currentPrice - The current market price
 * @param baseCost - The product's base cost (equilibrium price)
 * @param volatility - Optional volatility override (0-1, default uses MAX_DAILY_SWING)
 * @returns New price and direction metadata
 */
export function calculateNewPrice(
  currentPrice: number,
  baseCost: number,
  volatility?: number
): {
  newPrice: number;
  direction: "up" | "down" | "stable";
  changePercent: number;
} {
  const vol = volatility ?? MAX_DAILY_SWING;

  // Random component: uniform random in [-vol, +vol]
  const randomShock = (Math.random() * 2 - 1) * vol;

  // Mean-reversion component: pulls price toward base cost
  const deviation = (currentPrice - baseCost) / baseCost;
  const meanReversion = -deviation * MEAN_REVERSION_STRENGTH;

  // Combined change
  const totalChange = randomShock + meanReversion;
  let newPrice = currentPrice * (1 + totalChange);

  // Enforce floor and ceiling
  const floor = baseCost * PRICE_FLOOR_RATIO;
  const ceiling = baseCost * PRICE_CEILING_RATIO;
  newPrice = Math.max(floor, Math.min(ceiling, newPrice));

  // Round to 2 decimals
  newPrice = Math.round(newPrice * 100) / 100;

  const changePercent = ((newPrice - currentPrice) / currentPrice) * 100;
  const direction =
    changePercent > 0.5 ? "up" : changePercent < -0.5 ? "down" : "stable";

  return { newPrice, direction, changePercent: Math.round(changePercent * 100) / 100 };
}

/**
 * Apply a global market event multiplier to a product price.
 * Only applies if the product's category is in the event's affected list.
 */
export function applyEventMultiplier(
  price: number,
  productCategory: string,
  activeEvents: Array<{ affectedCategories: string; priceMultiplier: number }>
): { adjustedPrice: number; appliedEvents: string[] } {
  let adjustedPrice = price;
  const appliedEvents: string[] = [];

  for (const event of activeEvents) {
    const categories = event.affectedCategories.split(",").map((c) => c.trim());
    if (categories.includes(productCategory)) {
      adjustedPrice *= event.priceMultiplier;
      appliedEvents.push(`x${event.priceMultiplier}`);
    }
  }

  return {
    adjustedPrice: Math.round(adjustedPrice * 100) / 100,
    appliedEvents,
  };
}

/**
 * Get the demand multiplier for a product category at a specific demographic location.
 */
export function getDemandMultiplier(
  demographic: string,
  category: string
): number {
  return DEMAND_AFFINITY[demographic]?.[category] ?? 1.0;
}

/**
 * Calculate the optimal selling price for a product at a specific location.
 * Combines base market price + demand multiplier + freshness bonus + event effects.
 */
export function calculateOptimalSellingPrice(params: {
  marketPrice: number;
  demographic: string;
  category: string;
  isExtraFresh: boolean;
  daysOld: number;
  activeEvents: Array<{ affectedCategories: string; priceMultiplier: number }>;
}): {
  suggestedPrice: number;
  demandMultiplier: number;
  freshnessMultiplier: number;
  eventMultiplier: number;
  breakdown: string;
} {
  const demandMultiplier = getDemandMultiplier(params.demographic, params.category);
  const freshnessMultiplier = calculateFreshnessMultiplier(params.isExtraFresh, params.daysOld);

  const { adjustedPrice: eventAdjusted } = applyEventMultiplier(
    params.marketPrice,
    params.category,
    params.activeEvents
  );
  const eventMultiplier = eventAdjusted / params.marketPrice;

  // Suggested price = market price * demand * freshness * events * retail markup (1.4x)
  const retailMarkup = 1.4;
  const suggestedPrice =
    Math.round(
      params.marketPrice * demandMultiplier * freshnessMultiplier * eventMultiplier * retailMarkup * 100
    ) / 100;

  return {
    suggestedPrice,
    demandMultiplier,
    freshnessMultiplier,
    eventMultiplier: Math.round(eventMultiplier * 100) / 100,
    breakdown: `Base $${params.marketPrice} × demand ${demandMultiplier} × fresh ${freshnessMultiplier} × events ${eventMultiplier.toFixed(2)} × markup ${retailMarkup}`,
  };
}

// ============================================================================
// FRESHNESS & EXPIRATION
// ============================================================================

/**
 * Calculate freshness multiplier based on product age and extra-fresh status.
 *
 * Fresh products sell at a premium; stale products sell at a discount.
 * Extra-fresh products (from premium suppliers) maintain freshness longer.
 */
export function calculateFreshnessMultiplier(
  isExtraFresh: boolean,
  daysOld: number
): number {
  if (isExtraFresh) {
    // Extra fresh: premium for 3 days, then normal degradation
    if (daysOld <= 1) return 1.20; // 20% premium
    if (daysOld <= 3) return 1.10; // 10% premium
    if (daysOld <= 5) return 1.0;  // Normal
    return Math.max(0.5, 1.0 - (daysOld - 5) * 0.1); // Degrades 10% per day after 5
  }

  // Standard freshness curve
  if (daysOld === 0) return 1.10; // 10% premium for same-day
  if (daysOld === 1) return 1.05; // 5% premium
  if (daysOld <= 3) return 1.0;   // Normal
  if (daysOld <= 5) return 0.85;  // 15% discount
  return Math.max(0.4, 0.85 - (daysOld - 5) * 0.15); // Steep decline after 5 days
}

/**
 * Check if a product has expired based on its expiration date.
 */
export function isProductExpired(expirationDate: Date): boolean {
  return new Date() > expirationDate;
}

/**
 * Calculate days until expiration. Returns negative if already expired.
 */
export function daysUntilExpiration(expirationDate: Date): number {
  const now = new Date();
  const diffMs = expirationDate.getTime() - now.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Calculate the age of a product in days since purchase.
 */
export function calculateProductAge(purchaseDate: Date): number {
  const now = new Date();
  const diffMs = now.getTime() - purchaseDate.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

// ============================================================================
// DATABASE OPERATIONS: WHOLESALE MARKET
// ============================================================================

/**
 * Run the daily price fluctuation cycle for all products.
 * Updates market prices, records price history, and applies active events.
 */
export async function runDailyPriceFluctuation(): Promise<{
  updated: number;
  events: string[];
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get all products with their current market prices
  const allProducts = await db.select().from(products);
  const marketPrices = await db.select().from(productMarketPrices);

  // Get active market events
  const now = new Date();
  const activeEvents = await db
    .select()
    .from(marketEvents)
    .where(
      and(
        lte(marketEvents.startDate, now),
        gte(marketEvents.endDate, now)
      )
    );

  const eventNames = activeEvents.map((e) => e.eventName);
  let updatedCount = 0;

  for (const product of allProducts) {
    const baseCost = parseFloat(product.baseCost);
    const existingPrice = marketPrices.find((mp) => mp.productId === product.id);
    const currentPrice = existingPrice
      ? parseFloat(existingPrice.currentPrice)
      : baseCost;

    // Calculate new base price via random walk
    const { newPrice, direction, changePercent } = calculateNewPrice(currentPrice, baseCost);

    // Apply active event multipliers
    const { adjustedPrice } = applyEventMultiplier(
      newPrice,
      product.category,
      activeEvents.map((e) => ({
        affectedCategories: e.affectedCategories || "",
        priceMultiplier: e.priceMultiplier || 1,
      }))
    );

    // Update or insert market price
    if (existingPrice) {
      await db
        .update(productMarketPrices)
        .set({
          currentPrice: adjustedPrice.toString(),
          priceDirection: direction,
          priceChangePercent: changePercent,
          lastUpdatedAt: now,
        })
        .where(eq(productMarketPrices.id, existingPrice.id));
    } else {
      await db.insert(productMarketPrices).values({
        productId: product.id,
        currentPrice: adjustedPrice.toString(),
        priceDirection: direction,
        priceChangePercent: changePercent,
        lastUpdatedAt: now,
      });
    }

    // Record price history
    await db.insert(priceHistory).values({
      productId: product.id,
      price: adjustedPrice.toString(),
      timestamp: now,
    });

    updatedCount++;
  }

  return { updated: updatedCount, events: eventNames };
}

/**
 * Trigger a random global market event.
 * Picks a random event template and creates it in the database.
 */
export async function triggerRandomMarketEvent(): Promise<{
  event: typeof MARKET_EVENT_TEMPLATES[number];
  id: string;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const template =
    MARKET_EVENT_TEMPLATES[Math.floor(Math.random() * MARKET_EVENT_TEMPLATES.length)];

  const now = new Date();
  const endDate = new Date(now.getTime() + template.durationDays * 24 * 60 * 60 * 1000);
  const id = nanoid();

  await db.insert(marketEvents).values({
    id,
    eventName: template.eventName,
    description: template.description,
    priceMultiplier: template.priceMultiplier,
    startDate: now,
    endDate,
    affectedCategories: template.affectedCategories.join(","),
  });

  return { event: template, id };
}

/**
 * Get all currently active market events.
 */
export async function getActiveMarketEvents() {
  const db = await getDb();
  if (!db) return [];

  const now = new Date();
  return db
    .select()
    .from(marketEvents)
    .where(
      and(
        lte(marketEvents.startDate, now),
        gte(marketEvents.endDate, now)
      )
    );
}

/**
 * Get current market prices for all products.
 * Joins products with their market prices.
 */
export async function getMarketPrices() {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select({
      productId: products.id,
      productName: products.name,
      category: products.category,
      baseCost: products.baseCost,
      currentPrice: productMarketPrices.currentPrice,
      priceDirection: productMarketPrices.priceDirection,
      priceChangePercent: productMarketPrices.priceChangePercent,
      lastUpdatedAt: productMarketPrices.lastUpdatedAt,
      expirationDays: products.expirationDays,
      iconName: products.iconName,
    })
    .from(products)
    .leftJoin(productMarketPrices, eq(products.id, productMarketPrices.productId));

  return result.map((r) => ({
    ...r,
    currentPrice: r.currentPrice || r.baseCost,
    priceDirection: r.priceDirection || "stable",
    priceChangePercent: r.priceChangePercent || 0,
  }));
}

/**
 * Get price history for a specific product.
 */
export async function getProductPriceHistory(
  productId: string,
  limit: number = 30
) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(priceHistory)
    .where(eq(priceHistory.productId, productId))
    .orderBy(desc(priceHistory.timestamp))
    .limit(limit);
}

/**
 * Remove expired inventory from warehouses and machines.
 * Returns count of expired items removed.
 */
export async function purgeExpiredInventory(): Promise<{
  warehouseExpired: number;
  machineExpired: number;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const now = new Date();

  // Find expired warehouse items
  const expiredWarehouse = await db
    .select()
    .from(warehouseInventory)
    .where(lte(warehouseInventory.expirationDate, now));

  // Find expired machine items
  const expiredMachine = await db
    .select()
    .from(machineInventory)
    .where(lte(machineInventory.expirationDate, now));

  // Delete expired warehouse items
  if (expiredWarehouse.length > 0) {
    const expiredIds = expiredWarehouse.map((e) => e.id);
    await db
      .delete(warehouseInventory)
      .where(inArray(warehouseInventory.id, expiredIds));
  }

  // Delete expired machine items
  if (expiredMachine.length > 0) {
    const expiredIds = expiredMachine.map((e) => e.id);
    await db
      .delete(machineInventory)
      .where(inArray(machineInventory.id, expiredIds));
  }

  return {
    warehouseExpired: expiredWarehouse.length,
    machineExpired: expiredMachine.length,
  };
}

/**
 * Purchase products from the wholesale market.
 * Creates warehouse inventory entries for the player.
 */
export async function purchaseFromWholesale(
  playerId: number,
  productId: string,
  quantity: number,
  isExtraFresh: boolean = false
): Promise<{
  success: boolean;
  item?: any;
  totalCost?: number;
  error?: string;
}> {
  const db = await getDb();
  if (!db) return { success: false, error: "Database not available" };

  // Get current market price
  const marketPrice = await db
    .select()
    .from(productMarketPrices)
    .where(eq(productMarketPrices.productId, productId))
    .limit(1);

  const product = await db
    .select()
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  if (!product[0]) return { success: false, error: "Product not found" };

  const pricePerUnit = marketPrice[0]
    ? parseFloat(marketPrice[0].currentPrice)
    : parseFloat(product[0].baseCost);

  // Extra fresh costs 20% more
  const finalPrice = isExtraFresh ? pricePerUnit * 1.2 : pricePerUnit;
  const totalCost = Math.round(finalPrice * quantity * 100) / 100;

  // Calculate expiration date
  const expirationDays = product[0].expirationDays || 5;
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + expirationDays);

  const itemId = nanoid();

  await db.insert(warehouseInventory).values({
    id: itemId,
    playerId,
    productId,
    quantity,
    purchasePrice: finalPrice.toString(),
    expirationDate,
    isExtraFresh,
  });

  // Select back
  const item = await db
    .select()
    .from(warehouseInventory)
    .where(eq(warehouseInventory.id, itemId))
    .limit(1);

  return {
    success: true,
    item: item[0],
    totalCost,
  };
}
