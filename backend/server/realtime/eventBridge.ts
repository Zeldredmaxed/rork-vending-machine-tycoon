/**
 * VendFX Event Bridge
 *
 * Connects game engine operations to Socket.io real-time broadcasting.
 * Engines call these functions after completing operations, and the bridge
 * handles broadcasting to the correct rooms and players.
 *
 * This decouples the game logic from the real-time transport layer.
 */

import {
  broadcastMachineStatus,
  broadcastMarketPriceUpdate,
  broadcastMarketEvent,
  broadcastMarketEventEnded,
  broadcastLeaderboardUpdate,
  sendCompetitorAlert,
  sendDispatchUpdate,
  sendWalletUpdate,
  sendMarketplaceTradeNotification,
  broadcastAllianceTreasuryUpdate,
  broadcastAllianceMemberJoined,
  broadcastAllianceMemberLeft,
  broadcastSeasonPhaseChange,
  sendNotification,
  getIO,
  type MachineStatusUpdate,
  type MarketPriceUpdate,
  type MarketEventBroadcast,
  type LeaderboardUpdate,
  type CompetitorAlert,
  type DispatchUpdate,
  type WalletUpdate,
  type MarketplaceTradeNotification,
} from "./socketServer";

// ============================================================================
// MACHINE EVENTS
// ============================================================================

/**
 * Called when a machine's status changes (e.g., healthy → low_stock → broken).
 */
export function emitMachineStatusChanged(update: MachineStatusUpdate): void {
  try {
    broadcastMachineStatus(update);
  } catch (error) {
    console.error("[EventBridge] Failed to emit machine status:", error);
  }
}

/**
 * Called when a new machine is placed near existing machines.
 * Sends competitor alerts to nearby machine owners.
 */
export function emitNewMachineAlert(
  nearbyPlayerIds: number[],
  competitorBrandName: string,
  competitorPlayerId: number,
  machineId: string,
  latitude: number,
  longitude: number
): void {
  try {
    for (const playerId of nearbyPlayerIds) {
      if (playerId === competitorPlayerId) continue; // Don't alert yourself
      sendCompetitorAlert(playerId, {
        type: "new_machine",
        competitorBrandName,
        competitorPlayerId,
        machineId,
        latitude,
        longitude,
        details: `${competitorBrandName} placed a new machine near your territory!`,
      });
    }
  } catch (error) {
    console.error("[EventBridge] Failed to emit competitor alert:", error);
  }
}

/**
 * Called when a competitor undercuts prices on a nearby machine.
 */
export function emitPriceUndercutAlert(
  targetPlayerId: number,
  competitorBrandName: string,
  competitorPlayerId: number,
  machineId: string,
  details: string
): void {
  try {
    sendCompetitorAlert(targetPlayerId, {
      type: "price_undercut",
      competitorBrandName,
      competitorPlayerId,
      machineId,
      details,
    });
  } catch (error) {
    console.error("[EventBridge] Failed to emit price undercut alert:", error);
  }
}

// ============================================================================
// MARKET EVENTS
// ============================================================================

/**
 * Called after daily price fluctuation runs.
 * Broadcasts all price changes to market subscribers.
 */
export function emitMarketPriceUpdates(updates: MarketPriceUpdate[]): void {
  try {
    if (updates.length > 0) {
      broadcastMarketPriceUpdate(updates);
    }
  } catch (error) {
    console.error("[EventBridge] Failed to emit market price updates:", error);
  }
}

/**
 * Called when a new global market event starts.
 */
export function emitMarketEventStarted(event: MarketEventBroadcast): void {
  try {
    broadcastMarketEvent(event);
  } catch (error) {
    console.error("[EventBridge] Failed to emit market event:", error);
  }
}

/**
 * Called when a market event expires.
 */
export function emitMarketEventEnded(eventId: string, eventName: string): void {
  try {
    broadcastMarketEventEnded(eventId, eventName);
  } catch (error) {
    console.error("[EventBridge] Failed to emit market event ended:", error);
  }
}

// ============================================================================
// DISPATCH / FLEET EVENTS
// ============================================================================

/**
 * Called when a restock or maintenance dispatch status changes.
 */
export function emitDispatchStatusChanged(
  playerId: number,
  update: DispatchUpdate
): void {
  try {
    sendDispatchUpdate(playerId, update);
  } catch (error) {
    console.error("[EventBridge] Failed to emit dispatch update:", error);
  }
}

/**
 * Called when a vehicle breaks down during dispatch.
 */
export function emitVehicleBreakdown(
  playerId: number,
  dispatchId: string,
  employeeName: string,
  machineId: string,
  machineName: string,
  breakdownDetails: string
): void {
  try {
    sendDispatchUpdate(playerId, {
      dispatchId,
      type: "restock",
      status: "breakdown",
      employeeName,
      machineId,
      machineName,
      details: breakdownDetails,
    });
    sendNotification(
      playerId,
      "Vehicle Breakdown!",
      `${employeeName}'s vehicle broke down en route to ${machineName}. ${breakdownDetails}`,
      "warning"
    );
  } catch (error) {
    console.error("[EventBridge] Failed to emit vehicle breakdown:", error);
  }
}

// ============================================================================
// WALLET / FINANCIAL EVENTS
// ============================================================================

/**
 * Called when a player's wallet balance changes.
 */
export function emitWalletBalanceChanged(update: WalletUpdate): void {
  try {
    sendWalletUpdate(update);
  } catch (error) {
    console.error("[EventBridge] Failed to emit wallet update:", error);
  }
}

// ============================================================================
// MARKETPLACE EVENTS
// ============================================================================

/**
 * Called when a marketplace listing is sold.
 * Notifies both buyer and seller.
 */
export function emitMarketplaceSale(
  sellerId: number,
  buyerId: number,
  listingId: string,
  productName: string,
  quantity: number,
  pricePerUnit: string,
  totalAmount: string,
  sellerBrandName: string,
  buyerBrandName: string
): void {
  try {
    // Notify seller
    sendMarketplaceTradeNotification(sellerId, {
      type: "listing_sold",
      listingId,
      productName,
      quantity,
      pricePerUnit,
      totalAmount,
      counterpartyBrandName: buyerBrandName,
    });

    // Notify buyer
    sendMarketplaceTradeNotification(buyerId, {
      type: "listing_purchased",
      listingId,
      productName,
      quantity,
      pricePerUnit,
      totalAmount,
      counterpartyBrandName: sellerBrandName,
    });
  } catch (error) {
    console.error("[EventBridge] Failed to emit marketplace sale:", error);
  }
}

/**
 * Called when a marketplace listing expires.
 */
export function emitMarketplaceListingExpired(
  sellerId: number,
  listingId: string,
  productName: string,
  quantity: number
): void {
  try {
    sendMarketplaceTradeNotification(sellerId, {
      type: "listing_expired",
      listingId,
      productName,
      quantity,
      pricePerUnit: "0",
      totalAmount: "0",
    });
    sendNotification(
      sellerId,
      "Listing Expired",
      `Your listing of ${quantity}x ${productName} has expired. Items returned to warehouse.`,
      "info"
    );
  } catch (error) {
    console.error("[EventBridge] Failed to emit listing expired:", error);
  }
}

// ============================================================================
// ALLIANCE EVENTS
// ============================================================================

/**
 * Called when alliance treasury balance changes.
 */
export function emitAllianceTreasuryChanged(
  allianceId: string,
  newBalance: string,
  reason: string
): void {
  try {
    broadcastAllianceTreasuryUpdate(allianceId, newBalance, reason);
  } catch (error) {
    console.error("[EventBridge] Failed to emit treasury update:", error);
  }
}

/**
 * Called when a player joins an alliance.
 */
export function emitAllianceMemberJoined(
  allianceId: string,
  playerName: string,
  playerId: number
): void {
  try {
    broadcastAllianceMemberJoined(allianceId, playerName, playerId);
  } catch (error) {
    console.error("[EventBridge] Failed to emit member joined:", error);
  }
}

/**
 * Called when a player leaves an alliance.
 */
export function emitAllianceMemberLeft(
  allianceId: string,
  playerName: string,
  playerId: number
): void {
  try {
    broadcastAllianceMemberLeft(allianceId, playerName, playerId);
  } catch (error) {
    console.error("[EventBridge] Failed to emit member left:", error);
  }
}

// ============================================================================
// SEASON EVENTS
// ============================================================================

/**
 * Called when a season transitions phases (lobby → active → ended).
 */
export function emitSeasonPhaseChanged(
  seasonId: string,
  newPhase: string,
  details?: Record<string, unknown>
): void {
  try {
    broadcastSeasonPhaseChange(seasonId, newPhase, details);
  } catch (error) {
    console.error("[EventBridge] Failed to emit season phase change:", error);
  }
}

/**
 * Called when leaderboard rankings are recalculated.
 */
export function emitLeaderboardUpdated(update: LeaderboardUpdate): void {
  try {
    broadcastLeaderboardUpdate(update);
  } catch (error) {
    console.error("[EventBridge] Failed to emit leaderboard update:", error);
  }
}

// ============================================================================
// GENERIC NOTIFICATIONS
// ============================================================================

/**
 * Send a notification to a specific player.
 */
export function emitPlayerNotification(
  playerId: number,
  title: string,
  message: string,
  type: "info" | "warning" | "success" | "error" = "info"
): void {
  try {
    sendNotification(playerId, title, message, type);
  } catch (error) {
    console.error("[EventBridge] Failed to emit notification:", error);
  }
}

/**
 * Broadcast a notification to all connected players.
 */
export function emitGlobalNotification(
  title: string,
  message: string,
  type: "info" | "warning" | "success" | "error" = "info"
): void {
  try {
    const ioInstance = getIO();
    if (ioInstance) {
      ioInstance.emit("notification", {
        title,
        message,
        type,
        timestamp: Date.now(),
      });
    }
  } catch (error) {
    console.error("[EventBridge] Failed to emit global notification:", error);
  }
}
