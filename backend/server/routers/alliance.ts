/**
 * Alliance tRPC Router
 * ====================
 * Handles all alliance operations: creation, member management,
 * role-based permissions, treasury, invites, and chat.
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as AllianceEngine from "../engines/alliance";

export const allianceRouter = router({
  // ========================================================================
  // ALLIANCE CRUD
  // ========================================================================

  /** Create a new alliance. Player must not already be in one. */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(3).max(30),
        brandName: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return AllianceEngine.createAlliance(
        ctx.user.id,
        input.name,
        input.brandName
      );
    }),

  /** Get detailed info about an alliance. */
  getDetails: protectedProcedure
    .input(z.object({ allianceId: z.string() }))
    .query(async ({ input }) => {
      return AllianceEngine.getAllianceDetails(input.allianceId);
    }),

  /** List all alliances sorted by treasury balance. */
  list: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).default(50),
          offset: z.number().min(0).default(0),
        })
        .optional()
    )
    .query(async ({ input }) => {
      return AllianceEngine.listAlliances(input?.limit, input?.offset);
    }),

  /** Search alliances by name. */
  search: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1).max(50),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ input }) => {
      return AllianceEngine.searchAlliances(input.query, input.limit);
    }),

  /** Disband an alliance. Only the leader can do this. Treasury must be empty. */
  disband: protectedProcedure
    .input(z.object({ allianceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return AllianceEngine.disbandAlliance(input.allianceId, ctx.user.id);
    }),

  // ========================================================================
  // MEMBER MANAGEMENT
  // ========================================================================

  /** Get the current player's alliance (if any). */
  myAlliance: protectedProcedure.query(async ({ ctx }) => {
    return AllianceEngine.getPlayerAlliance(ctx.user.id);
  }),

  /** Get all members of an alliance with player details. */
  getMembers: protectedProcedure
    .input(z.object({ allianceId: z.string() }))
    .query(async ({ input }) => {
      return AllianceEngine.getAllianceMembers(input.allianceId);
    }),

  /** Leave the current alliance. Leaders must transfer leadership first. */
  leave: protectedProcedure
    .input(
      z.object({
        allianceId: z.string(),
        brandName: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return AllianceEngine.leaveAlliance(
        input.allianceId,
        ctx.user.id,
        input.brandName
      );
    }),

  /** Kick a member from the alliance. Requires officer+ rank and outranking the target. */
  kick: protectedProcedure
    .input(
      z.object({
        allianceId: z.string(),
        targetPlayerId: z.number(),
        kickerBrandName: z.string(),
        targetBrandName: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return AllianceEngine.kickMember(
        input.allianceId,
        ctx.user.id,
        input.targetPlayerId,
        input.kickerBrandName,
        input.targetBrandName
      );
    }),

  /** Promote a member to a higher role. Only the leader can promote. */
  promote: protectedProcedure
    .input(
      z.object({
        allianceId: z.string(),
        targetPlayerId: z.number(),
        targetBrandName: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return AllianceEngine.promoteMember(
        input.allianceId,
        ctx.user.id,
        input.targetPlayerId,
        input.targetBrandName
      );
    }),

  /** Demote a member to a lower role. Only the leader can demote. */
  demote: protectedProcedure
    .input(
      z.object({
        allianceId: z.string(),
        targetPlayerId: z.number(),
        targetBrandName: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return AllianceEngine.demoteMember(
        input.allianceId,
        ctx.user.id,
        input.targetPlayerId,
        input.targetBrandName
      );
    }),

  /** Transfer leadership to another member. Current leader becomes officer. */
  transferLeadership: protectedProcedure
    .input(
      z.object({
        allianceId: z.string(),
        newLeaderId: z.number(),
        currentLeaderBrandName: z.string(),
        newLeaderBrandName: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return AllianceEngine.transferLeadership(
        input.allianceId,
        ctx.user.id,
        input.newLeaderId,
        input.currentLeaderBrandName,
        input.newLeaderBrandName
      );
    }),

  // ========================================================================
  // INVITE SYSTEM
  // ========================================================================

  /** Send an invite to a player to join the alliance. */
  sendInvite: protectedProcedure
    .input(
      z.object({
        allianceId: z.string(),
        inviteeId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return AllianceEngine.sendInvite(
        input.allianceId,
        ctx.user.id,
        input.inviteeId
      );
    }),

  /** Accept an invite and join the alliance. */
  acceptInvite: protectedProcedure
    .input(
      z.object({
        inviteId: z.string(),
        brandName: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return AllianceEngine.acceptInvite(
        input.inviteId,
        ctx.user.id,
        input.brandName
      );
    }),

  /** Decline an invite. */
  declineInvite: protectedProcedure
    .input(z.object({ inviteId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return AllianceEngine.declineInvite(input.inviteId, ctx.user.id);
    }),

  /** Get pending invites for the current player. */
  myInvites: protectedProcedure.query(async ({ ctx }) => {
    return AllianceEngine.getPlayerInvites(ctx.user.id);
  }),

  /** Get pending invites sent by the alliance. */
  pendingInvites: protectedProcedure
    .input(z.object({ allianceId: z.string() }))
    .query(async ({ input }) => {
      return AllianceEngine.getAlliancePendingInvites(input.allianceId);
    }),

  /** Cancel a pending invite. */
  cancelInvite: protectedProcedure
    .input(
      z.object({
        inviteId: z.string(),
        allianceId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return AllianceEngine.cancelInvite(
        input.inviteId,
        input.allianceId,
        ctx.user.id
      );
    }),

  // ========================================================================
  // TREASURY
  // ========================================================================

  /** Deposit funds from competition wallet into alliance treasury. */
  treasuryDeposit: protectedProcedure
    .input(
      z.object({
        allianceId: z.string(),
        amount: z.number().positive(),
        brandName: z.string(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return AllianceEngine.depositToTreasury(
        input.allianceId,
        ctx.user.id,
        input.brandName,
        input.amount,
        input.reason
      );
    }),

  /** Withdraw funds from alliance treasury to competition wallet. Officers+ only. */
  treasuryWithdraw: protectedProcedure
    .input(
      z.object({
        allianceId: z.string(),
        amount: z.number().positive(),
        brandName: z.string(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return AllianceEngine.withdrawFromTreasury(
        input.allianceId,
        ctx.user.id,
        input.brandName,
        input.amount,
        input.reason
      );
    }),

  /** Get treasury transaction history. */
  treasuryHistory: protectedProcedure
    .input(
      z.object({
        allianceId: z.string(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      return AllianceEngine.getTreasuryHistory(
        input.allianceId,
        input.limit,
        input.offset
      );
    }),

  /** Get contribution leaderboard for the alliance. */
  contributionLeaderboard: protectedProcedure
    .input(z.object({ allianceId: z.string() }))
    .query(async ({ input }) => {
      return AllianceEngine.getContributionLeaderboard(input.allianceId);
    }),

  // ========================================================================
  // CHAT
  // ========================================================================

  /** Send a chat message in the alliance. */
  sendMessage: protectedProcedure
    .input(
      z.object({
        allianceId: z.string(),
        senderName: z.string(),
        content: z.string().min(1).max(500),
        messageType: z.enum(["chat", "announcement"]).default("chat"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return AllianceEngine.sendChatMessage(
        input.allianceId,
        ctx.user.id,
        input.senderName,
        input.content,
        input.messageType
      );
    }),

  /** Get chat message history for the alliance. */
  chatHistory: protectedProcedure
    .input(
      z.object({
        allianceId: z.string(),
        limit: z.number().min(1).max(100).default(50),
        beforeId: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      return AllianceEngine.getChatHistory(
        input.allianceId,
        input.limit,
        input.beforeId
      );
    }),

  /** Delete a chat message. Members can delete their own; officers+ can delete any. */
  deleteMessage: protectedProcedure
    .input(
      z.object({
        messageId: z.string(),
        allianceId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return AllianceEngine.deleteChatMessage(
        input.messageId,
        input.allianceId,
        ctx.user.id
      );
    }),
});
