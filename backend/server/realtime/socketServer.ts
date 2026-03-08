/**
 * VendFX Socket.io Real-Time Server
 *
 * Handles WebSocket connections with JWT authentication,
 * room management for players/alliances/seasons, and
 * event broadcasting for all game systems.
 *
 * Room structure:
 *   player:{playerId}       — Personal events (wallet updates, dispatch alerts)
 *   alliance:{allianceId}   — Alliance chat + treasury updates
 *   season:{seasonId}       — Season-wide leaderboard + market events
 *   machine:{machineId}     — Machine status updates (owner + nearby competitors)
 *   market                  — Global market price shifts + events
 *   leaderboard             — Live leaderboard updates
 */

import { Server as SocketIOServer, Socket } from "socket.io";
import { Server as HTTPServer } from "http";
import { parse as parseCookieHeader } from "cookie";
import { sdk } from "../_core/sdk";
import { getUserByOpenId } from "../db";
import { getDb } from "../db";
import { players, allianceMembers, seasonBrackets } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import type { User } from "../../drizzle/schema";

// ============================================================================
// TYPES
// ============================================================================

export interface AuthenticatedSocket extends Socket {
  user: User;
  playerId: number | null;
}

export interface ChatMessage {
  allianceId: string;
  content: string;
  senderName: string;
  senderPlayerId: number;
  timestamp: number;
}

export interface MachineStatusUpdate {
  machineId: string;
  playerId: number;
  status: string;
  maintenanceLevel: number;
  usedCapacity: number;
  capacity: number;
  dailyRevenue: string;
}

export interface MarketPriceUpdate {
  productId: string;
  productName: string;
  oldPrice: number;
  newPrice: number;
  direction: "up" | "down" | "stable";
  changePercent: number;
}

export interface MarketEventBroadcast {
  eventId: string;
  eventName: string;
  description: string;
  affectedCategories: string;
  priceMultiplier: number;
  startDate: string;
  endDate: string;
}

export interface LeaderboardUpdate {
  seasonId: string;
  rankings: Array<{
    rank: number;
    playerId: number;
    brandName: string;
    tycoonScore: number;
    eloRating: number;
    change: number; // rank change since last update
  }>;
}

export interface CompetitorAlert {
  type: "new_machine" | "price_undercut" | "territory_overlap";
  competitorBrandName: string;
  competitorPlayerId: number;
  machineId?: string;
  latitude?: number;
  longitude?: number;
  details: string;
}

export interface DispatchUpdate {
  dispatchId: string;
  type: "restock" | "maintenance";
  status: "dispatched" | "in_transit" | "arrived" | "completed" | "failed" | "breakdown";
  employeeName: string;
  machineId: string;
  machineName: string;
  eta?: string;
  completedAt?: string;
  details?: string;
}

export interface WalletUpdate {
  playerId: number;
  walletType: "competition" | "premium";
  newBalance: string;
  changeAmount: string;
  reason: string;
}

export interface MarketplaceTradeNotification {
  type: "listing_sold" | "listing_purchased" | "listing_expired";
  listingId: string;
  productName: string;
  quantity: number;
  pricePerUnit: string;
  totalAmount: string;
  counterpartyBrandName?: string;
}

// ============================================================================
// EVENT NAMES (shared between server and client)
// ============================================================================

export const SOCKET_EVENTS = {
  // Client → Server
  JOIN_ALLIANCE_ROOM: "alliance:join",
  LEAVE_ALLIANCE_ROOM: "alliance:leave",
  ALLIANCE_CHAT_SEND: "alliance:chat:send",
  JOIN_SEASON_ROOM: "season:join",
  LEAVE_SEASON_ROOM: "season:leave",
  JOIN_MACHINE_ROOM: "machine:join",
  LEAVE_MACHINE_ROOM: "machine:leave",
  SUBSCRIBE_MARKET: "market:subscribe",
  UNSUBSCRIBE_MARKET: "market:unsubscribe",
  SUBSCRIBE_LEADERBOARD: "leaderboard:subscribe",
  UNSUBSCRIBE_LEADERBOARD: "leaderboard:unsubscribe",

  // Server → Client
  ALLIANCE_CHAT_MESSAGE: "alliance:chat:message",
  ALLIANCE_MEMBER_JOINED: "alliance:member:joined",
  ALLIANCE_MEMBER_LEFT: "alliance:member:left",
  ALLIANCE_TREASURY_UPDATE: "alliance:treasury:update",
  MACHINE_STATUS_UPDATE: "machine:status:update",
  MARKET_PRICE_UPDATE: "market:price:update",
  MARKET_EVENT_STARTED: "market:event:started",
  MARKET_EVENT_ENDED: "market:event:ended",
  LEADERBOARD_UPDATE: "leaderboard:update",
  COMPETITOR_ALERT: "competitor:alert",
  DISPATCH_UPDATE: "dispatch:update",
  WALLET_UPDATE: "wallet:update",
  MARKETPLACE_TRADE: "marketplace:trade",
  SEASON_PHASE_CHANGE: "season:phase:change",
  NOTIFICATION: "notification",

  // System
  ERROR: "error",
  CONNECTED: "connected",
} as const;

// ============================================================================
// SINGLETON IO INSTANCE
// ============================================================================

let io: SocketIOServer | null = null;

export function getIO(): SocketIOServer | null {
  return io;
}

// ============================================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================================

async function authenticateSocket(
  socket: Socket,
  next: (err?: Error) => void
): Promise<void> {
  try {
    // Extract session cookie from handshake
    const cookieHeader = socket.handshake.headers.cookie;
    if (!cookieHeader) {
      return next(new Error("Authentication required: no cookies"));
    }

    const cookies = parseCookieHeader(cookieHeader);
    const sessionCookie = cookies["app_session_id"];

    if (!sessionCookie) {
      return next(new Error("Authentication required: no session cookie"));
    }

    // Verify session using the existing SDK
    const session = await sdk.verifySession(sessionCookie);
    if (!session) {
      return next(new Error("Authentication failed: invalid session"));
    }

    // Get user from database
    const user = await getUserByOpenId(session.openId);
    if (!user) {
      return next(new Error("Authentication failed: user not found"));
    }

    // Attach user to socket
    (socket as AuthenticatedSocket).user = user;

    // Look up player ID
    const db = await getDb();
    if (db) {
      const playerRows = await db
        .select({ id: players.id })
        .from(players)
        .where(eq(players.userId, user.id))
        .limit(1);
      (socket as AuthenticatedSocket).playerId = playerRows[0]?.id ?? null;
    } else {
      (socket as AuthenticatedSocket).playerId = null;
    }

    next();
  } catch (error) {
    console.error("[Socket.io] Authentication error:", error);
    next(new Error("Authentication failed"));
  }
}

// ============================================================================
// ROOM MANAGEMENT HELPERS
// ============================================================================

async function validateAllianceMembership(
  playerId: number,
  allianceId: string
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const membership = await db
    .select()
    .from(allianceMembers)
    .where(
      and(
        eq(allianceMembers.allianceId, allianceId),
        eq(allianceMembers.playerId, playerId)
      )
    )
    .limit(1);

  return membership.length > 0;
}

async function validateSeasonEntry(
  playerId: number,
  seasonId: string
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const entry = await db
    .select()
    .from(seasonBrackets)
    .where(
      and(
        eq(seasonBrackets.seasonId, parseInt(seasonId)),
        eq(seasonBrackets.playerId, playerId)
      )
    )
    .limit(1);

  return entry.length > 0;
}

// ============================================================================
// CONNECTION HANDLER
// ============================================================================

function handleConnection(socket: AuthenticatedSocket): void {
  const { user, playerId } = socket;
  console.log(
    `[Socket.io] Connected: user=${user.id} player=${playerId} socket=${socket.id}`
  );

  // Auto-join personal room
  if (playerId) {
    socket.join(`player:${playerId}`);
  }

  // Send connection confirmation
  socket.emit(SOCKET_EVENTS.CONNECTED, {
    userId: user.id,
    playerId,
    socketId: socket.id,
    timestamp: Date.now(),
  });

  // ─── Alliance Room Management ───────────────────────────────────────

  socket.on(SOCKET_EVENTS.JOIN_ALLIANCE_ROOM, async (data: { allianceId: string }) => {
    if (!playerId) {
      socket.emit(SOCKET_EVENTS.ERROR, { message: "No player profile" });
      return;
    }

    const isMember = await validateAllianceMembership(playerId, data.allianceId);
    if (!isMember) {
      socket.emit(SOCKET_EVENTS.ERROR, {
        message: "Not a member of this alliance",
      });
      return;
    }

    socket.join(`alliance:${data.allianceId}`);
    console.log(`[Socket.io] Player ${playerId} joined alliance room ${data.allianceId}`);
  });

  socket.on(SOCKET_EVENTS.LEAVE_ALLIANCE_ROOM, (data: { allianceId: string }) => {
    socket.leave(`alliance:${data.allianceId}`);
  });

  // ─── Alliance Chat ──────────────────────────────────────────────────

  socket.on(
    SOCKET_EVENTS.ALLIANCE_CHAT_SEND,
    async (data: { allianceId: string; content: string }) => {
      if (!playerId) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: "No player profile" });
        return;
      }

      if (!data.content || data.content.trim().length === 0) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: "Message cannot be empty" });
        return;
      }

      if (data.content.length > 1000) {
        socket.emit(SOCKET_EVENTS.ERROR, {
          message: "Message too long (max 1000 chars)",
        });
        return;
      }

      // Verify membership
      const isMember = await validateAllianceMembership(playerId, data.allianceId);
      if (!isMember) {
        socket.emit(SOCKET_EVENTS.ERROR, {
          message: "Not a member of this alliance",
        });
        return;
      }

      // Get player brand name for display
      const db = await getDb();
      let senderName = user.name || "Unknown";
      if (db) {
        const playerRow = await db
          .select({ brandName: players.brandName })
          .from(players)
          .where(eq(players.id, playerId))
          .limit(1);
        if (playerRow[0]) {
          senderName = playerRow[0].brandName;
        }
      }

      const message: ChatMessage = {
        allianceId: data.allianceId,
        content: data.content.trim(),
        senderName,
        senderPlayerId: playerId,
        timestamp: Date.now(),
      };

      // Broadcast to alliance room (including sender)
      io?.to(`alliance:${data.allianceId}`).emit(
        SOCKET_EVENTS.ALLIANCE_CHAT_MESSAGE,
        message
      );
    }
  );

  // ─── Season Room Management ─────────────────────────────────────────

  socket.on(SOCKET_EVENTS.JOIN_SEASON_ROOM, async (data: { seasonId: string }) => {
    if (!playerId) {
      socket.emit(SOCKET_EVENTS.ERROR, { message: "No player profile" });
      return;
    }

    const isEntered = await validateSeasonEntry(playerId, data.seasonId);
    if (!isEntered) {
      socket.emit(SOCKET_EVENTS.ERROR, {
        message: "Not entered in this season",
      });
      return;
    }

    socket.join(`season:${data.seasonId}`);
    console.log(`[Socket.io] Player ${playerId} joined season room ${data.seasonId}`);
  });

  socket.on(SOCKET_EVENTS.LEAVE_SEASON_ROOM, (data: { seasonId: string }) => {
    socket.leave(`season:${data.seasonId}`);
  });

  // ─── Machine Room Management ────────────────────────────────────────

  socket.on(SOCKET_EVENTS.JOIN_MACHINE_ROOM, (data: { machineId: string }) => {
    socket.join(`machine:${data.machineId}`);
  });

  socket.on(SOCKET_EVENTS.LEAVE_MACHINE_ROOM, (data: { machineId: string }) => {
    socket.leave(`machine:${data.machineId}`);
  });

  // ─── Market Subscription ───────────────────────────────────────────

  socket.on(SOCKET_EVENTS.SUBSCRIBE_MARKET, () => {
    socket.join("market");
  });

  socket.on(SOCKET_EVENTS.UNSUBSCRIBE_MARKET, () => {
    socket.leave("market");
  });

  // ─── Leaderboard Subscription ──────────────────────────────────────

  socket.on(SOCKET_EVENTS.SUBSCRIBE_LEADERBOARD, () => {
    socket.join("leaderboard");
  });

  socket.on(SOCKET_EVENTS.UNSUBSCRIBE_LEADERBOARD, () => {
    socket.leave("leaderboard");
  });

  // ─── Disconnect ────────────────────────────────────────────────────

  socket.on("disconnect", (reason) => {
    console.log(
      `[Socket.io] Disconnected: user=${user.id} player=${playerId} reason=${reason}`
    );
  });
}

// ============================================================================
// SERVER INITIALIZATION
// ============================================================================

export function initSocketServer(httpServer: HTTPServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: true, // Allow all origins (session cookie handles auth)
      credentials: true,
    },
    path: "/api/socket.io",
    transports: ["websocket", "polling"],
    pingInterval: 25000,
    pingTimeout: 20000,
    maxHttpBufferSize: 1e6, // 1MB max message size
  });

  // Authentication middleware
  io.use(authenticateSocket);

  // Connection handler
  io.on("connection", (socket) => {
    handleConnection(socket as AuthenticatedSocket);
  });

  console.log("[Socket.io] Real-time server initialized on /api/socket.io");

  return io;
}

// ============================================================================
// BROADCASTING UTILITIES (called from engines/routers)
// ============================================================================

/**
 * Broadcast machine status update to machine room subscribers.
 */
export function broadcastMachineStatus(update: MachineStatusUpdate): void {
  io?.to(`machine:${update.machineId}`).emit(
    SOCKET_EVENTS.MACHINE_STATUS_UPDATE,
    update
  );
  // Also notify the owner
  io?.to(`player:${update.playerId}`).emit(
    SOCKET_EVENTS.MACHINE_STATUS_UPDATE,
    update
  );
}

/**
 * Broadcast market price updates to all market subscribers.
 */
export function broadcastMarketPriceUpdate(updates: MarketPriceUpdate[]): void {
  io?.to("market").emit(SOCKET_EVENTS.MARKET_PRICE_UPDATE, {
    updates,
    timestamp: Date.now(),
  });
}

/**
 * Broadcast a new market event to all market subscribers.
 */
export function broadcastMarketEvent(event: MarketEventBroadcast): void {
  io?.to("market").emit(SOCKET_EVENTS.MARKET_EVENT_STARTED, event);
}

/**
 * Broadcast market event ended.
 */
export function broadcastMarketEventEnded(eventId: string, eventName: string): void {
  io?.to("market").emit(SOCKET_EVENTS.MARKET_EVENT_ENDED, {
    eventId,
    eventName,
    timestamp: Date.now(),
  });
}

/**
 * Broadcast leaderboard update to all leaderboard subscribers.
 */
export function broadcastLeaderboardUpdate(update: LeaderboardUpdate): void {
  io?.to("leaderboard").emit(SOCKET_EVENTS.LEADERBOARD_UPDATE, update);
  // Also send to season room
  io?.to(`season:${update.seasonId}`).emit(SOCKET_EVENTS.LEADERBOARD_UPDATE, update);
}

/**
 * Send a competitor alert to a specific player.
 */
export function sendCompetitorAlert(
  playerId: number,
  alert: CompetitorAlert
): void {
  io?.to(`player:${playerId}`).emit(SOCKET_EVENTS.COMPETITOR_ALERT, {
    ...alert,
    timestamp: Date.now(),
  });
}

/**
 * Send dispatch update to a specific player.
 */
export function sendDispatchUpdate(
  playerId: number,
  update: DispatchUpdate
): void {
  io?.to(`player:${playerId}`).emit(SOCKET_EVENTS.DISPATCH_UPDATE, update);
}

/**
 * Send wallet balance update to a specific player.
 */
export function sendWalletUpdate(update: WalletUpdate): void {
  io?.to(`player:${update.playerId}`).emit(SOCKET_EVENTS.WALLET_UPDATE, update);
}

/**
 * Send marketplace trade notification to a specific player.
 */
export function sendMarketplaceTradeNotification(
  playerId: number,
  notification: MarketplaceTradeNotification
): void {
  io?.to(`player:${playerId}`).emit(
    SOCKET_EVENTS.MARKETPLACE_TRADE,
    notification
  );
}

/**
 * Broadcast alliance treasury update.
 */
export function broadcastAllianceTreasuryUpdate(
  allianceId: string,
  newBalance: string,
  reason: string
): void {
  io?.to(`alliance:${allianceId}`).emit(
    SOCKET_EVENTS.ALLIANCE_TREASURY_UPDATE,
    {
      allianceId,
      newBalance,
      reason,
      timestamp: Date.now(),
    }
  );
}

/**
 * Broadcast alliance member joined event.
 */
export function broadcastAllianceMemberJoined(
  allianceId: string,
  playerName: string,
  playerId: number
): void {
  io?.to(`alliance:${allianceId}`).emit(SOCKET_EVENTS.ALLIANCE_MEMBER_JOINED, {
    allianceId,
    playerName,
    playerId,
    timestamp: Date.now(),
  });
}

/**
 * Broadcast alliance member left event.
 */
export function broadcastAllianceMemberLeft(
  allianceId: string,
  playerName: string,
  playerId: number
): void {
  io?.to(`alliance:${allianceId}`).emit(SOCKET_EVENTS.ALLIANCE_MEMBER_LEFT, {
    allianceId,
    playerName,
    playerId,
    timestamp: Date.now(),
  });
}

/**
 * Broadcast season phase change to all season participants.
 */
export function broadcastSeasonPhaseChange(
  seasonId: string,
  newPhase: string,
  details?: Record<string, unknown>
): void {
  io?.to(`season:${seasonId}`).emit(SOCKET_EVENTS.SEASON_PHASE_CHANGE, {
    seasonId,
    phase: newPhase,
    ...details,
    timestamp: Date.now(),
  });
}

/**
 * Send a generic notification to a specific player.
 */
export function sendNotification(
  playerId: number,
  title: string,
  message: string,
  type: "info" | "warning" | "success" | "error" = "info"
): void {
  io?.to(`player:${playerId}`).emit(SOCKET_EVENTS.NOTIFICATION, {
    title,
    message,
    type,
    timestamp: Date.now(),
  });
}

/**
 * Get connected socket count for monitoring.
 */
export function getConnectionStats(): {
  totalConnections: number;
  rooms: Record<string, number>;
} {
  if (!io) return { totalConnections: 0, rooms: {} };

  const rooms: Record<string, number> = {};
  const adapterRooms = io.sockets.adapter.rooms;
  adapterRooms.forEach((sockets, roomName) => {
    // Skip socket ID rooms (each socket auto-joins a room with its ID)
    if (!roomName.includes(":") && roomName !== "market" && roomName !== "leaderboard") {
      return;
    }
    rooms[roomName] = sockets.size;
  });

  return {
    totalConnections: io.sockets.sockets.size,
    rooms,
  };
}
