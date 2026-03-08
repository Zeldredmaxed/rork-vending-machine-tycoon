/**
 * VendFX Real-Time Admin tRPC Router
 *
 * Provides admin procedures for monitoring WebSocket connections
 * and broadcasting system-wide notifications.
 */

import { z } from "zod";
import { protectedProcedure, adminProcedure, router } from "../_core/trpc";
import { getConnectionStats, SOCKET_EVENTS } from "../realtime/socketServer";
import { emitGlobalNotification } from "../realtime/eventBridge";

export const realtimeRouter = router({
  /**
   * Get current WebSocket connection statistics.
   * Available to authenticated users for their own connection info.
   */
  connectionStats: protectedProcedure.query(() => {
    return getConnectionStats();
  }),

  /**
   * Get available event names for client reference.
   */
  eventNames: protectedProcedure.query(() => {
    return SOCKET_EVENTS;
  }),

  // ============================================================================
  // ADMIN PROCEDURES
  // ============================================================================

  /**
   * Admin: Broadcast a global notification to all connected players.
   */
  adminBroadcastNotification: adminProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200),
        message: z.string().min(1).max(1000),
        type: z.enum(["info", "warning", "success", "error"]).default("info"),
      })
    )
    .mutation(({ input }) => {
      emitGlobalNotification(input.title, input.message, input.type);
      return {
        success: true,
        message: `Notification broadcast to all connected players`,
      };
    }),

  /**
   * Admin: Get detailed connection stats including room breakdown.
   */
  adminDetailedStats: adminProcedure.query(() => {
    const stats = getConnectionStats();
    return {
      ...stats,
      roomBreakdown: {
        playerRooms: Object.entries(stats.rooms).filter(([k]) =>
          k.startsWith("player:")
        ).length,
        allianceRooms: Object.entries(stats.rooms).filter(([k]) =>
          k.startsWith("alliance:")
        ).length,
        seasonRooms: Object.entries(stats.rooms).filter(([k]) =>
          k.startsWith("season:")
        ).length,
        machineRooms: Object.entries(stats.rooms).filter(([k]) =>
          k.startsWith("machine:")
        ).length,
        marketSubscribers: stats.rooms["market"] || 0,
        leaderboardSubscribers: stats.rooms["leaderboard"] || 0,
      },
    };
  }),
});
