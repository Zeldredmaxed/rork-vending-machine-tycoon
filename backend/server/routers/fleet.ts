/**
 * Fleet Management tRPC Router
 * Handles restock dispatch, maintenance dispatch, breakdown management,
 * dispatch tracking, and fleet status queries.
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getPlayerByUserId, getPlayerMachines, getMachineById } from "../queries";
import {
  dispatchRestock,
  dispatchMaintenance,
  completeRestock,
  failDispatch,
  getActiveDispatches,
  getDispatchHistory,
  simulateBreakdown,
  calculateRepairCost,
  applyBreakdown,
  calculateGpsDistance,
  calculateFullETA,
  processCompletedDispatches,
} from "../engines/fleetManagement";
import { getEmployeeRoster } from "../engines/hrLogistics";

export const fleetRouter = router({
  // ========================================================================
  // DISPATCH OPERATIONS
  // ========================================================================

  /**
   * Dispatch an employee to restock a vending machine.
   * Validates employee availability, calculates ETA, creates dispatch record.
   */
  dispatchRestock: protectedProcedure
    .input(
      z.object({
        employeeId: z.string(),
        machineId: z.string(),
        playerLatitude: z.number().optional(),
        playerLongitude: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const player = await getPlayerByUserId(ctx.user.id);
      if (!player) throw new Error("Player not found");

      const result = await dispatchRestock(
        input.employeeId,
        input.machineId,
        player.id,
        input.playerLatitude,
        input.playerLongitude
      );

      if (!result.success) {
        throw new Error(result.error || "Failed to dispatch restock");
      }

      return {
        dispatch: result.dispatch,
        eta: result.eta,
        message: `Restock dispatched! ETA: ${result.eta?.totalMinutes} minutes.`,
      };
    }),

  /**
   * Dispatch an employee for maintenance/repair on a machine.
   */
  dispatchMaintenance: protectedProcedure
    .input(
      z.object({
        employeeId: z.string(),
        machineId: z.string(),
        playerLatitude: z.number().optional(),
        playerLongitude: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const player = await getPlayerByUserId(ctx.user.id);
      if (!player) throw new Error("Player not found");

      const result = await dispatchMaintenance(
        input.employeeId,
        input.machineId,
        player.id,
        input.playerLatitude,
        input.playerLongitude
      );

      if (!result.success) {
        throw new Error(result.error || "Failed to dispatch maintenance");
      }

      return {
        dispatch: result.dispatch,
        eta: result.eta,
        message: `Maintenance crew dispatched! ETA: ${result.eta?.totalMinutes} minutes.`,
      };
    }),

  // ========================================================================
  // DISPATCH TRACKING
  // ========================================================================

  /**
   * Get all active dispatches for the player's machines.
   * Includes progress percentage and machine details.
   */
  getActiveDispatches: protectedProcedure.query(async ({ ctx }) => {
    const player = await getPlayerByUserId(ctx.user.id);
    if (!player) throw new Error("Player not found");

    const dispatches = await getActiveDispatches(player.id);

    return {
      dispatches,
      activeCount: dispatches.length,
    };
  }),

  /**
   * Get dispatch history for the player.
   */
  getHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(200).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const player = await getPlayerByUserId(ctx.user.id);
      if (!player) throw new Error("Player not found");

      const history = await getDispatchHistory(player.id, input.limit || 50);

      return { dispatches: history };
    }),

  // ========================================================================
  // ETA CALCULATION (Preview)
  // ========================================================================

  /**
   * Calculate ETA preview for a potential dispatch without actually dispatching.
   * Useful for UI to show estimated times before player commits.
   */
  previewETA: protectedProcedure
    .input(
      z.object({
        employeeId: z.string(),
        machineId: z.string(),
        taskType: z.enum(["restock", "maintenance", "emergency"]),
        playerLatitude: z.number().optional(),
        playerLongitude: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const player = await getPlayerByUserId(ctx.user.id);
      if (!player) throw new Error("Player not found");

      // Get employee
      const roster = await getEmployeeRoster(player.id);
      const employee = roster.find((e) => e.id === input.employeeId);
      if (!employee) throw new Error("Employee not found");

      // Get machine
      const machine = await getMachineById(input.machineId);
      if (!machine) throw new Error("Machine not found");

      // Calculate distance
      const playerLat = input.playerLatitude || 40.7128;
      const playerLon = input.playerLongitude || -74.006;
      const distance = calculateGpsDistance(
        playerLat,
        playerLon,
        machine.latitude,
        machine.longitude
      );

      // Calculate ETA
      const eta = calculateFullETA(distance, employee, input.taskType);

      return {
        distance: Math.round(distance * 100) / 100,
        distanceUnit: "miles",
        travelMinutes: eta.travelMinutes,
        taskMinutes: eta.taskMinutes,
        totalMinutes: eta.totalMinutes,
        estimatedArrival: eta.estimatedArrival,
        estimatedCompletion: eta.estimatedCompletion,
        employeeName: employee.name,
        employeeEfficiency: employee.restockEfficiency,
        machineName: machine.name,
      };
    }),

  // ========================================================================
  // MACHINE HEALTH & BREAKDOWNS
  // ========================================================================

  /**
   * Get machine fleet status overview.
   * Shows all machines with health, maintenance level, and status.
   */
  getFleetStatus: protectedProcedure.query(async ({ ctx }) => {
    const player = await getPlayerByUserId(ctx.user.id);
    if (!player) throw new Error("Player not found");

    const machines = await getPlayerMachines(player.id);

    const statusCounts = {
      healthy: 0,
      lowStock: 0,
      needsMaintenance: 0,
      broken: 0,
      offline: 0,
    };

    const machineDetails = machines.map((m) => {
      const status = (m.status || "healthy") as keyof typeof statusCounts;
      if (status in statusCounts) {
        statusCounts[status]++;
      }

      // Calculate breakdown risk
      const maintenance = m.maintenanceLevel || 100;
      let breakdownRisk: "low" | "medium" | "high" | "critical";
      if (maintenance > 75) breakdownRisk = "low";
      else if (maintenance > 50) breakdownRisk = "medium";
      else if (maintenance > 25) breakdownRisk = "high";
      else breakdownRisk = "critical";

      return {
        id: m.id,
        name: m.name,
        status: m.status,
        maintenanceLevel: maintenance,
        breakdownRisk,
        restockState: m.restockState,
        dailyRevenue: m.dailyRevenue,
        latitude: m.latitude,
        longitude: m.longitude,
      };
    });

    return {
      machines: machineDetails,
      summary: {
        total: machines.length,
        ...statusCounts,
        averageMaintenance:
          machines.length > 0
            ? Math.round(
                machines.reduce((sum, m) => sum + (m.maintenanceLevel || 0), 0) / machines.length
              )
            : 100,
      },
    };
  }),

  /**
   * Manually trigger a breakdown check on a specific machine.
   * Used for testing or admin purposes.
   */
  checkBreakdown: protectedProcedure
    .input(z.object({ machineId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const player = await getPlayerByUserId(ctx.user.id);
      if (!player) throw new Error("Player not found");

      const machine = await getMachineById(input.machineId);
      if (!machine) throw new Error("Machine not found");
      if (machine.playerId !== player.id) throw new Error("Not your machine");

      const breakdownResult = simulateBreakdown(machine.maintenanceLevel || 100);

      if (breakdownResult.brokeDown && breakdownResult.severity) {
        const repairCost = calculateRepairCost(
          parseFloat(machine.basePurchaseCost || "500"),
          breakdownResult.severity
        );

        const applyResult = await applyBreakdown(input.machineId, breakdownResult.severity);

        return {
          brokeDown: true,
          severity: breakdownResult.severity,
          repairCost,
          maintenanceDrop: breakdownResult.maintenanceDrop,
          machine: applyResult.machine,
          message: `Machine "${machine.name}" suffered a ${breakdownResult.severity} breakdown! Repair cost: $${repairCost}`,
        };
      }

      return {
        brokeDown: false,
        message: `Machine "${machine.name}" passed the inspection.`,
      };
    }),

  /**
   * Get repair cost estimate for a machine.
   */
  getRepairEstimate: protectedProcedure
    .input(z.object({ machineId: z.string() }))
    .query(async ({ ctx, input }) => {
      const player = await getPlayerByUserId(ctx.user.id);
      if (!player) throw new Error("Player not found");

      const machine = await getMachineById(input.machineId);
      if (!machine) throw new Error("Machine not found");
      if (machine.playerId !== player.id) throw new Error("Not your machine");

      const baseCost = parseFloat(machine.basePurchaseCost || "500");

      return {
        machineId: machine.id,
        machineName: machine.name,
        currentMaintenance: machine.maintenanceLevel,
        status: machine.status,
        estimates: {
          minor: calculateRepairCost(baseCost, "minor"),
          moderate: calculateRepairCost(baseCost, "moderate"),
          major: calculateRepairCost(baseCost, "major"),
          critical: calculateRepairCost(baseCost, "critical"),
        },
      };
    }),

  // ========================================================================
  // ADMIN: PROCESS COMPLETED DISPATCHES
  // ========================================================================

  /**
   * Process all dispatches that have passed their ETA.
   * Auto-completes or fails them based on employee stats.
   * Typically called by a cron job.
   */
  processDispatches: protectedProcedure.mutation(async ({ ctx }) => {
    // This could be admin-only in production
    const result = await processCompletedDispatches();

    return {
      completed: result.completed,
      failed: result.failed,
      message: `Processed dispatches: ${result.completed} completed, ${result.failed} failed.`,
    };
  }),
});
