/**
 * VendFX Player Marketplace tRPC Router
 *
 * Provides procedures for player-to-player inventory trading:
 * - List surplus inventory for sale
 * - Browse and buy from other players
 * - Cancel listings
 * - View trade history and analytics
 * - Get price suggestions
 * - Leaderboard: top sellers
 */

import { z } from "zod";
import { protectedProcedure, adminProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  createListing,
  cancelListing,
  purchaseListing,
  browseListings,
  getPlayerListings,
  getPlayerTradeHistory,
  getPlayerMarketplaceStats,
  getSuggestedPrice,
  cleanupExpiredListings,
  getTopSellers,
} from "../engines/playerMarketplace";
import { getDb } from "../db";
import { players } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export const marketplaceRouter = router({
  /**
   * List surplus inventory for sale on the player marketplace.
   * Deducts quantity from warehouse and creates an active listing.
   */
  createListing: protectedProcedure
    .input(
      z.object({
        warehouseItemId: z.string(),
        quantity: z.number().min(1),
        pricePerUnit: z.number().min(0.01),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const player = await db
        .select()
        .from(players)
        .where(eq(players.userId, ctx.user.id))
        .limit(1);

      if (!player[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Player profile not found",
        });
      }

      const result = await createListing({
        sellerId: player[0].id,
        warehouseItemId: input.warehouseItemId,
        quantity: input.quantity,
        pricePerUnit: input.pricePerUnit,
      });

      if (!result.success) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: result.error || "Failed to create listing",
        });
      }

      return result.listing;
    }),

  /**
   * Cancel an active listing and return inventory to warehouse.
   */
  cancelListing: protectedProcedure
    .input(z.object({ listingId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const player = await db
        .select()
        .from(players)
        .where(eq(players.userId, ctx.user.id))
        .limit(1);

      if (!player[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Player profile not found",
        });
      }

      const result = await cancelListing(player[0].id, input.listingId);

      if (!result.success) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: result.error || "Failed to cancel listing",
        });
      }

      return { success: true };
    }),

  /**
   * Purchase a listing from another player.
   * Deducts from buyer's wallet, credits seller, creates warehouse item for buyer.
   */
  buy: protectedProcedure
    .input(
      z.object({
        listingId: z.string(),
        quantity: z.number().min(1).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const player = await db
        .select()
        .from(players)
        .where(eq(players.userId, ctx.user.id))
        .limit(1);

      if (!player[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Player profile not found",
        });
      }

      const result = await purchaseListing({
        buyerId: player[0].id,
        listingId: input.listingId,
        quantity: input.quantity,
      });

      if (!result.success) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: result.error || "Purchase failed",
        });
      }

      return result.trade;
    }),

  /**
   * Browse active marketplace listings with filters and sorting.
   */
  browse: protectedProcedure
    .input(
      z.object({
        category: z.string().optional(),
        productId: z.string().optional(),
        maxPrice: z.number().optional(),
        minPrice: z.number().optional(),
        excludeOwn: z.boolean().default(true),
        sortBy: z
          .enum(["price_asc", "price_desc", "newest", "expiring_soon"])
          .default("newest"),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      let excludeSellerId: number | undefined;

      if (input.excludeOwn) {
        const db = await getDb();
        if (db) {
          const player = await db
            .select()
            .from(players)
            .where(eq(players.userId, ctx.user.id))
            .limit(1);
          excludeSellerId = player[0]?.id;
        }
      }

      return browseListings({
        category: input.category,
        productId: input.productId,
        maxPrice: input.maxPrice,
        minPrice: input.minPrice,
        excludeSellerId,
        sortBy: input.sortBy,
        limit: input.limit,
        offset: input.offset,
      });
    }),

  /**
   * Get the current player's active and past listings.
   */
  myListings: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];

    const player = await db
      .select()
      .from(players)
      .where(eq(players.userId, ctx.user.id))
      .limit(1);

    if (!player[0]) return [];

    return getPlayerListings(player[0].id);
  }),

  /**
   * Get the current player's trade history.
   */
  myTrades: protectedProcedure
    .input(
      z.object({
        role: z.enum(["buyer", "seller", "both"]).default("both"),
        limit: z.number().min(1).max(200).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      const player = await db
        .select()
        .from(players)
        .where(eq(players.userId, ctx.user.id))
        .limit(1);

      if (!player[0]) return [];

      return getPlayerTradeHistory(player[0].id, input.role, input.limit);
    }),

  /**
   * Get the current player's marketplace analytics.
   */
  myStats: protectedProcedure.query(async ({ ctx }) => {
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

    const player = await db
      .select()
      .from(players)
      .where(eq(players.userId, ctx.user.id))
      .limit(1);

    if (!player[0]) {
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

    return getPlayerMarketplaceStats(player[0].id);
  }),

  /**
   * Get a suggested price for listing a product.
   * Based on current market price and recent trade history.
   */
  getSuggestedPrice: protectedProcedure
    .input(z.object({ productId: z.string() }))
    .query(async ({ input }) => {
      return getSuggestedPrice(input.productId);
    }),

  /**
   * Get the top marketplace sellers leaderboard.
   */
  topSellers: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(10) }))
    .query(async ({ input }) => {
      return getTopSellers(input.limit);
    }),

  // ============================================================================
  // ADMIN PROCEDURES
  // ============================================================================

  /**
   * Admin: Cleanup expired marketplace listings.
   * Returns unsold inventory to sellers' warehouses.
   */
  adminCleanupExpired: adminProcedure.mutation(async () => {
    const result = await cleanupExpiredListings();
    return {
      message: `Cancelled ${result.cancelled} expired listings, returned ${result.returned} items to warehouses`,
      ...result,
    };
  }),
});
