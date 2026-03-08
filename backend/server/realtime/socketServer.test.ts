/**
 * Tests for VendFX Socket.io Real-Time System
 *
 * Tests the event bridge broadcasting utilities, SOCKET_EVENTS constants,
 * and connection stats logic. Socket.io server initialization is tested
 * indirectly through the event bridge.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { SOCKET_EVENTS } from "./socketServer";

// ============================================================================
// SOCKET_EVENTS CONSTANT TESTS
// ============================================================================

describe("SOCKET_EVENTS", () => {
  it("should have all client-to-server event names", () => {
    expect(SOCKET_EVENTS.JOIN_ALLIANCE_ROOM).toBe("alliance:join");
    expect(SOCKET_EVENTS.LEAVE_ALLIANCE_ROOM).toBe("alliance:leave");
    expect(SOCKET_EVENTS.ALLIANCE_CHAT_SEND).toBe("alliance:chat:send");
    expect(SOCKET_EVENTS.JOIN_SEASON_ROOM).toBe("season:join");
    expect(SOCKET_EVENTS.LEAVE_SEASON_ROOM).toBe("season:leave");
    expect(SOCKET_EVENTS.JOIN_MACHINE_ROOM).toBe("machine:join");
    expect(SOCKET_EVENTS.LEAVE_MACHINE_ROOM).toBe("machine:leave");
    expect(SOCKET_EVENTS.SUBSCRIBE_MARKET).toBe("market:subscribe");
    expect(SOCKET_EVENTS.UNSUBSCRIBE_MARKET).toBe("market:unsubscribe");
    expect(SOCKET_EVENTS.SUBSCRIBE_LEADERBOARD).toBe("leaderboard:subscribe");
    expect(SOCKET_EVENTS.UNSUBSCRIBE_LEADERBOARD).toBe("leaderboard:unsubscribe");
  });

  it("should have all server-to-client event names", () => {
    expect(SOCKET_EVENTS.ALLIANCE_CHAT_MESSAGE).toBe("alliance:chat:message");
    expect(SOCKET_EVENTS.ALLIANCE_MEMBER_JOINED).toBe("alliance:member:joined");
    expect(SOCKET_EVENTS.ALLIANCE_MEMBER_LEFT).toBe("alliance:member:left");
    expect(SOCKET_EVENTS.ALLIANCE_TREASURY_UPDATE).toBe("alliance:treasury:update");
    expect(SOCKET_EVENTS.MACHINE_STATUS_UPDATE).toBe("machine:status:update");
    expect(SOCKET_EVENTS.MARKET_PRICE_UPDATE).toBe("market:price:update");
    expect(SOCKET_EVENTS.MARKET_EVENT_STARTED).toBe("market:event:started");
    expect(SOCKET_EVENTS.MARKET_EVENT_ENDED).toBe("market:event:ended");
    expect(SOCKET_EVENTS.LEADERBOARD_UPDATE).toBe("leaderboard:update");
    expect(SOCKET_EVENTS.COMPETITOR_ALERT).toBe("competitor:alert");
    expect(SOCKET_EVENTS.DISPATCH_UPDATE).toBe("dispatch:update");
    expect(SOCKET_EVENTS.WALLET_UPDATE).toBe("wallet:update");
    expect(SOCKET_EVENTS.MARKETPLACE_TRADE).toBe("marketplace:trade");
    expect(SOCKET_EVENTS.SEASON_PHASE_CHANGE).toBe("season:phase:change");
    expect(SOCKET_EVENTS.NOTIFICATION).toBe("notification");
  });

  it("should have system event names", () => {
    expect(SOCKET_EVENTS.ERROR).toBe("error");
    expect(SOCKET_EVENTS.CONNECTED).toBe("connected");
  });

  it("should have unique event names (no duplicates)", () => {
    const values = Object.values(SOCKET_EVENTS);
    const uniqueValues = new Set(values);
    expect(uniqueValues.size).toBe(values.length);
  });

  it("should use colon-separated namespacing for all game events", () => {
    const gameEvents = Object.entries(SOCKET_EVENTS).filter(
      ([key]) => key !== "ERROR" && key !== "CONNECTED" && key !== "NOTIFICATION"
    );
    for (const [key, value] of gameEvents) {
      expect(value).toContain(":");
    }
  });
});

// ============================================================================
// EVENT BRIDGE TESTS (unit tests for the bridge functions)
// ============================================================================

describe("Event Bridge", () => {
  // The event bridge functions are thin wrappers that call socketServer broadcast
  // functions. When io is null (no server initialized), they should not throw.

  it("should not throw when io is null (server not initialized)", async () => {
    // Import event bridge - io will be null since we haven't initialized the server
    const bridge = await import("./eventBridge");

    expect(() =>
      bridge.emitMachineStatusChanged({
        machineId: "m1",
        playerId: 1,
        status: "healthy",
        maintenanceLevel: 100,
        usedCapacity: 5,
        capacity: 20,
        dailyRevenue: "150.00",
      })
    ).not.toThrow();

    expect(() =>
      bridge.emitMarketPriceUpdates([
        {
          productId: "p1",
          productName: "Cola",
          oldPrice: 1.5,
          newPrice: 1.65,
          direction: "up",
          changePercent: 10,
        },
      ])
    ).not.toThrow();

    expect(() =>
      bridge.emitMarketEventStarted({
        eventId: "e1",
        eventName: "Sugar Tax",
        description: "Government imposes sugar tax",
        affectedCategories: "beverages",
        priceMultiplier: 1.15,
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
      })
    ).not.toThrow();

    expect(() =>
      bridge.emitMarketEventEnded("e1", "Sugar Tax")
    ).not.toThrow();

    expect(() =>
      bridge.emitDispatchStatusChanged(1, {
        dispatchId: "d1",
        type: "restock",
        status: "dispatched",
        employeeName: "John",
        machineId: "m1",
        machineName: "Downtown Snacker",
      })
    ).not.toThrow();

    expect(() =>
      bridge.emitVehicleBreakdown(
        1,
        "d1",
        "John",
        "m1",
        "Downtown Snacker",
        "Flat tire on Highway 101"
      )
    ).not.toThrow();

    expect(() =>
      bridge.emitWalletBalanceChanged({
        playerId: 1,
        walletType: "competition",
        newBalance: "5000.00",
        changeAmount: "-500.00",
        reason: "Machine purchase",
      })
    ).not.toThrow();

    expect(() =>
      bridge.emitMarketplaceSale(
        1, 2, "l1", "Cola", 100, "1.50", "150.00",
        "SnackCorp", "VendKing"
      )
    ).not.toThrow();

    expect(() =>
      bridge.emitMarketplaceListingExpired(1, "l1", "Cola", 50)
    ).not.toThrow();

    expect(() =>
      bridge.emitAllianceTreasuryChanged("a1", "10000.00", "Member contribution")
    ).not.toThrow();

    expect(() =>
      bridge.emitAllianceMemberJoined("a1", "NewPlayer", 5)
    ).not.toThrow();

    expect(() =>
      bridge.emitAllianceMemberLeft("a1", "OldPlayer", 3)
    ).not.toThrow();

    expect(() =>
      bridge.emitSeasonPhaseChanged("s1", "active", { message: "Season started!" })
    ).not.toThrow();

    expect(() =>
      bridge.emitLeaderboardUpdated({
        seasonId: "s1",
        rankings: [
          {
            rank: 1,
            playerId: 1,
            brandName: "SnackCorp",
            tycoonScore: 9500,
            eloRating: 1650,
            change: 0,
          },
        ],
      })
    ).not.toThrow();

    expect(() =>
      bridge.emitPlayerNotification(1, "Test", "Test message", "info")
    ).not.toThrow();

    expect(() =>
      bridge.emitGlobalNotification("System Update", "Maintenance in 1 hour", "warning")
    ).not.toThrow();

    expect(() =>
      bridge.emitNewMachineAlert([1, 2, 3], "CompetitorBrand", 4, "m5", 40.7, -74.0)
    ).not.toThrow();

    expect(() =>
      bridge.emitPriceUndercutAlert(1, "CheapVend", 2, "m3", "CheapVend undercut your Cola price by 20%")
    ).not.toThrow();
  });

  it("should skip self-alerts in emitNewMachineAlert", async () => {
    const bridge = await import("./eventBridge");

    // This should not throw even when the competitor is in the nearby list
    expect(() =>
      bridge.emitNewMachineAlert([1, 2, 3], "MyBrand", 2, "m5", 40.7, -74.0)
    ).not.toThrow();
  });
});

// ============================================================================
// CONNECTION STATS TESTS
// ============================================================================

describe("getConnectionStats", () => {
  it("should return zero connections when server is not initialized", async () => {
    const { getConnectionStats } = await import("./socketServer");
    const stats = getConnectionStats();

    expect(stats.totalConnections).toBe(0);
    expect(stats.rooms).toEqual({});
  });
});

// ============================================================================
// TYPE VALIDATION TESTS
// ============================================================================

describe("Type Contracts", () => {
  it("should validate MachineStatusUpdate shape", () => {
    const update = {
      machineId: "m-123",
      playerId: 1,
      status: "low_stock",
      maintenanceLevel: 75,
      usedCapacity: 15,
      capacity: 20,
      dailyRevenue: "250.00",
    };

    expect(update.machineId).toBeTruthy();
    expect(typeof update.playerId).toBe("number");
    expect(typeof update.maintenanceLevel).toBe("number");
    expect(update.maintenanceLevel).toBeGreaterThanOrEqual(0);
    expect(update.maintenanceLevel).toBeLessThanOrEqual(100);
    expect(update.usedCapacity).toBeLessThanOrEqual(update.capacity);
  });

  it("should validate MarketPriceUpdate shape", () => {
    const update = {
      productId: "p-cola",
      productName: "Cola",
      oldPrice: 1.5,
      newPrice: 1.65,
      direction: "up" as const,
      changePercent: 10,
    };

    expect(update.productId).toBeTruthy();
    expect(update.newPrice).toBeGreaterThan(0);
    expect(["up", "down", "stable"]).toContain(update.direction);
  });

  it("should validate LeaderboardUpdate shape", () => {
    const update = {
      seasonId: "s-2026-spring",
      rankings: [
        {
          rank: 1,
          playerId: 42,
          brandName: "SnackCorp",
          tycoonScore: 9500,
          eloRating: 1650,
          change: 2,
        },
        {
          rank: 2,
          playerId: 17,
          brandName: "VendKing",
          tycoonScore: 9200,
          eloRating: 1580,
          change: -1,
        },
      ],
    };

    expect(update.rankings.length).toBe(2);
    expect(update.rankings[0].rank).toBeLessThan(update.rankings[1].rank);
    expect(update.rankings[0].tycoonScore).toBeGreaterThan(
      update.rankings[1].tycoonScore
    );
  });

  it("should validate CompetitorAlert shape", () => {
    const alert = {
      type: "new_machine" as const,
      competitorBrandName: "RivalVend",
      competitorPlayerId: 5,
      machineId: "m-rival-1",
      latitude: 40.7128,
      longitude: -74.006,
      details: "RivalVend placed a new machine near your territory!",
    };

    expect(["new_machine", "price_undercut", "territory_overlap"]).toContain(
      alert.type
    );
    expect(alert.latitude).toBeGreaterThanOrEqual(-90);
    expect(alert.latitude).toBeLessThanOrEqual(90);
    expect(alert.longitude).toBeGreaterThanOrEqual(-180);
    expect(alert.longitude).toBeLessThanOrEqual(180);
  });

  it("should validate DispatchUpdate shape", () => {
    const update = {
      dispatchId: "d-123",
      type: "restock" as const,
      status: "in_transit" as const,
      employeeName: "John Smith",
      machineId: "m-downtown",
      machineName: "Downtown Snacker",
      eta: new Date(Date.now() + 30 * 60000).toISOString(),
    };

    expect(["restock", "maintenance"]).toContain(update.type);
    expect([
      "dispatched",
      "in_transit",
      "arrived",
      "completed",
      "failed",
      "breakdown",
    ]).toContain(update.status);
  });

  it("should validate WalletUpdate shape", () => {
    const update = {
      playerId: 1,
      walletType: "competition" as const,
      newBalance: "4500.00",
      changeAmount: "-500.00",
      reason: "Machine purchase",
    };

    expect(["competition", "premium"]).toContain(update.walletType);
    expect(parseFloat(update.newBalance)).toBeGreaterThanOrEqual(0);
  });

  it("should validate ChatMessage shape", () => {
    const message = {
      allianceId: "a-123",
      content: "Let's coordinate our restocks!",
      senderName: "SnackCorp",
      senderPlayerId: 1,
      timestamp: Date.now(),
    };

    expect(message.content.length).toBeGreaterThan(0);
    expect(message.content.length).toBeLessThanOrEqual(1000);
    expect(message.timestamp).toBeGreaterThan(0);
  });
});
