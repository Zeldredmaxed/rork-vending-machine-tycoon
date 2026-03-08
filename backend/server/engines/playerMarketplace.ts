/**
 * VendFX Player Marketplace Engine
 *
 * Enables player-to-player trading of surplus inventory.
 * Players can list warehouse items at their own prices, and other players
 * can buy them. A 5% platform fee is deducted from each sale.
 *
 * Key mechanics:
 * - Players list surplus inventory from their warehouse
 * - Listings show product details, freshness, expiration, and seller brand
 * - Buyers can browse, filter, and purchase listings
 * - 5% platform fee deducted from seller proceeds
 * - Seller profit tracked (sale price - original cost - fee)
 * - Trade history for analytics and leaderboard
 * - Auto-cancel expired listings
 * - Price suggestions based on current market rates
 * - Seller reputation affects listing visibility
 */

import { eq, and, desc, asc, gte, lte, ne, sql, inArray } from "drizzle-orm";
import { getDb } from "../db";
import {
  marketplaceListings,
  marketplaceTrades,
  warehouseInventory,
  players,
  products,
  productMarketPrices,
} from "../../drizzle/schema";
import { nanoid } from "nanoid";
import { MARKETPLACE_FEE_RATE } from "./wholesaleMarket";

// ============================================================================
// CONSTANTS
// ============================================================================

/** Minimum listing price as fraction of market price (can't dump below 30%) */
const MIN_PRICE_RATIO = 0.3;

/** Maximum listing price as fraction of market price (can't gouge above 500%) */
const MAX_PRICE_RATIO = 5.0;

/** Maximum active listings per player */
const MAX_ACTIVE_LISTINGS_PER_PLAYER = 50;

/** Listings auto-expire after this many hours if not sold */
const LISTING_EXPIRY_HOURS = 72;

// ============================================================================
// LISTING MANAGEMENT
// ============================================================================

/**
 * Create a new marketplace listing from a player's warehouse inventory.
 *
 * Validates:
 * - Player owns the warehouse item
 * - Sufficient quantity available
 * - Product not expired
 * - Price within allowed range
 * - Player hasn't exceeded max active listings
 */
export async function createListing(params: {
  sellerId: number;
  warehouseItemId: string;
  quantity: number;
  pricePerUnit: number;
}): Promise<{
  success: boolean;
  listing?: any;
  error?: string;
}> {
  const db = await getDb();
  if (!db) return { success: false, error: "Database not available" };

  // Get seller info
  const seller = await db
    .select()
    .from(players)
    .where(eq(players.id, params.sellerId))
    .limit(1);

  if (!seller[0]) return { success: false, error: "Player not found" };

  // Check active listing count
  const activeListings = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(marketplaceListings)
    .where(
      and(
        eq(marketplaceListings.sellerId, params.sellerId),
        eq(marketplaceListings.status, "active")
      )
    );

  const listingCount = Number(activeListings[0]?.count || 0);
  if (listingCount >= MAX_ACTIVE_LISTINGS_PER_PLAYER) {
    return {
      success: false,
      error: `Maximum ${MAX_ACTIVE_LISTINGS_PER_PLAYER} active listings allowed`,
    };
  }

  // Get warehouse item
  const warehouseItem = await db
    .select()
    .from(warehouseInventory)
    .where(eq(warehouseInventory.id, params.warehouseItemId))
    .limit(1);

  if (!warehouseItem[0]) return { success: false, error: "Warehouse item not found" };
  if (warehouseItem[0].playerId !== params.sellerId) {
    return { success: false, error: "You don't own this inventory" };
  }

  const availableQty = warehouseItem[0].quantity || 0;
  if (availableQty < params.quantity) {
    return {
      success: false,
      error: `Insufficient quantity. Available: ${availableQty}, requested: ${params.quantity}`,
    };
  }

  // Check expiration
  if (warehouseItem[0].expirationDate && new Date() > warehouseItem[0].expirationDate) {
    return { success: false, error: "Cannot list expired products" };
  }

  // Validate price range against market price
  const marketPrice = await db
    .select()
    .from(productMarketPrices)
    .where(eq(productMarketPrices.productId, warehouseItem[0].productId))
    .limit(1);

  const product = await db
    .select()
    .from(products)
    .where(eq(products.id, warehouseItem[0].productId))
    .limit(1);

  const currentMarketPrice = marketPrice[0]
    ? parseFloat(marketPrice[0].currentPrice)
    : product[0]
    ? parseFloat(product[0].baseCost)
    : 1.0;

  const minPrice = Math.round(currentMarketPrice * MIN_PRICE_RATIO * 100) / 100;
  const maxPrice = Math.round(currentMarketPrice * MAX_PRICE_RATIO * 100) / 100;

  if (params.pricePerUnit < minPrice) {
    return {
      success: false,
      error: `Price too low. Minimum: $${minPrice} (${Math.round(MIN_PRICE_RATIO * 100)}% of market price)`,
    };
  }

  if (params.pricePerUnit > maxPrice) {
    return {
      success: false,
      error: `Price too high. Maximum: $${maxPrice} (${Math.round(MAX_PRICE_RATIO * 100)}% of market price)`,
    };
  }

  // Deduct quantity from warehouse
  const newQty = availableQty - params.quantity;
  if (newQty <= 0) {
    await db
      .delete(warehouseInventory)
      .where(eq(warehouseInventory.id, params.warehouseItemId));
  } else {
    await db
      .update(warehouseInventory)
      .set({ quantity: newQty })
      .where(eq(warehouseInventory.id, params.warehouseItemId));
  }

  // Create listing
  const listingId = nanoid();
  const listingExpiry = new Date(Date.now() + LISTING_EXPIRY_HOURS * 60 * 60 * 1000);
  // Use the earlier of product expiration or listing expiry
  const effectiveExpiry = warehouseItem[0].expirationDate && warehouseItem[0].expirationDate < listingExpiry
    ? warehouseItem[0].expirationDate
    : listingExpiry;

  await db.insert(marketplaceListings).values({
    id: listingId,
    sellerId: params.sellerId,
    sellerBrandName: seller[0].brandName,
    productId: warehouseItem[0].productId,
    warehouseItemId: params.warehouseItemId,
    quantity: params.quantity,
    pricePerUnit: params.pricePerUnit.toString(),
    originalCostPerUnit: warehouseItem[0].purchasePrice,
    status: "active",
    expirationDate: effectiveExpiry,
    isExtraFresh: warehouseItem[0].isExtraFresh || false,
  });

  const listing = await db
    .select()
    .from(marketplaceListings)
    .where(eq(marketplaceListings.id, listingId))
    .limit(1);

  return { success: true, listing: listing[0] };
}

/**
 * Cancel an active listing and return inventory to warehouse.
 */
export async function cancelListing(
  sellerId: number,
  listingId: string
): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: "Database not available" };

  const listing = await db
    .select()
    .from(marketplaceListings)
    .where(eq(marketplaceListings.id, listingId))
    .limit(1);

  if (!listing[0]) return { success: false, error: "Listing not found" };
  if (listing[0].sellerId !== sellerId) {
    return { success: false, error: "You don't own this listing" };
  }
  if (listing[0].status !== "active") {
    return { success: false, error: "Listing is not active" };
  }

  // Return inventory to warehouse
  const existingWarehouse = await db
    .select()
    .from(warehouseInventory)
    .where(eq(warehouseInventory.id, listing[0].warehouseItemId))
    .limit(1);

  if (existingWarehouse[0]) {
    // Add back to existing warehouse item
    await db
      .update(warehouseInventory)
      .set({
        quantity: (existingWarehouse[0].quantity || 0) + listing[0].quantity,
      })
      .where(eq(warehouseInventory.id, listing[0].warehouseItemId));
  } else {
    // Recreate warehouse item
    await db.insert(warehouseInventory).values({
      id: listing[0].warehouseItemId,
      playerId: sellerId,
      productId: listing[0].productId,
      quantity: listing[0].quantity,
      purchasePrice: listing[0].originalCostPerUnit,
      expirationDate: listing[0].expirationDate || new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      isExtraFresh: listing[0].isExtraFresh || false,
    });
  }

  // Mark listing as cancelled
  await db
    .update(marketplaceListings)
    .set({ status: "cancelled", cancelledAt: new Date() })
    .where(eq(marketplaceListings.id, listingId));

  return { success: true };
}

// ============================================================================
// BUYING
// ============================================================================

/**
 * Purchase a listing from the player marketplace.
 *
 * Flow:
 * 1. Validate listing is active and buyer has funds
 * 2. Deduct total cost from buyer's competition wallet
 * 3. Calculate platform fee (5%) and seller proceeds
 * 4. Credit seller's competition wallet
 * 5. Create warehouse inventory for buyer
 * 6. Record the trade
 * 7. Update listing status
 */
export async function purchaseListing(params: {
  buyerId: number;
  listingId: string;
  quantity?: number; // Optional: buy partial quantity
}): Promise<{
  success: boolean;
  trade?: any;
  error?: string;
}> {
  const db = await getDb();
  if (!db) return { success: false, error: "Database not available" };

  // Get listing
  const listing = await db
    .select()
    .from(marketplaceListings)
    .where(eq(marketplaceListings.id, params.listingId))
    .limit(1);

  if (!listing[0]) return { success: false, error: "Listing not found" };
  if (listing[0].status !== "active") {
    return { success: false, error: "Listing is no longer active" };
  }
  if (listing[0].sellerId === params.buyerId) {
    return { success: false, error: "Cannot buy your own listing" };
  }

  // Check expiration
  if (listing[0].expirationDate && new Date() > listing[0].expirationDate) {
    // Auto-cancel expired listing
    await db
      .update(marketplaceListings)
      .set({ status: "expired", cancelledAt: new Date() })
      .where(eq(marketplaceListings.id, params.listingId));
    return { success: false, error: "Listing has expired" };
  }

  const buyQuantity = params.quantity || listing[0].quantity;
  if (buyQuantity > listing[0].quantity) {
    return {
      success: false,
      error: `Only ${listing[0].quantity} units available`,
    };
  }

  const pricePerUnit = parseFloat(listing[0].pricePerUnit);
  const totalPrice = Math.round(pricePerUnit * buyQuantity * 100) / 100;

  // Get buyer
  const buyer = await db
    .select()
    .from(players)
    .where(eq(players.id, params.buyerId))
    .limit(1);

  if (!buyer[0]) return { success: false, error: "Buyer not found" };

  const buyerBalance = parseFloat(buyer[0].competitionWalletBalance || "0");
  if (buyerBalance < totalPrice) {
    return {
      success: false,
      error: `Insufficient funds. Need $${totalPrice}, have $${buyerBalance.toFixed(2)}`,
    };
  }

  // Calculate fees
  const platformFee = Math.round(totalPrice * MARKETPLACE_FEE_RATE * 100) / 100;
  const sellerProceeds = Math.round((totalPrice - platformFee) * 100) / 100;
  const originalCost = parseFloat(listing[0].originalCostPerUnit) * buyQuantity;
  const sellerProfit = Math.round((sellerProceeds - originalCost) * 100) / 100;

  // Get seller
  const seller = await db
    .select()
    .from(players)
    .where(eq(players.id, listing[0].sellerId))
    .limit(1);

  if (!seller[0]) return { success: false, error: "Seller not found" };

  // Deduct from buyer
  await db
    .update(players)
    .set({
      competitionWalletBalance: (buyerBalance - totalPrice).toFixed(2),
      totalExpenses: (
        parseFloat(buyer[0].totalExpenses || "0") + totalPrice
      ).toFixed(2),
    })
    .where(eq(players.id, params.buyerId));

  // Credit seller
  const sellerBalance = parseFloat(seller[0].competitionWalletBalance || "0");
  await db
    .update(players)
    .set({
      competitionWalletBalance: (sellerBalance + sellerProceeds).toFixed(2),
      totalRevenue: (
        parseFloat(seller[0].totalRevenue || "0") + sellerProceeds
      ).toFixed(2),
    })
    .where(eq(players.id, listing[0].sellerId));

  // Create warehouse inventory for buyer
  const newItemId = nanoid();
  await db.insert(warehouseInventory).values({
    id: newItemId,
    playerId: params.buyerId,
    productId: listing[0].productId,
    quantity: buyQuantity,
    purchasePrice: pricePerUnit.toString(),
    expirationDate: listing[0].expirationDate || new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    isExtraFresh: listing[0].isExtraFresh || false,
  });

  // Update listing
  const remainingQty = listing[0].quantity - buyQuantity;
  if (remainingQty <= 0) {
    // Fully sold
    await db
      .update(marketplaceListings)
      .set({
        status: "sold",
        soldAt: new Date(),
        buyerId: params.buyerId,
        buyerBrandName: buyer[0].brandName,
        platformFee: platformFee.toString(),
        quantity: 0,
      })
      .where(eq(marketplaceListings.id, params.listingId));
  } else {
    // Partially sold — update quantity
    await db
      .update(marketplaceListings)
      .set({ quantity: remainingQty })
      .where(eq(marketplaceListings.id, params.listingId));
  }

  // Record trade
  const tradeId = nanoid();
  await db.insert(marketplaceTrades).values({
    id: tradeId,
    listingId: params.listingId,
    sellerId: listing[0].sellerId,
    buyerId: params.buyerId,
    productId: listing[0].productId,
    quantity: buyQuantity,
    pricePerUnit: pricePerUnit.toString(),
    totalPrice: totalPrice.toString(),
    platformFee: platformFee.toString(),
    sellerProceeds: sellerProceeds.toString(),
    sellerProfit: sellerProfit.toString(),
  });

  const trade = await db
    .select()
    .from(marketplaceTrades)
    .where(eq(marketplaceTrades.id, tradeId))
    .limit(1);

  return { success: true, trade: trade[0] };
}

// ============================================================================
// BROWSING & SEARCH
// ============================================================================

/**
 * Browse active marketplace listings with filters.
 */
export async function browseListings(params: {
  category?: string;
  productId?: string;
  maxPrice?: number;
  minPrice?: number;
  excludeSellerId?: number;
  sortBy?: "price_asc" | "price_desc" | "newest" | "expiring_soon";
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return { listings: [], total: 0 };

  const conditions = [eq(marketplaceListings.status, "active")];

  if (params.productId) {
    conditions.push(eq(marketplaceListings.productId, params.productId));
  }

  if (params.excludeSellerId) {
    conditions.push(ne(marketplaceListings.sellerId, params.excludeSellerId));
  }

  if (params.maxPrice) {
    conditions.push(
      lte(marketplaceListings.pricePerUnit, params.maxPrice.toString())
    );
  }

  if (params.minPrice) {
    conditions.push(
      gte(marketplaceListings.pricePerUnit, params.minPrice.toString())
    );
  }

  // Don't show expired listings
  conditions.push(gte(marketplaceListings.expirationDate, new Date()));

  const whereClause = and(...conditions);

  // Get total count
  const countResult = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(marketplaceListings)
    .where(whereClause);

  const total = Number(countResult[0]?.count || 0);

  // Build query with sorting
  let query = db
    .select({
      id: marketplaceListings.id,
      sellerId: marketplaceListings.sellerId,
      sellerBrandName: marketplaceListings.sellerBrandName,
      productId: marketplaceListings.productId,
      productName: products.name,
      productCategory: products.category,
      productIcon: products.iconName,
      quantity: marketplaceListings.quantity,
      pricePerUnit: marketplaceListings.pricePerUnit,
      originalCostPerUnit: marketplaceListings.originalCostPerUnit,
      isExtraFresh: marketplaceListings.isExtraFresh,
      expirationDate: marketplaceListings.expirationDate,
      listedAt: marketplaceListings.listedAt,
    })
    .from(marketplaceListings)
    .leftJoin(products, eq(marketplaceListings.productId, products.id))
    .where(whereClause)
    .limit(params.limit || 20)
    .offset(params.offset || 0);

  // Apply sorting
  let sortedResults;
  switch (params.sortBy) {
    case "price_asc":
      sortedResults = await query.orderBy(asc(marketplaceListings.pricePerUnit));
      break;
    case "price_desc":
      sortedResults = await query.orderBy(desc(marketplaceListings.pricePerUnit));
      break;
    case "expiring_soon":
      sortedResults = await query.orderBy(asc(marketplaceListings.expirationDate));
      break;
    case "newest":
    default:
      sortedResults = await query.orderBy(desc(marketplaceListings.listedAt));
      break;
  }

  // Filter by category if specified (done post-join since category is on products table)
  let filteredResults = sortedResults;
  if (params.category) {
    filteredResults = sortedResults.filter(
      (r) => r.productCategory === params.category
    );
  }

  return { listings: filteredResults, total };
}

/**
 * Get a player's active listings.
 */
export async function getPlayerListings(playerId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      id: marketplaceListings.id,
      productId: marketplaceListings.productId,
      productName: products.name,
      productCategory: products.category,
      quantity: marketplaceListings.quantity,
      pricePerUnit: marketplaceListings.pricePerUnit,
      originalCostPerUnit: marketplaceListings.originalCostPerUnit,
      status: marketplaceListings.status,
      isExtraFresh: marketplaceListings.isExtraFresh,
      expirationDate: marketplaceListings.expirationDate,
      listedAt: marketplaceListings.listedAt,
      soldAt: marketplaceListings.soldAt,
      buyerBrandName: marketplaceListings.buyerBrandName,
      platformFee: marketplaceListings.platformFee,
    })
    .from(marketplaceListings)
    .leftJoin(products, eq(marketplaceListings.productId, products.id))
    .where(eq(marketplaceListings.sellerId, playerId))
    .orderBy(desc(marketplaceListings.listedAt));
}

/**
 * Get a player's trade history (both as buyer and seller).
 */
export async function getPlayerTradeHistory(
  playerId: number,
  role: "buyer" | "seller" | "both" = "both",
  limit: number = 50
) {
  const db = await getDb();
  if (!db) return [];

  let condition;
  if (role === "buyer") {
    condition = eq(marketplaceTrades.buyerId, playerId);
  } else if (role === "seller") {
    condition = eq(marketplaceTrades.sellerId, playerId);
  } else {
    condition = sql`(${marketplaceTrades.sellerId} = ${playerId} OR ${marketplaceTrades.buyerId} = ${playerId})`;
  }

  return db
    .select({
      id: marketplaceTrades.id,
      listingId: marketplaceTrades.listingId,
      sellerId: marketplaceTrades.sellerId,
      buyerId: marketplaceTrades.buyerId,
      productId: marketplaceTrades.productId,
      productName: products.name,
      quantity: marketplaceTrades.quantity,
      pricePerUnit: marketplaceTrades.pricePerUnit,
      totalPrice: marketplaceTrades.totalPrice,
      platformFee: marketplaceTrades.platformFee,
      sellerProceeds: marketplaceTrades.sellerProceeds,
      sellerProfit: marketplaceTrades.sellerProfit,
      completedAt: marketplaceTrades.completedAt,
    })
    .from(marketplaceTrades)
    .leftJoin(products, eq(marketplaceTrades.productId, products.id))
    .where(condition)
    .orderBy(desc(marketplaceTrades.completedAt))
    .limit(limit);
}

/**
 * Get marketplace analytics for a player.
 */
export async function getPlayerMarketplaceStats(playerId: number) {
  const db = await getDb();
  if (!db) {
    return {
      totalSales: 0,
      totalPurchases: 0,
      totalRevenue: 0,
      totalSpent: 0,
      totalProfit: 0,
      totalFeesPaid: 0,
      activeListings: 0,
    };
  }

  // Sales stats
  const salesStats = await db
    .select({
      count: sql<number>`COUNT(*)`,
      revenue: sql<number>`COALESCE(SUM(CAST(${marketplaceTrades.sellerProceeds} AS DECIMAL(12,2))), 0)`,
      profit: sql<number>`COALESCE(SUM(CAST(${marketplaceTrades.sellerProfit} AS DECIMAL(12,2))), 0)`,
      fees: sql<number>`COALESCE(SUM(CAST(${marketplaceTrades.platformFee} AS DECIMAL(12,2))), 0)`,
    })
    .from(marketplaceTrades)
    .where(eq(marketplaceTrades.sellerId, playerId));

  // Purchase stats
  const purchaseStats = await db
    .select({
      count: sql<number>`COUNT(*)`,
      spent: sql<number>`COALESCE(SUM(CAST(${marketplaceTrades.totalPrice} AS DECIMAL(12,2))), 0)`,
    })
    .from(marketplaceTrades)
    .where(eq(marketplaceTrades.buyerId, playerId));

  // Active listings count
  const activeCount = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(marketplaceListings)
    .where(
      and(
        eq(marketplaceListings.sellerId, playerId),
        eq(marketplaceListings.status, "active")
      )
    );

  return {
    totalSales: Number(salesStats[0]?.count || 0),
    totalPurchases: Number(purchaseStats[0]?.count || 0),
    totalRevenue: Number(salesStats[0]?.revenue || 0),
    totalSpent: Number(purchaseStats[0]?.spent || 0),
    totalProfit: Number(salesStats[0]?.profit || 0),
    totalFeesPaid: Number(salesStats[0]?.fees || 0),
    activeListings: Number(activeCount[0]?.count || 0),
  };
}

/**
 * Get a suggested listing price based on current market conditions.
 */
export async function getSuggestedPrice(productId: string): Promise<{
  marketPrice: number;
  suggestedMin: number;
  suggestedMax: number;
  suggestedPrice: number;
  recentAvgTradePrice: number | null;
}> {
  const db = await getDb();
  if (!db) {
    return {
      marketPrice: 0,
      suggestedMin: 0,
      suggestedMax: 0,
      suggestedPrice: 0,
      recentAvgTradePrice: null,
    };
  }

  // Get current market price
  const marketPriceRow = await db
    .select()
    .from(productMarketPrices)
    .where(eq(productMarketPrices.productId, productId))
    .limit(1);

  const product = await db
    .select()
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  const marketPrice = marketPriceRow[0]
    ? parseFloat(marketPriceRow[0].currentPrice)
    : product[0]
    ? parseFloat(product[0].baseCost)
    : 1.0;

  // Get recent trade average
  const recentTrades = await db
    .select({
      avgPrice: sql<number>`AVG(CAST(${marketplaceTrades.pricePerUnit} AS DECIMAL(8,2)))`,
    })
    .from(marketplaceTrades)
    .where(eq(marketplaceTrades.productId, productId));

  const recentAvgTradePrice = recentTrades[0]?.avgPrice
    ? Math.round(Number(recentTrades[0].avgPrice) * 100) / 100
    : null;

  // Suggested price: slightly above market price (10% markup for profit)
  const suggestedPrice = Math.round(marketPrice * 1.1 * 100) / 100;
  const suggestedMin = Math.round(marketPrice * 0.8 * 100) / 100;
  const suggestedMax = Math.round(marketPrice * 1.5 * 100) / 100;

  return {
    marketPrice,
    suggestedMin,
    suggestedMax,
    suggestedPrice,
    recentAvgTradePrice,
  };
}

/**
 * Auto-cancel expired marketplace listings.
 * Returns inventory to sellers' warehouses.
 * Should be called by a cron job.
 */
export async function cleanupExpiredListings(): Promise<{
  cancelled: number;
  returned: number;
}> {
  const db = await getDb();
  if (!db) return { cancelled: 0, returned: 0 };

  const now = new Date();

  // Find expired active listings
  const expiredListings = await db
    .select()
    .from(marketplaceListings)
    .where(
      and(
        eq(marketplaceListings.status, "active"),
        lte(marketplaceListings.expirationDate, now)
      )
    );

  let returnedCount = 0;

  for (const listing of expiredListings) {
    // Return inventory to warehouse
    const existingItem = await db
      .select()
      .from(warehouseInventory)
      .where(eq(warehouseInventory.id, listing.warehouseItemId))
      .limit(1);

    // Only return if the product hasn't expired
    const productExpired = listing.expirationDate && listing.expirationDate < now;

    if (!productExpired) {
      if (existingItem[0]) {
        await db
          .update(warehouseInventory)
          .set({
            quantity: (existingItem[0].quantity || 0) + listing.quantity,
          })
          .where(eq(warehouseInventory.id, listing.warehouseItemId));
      } else {
        await db.insert(warehouseInventory).values({
          id: listing.warehouseItemId,
          playerId: listing.sellerId,
          productId: listing.productId,
          quantity: listing.quantity,
          purchasePrice: listing.originalCostPerUnit,
          expirationDate: listing.expirationDate || new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          isExtraFresh: listing.isExtraFresh || false,
        });
      }
      returnedCount++;
    }

    // Mark listing as expired
    await db
      .update(marketplaceListings)
      .set({ status: "expired", cancelledAt: now })
      .where(eq(marketplaceListings.id, listing.id));
  }

  return { cancelled: expiredListings.length, returned: returnedCount };
}

/**
 * Get the top marketplace sellers by total profit.
 */
export async function getTopSellers(limit: number = 10) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      sellerId: marketplaceTrades.sellerId,
      brandName: players.brandName,
      totalTrades: sql<number>`COUNT(*)`,
      totalRevenue: sql<number>`SUM(CAST(${marketplaceTrades.sellerProceeds} AS DECIMAL(12,2)))`,
      totalProfit: sql<number>`SUM(CAST(${marketplaceTrades.sellerProfit} AS DECIMAL(12,2)))`,
    })
    .from(marketplaceTrades)
    .leftJoin(players, eq(marketplaceTrades.sellerId, players.id))
    .groupBy(marketplaceTrades.sellerId, players.brandName)
    .orderBy(desc(sql`SUM(CAST(${marketplaceTrades.sellerProfit} AS DECIMAL(12,2)))`))
    .limit(limit);
}
