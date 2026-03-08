/**
 * HR Logistics tRPC Router
 * Handles employee hiring, firing, task assignment, applicant management,
 * and employee roster queries.
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getPlayerByUserId } from "../queries";
import { calculateBusinessTier } from "../gameLogic";
import {
  generateApplicantPool,
  hireApplicant,
  fireEmployee,
  assignEmployeeToMachine,
  unassignEmployee,
  getEmployeeRoster,
  getApplicantPool,
  saveApplicantPool,
  canHireMore,
  calculateTaskEfficiency,
  calculateOverallRating,
  getBestEmployeeForTask,
} from "../engines/hrLogistics";
import { getPlayerMachines } from "../queries";

export const hrRouter = router({
  // ========================================================================
  // EMPLOYEE ROSTER
  // ========================================================================

  /**
   * Get full employee roster with computed ratings and lock status.
   */
  getRoster: protectedProcedure.query(async ({ ctx }) => {
    const player = await getPlayerByUserId(ctx.user.id);
    if (!player) throw new Error("Player not found. Create a profile first.");

    const roster = await getEmployeeRoster(player.id);
    const machines = await getPlayerMachines(player.id);
    const businessTier = calculateBusinessTier(machines.length);
    const capacity = canHireMore(roster.length, businessTier);

    return {
      employees: roster,
      capacity: {
        current: capacity.current,
        max: capacity.maxCapacity,
        canHireMore: capacity.allowed,
      },
      businessTier,
    };
  }),

  /**
   * Get a single employee's details with computed fields.
   */
  getEmployee: protectedProcedure
    .input(z.object({ employeeId: z.string() }))
    .query(async ({ ctx, input }) => {
      const player = await getPlayerByUserId(ctx.user.id);
      if (!player) throw new Error("Player not found");

      const roster = await getEmployeeRoster(player.id);
      const employee = roster.find((e) => e.id === input.employeeId);

      if (!employee) throw new Error("Employee not found");

      return employee;
    }),

  // ========================================================================
  // APPLICANT MANAGEMENT
  // ========================================================================

  /**
   * Get current applicant pool. Returns existing applicants or empty array.
   */
  getApplicants: protectedProcedure.query(async ({ ctx }) => {
    const player = await getPlayerByUserId(ctx.user.id);
    if (!player) throw new Error("Player not found");

    const applicants = await getApplicantPool(player.id);

    return {
      applicants: applicants.map((a) => ({
        ...a,
        overallRating: calculateOverallRating(a),
        restockEfficiency: calculateTaskEfficiency(a, "restock"),
        maintenanceEfficiency: calculateTaskEfficiency(a, "maintenance"),
      })),
    };
  }),

  /**
   * Refresh the applicant pool. Clears old applicants and generates new ones.
   * Costs in-game currency (competition wallet).
   */
  refreshApplicants: protectedProcedure
    .input(
      z.object({
        count: z.number().min(3).max(10).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const player = await getPlayerByUserId(ctx.user.id);
      if (!player) throw new Error("Player not found");

      const machines = await getPlayerMachines(player.id);
      const businessTier = calculateBusinessTier(machines.length);

      const count = input.count || 5;
      const applicantData = generateApplicantPool(player.id, businessTier, count);

      await saveApplicantPool(applicantData);

      return {
        applicants: applicantData.map((a) => ({
          ...a,
          overallRating: calculateOverallRating({
            statSpeed: a.statSpeed,
            statQualityControl: a.statQualityControl,
            statAttendance: a.statAttendance,
            statDriving: a.statDriving,
            statAdaptability: a.statAdaptability,
            statRepairSkill: a.statRepairSkill,
          }),
        })),
        count,
      };
    }),

  // ========================================================================
  // HIRING & FIRING
  // ========================================================================

  /**
   * Hire an applicant. Validates capacity constraints.
   */
  hire: protectedProcedure
    .input(z.object({ applicantId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const player = await getPlayerByUserId(ctx.user.id);
      if (!player) throw new Error("Player not found");

      const machines = await getPlayerMachines(player.id);
      const businessTier = calculateBusinessTier(machines.length);

      const result = await hireApplicant(input.applicantId, player.id, businessTier);

      if (!result.success) {
        throw new Error(result.error || "Failed to hire applicant");
      }

      return {
        employee: result.employee,
        message: `Successfully hired ${result.employee?.name}!`,
      };
    }),

  /**
   * Fire an employee. Cannot fire if currently on a task.
   */
  fire: protectedProcedure
    .input(z.object({ employeeId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const player = await getPlayerByUserId(ctx.user.id);
      if (!player) throw new Error("Player not found");

      const result = await fireEmployee(input.employeeId, player.id);

      if (!result.success) {
        throw new Error(result.error || "Failed to fire employee");
      }

      return { success: true, message: "Employee has been let go." };
    }),

  // ========================================================================
  // MACHINE ASSIGNMENT
  // ========================================================================

  /**
   * Assign an employee to a vending machine.
   * Triggers a 48-hour reassignment lock.
   */
  assignToMachine: protectedProcedure
    .input(
      z.object({
        employeeId: z.string(),
        machineId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const player = await getPlayerByUserId(ctx.user.id);
      if (!player) throw new Error("Player not found");

      const result = await assignEmployeeToMachine(
        input.employeeId,
        input.machineId,
        player.id
      );

      if (!result.success) {
        throw new Error(result.error || "Failed to assign employee");
      }

      return {
        employee: result.employee,
        message: `${result.employee?.name} assigned to machine. Locked for 48 hours.`,
      };
    }),

  /**
   * Unassign an employee from their machine. Respects 48-hour lock.
   */
  unassign: protectedProcedure
    .input(z.object({ employeeId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const player = await getPlayerByUserId(ctx.user.id);
      if (!player) throw new Error("Player not found");

      const result = await unassignEmployee(input.employeeId, player.id);

      if (!result.success) {
        throw new Error(result.error || "Failed to unassign employee");
      }

      return { success: true, message: "Employee unassigned from machine." };
    }),

  // ========================================================================
  // BEST EMPLOYEE RECOMMENDATION
  // ========================================================================

  /**
   * Get the best available employee for a specific task on a specific machine.
   */
  recommendEmployee: protectedProcedure
    .input(
      z.object({
        machineId: z.string(),
        taskType: z.enum(["restock", "maintenance", "emergency"]),
      })
    )
    .query(async ({ ctx, input }) => {
      const player = await getPlayerByUserId(ctx.user.id);
      if (!player) throw new Error("Player not found");

      const result = await getBestEmployeeForTask(
        player.id,
        input.machineId,
        input.taskType
      );

      return {
        employee: result.employee,
        efficiency: result.efficiency,
        reason: result.reason,
        taskType: input.taskType,
      };
    }),
});
