/**
 * VendFX Wholesale Market tRPC Router
 *
 * Provides procedures for:
 * - Browsing current market prices
 * - Purchasing from wholesale
 * - Viewing price history and trends
 * - Getting active market events
 * - Getting optimal selling price suggestions
 * - Admin: triggering market events, running price fluctuations
 */

import { z } from "zod";
import { protectedProcedure, adminProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  getMarketPrices,
  getProductPriceHistory,
  getActiveMarketEvents,
  purchaseFromWholesale,
  runDailyPriceFluctuation,
  triggerRandomMarketEvent,
  purgeExpiredInventory,
  calculateOptimalSellingPrice,
  getDemandMultiplier,
  calculateFreshnessMultiplier,
  daysUntilExpiration,
  PRODUCT_CATEGORIES,
  DEMOGRAPHIC_PROFILES,
} from "../engines/wholesaleMarket";
import { getDb } from "../db";
import { players } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export const marketRouter = router({
  /**
   * Get current wholesale market prices for all products.
   * Includes price direction, change %, and last update time.
   */
  getPrices: protectedProcedure.query(async () => {
    const prices = await getMarketPrices();
    return prices;
  }),

  /**
   * Get price history for a specific product (for charts).
   */
  getPriceHistory: protectedProcedure
    .input(
      z.object({
        productId: z.string(),
        limit: z.number().min(1).max(365).default(30),
      })
    )
    .query(async ({ input }) => {
      return getProductPriceHistory(input.productId, input.limit);
    }),

  /**
   * Get currently active global market events.
   */
  getActiveEvents: protectedProcedure.query(async () => {
    return getActiveMarketEvents();
  }),

  /**
   * Get available product categories and demographic profiles.
   * Useful for frontend dropdowns and filters.
   */
  getMetadata: protectedProcedure.query(() => {
    return {
      categories: PRODUCT_CATEGORIES,
      demographics: DEMOGRAPHIC_PROFILES,
    };
  }),

  /**
   * Get the demand multiplier for a product category at a specific demographic.
   */
  getDemand: protectedProcedure
    .input(
      z.object({
        demographic: z.string(),
        category: z.string(),
      })
    )
    .query(({ input }) => {
      const multiplier = getDemandMultiplier(input.demographic, input.category);
      return {
        demographic: input.demographic,
        category: input.category,
        demandMultiplier: multiplier,
        demandLevel:
          multiplier >= 1.4
            ? "very_high"
            : multiplier >= 1.2
            ? "high"
            : multiplier >= 0.9
            ? "normal"
            : multiplier >= 0.6
            ? "low"
            : "very_low",
      };
    }),

  /**
   * Get the optimal selling price for a product at a specific machine location.
   * Combines market price + demand + freshness + active events.
   */
  getOptimalPrice: protectedProcedure
    .input(
      z.object({
        productId: z.string(),
        demographic: z.string(),
        category: z.string(),
        isExtraFresh: z.boolean().default(false),
        daysOld: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const prices = await getMarketPrices();
      const product = prices.find((p) => p.productId === input.productId);
      if (!product) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found",
        });
      }

      const activeEvents = await getActiveMarketEvents();

      return calculateOptimalSellingPrice({
        marketPrice: parseFloat(product.currentPrice as string),
        demographic: input.demographic,
        category: input.category,
        isExtraFresh: input.isExtraFresh,
        daysOld: input.daysOld,
        activeEvents: activeEvents.map((e) => ({
          affectedCategories: e.affectedCategories || "",
          priceMultiplier: e.priceMultiplier || 1,
        })),
      });
    }),

  /**
   * Purchase products from the wholesale market.
   * Deducts from player's competition wallet and creates warehouse inventory.
   */
  purchase: protectedProcedure
    .input(
      z.object({
        productId: z.string(),
        quantity: z.number().min(1).max(1000),
        isExtraFresh: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Get player
      const player = await db
        .select()
        .from(players)
        .where(eq(players.userId, ctx.user.id))
        .limit(1);

      if (!player[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Player profile not found. Create a profile first.",
        });
      }

      // Purchase from wholesale
      const result = await purchaseFromWholesale(
        player[0].id,
        input.productId,
        input.quantity,
        input.isExtraFresh
      );

      if (!result.success) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: result.error || "Purchase failed",
        });
      }

      // Deduct cost from competition wallet
      const balance = parseFloat(player[0].competitionWalletBalance || "0");
      const cost = result.totalCost || 0;

      if (balance < cost) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Insufficient funds. Need $${cost}, have $${balance.toFixed(2)}`,
        });
      }

      await db
        .update(players)
        .set({
          competitionWalletBalance: (balance - cost).toFixed(2),
          totalExpenses: (
            parseFloat(player[0].totalExpenses || "0") + cost
          ).toFixed(2),
        })
        .where(eq(players.id, player[0].id));

      return {
        item: result.item,
        totalCost: cost,
        remainingBalance: Math.round((balance - cost) * 100) / 100,
      };
    }),

  /**
   * Get freshness info for a product.
   */
  getFreshnessInfo: protectedProcedure
    .input(
      z.object({
        isExtraFresh: z.boolean(),
        daysOld: z.number().min(0),
        expirationDate: z.string().optional(),
      })
    )
    .query(({ input }) => {
      const multiplier = calculateFreshnessMultiplier(input.isExtraFresh, input.daysOld);
      const daysLeft = input.expirationDate
        ? daysUntilExpiration(new Date(input.expirationDate))
        : null;

      return {
        freshnessMultiplier: multiplier,
        freshnessLevel:
          multiplier >= 1.15
            ? "extra_fresh"
            : multiplier >= 1.05
            ? "fresh"
            : multiplier >= 0.95
            ? "normal"
            : multiplier >= 0.7
            ? "aging"
            : "stale",
        daysUntilExpiration: daysLeft,
        isExpired: daysLeft !== null && daysLeft < 0,
        priceImpact: `${multiplier >= 1 ? "+" : ""}${Math.round((multiplier - 1) * 100)}%`,
      };
    }),

  // ============================================================================
  // ADMIN PROCEDURES
  // ============================================================================

  /**
   * Admin: Manually trigger daily price fluctuation cycle.
   */
  adminRunPriceFluctuation: adminProcedure.mutation(async () => {
    const result = await runDailyPriceFluctuation();
    return {
      message: `Updated ${result.updated} product prices`,
      activeEvents: result.events,
    };
  }),

  /**
   * Admin: Trigger a random market event.
   */
  adminTriggerEvent: adminProcedure.mutation(async () => {
    const result = await triggerRandomMarketEvent();
    return {
      message: `Triggered event: ${result.event.eventName}`,
      event: result.event,
      id: result.id,
    };
  }),

  /**
   * Admin: Purge expired inventory from all warehouses and machines.
   */
  adminPurgeExpired: adminProcedure.mutation(async () => {
    const result = await purgeExpiredInventory();
    return {
      message: `Purged ${result.warehouseExpired} warehouse items and ${result.machineExpired} machine items`,
      ...result,
    };
  }),
});
