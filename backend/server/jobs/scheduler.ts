/**
 * VendFX Cron Job Scheduler
 *
 * Centralized scheduler that registers, runs, and monitors all
 * recurring background tasks. Each job is wrapped with error handling,
 * execution tracking, and health reporting.
 *
 * Schedule Overview:
 *   Every 5 min  — Machine status degradation tick
 *   Every 15 min — Dispatch ETA checks and completion
 *   Every hour   — Marketplace listing cleanup
 *   Every 4 hrs  — Complaint expiration check
 *   Daily 3 AM   — Market price fluctuation + event generation
 *   Daily 3:30AM — Market event expiration cleanup
 *   Daily 4 AM   — Expired inventory purge
 *   Daily 5 AM   — Season lifecycle check (lobby → active → ended)
 *   Daily 6 AM   — Player inactivity recap
 *   Weekly Sun 2 AM — Location data cleanup (30-day purge)
 */

import cron from "node-cron";
import { getDb } from "../db";
import {
  vendingMachines,
  warehouseInventory,
  machineInventory,
  customerComplaints,
  restockDispatches,
  seasons,
  players,
  marketEvents,
  marketplaceListings,
  priceHistory,
} from "../../drizzle/schema";
import { eq, lt, lte, and, sql, ne, gt, inArray } from "drizzle-orm";
import {
  emitMachineStatusChanged,
  emitMarketPriceUpdates,
  emitMarketEventStarted,
  emitMarketEventEnded,
  emitSeasonPhaseChanged,
  emitPlayerNotification,
  emitGlobalNotification,
  emitMarketplaceListingExpired,
} from "../realtime/eventBridge";

// ============================================================================
// JOB REGISTRY & HEALTH TRACKING
// ============================================================================

interface JobRecord {
  name: string;
  schedule: string;
  description: string;
  lastRun: Date | null;
  lastDuration: number | null;
  lastStatus: "success" | "error" | "running" | "never_run";
  lastError: string | null;
  runCount: number;
  errorCount: number;
  enabled: boolean;
  task: ReturnType<typeof cron.schedule> | null;
}

const jobRegistry: Map<string, JobRecord> = new Map();

function registerJob(
  name: string,
  schedule: string,
  description: string,
  handler: () => Promise<void>,
  enabled: boolean = true
): void {
  const record: JobRecord = {
    name,
    schedule,
    description,
    lastRun: null,
    lastDuration: null,
    lastStatus: "never_run",
    lastError: null,
    runCount: 0,
    errorCount: 0,
    enabled,
    task: null,
  };

  if (enabled) {
    const task = cron.schedule(schedule, async () => {
      await executeJob(name, handler);
    });
    record.task = task;
  }

  jobRegistry.set(name, record);
  console.log(
    `[Scheduler] Registered job: ${name} (${schedule}) ${enabled ? "✓" : "✗ disabled"}`
  );
}

async function executeJob(
  name: string,
  handler: () => Promise<void>
): Promise<void> {
  const record = jobRegistry.get(name);
  if (!record) return;

  const startTime = Date.now();
  record.lastStatus = "running";
  record.lastRun = new Date();
  record.runCount++;

  try {
    await handler();
    record.lastStatus = "success";
    record.lastDuration = Date.now() - startTime;
    console.log(
      `[Scheduler] ✓ ${name} completed in ${record.lastDuration}ms`
    );
  } catch (error) {
    record.lastStatus = "error";
    record.lastDuration = Date.now() - startTime;
    record.errorCount++;
    record.lastError =
      error instanceof Error ? error.message : String(error);
    console.error(
      `[Scheduler] ✗ ${name} failed after ${record.lastDuration}ms:`,
      record.lastError
    );
  }
}

// ============================================================================
// PUBLIC API
// ============================================================================

export function getJobStatus(): Array<Omit<JobRecord, "task">> {
  const results: Array<Omit<JobRecord, "task">> = [];
  jobRegistry.forEach((record) => {
    const { task, ...rest } = record;
    results.push(rest);
  });
  return results;
}

export async function triggerJob(name: string): Promise<{
  success: boolean;
  message: string;
}> {
  const record = jobRegistry.get(name);
  if (!record) {
    return { success: false, message: `Job "${name}" not found` };
  }

  const handler = jobHandlers.get(name);
  if (!handler) {
    return { success: false, message: `Job "${name}" has no handler` };
  }

  await executeJob(name, handler);

  return {
    success: record.lastStatus === "success",
    message:
      record.lastStatus === "success"
        ? `Job "${name}" completed in ${record.lastDuration}ms`
        : `Job "${name}" failed: ${record.lastError}`,
  };
}

export function setJobEnabled(
  name: string,
  enabled: boolean
): { success: boolean; message: string } {
  const record = jobRegistry.get(name);
  if (!record) {
    return { success: false, message: `Job "${name}" not found` };
  }

  record.enabled = enabled;
  if (record.task) {
    if (enabled) {
      record.task.start();
    } else {
      record.task.stop();
    }
  }

  return {
    success: true,
    message: `Job "${name}" ${enabled ? "enabled" : "disabled"}`,
  };
}

export function getJobNames(): string[] {
  return Array.from(jobRegistry.keys());
}

// ============================================================================
// JOB HANDLERS (stored separately for manual triggering)
// ============================================================================

const jobHandlers: Map<string, () => Promise<void>> = new Map();

// ============================================================================
// JOB IMPLEMENTATIONS
// ============================================================================

/**
 * MACHINE STATUS DEGRADATION (Every 5 minutes)
 *
 * Simulates wear and tear on vending machines. Reduces maintenance level
 * based on usage and age, updates machine status accordingly.
 */
async function jobMachineStatusDegradation(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const machines = await db
    .select()
    .from(vendingMachines)
    .where(ne(vendingMachines.status, "offline"));

  let degradedCount = 0;
  let brokenCount = 0;

  for (const machine of machines) {
    const currentMaintenance = machine.maintenanceLevel ?? 100;

    // Degradation rate: 0.1-0.5% per tick based on usage
    const totalCapacity = machine.capacity ?? 100;
    const usedCapacity = machine.usedCapacity ?? 0;
    const usageRatio = usedCapacity / Math.max(totalCapacity, 1);
    const degradationRate = 0.1 + usageRatio * 0.4;
    const randomFactor = 0.8 + Math.random() * 0.4;

    const newMaintenance = Math.max(
      0,
      currentMaintenance - degradationRate * randomFactor
    );

    // Determine new status based on maintenance level
    let newStatus = machine.status;
    if (newMaintenance <= 0) {
      newStatus = "broken";
      brokenCount++;
    } else if (newMaintenance <= 25) {
      newStatus = "needs_maintenance";
    } else if (newMaintenance <= 50 && usedCapacity < totalCapacity * 0.25) {
      newStatus = "low_stock";
    } else if (newMaintenance <= 50) {
      newStatus = "needs_maintenance";
    }

    if (
      newMaintenance !== currentMaintenance ||
      newStatus !== machine.status
    ) {
      await db
        .update(vendingMachines)
        .set({
          maintenanceLevel: Math.round(newMaintenance * 100) / 100,
          status: newStatus,
        })
        .where(eq(vendingMachines.id, machine.id));

      degradedCount++;

      if (newStatus !== machine.status) {
        emitMachineStatusChanged({
          machineId: machine.id,
          playerId: machine.playerId,
          status: newStatus ?? "healthy",
          maintenanceLevel: Math.round(newMaintenance),
          usedCapacity: machine.usedCapacity ?? 0,
          capacity: machine.capacity ?? 100,
          dailyRevenue: String(machine.dailyRevenue ?? "0"),
        });

        if (newStatus === "broken") {
          emitPlayerNotification(
            machine.playerId,
            "Machine Breakdown!",
            `Your machine "${machine.name}" has broken down and needs immediate repair.`,
            "error"
          );
        } else if (newStatus === "needs_maintenance") {
          emitPlayerNotification(
            machine.playerId,
            "Maintenance Required",
            `Your machine "${machine.name}" needs maintenance (${Math.round(newMaintenance)}% condition).`,
            "warning"
          );
        }
      }
    }
  }

  console.log(
    `[Job:MachineStatus] Processed ${machines.length} machines, ${degradedCount} degraded, ${brokenCount} broken`
  );
}

/**
 * DISPATCH ETA CHECK (Every 15 minutes)
 *
 * Checks active dispatches and completes those that have passed their ETA.
 */
async function jobDispatchETACheck(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const now = new Date();

  // Find dispatches that are in_transit and past their ETA
  const overdueDispatches = await db
    .select()
    .from(restockDispatches)
    .where(
      and(
        eq(restockDispatches.status, "in_transit"),
        lte(restockDispatches.estimatedArrival, now)
      )
    );

  let completedCount = 0;

  for (const dispatch of overdueDispatches) {
    // 90% success, 10% failure
    const isSuccess = Math.random() > 0.1;

    if (isSuccess) {
      await db
        .update(restockDispatches)
        .set({
          status: "completed",
          updatedAt: now,
        })
        .where(eq(restockDispatches.id, dispatch.id));

      // Restore machine to healthy + add capacity
      if (dispatch.machineId) {
        await db
          .update(vendingMachines)
          .set({
            usedCapacity: sql`LEAST(${vendingMachines.capacity}, ${vendingMachines.usedCapacity} + 5)`,
            status: "healthy",
            maintenanceLevel: 100,
          })
          .where(eq(vendingMachines.id, dispatch.machineId));
      }

      completedCount++;
    } else {
      await db
        .update(restockDispatches)
        .set({ status: "failed", updatedAt: now })
        .where(eq(restockDispatches.id, dispatch.id));

      // Look up machine owner for notification
      if (dispatch.machineId) {
        const machine = await db
          .select({ playerId: vendingMachines.playerId })
          .from(vendingMachines)
          .where(eq(vendingMachines.id, dispatch.machineId))
          .limit(1);

        if (machine[0]) {
          emitPlayerNotification(
            machine[0].playerId,
            "Dispatch Failed",
            `${dispatch.employeeName}'s dispatch to your machine failed. Please retry.`,
            "error"
          );
        }
      }
    }
  }

  if (overdueDispatches.length > 0) {
    console.log(
      `[Job:DispatchETA] Processed ${overdueDispatches.length} overdue dispatches, ${completedCount} completed`
    );
  }
}

/**
 * MARKETPLACE LISTING CLEANUP (Every hour)
 *
 * Removes expired marketplace listings and returns inventory to sellers.
 */
async function jobMarketplaceCleanup(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const now = new Date();

  const expiredListings = await db
    .select()
    .from(marketplaceListings)
    .where(
      and(
        eq(marketplaceListings.status, "active"),
        lte(marketplaceListings.expirationDate, now)
      )
    );

  for (const listing of expiredListings) {
    await db
      .update(marketplaceListings)
      .set({
        status: "expired",
        cancelledAt: now,
      })
      .where(eq(marketplaceListings.id, listing.id));

    // Return inventory to seller's warehouse
    await db
      .update(warehouseInventory)
      .set({
        quantity: sql`${warehouseInventory.quantity} + ${listing.quantity}`,
      })
      .where(eq(warehouseInventory.id, listing.warehouseItemId));

    emitMarketplaceListingExpired(
      listing.sellerId,
      listing.id,
      listing.sellerBrandName,
      listing.quantity
    );
  }

  if (expiredListings.length > 0) {
    console.log(
      `[Job:MarketplaceCleanup] Expired ${expiredListings.length} listings, inventory returned to sellers`
    );
  }
}

/**
 * COMPLAINT EXPIRATION (Every 4 hours)
 *
 * Auto-resolves complaints that have passed their expiration date.
 */
async function jobComplaintExpiration(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const now = new Date();

  const expiredComplaints = await db
    .select()
    .from(customerComplaints)
    .where(
      and(
        eq(customerComplaints.resolution, "pending"),
        lte(customerComplaints.expiresAt, now)
      )
    );

  if (expiredComplaints.length === 0) return;

  for (const complaint of expiredComplaints) {
    await db
      .update(customerComplaints)
      .set({
        resolution: "auto_refunded",
        resolvedAt: now,
      })
      .where(eq(customerComplaints.id, complaint.id));

    // Deduct refund from player's competition wallet
    const refundAmount = parseFloat(String(complaint.refundAmount));
    await db
      .update(players)
      .set({
        competitionWalletBalance: sql`GREATEST(0, ${players.competitionWalletBalance} - ${refundAmount})`,
      })
      .where(eq(players.id, complaint.playerId));

    emitPlayerNotification(
      complaint.playerId,
      "Complaint Auto-Resolved",
      `A complaint for $${refundAmount.toFixed(2)} was auto-refunded because it expired without action.`,
      "warning"
    );
  }

  console.log(
    `[Job:ComplaintExpiration] Auto-resolved ${expiredComplaints.length} expired complaints`
  );
}

/**
 * DAILY MARKET PRICE FLUCTUATION (Daily 3 AM)
 *
 * Runs the wholesale market price fluctuation algorithm and
 * optionally triggers random market events.
 */
async function jobDailyMarketPrices(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const { runDailyPriceFluctuation, triggerRandomMarketEvent } = await import(
    "../engines/wholesaleMarket"
  );

  const result = await runDailyPriceFluctuation();

  // The function returns { updated: number, events: string[] }
  // Broadcast a summary notification if prices were updated
  if (result.updated > 0) {
    emitGlobalNotification(
      "Daily Market Update",
      `${result.updated} product prices have been updated.${result.events.length > 0 ? " Events: " + result.events.join(", ") : ""}`,
      "info"
    );
  }

  // 30% chance to trigger a random market event each day
  if (Math.random() < 0.3) {
    const eventResult = await triggerRandomMarketEvent();
    if (eventResult.event) {
      const template = eventResult.event;
      const endDate = new Date(
        Date.now() + template.durationDays * 24 * 60 * 60 * 1000
      );

      emitMarketEventStarted({
        eventId: eventResult.id,
        eventName: template.eventName,
        description: template.description,
        affectedCategories: template.affectedCategories.join(","),
        priceMultiplier: template.priceMultiplier,
        startDate: new Date().toISOString(),
        endDate: endDate.toISOString(),
      });

      emitGlobalNotification(
        `Market Event: ${template.eventName}`,
        template.description,
        "warning"
      );
    }
  }

  // Check for expired market events
  const now = new Date();
  const expiredEvents = await db
    .select()
    .from(marketEvents)
    .where(
      and(
        lte(marketEvents.endDate, now),
        gt(
          marketEvents.startDate,
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        )
      )
    );

  for (const event of expiredEvents) {
    emitMarketEventEnded(event.id, event.eventName);
  }

  console.log(
    `[Job:DailyMarketPrices] Updated ${result.updated} prices, ${expiredEvents.length} events expired`
  );
}

/**
 * EXPIRED INVENTORY PURGE (Daily 4 AM)
 *
 * Removes expired products from warehouses and machines.
 */
async function jobExpiredInventoryPurge(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const now = new Date();
  let totalPurged = 0;
  const affectedPlayers = new Set<number>();

  // Purge expired warehouse inventory
  const expiredWarehouse = await db
    .select()
    .from(warehouseInventory)
    .where(
      and(
        lte(warehouseInventory.expirationDate, now),
        gt(warehouseInventory.quantity, 0)
      )
    );

  for (const item of expiredWarehouse) {
    const lostQuantity = item.quantity ?? 0;
    const lostValue =
      lostQuantity * parseFloat(String(item.purchasePrice ?? "0"));

    await db
      .update(warehouseInventory)
      .set({ quantity: 0 })
      .where(eq(warehouseInventory.id, item.id));

    totalPurged += lostQuantity;
    affectedPlayers.add(item.playerId);

    emitPlayerNotification(
      item.playerId,
      "Inventory Expired",
      `${lostQuantity} units of expired inventory worth $${lostValue.toFixed(2)} were discarded from your warehouse.`,
      "warning"
    );
  }

  // Purge expired machine inventory (uses quantityAllocated, not currentStock)
  const expiredMachine = await db
    .select()
    .from(machineInventory)
    .where(
      and(
        lte(machineInventory.expirationDate, now),
        gt(machineInventory.quantityAllocated, 0)
      )
    );

  for (const item of expiredMachine) {
    const lostQuantity = item.quantityAllocated ?? 0;

    await db
      .update(machineInventory)
      .set({ quantityAllocated: 0 })
      .where(eq(machineInventory.id, item.id));

    // Reduce machine used capacity
    await db
      .update(vendingMachines)
      .set({
        usedCapacity: sql`GREATEST(0, ${vendingMachines.usedCapacity} - ${lostQuantity})`,
      })
      .where(eq(vendingMachines.id, item.machineId));

    totalPurged += lostQuantity;

    // Look up machine owner
    const machine = await db
      .select({
        playerId: vendingMachines.playerId,
        name: vendingMachines.name,
      })
      .from(vendingMachines)
      .where(eq(vendingMachines.id, item.machineId))
      .limit(1);

    if (machine[0]) {
      affectedPlayers.add(machine[0].playerId);
      emitPlayerNotification(
        machine[0].playerId,
        "Machine Inventory Expired",
        `${lostQuantity} expired items were removed from "${machine[0].name}". Restock needed!`,
        "warning"
      );
    }
  }

  if (totalPurged > 0) {
    console.log(
      `[Job:ExpiredInventory] Purged ${totalPurged} expired items, ${affectedPlayers.size} players affected`
    );
  }
}

/**
 * SEASON LIFECYCLE CHECK (Daily 5 AM)
 *
 * Checks all seasons for phase transitions:
 * - preseason/lobby → Active (when start date reached)
 * - Active → Ended (when end date reached)
 * Triggers payouts for ended seasons.
 *
 * Note: seasons table uses `state` column (not `status`) and `seasonNumber` (not `name`).
 */
async function jobSeasonLifecycleCheck(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const now = new Date();

  // Check for seasons that should transition from preseason/lobby to active
  const lobbySeasons = await db
    .select()
    .from(seasons)
    .where(
      and(eq(seasons.state, "preseason"), lte(seasons.startDate, now))
    );

  for (const season of lobbySeasons) {
    try {
      const { activateSeason } = await import("../engines/seasonLifecycle");
      await activateSeason(season.id);

      const seasonLabel = `Season #${season.seasonNumber}`;

      emitSeasonPhaseChanged(String(season.id), "active", {
        seasonName: seasonLabel,
        message: `${seasonLabel} is now active! Competition has begun.`,
      });

      emitGlobalNotification(
        `Season Started: ${seasonLabel}`,
        "The competition is now live! Start building your vending empire.",
        "success"
      );

      console.log(`[Job:SeasonLifecycle] Activated: ${seasonLabel}`);
    } catch (error) {
      console.error(
        `[Job:SeasonLifecycle] Failed to activate season ${season.id}:`,
        error
      );
    }
  }

  // Check for seasons that should end
  const activeSeasons = await db
    .select()
    .from(seasons)
    .where(
      and(eq(seasons.state, "active"), lte(seasons.endDate, now))
    );

  for (const season of activeSeasons) {
    try {
      const { endSeason } = await import("../engines/seasonLifecycle");
      const summary = await endSeason(season.id);

      const seasonLabel = `Season #${season.seasonNumber}`;

      emitSeasonPhaseChanged(String(season.id), "ended", {
        seasonName: seasonLabel,
        message: `${seasonLabel} has ended! Check your rankings and payouts.`,
        totalPlayers: summary.totalPlayers,
        totalPrizePool: summary.totalPrizePool,
      });

      emitGlobalNotification(
        `Season Ended: ${seasonLabel}`,
        `The season has concluded with ${summary.totalPlayers} players competing for a $${summary.totalPrizePool.toFixed(2)} prize pool!`,
        "info"
      );

      // Notify each player of their results (winners array from SeasonSummary)
      for (const payout of summary.winners) {
        emitPlayerNotification(
          payout.playerId,
          `Season Results: Rank #${payout.rank}`,
          `You finished #${payout.rank} with a Tycoon Score of ${payout.tycoonScore}. Payout: $${payout.payoutAmount.toFixed(2)}`,
          payout.payoutAmount > 0 ? "success" : "info"
        );
      }

      console.log(
        `[Job:SeasonLifecycle] Ended: ${seasonLabel}, ${summary.totalPlayers} players, $${summary.totalPrizePool.toFixed(2)} prize pool`
      );
    } catch (error) {
      console.error(
        `[Job:SeasonLifecycle] Failed to end season ${season.id}:`,
        error
      );
    }
  }
}

/**
 * PLAYER INACTIVITY RECAP (Daily 6 AM)
 *
 * Sends notifications to players who haven't logged in recently.
 */
async function jobPlayerInactivityRecap(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

  // Find players inactive for 1-3 days
  const inactivePlayers = await db
    .select({
      id: players.id,
      brandName: players.brandName,
    })
    .from(players)
    .where(
      and(
        lte(players.updatedAt, oneDayAgo),
        gt(players.updatedAt, threeDaysAgo)
      )
    );

  for (const player of inactivePlayers) {
    // Count machines needing attention
    const machinesNeedingAttention = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(vendingMachines)
      .where(
        and(
          eq(vendingMachines.playerId, player.id),
          inArray(vendingMachines.status, [
            "needs_maintenance",
            "broken",
            "low_stock",
          ])
        )
      );

    const attentionCount = machinesNeedingAttention[0]?.count ?? 0;

    if (attentionCount > 0) {
      emitPlayerNotification(
        player.id,
        "Your Machines Need You!",
        `${attentionCount} of your machines need attention. Log in to manage your vending empire!`,
        "warning"
      );
    }
  }

  if (inactivePlayers.length > 0) {
    console.log(
      `[Job:InactivityRecap] Sent recaps to ${inactivePlayers.length} inactive players`
    );
  }
}

/**
 * LOCATION DATA CLEANUP (Weekly Sunday 2 AM)
 *
 * Purges old data older than 30 days for GDPR compliance.
 */
async function jobLocationDataCleanup(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Clean old price history (keep last 30 days)
  await db
    .delete(priceHistory)
    .where(lt(priceHistory.timestamp, thirtyDaysAgo));

  // Clean old completed/failed dispatches (keep last 30 days)
  await db
    .delete(restockDispatches)
    .where(
      and(
        inArray(restockDispatches.status, ["completed", "failed"]),
        lt(restockDispatches.updatedAt, thirtyDaysAgo)
      )
    );

  // Clean old resolved complaints (keep last 30 days)
  await db
    .delete(customerComplaints)
    .where(
      and(
        ne(customerComplaints.resolution, "pending"),
        lt(customerComplaints.resolvedAt, thirtyDaysAgo)
      )
    );

  console.log(
    `[Job:LocationDataCleanup] Purged old data (30+ days): prices, dispatches, complaints`
  );
}

/**
 * MARKET EVENT EXPIRATION CHECK (Daily 3:30 AM)
 */
async function jobMarketEventExpiration(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const now = new Date();

  const expiredEvents = await db
    .select()
    .from(marketEvents)
    .where(lte(marketEvents.endDate, now));

  for (const event of expiredEvents) {
    emitMarketEventEnded(event.id, event.eventName);
  }

  // Delete events older than 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  await db
    .delete(marketEvents)
    .where(lt(marketEvents.endDate, sevenDaysAgo));

  if (expiredEvents.length > 0) {
    console.log(
      `[Job:MarketEventExpiration] ${expiredEvents.length} events expired`
    );
  }
}

// ============================================================================
// SCHEDULER INITIALIZATION
// ============================================================================

export function initScheduler(): void {
  console.log("[Scheduler] Initializing VendFX cron job scheduler...");

  // Store handlers for manual triggering
  jobHandlers.set("machine-status-degradation", jobMachineStatusDegradation);
  jobHandlers.set("dispatch-eta-check", jobDispatchETACheck);
  jobHandlers.set("marketplace-cleanup", jobMarketplaceCleanup);
  jobHandlers.set("complaint-expiration", jobComplaintExpiration);
  jobHandlers.set("daily-market-prices", jobDailyMarketPrices);
  jobHandlers.set("expired-inventory-purge", jobExpiredInventoryPurge);
  jobHandlers.set("season-lifecycle-check", jobSeasonLifecycleCheck);
  jobHandlers.set("player-inactivity-recap", jobPlayerInactivityRecap);
  jobHandlers.set("location-data-cleanup", jobLocationDataCleanup);
  jobHandlers.set("market-event-expiration", jobMarketEventExpiration);

  // Register all jobs with their cron schedules
  // Format: seconds minutes hours day-of-month month day-of-week

  registerJob(
    "machine-status-degradation",
    "0 */5 * * * *",
    "Simulates wear and tear on vending machines, degrades maintenance levels",
    jobMachineStatusDegradation
  );

  registerJob(
    "dispatch-eta-check",
    "0 */15 * * * *",
    "Checks active dispatches and completes those past their ETA",
    jobDispatchETACheck
  );

  registerJob(
    "marketplace-cleanup",
    "0 0 * * * *",
    "Removes expired marketplace listings and returns inventory to sellers",
    jobMarketplaceCleanup
  );

  registerJob(
    "complaint-expiration",
    "0 0 */4 * * *",
    "Auto-resolves customer complaints that expired without player action",
    jobComplaintExpiration
  );

  registerJob(
    "daily-market-prices",
    "0 0 3 * * *",
    "Runs wholesale market price fluctuation algorithm and triggers random events",
    jobDailyMarketPrices
  );

  registerJob(
    "market-event-expiration",
    "0 30 3 * * *",
    "Checks for expired market events and cleans up old ones",
    jobMarketEventExpiration
  );

  registerJob(
    "expired-inventory-purge",
    "0 0 4 * * *",
    "Removes expired products from warehouses and machines",
    jobExpiredInventoryPurge
  );

  registerJob(
    "season-lifecycle-check",
    "0 0 5 * * *",
    "Checks season phase transitions (preseason → active → ended) and triggers payouts",
    jobSeasonLifecycleCheck
  );

  registerJob(
    "player-inactivity-recap",
    "0 0 6 * * *",
    "Sends recap notifications to inactive players about machines needing attention",
    jobPlayerInactivityRecap
  );

  registerJob(
    "location-data-cleanup",
    "0 0 2 * * 0",
    "Purges old location/tracking data older than 30 days for GDPR compliance",
    jobLocationDataCleanup
  );

  console.log(
    `[Scheduler] ✓ ${jobRegistry.size} jobs registered and running`
  );
}

export function stopScheduler(): void {
  jobRegistry.forEach((record) => {
    if (record.task) {
      record.task.stop();
    }
  });
  console.log("[Scheduler] All jobs stopped");
}
