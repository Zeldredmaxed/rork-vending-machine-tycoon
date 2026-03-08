/**
 * VendFX Real-Time Module
 *
 * Re-exports the Socket.io server initialization and event bridge utilities.
 */

export { initSocketServer, getIO, getConnectionStats, SOCKET_EVENTS } from "./socketServer";
export type {
  AuthenticatedSocket,
  ChatMessage,
  MachineStatusUpdate,
  MarketPriceUpdate,
  MarketEventBroadcast,
  LeaderboardUpdate,
  CompetitorAlert,
  DispatchUpdate,
  WalletUpdate,
  MarketplaceTradeNotification,
} from "./socketServer";

export {
  emitMachineStatusChanged,
  emitNewMachineAlert,
  emitPriceUndercutAlert,
  emitMarketPriceUpdates,
  emitMarketEventStarted,
  emitMarketEventEnded,
  emitDispatchStatusChanged,
  emitVehicleBreakdown,
  emitWalletBalanceChanged,
  emitMarketplaceSale,
  emitMarketplaceListingExpired,
  emitAllianceTreasuryChanged,
  emitAllianceMemberJoined,
  emitAllianceMemberLeft,
  emitSeasonPhaseChanged,
  emitLeaderboardUpdated,
  emitPlayerNotification,
  emitGlobalNotification,
} from "./eventBridge";
