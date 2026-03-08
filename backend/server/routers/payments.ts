/**
 * VendFX Payments tRPC Router
 *
 * Handles all payment-related API endpoints:
 * - Deposit via Stripe Checkout
 * - Withdrawal requests
 * - Wallet balance queries
 * - Wallet transfers
 * - Transaction history
 * - Admin: approve/reject withdrawals
 * - Tax reporting (1099)
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  createDepositSession,
  requestWithdrawal,
  approveWithdrawal,
  rejectWithdrawal,
  getWalletBalances,
  transferBetweenWallets,
  getTransactionHistory,
  calculateAnnualWinnings,
} from "../engines/payments";
import { getDb } from "../db";
import { players } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

// Helper to get player from user
async function getPlayerFromUser(userId: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

  const result = await db
    .select()
    .from(players)
    .where(eq(players.userId, userId))
    .limit(1);

  if (result.length === 0) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Player profile not found. Please create a profile first." });
  }

  return result[0];
}

export const paymentsRouter = router({
  /**
   * Create a Stripe Checkout session for depositing funds.
   */
  createDeposit: protectedProcedure
    .input(
      z.object({
        amount: z.number().min(5).max(10000),
        walletType: z.enum(["competition", "premium"]),
        stateCode: z.string().length(2).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const player = await getPlayerFromUser(ctx.user.id);

        const result = await createDepositSession({
          playerId: player.id,
          userId: ctx.user.id,
          userEmail: ctx.user.email ?? "",
          userName: ctx.user.name ?? "",
          amount: input.amount,
          walletType: input.walletType,
          stateCode: input.stateCode,
          origin: ctx.req.headers.origin ?? `${ctx.req.protocol}://${ctx.req.get("host")}`,
        });

        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error.message ?? "Failed to create deposit session",
        });
      }
    }),

  /**
   * Request a withdrawal from a wallet.
   */
  requestWithdrawal: protectedProcedure
    .input(
      z.object({
        amount: z.number().min(10),
        walletType: z.enum(["competition", "premium"]),
        stateCode: z.string().length(2).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const player = await getPlayerFromUser(ctx.user.id);

        return await requestWithdrawal({
          playerId: player.id,
          amount: input.amount,
          walletType: input.walletType,
          stateCode: input.stateCode,
        });
      } catch (error: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error.message ?? "Failed to request withdrawal",
        });
      }
    }),

  /**
   * Get wallet balances.
   */
  getBalances: protectedProcedure.query(async ({ ctx }) => {
    const player = await getPlayerFromUser(ctx.user.id);
    return await getWalletBalances(player.id);
  }),

  /**
   * Transfer funds between wallets.
   */
  transfer: protectedProcedure
    .input(
      z.object({
        fromWallet: z.enum(["competition", "premium"]),
        toWallet: z.enum(["competition", "premium"]),
        amount: z.number().positive(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const player = await getPlayerFromUser(ctx.user.id);

        return await transferBetweenWallets(
          player.id,
          input.fromWallet,
          input.toWallet,
          input.amount
        );
      } catch (error: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error.message ?? "Transfer failed",
        });
      }
    }),

  /**
   * Get transaction history.
   */
  getHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
        type: z.string().optional(),
        walletType: z.enum(["competition", "premium"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const player = await getPlayerFromUser(ctx.user.id);
      return await getTransactionHistory(player.id, input);
    }),

  /**
   * Get annual tax summary for 1099 reporting.
   */
  getTaxSummary: protectedProcedure
    .input(
      z.object({
        year: z.number().min(2024).max(2030),
      })
    )
    .query(async ({ ctx, input }) => {
      const player = await getPlayerFromUser(ctx.user.id);
      return await calculateAnnualWinnings(player.id, input.year);
    }),

  // ============================================================================
  // ADMIN ENDPOINTS
  // ============================================================================

  /**
   * Admin: Approve a pending withdrawal.
   */
  adminApproveWithdrawal: protectedProcedure
    .input(z.object({ transactionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      try {
        return await approveWithdrawal(input.transactionId);
      } catch (error: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error.message ?? "Failed to approve withdrawal",
        });
      }
    }),

  /**
   * Admin: Reject a pending withdrawal.
   */
  adminRejectWithdrawal: protectedProcedure
    .input(
      z.object({
        transactionId: z.string(),
        reason: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      try {
        return await rejectWithdrawal(input.transactionId, input.reason);
      } catch (error: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error.message ?? "Failed to reject withdrawal",
        });
      }
    }),
});
