/**
 * VendFX Compliance tRPC Router
 *
 * Handles all compliance-related API endpoints:
 * - KYC verification submission and status
 * - Geo-blocking checks
 * - Responsible gaming limits
 * - Self-exclusion management
 * - GDPR data export and account deletion
 * - Data retention policy
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  submitKycVerification,
  checkGeoCompliance,
  getRestrictedStates,
  setSpendingLimits,
  getSpendingStatus,
  activateSelfExclusion,
  getKycStatus,
  runComplianceCheck,
  RESTRICTED_STATES,
} from "../engines/compliance";
import { exportPlayerData, deletePlayerAccount, getDataRetentionPolicy } from "../engines/gdpr";
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
    throw new TRPCError({ code: "NOT_FOUND", message: "Player profile not found." });
  }

  return result[0];
}

export const complianceRouter = router({
  // ============================================================================
  // KYC VERIFICATION
  // ============================================================================

  /**
   * Submit KYC verification documents.
   */
  submitKyc: protectedProcedure
    .input(
      z.object({
        idDocumentUrl: z.string().url(),
        ssnLastFour: z.string().length(4),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const player = await getPlayerFromUser(ctx.user.id);

        return await submitKycVerification(
          player.id,
          input.idDocumentUrl,
          input.ssnLastFour
        );
      } catch (error: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error.message ?? "KYC submission failed",
        });
      }
    }),

  /**
   * Get current compliance status for the player.
   */
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const player = await getPlayerFromUser(ctx.user.id);
    const kyc = await getKycStatus(player.id);
    const spending = await getSpendingStatus(player.id);
    return { kyc, spending };
  }),

  // ============================================================================
  // GEO-BLOCKING
  // ============================================================================

  /**
   * Check if a state is restricted.
   */
  checkState: protectedProcedure
    .input(z.object({ stateCode: z.string().length(2) }))
    .query(({ input }) => {
      return checkGeoCompliance(input.stateCode);
    }),

  /**
   * Get list of all restricted states.
   */
  getRestrictedStates: protectedProcedure.query(() => {
    const states = getRestrictedStates();
    return {
      restrictedStates: states,
      count: states.length,
    };
  }),

  // ============================================================================
  // RESPONSIBLE GAMING
  // ============================================================================

  /**
   * Set responsible gaming spending limits.
   */
  setLimits: protectedProcedure
    .input(
      z.object({
        dailyLimit: z.number().positive().nullable().optional(),
        weeklyLimit: z.number().positive().nullable().optional(),
        monthlyLimit: z.number().positive().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const player = await getPlayerFromUser(ctx.user.id);

        return await setSpendingLimits(player.id, {
          dailyLimit: input.dailyLimit ?? null,
          weeklyLimit: input.weeklyLimit ?? null,
          monthlyLimit: input.monthlyLimit ?? null,
        });
      } catch (error: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error.message ?? "Failed to set limits",
        });
      }
    }),

  /**
   * Activate self-exclusion for a specified period.
   */
  selfExclude: protectedProcedure
    .input(
      z.object({
        period: z.enum(["24h", "7d", "30d", "permanent"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const player = await getPlayerFromUser(ctx.user.id);
        return await activateSelfExclusion(player.id, input.period);
      } catch (error: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error.message ?? "Failed to set self-exclusion",
        });
      }
    }),

  /**
   * Run a full compliance check for a specific action.
   */
  runCheck: protectedProcedure
    .input(
      z.object({
        action: z.enum(["deposit", "withdraw", "season_entry"]),
        amount: z.number().default(0),
        stateCode: z.string().length(2).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const player = await getPlayerFromUser(ctx.user.id);
      return await runComplianceCheck(
        player.id,
        input.action,
        input.amount,
        input.stateCode
      );
    }),

  // ============================================================================
  // GDPR
  // ============================================================================

  /**
   * Export all player data (GDPR right to portability).
   */
  exportData: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      const player = await getPlayerFromUser(ctx.user.id);
      return await exportPlayerData(player.id, ctx.user.id);
    } catch (error: any) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error.message ?? "Failed to export data",
      });
    }
  }),

  /**
   * Delete player account (GDPR right to erasure).
   * This is irreversible.
   */
  deleteAccount: protectedProcedure
    .input(
      z.object({
        confirmPhrase: z.literal("DELETE MY ACCOUNT"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const player = await getPlayerFromUser(ctx.user.id);
        return await deletePlayerAccount(player.id, ctx.user.id);
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message ?? "Failed to delete account",
        });
      }
    }),

  /**
   * Get data retention policy.
   */
  getRetentionPolicy: protectedProcedure.query(() => {
    return getDataRetentionPolicy();
  }),

  // ============================================================================
  // ADMIN ENDPOINTS
  // ============================================================================

  /**
   * Admin: Approve or reject KYC verification.
   */
  adminReviewKyc: protectedProcedure
    .input(
      z.object({
        playerId: z.number(),
        approved: z.boolean(),
        rejectionReason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const newStatus = input.approved ? "verified" : "rejected";

      await db
        .update(players)
        .set({ kycStatus: newStatus })
        .where(eq(players.id, input.playerId));

      return {
        success: true,
        playerId: input.playerId,
        newStatus,
        message: input.approved
          ? "KYC verification approved"
          : `KYC verification rejected: ${input.rejectionReason ?? "No reason provided"}`,
      };
    }),
});
