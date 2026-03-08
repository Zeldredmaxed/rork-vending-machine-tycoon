/**
 * Fleet Management Engine
 * Manages restock dispatch, travel time calculation, ETA prediction,
 * vehicle breakdown simulation, maintenance dispatch, and worker status tracking.
 */

import { eq, and, sql, desc, lte } from "drizzle-orm";
import { getDb } from "../db";
import {
  employees,
  vendingMachines,
  restockDispatches,
  type Employee,
  type VendingMachine,
  type RestockDispatch,
} from "../../drizzle/schema";
import { calculateTaskEfficiency, simulateAttendance } from "./hrLogistics";

// ============================================================================
// CONSTANTS
// ============================================================================

const BASE_DRIVING_SPEED_MPH = 30;
const RESTOCK_BASE_MINUTES = 30; // Base time to restock a machine
const REPAIR_BASE_MINUTES = 60; // Base time to repair a machine
const BREAKDOWN_COOLDOWN_HOURS = 4; // Min hours between breakdowns

// Maintenance degradation rates per hour
const MAINTENANCE_DEGRADATION_RATE: Record<string, number> = {
  healthy: 0.1,
  lowStock: 0.15,
  needsMaintenance: 0.3,
  broken: 0.5,
  offline: 0,
};

// Breakdown severity levels
const BREAKDOWN_SEVERITY = {
  minor: { repairMultiplier: 0.5, maintenanceDrop: 10, costMultiplier: 0.3 },
  moderate: { repairMultiplier: 1.0, maintenanceDrop: 25, costMultiplier: 0.6 },
  major: { repairMultiplier: 2.0, maintenanceDrop: 50, costMultiplier: 1.0 },
  critical: { repairMultiplier: 3.0, maintenanceDrop: 75, costMultiplier: 1.5 },
};

// ============================================================================
// GPS & TRAVEL TIME CALCULATIONS
// ============================================================================

/**
 * Calculate distance between two GPS coordinates using Haversine formula.
 * Returns distance in miles.
 */
export function calculateGpsDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate travel time based on distance and employee driving skill.
 * Driving skill modifies speed: 0 = -50% speed, 50 = base, 100 = +50% speed.
 * Returns total minutes.
 */
export function calculateTravelTimeMinutes(
  distanceMiles: number,
  drivingSkill: number
): number {
  const speedModifier = 1 + ((drivingSkill || 50) - 50) / 100; // 0.5x to 1.5x
  const actualSpeed = BASE_DRIVING_SPEED_MPH * speedModifier;
  const hours = distanceMiles / actualSpeed;
  return Math.max(1, Math.round(hours * 60)); // Minimum 1 minute
}

/**
 * Calculate task completion time based on employee stats and task type.
 * Speed stat reduces time, quality stat affects success rate.
 */
export function calculateTaskDurationMinutes(
  employee: {
    statSpeed: number | null;
    statQualityControl: number | null;
    statRepairSkill: number | null;
  },
  taskType: "restock" | "maintenance" | "emergency"
): number {
  const speed = employee.statSpeed || 50;

  let baseMinutes: number;
  switch (taskType) {
    case "restock":
      baseMinutes = RESTOCK_BASE_MINUTES;
      break;
    case "maintenance":
      baseMinutes = REPAIR_BASE_MINUTES;
      // Repair skill reduces maintenance time
      const repairSkill = employee.statRepairSkill || 50;
      baseMinutes = baseMinutes * (1 - (repairSkill - 50) / 200); // ±25% based on repair skill
      break;
    case "emergency":
      baseMinutes = RESTOCK_BASE_MINUTES * 0.5; // Emergency restocks are faster but less thorough
      break;
    default:
      baseMinutes = RESTOCK_BASE_MINUTES;
  }

  // Speed stat reduces task time: 0 = +50% time, 50 = base, 100 = -50% time
  const speedModifier = 1 - (speed - 50) / 200; // 0.75x to 1.25x
  return Math.max(5, Math.round(baseMinutes * speedModifier)); // Minimum 5 minutes
}

/**
 * Calculate full ETA for a dispatch: travel time + task time.
 * Returns the estimated arrival Date and breakdown of time components.
 */
export function calculateFullETA(
  distanceMiles: number,
  employee: {
    statSpeed: number | null;
    statDriving: number | null;
    statQualityControl: number | null;
    statRepairSkill: number | null;
  },
  taskType: "restock" | "maintenance" | "emergency"
): {
  travelMinutes: number;
  taskMinutes: number;
  totalMinutes: number;
  estimatedArrival: Date;
  estimatedCompletion: Date;
} {
  const travelMinutes = calculateTravelTimeMinutes(distanceMiles, employee.statDriving || 50);
  const taskMinutes = calculateTaskDurationMinutes(employee, taskType);
  const totalMinutes = travelMinutes + taskMinutes;

  const now = new Date();
  const estimatedArrival = new Date(now.getTime() + travelMinutes * 60 * 1000);
  const estimatedCompletion = new Date(now.getTime() + totalMinutes * 60 * 1000);

  return {
    travelMinutes,
    taskMinutes,
    totalMinutes,
    estimatedArrival,
    estimatedCompletion,
  };
}

// ============================================================================
// RESTOCK DISPATCH
// ============================================================================

/**
 * Dispatch an employee to restock a vending machine.
 * Validates employee availability, calculates ETA, creates dispatch record.
 */
export async function dispatchRestock(
  employeeId: string,
  machineId: string,
  playerId: number,
  playerLatitude: number = 40.7128, // Default: NYC (player HQ)
  playerLongitude: number = -74.006
): Promise<{
  success: boolean;
  dispatch?: RestockDispatch;
  eta?: {
    travelMinutes: number;
    taskMinutes: number;
    totalMinutes: number;
    estimatedArrival: Date;
    estimatedCompletion: Date;
  };
  error?: string;
}> {
  const db = await getDb();
  if (!db) return { success: false, error: "Database not available" };

  // Validate employee
  const empResult = await db
    .select()
    .from(employees)
    .where(and(eq(employees.id, employeeId), eq(employees.playerId, playerId)))
    .limit(1);

  if (!empResult[0]) {
    return { success: false, error: "Employee not found" };
  }

  const emp = empResult[0];

  // Check employee is idle
  if (emp.status !== "idle") {
    return {
      success: false,
      error: `Employee is currently ${emp.status}. Cannot dispatch until task is complete.`,
    };
  }

  // Simulate attendance check
  if (!simulateAttendance(emp.statAttendance || 50)) {
    return {
      success: false,
      error: `${emp.name} didn't show up for work today. Try another employee or wait.`,
    };
  }

  // Validate machine
  const machineResult = await db
    .select()
    .from(vendingMachines)
    .where(and(eq(vendingMachines.id, machineId), eq(vendingMachines.playerId, playerId)))
    .limit(1);

  if (!machineResult[0]) {
    return { success: false, error: "Machine not found" };
  }

  const machine = machineResult[0];

  // Check machine isn't already being restocked
  if (machine.restockState === "inProgress") {
    return { success: false, error: "Machine is already being restocked" };
  }

  // Calculate distance from player HQ to machine
  const distance = calculateGpsDistance(
    playerLatitude,
    playerLongitude,
    machine.latitude,
    machine.longitude
  );

  // Calculate ETA
  const eta = calculateFullETA(distance, emp, "restock");

  // Create dispatch record
  const dispatchId = `dsp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  await db.insert(restockDispatches).values({
    id: dispatchId,
    machineId,
    employeeId,
    employeeName: emp.name,
    status: "enRoute",
    estimatedArrival: eta.estimatedArrival,
  });

  // Update employee status
  await db
    .update(employees)
    .set({
      status: "enRoute",
      currentTaskStartTime: new Date(),
      estimatedArrivalTime: eta.estimatedArrival,
    })
    .where(eq(employees.id, employeeId));

  // Update machine restock state
  await db
    .update(vendingMachines)
    .set({ restockState: "inProgress" })
    .where(eq(vendingMachines.id, machineId));

  // Select back the dispatch
  const dispatchResult = await db
    .select()
    .from(restockDispatches)
    .where(eq(restockDispatches.id, dispatchId))
    .limit(1);

  return {
    success: true,
    dispatch: dispatchResult[0],
    eta,
  };
}

/**
 * Dispatch an employee for maintenance/repair on a machine.
 */
export async function dispatchMaintenance(
  employeeId: string,
  machineId: string,
  playerId: number,
  playerLatitude: number = 40.7128,
  playerLongitude: number = -74.006
): Promise<{
  success: boolean;
  dispatch?: RestockDispatch;
  eta?: {
    travelMinutes: number;
    taskMinutes: number;
    totalMinutes: number;
    estimatedArrival: Date;
    estimatedCompletion: Date;
  };
  error?: string;
}> {
  const db = await getDb();
  if (!db) return { success: false, error: "Database not available" };

  // Validate employee
  const empResult = await db
    .select()
    .from(employees)
    .where(and(eq(employees.id, employeeId), eq(employees.playerId, playerId)))
    .limit(1);

  if (!empResult[0]) {
    return { success: false, error: "Employee not found" };
  }

  const emp = empResult[0];

  if (emp.status !== "idle") {
    return {
      success: false,
      error: `Employee is currently ${emp.status}. Cannot dispatch.`,
    };
  }

  // Attendance check
  if (!simulateAttendance(emp.statAttendance || 50)) {
    return {
      success: false,
      error: `${emp.name} didn't show up for work today.`,
    };
  }

  // Validate machine
  const machineResult = await db
    .select()
    .from(vendingMachines)
    .where(and(eq(vendingMachines.id, machineId), eq(vendingMachines.playerId, playerId)))
    .limit(1);

  if (!machineResult[0]) {
    return { success: false, error: "Machine not found" };
  }

  const machine = machineResult[0];

  // Calculate distance and ETA
  const distance = calculateGpsDistance(
    playerLatitude,
    playerLongitude,
    machine.latitude,
    machine.longitude
  );

  const eta = calculateFullETA(distance, emp, "maintenance");

  // Create dispatch record
  const dispatchId = `dsp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  await db.insert(restockDispatches).values({
    id: dispatchId,
    machineId,
    employeeId,
    employeeName: emp.name,
    status: "enRoute",
    estimatedArrival: eta.estimatedArrival,
  });

  // Update employee status
  await db
    .update(employees)
    .set({
      status: "enRoute",
      currentTaskStartTime: new Date(),
      estimatedArrivalTime: eta.estimatedArrival,
    })
    .where(eq(employees.id, employeeId));

  // Select back the dispatch
  const dispatchResultRows = await db
    .select()
    .from(restockDispatches)
    .where(eq(restockDispatches.id, dispatchId))
    .limit(1);

  return {
    success: true,
    dispatch: dispatchResultRows[0],
    eta,
  };
}

// ============================================================================
// BREAKDOWN SIMULATION
// ============================================================================

/**
 * Simulate whether a machine breaks down based on its maintenance level.
 * Returns breakdown details if one occurs.
 */
export function simulateBreakdown(maintenanceLevel: number): {
  brokeDown: boolean;
  severity?: keyof typeof BREAKDOWN_SEVERITY;
  maintenanceDrop?: number;
  costMultiplier?: number;
} {
  // Breakdown probability increases exponentially as maintenance decreases
  // 100% maintenance: ~0% chance
  // 75% maintenance: ~6% chance
  // 50% maintenance: ~25% chance
  // 25% maintenance: ~56% chance
  // 0% maintenance: ~100% chance
  const breakdownChance = Math.pow(1 - maintenanceLevel / 100, 2);

  if (Math.random() >= breakdownChance) {
    return { brokeDown: false };
  }

  // Determine severity based on maintenance level
  let severity: keyof typeof BREAKDOWN_SEVERITY;
  const severityRoll = Math.random();

  if (maintenanceLevel > 60) {
    severity = severityRoll < 0.7 ? "minor" : "moderate";
  } else if (maintenanceLevel > 30) {
    severity = severityRoll < 0.3 ? "minor" : severityRoll < 0.7 ? "moderate" : "major";
  } else {
    severity = severityRoll < 0.1 ? "moderate" : severityRoll < 0.5 ? "major" : "critical";
  }

  const details = BREAKDOWN_SEVERITY[severity];

  return {
    brokeDown: true,
    severity,
    maintenanceDrop: details.maintenanceDrop,
    costMultiplier: details.costMultiplier,
  };
}

/**
 * Calculate repair cost for a breakdown.
 */
export function calculateRepairCost(
  baseMachineCost: number,
  severity: keyof typeof BREAKDOWN_SEVERITY
): number {
  const details = BREAKDOWN_SEVERITY[severity];
  const repairCost = baseMachineCost * details.costMultiplier;
  return Math.round(repairCost * 100) / 100;
}

/**
 * Apply breakdown to a machine in the database.
 */
export async function applyBreakdown(
  machineId: string,
  severity: keyof typeof BREAKDOWN_SEVERITY
): Promise<{ success: boolean; machine?: VendingMachine; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: "Database not available" };

  const machineResult = await db
    .select()
    .from(vendingMachines)
    .where(eq(vendingMachines.id, machineId))
    .limit(1);

  if (!machineResult[0]) {
    return { success: false, error: "Machine not found" };
  }

  const machine = machineResult[0];
  const details = BREAKDOWN_SEVERITY[severity];

  const newMaintenance = Math.max(0, (machine.maintenanceLevel || 100) - details.maintenanceDrop);
  const newStatus = newMaintenance <= 0 ? "broken" : "needsMaintenance";

  await db
    .update(vendingMachines)
    .set({
      maintenanceLevel: newMaintenance,
      status: newStatus,
    })
    .where(eq(vendingMachines.id, machineId));

  const updated = await db
    .select()
    .from(vendingMachines)
    .where(eq(vendingMachines.id, machineId))
    .limit(1);

  return { success: true, machine: updated[0] };
}

// ============================================================================
// DISPATCH COMPLETION & STATUS TRACKING
// ============================================================================

/**
 * Complete a restock dispatch. Called when ETA has passed.
 * Applies quality check based on employee stats.
 */
export async function completeRestock(
  dispatchId: string
): Promise<{
  success: boolean;
  qualityScore: number;
  maintenanceRestored: number;
  error?: string;
}> {
  const db = await getDb();
  if (!db) return { success: false, qualityScore: 0, maintenanceRestored: 0, error: "Database not available" };

  const dispatchResult = await db
    .select()
    .from(restockDispatches)
    .where(eq(restockDispatches.id, dispatchId))
    .limit(1);

  if (!dispatchResult[0]) {
    return { success: false, qualityScore: 0, maintenanceRestored: 0, error: "Dispatch not found" };
  }

  const dispatch = dispatchResult[0];

  // Get employee for quality calculation
  const empResult = await db
    .select()
    .from(employees)
    .where(eq(employees.id, dispatch.employeeId))
    .limit(1);

  const emp = empResult[0];
  const qualityControl = emp?.statQualityControl || 50;

  // Quality score determines how well the restock was done
  // Higher quality = more maintenance restored, better inventory placement
  const qualityScore = Math.min(100, Math.max(0, qualityControl + (Math.random() * 20 - 10)));

  // Maintenance restoration based on quality
  const maintenanceRestored = Math.round(5 + (qualityScore / 100) * 15); // 5-20 points

  // Update machine
  const machineResult = await db
    .select()
    .from(vendingMachines)
    .where(eq(vendingMachines.id, dispatch.machineId))
    .limit(1);

  if (machineResult[0]) {
    const currentMaintenance = machineResult[0].maintenanceLevel || 0;
    const newMaintenance = Math.min(100, currentMaintenance + maintenanceRestored);

    await db
      .update(vendingMachines)
      .set({
        maintenanceLevel: newMaintenance,
        restockState: "idle",
        status: newMaintenance > 50 ? "healthy" : "needsMaintenance",
      })
      .where(eq(vendingMachines.id, dispatch.machineId));
  }

  // Update dispatch status
  await db
    .update(restockDispatches)
    .set({ status: "completed" })
    .where(eq(restockDispatches.id, dispatchId));

  // Reset employee status
  if (emp) {
    await db
      .update(employees)
      .set({
        status: "idle",
        currentTaskStartTime: null,
        estimatedArrivalTime: null,
      })
      .where(eq(employees.id, emp.id));
  }

  return { success: true, qualityScore, maintenanceRestored };
}

/**
 * Fail a dispatch (e.g., vehicle broke down en route).
 */
export async function failDispatch(
  dispatchId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: "Database not available" };

  const dispatchResult = await db
    .select()
    .from(restockDispatches)
    .where(eq(restockDispatches.id, dispatchId))
    .limit(1);

  if (!dispatchResult[0]) {
    return { success: false, error: "Dispatch not found" };
  }

  const dispatch = dispatchResult[0];

  // Update dispatch status
  await db
    .update(restockDispatches)
    .set({ status: "failed" })
    .where(eq(restockDispatches.id, dispatchId));

  // Reset employee
  await db
    .update(employees)
    .set({
      status: "idle",
      currentTaskStartTime: null,
      estimatedArrivalTime: null,
    })
    .where(eq(employees.id, dispatch.employeeId));

  // Reset machine restock state
  await db
    .update(vendingMachines)
    .set({ restockState: "idle" })
    .where(eq(vendingMachines.id, dispatch.machineId));

  return { success: true };
}

/**
 * Get active dispatches for a player's machines.
 */
export async function getActiveDispatches(playerId: number): Promise<
  Array<
    RestockDispatch & {
      machineName: string;
      machineLatitude: number;
      machineLongitude: number;
      progressPercent: number;
    }
  >
> {
  const db = await getDb();
  if (!db) return [];

  // Get player's machines
  const playerMachines = await db
    .select()
    .from(vendingMachines)
    .where(eq(vendingMachines.playerId, playerId));

  if (playerMachines.length === 0) return [];

  const machineIds = playerMachines.map((m) => m.id);
  const machineMap = new Map(playerMachines.map((m) => [m.id, m]));

  // Get active dispatches for those machines
  const dispatches = await db
    .select()
    .from(restockDispatches)
    .where(
      and(
        sql`${restockDispatches.machineId} IN (${sql.raw(machineIds.map((id) => `'${id}'`).join(","))})`,
        sql`${restockDispatches.status} IN ('pending', 'enRoute', 'restocking', 'repairing')`
      )
    )
    .orderBy(desc(restockDispatches.createdAt));

  return dispatches.map((d) => {
    const machine = machineMap.get(d.machineId);
    const now = Date.now();
    const start = d.dispatchTime ? new Date(d.dispatchTime).getTime() : now;
    const end = d.estimatedArrival ? new Date(d.estimatedArrival).getTime() : now;
    const elapsed = now - start;
    const total = end - start;
    const progressPercent = total > 0 ? Math.min(100, Math.round((elapsed / total) * 100)) : 100;

    return {
      ...d,
      machineName: machine?.name || "Unknown",
      machineLatitude: machine?.latitude || 0,
      machineLongitude: machine?.longitude || 0,
      progressPercent,
    };
  });
}

/**
 * Get dispatch history for a player.
 */
export async function getDispatchHistory(
  playerId: number,
  limit: number = 50
): Promise<RestockDispatch[]> {
  const db = await getDb();
  if (!db) return [];

  // Get player's machines
  const playerMachines = await db
    .select({ id: vendingMachines.id })
    .from(vendingMachines)
    .where(eq(vendingMachines.playerId, playerId));

  if (playerMachines.length === 0) return [];

  const machineIds = playerMachines.map((m) => m.id);

  return await db
    .select()
    .from(restockDispatches)
    .where(
      sql`${restockDispatches.machineId} IN (${sql.raw(machineIds.map((id) => `'${id}'`).join(","))})`
    )
    .orderBy(desc(restockDispatches.createdAt))
    .limit(limit);
}

// ============================================================================
// MAINTENANCE DEGRADATION
// ============================================================================

/**
 * Apply hourly maintenance degradation to all machines.
 * Called by cron job. Machines degrade faster when in poor condition.
 */
export async function degradeAllMachines(): Promise<{
  machinesUpdated: number;
  breakdowns: Array<{ machineId: string; severity: string }>;
}> {
  const db = await getDb();
  if (!db) return { machinesUpdated: 0, breakdowns: [] };

  const allMachines = await db
    .select()
    .from(vendingMachines)
    .where(sql`${vendingMachines.status} != 'offline'`);

  const breakdowns: Array<{ machineId: string; severity: string }> = [];
  let updated = 0;

  for (const machine of allMachines) {
    const currentStatus = machine.status || "healthy";
    const degradeRate = MAINTENANCE_DEGRADATION_RATE[currentStatus] || 0.1;
    const currentMaintenance = machine.maintenanceLevel || 100;
    const newMaintenance = Math.max(0, currentMaintenance - degradeRate);

    // Check for breakdown
    const breakdownResult = simulateBreakdown(newMaintenance);

    let newStatus = currentStatus;
    let finalMaintenance = newMaintenance;

    if (breakdownResult.brokeDown && breakdownResult.severity) {
      const severity = breakdownResult.severity;
      finalMaintenance = Math.max(0, newMaintenance - (breakdownResult.maintenanceDrop || 0));
      newStatus = finalMaintenance <= 0 ? "broken" : "needsMaintenance";
      breakdowns.push({ machineId: machine.id, severity });
    } else if (newMaintenance < 30 && currentStatus === "healthy") {
      newStatus = "needsMaintenance";
    }

    if (finalMaintenance !== currentMaintenance || newStatus !== currentStatus) {
      await db
        .update(vendingMachines)
        .set({
          maintenanceLevel: finalMaintenance,
          status: newStatus,
        })
        .where(eq(vendingMachines.id, machine.id));
      updated++;
    }
  }

  return { machinesUpdated: updated, breakdowns };
}

/**
 * Check for dispatches that should be completed (ETA has passed).
 * Auto-completes them.
 */
export async function processCompletedDispatches(): Promise<{
  completed: number;
  failed: number;
}> {
  const db = await getDb();
  if (!db) return { completed: 0, failed: 0 };

  const now = new Date();

  // Find dispatches where ETA has passed and status is still enRoute
  const overdueDispatches = await db
    .select()
    .from(restockDispatches)
    .where(
      and(
        sql`${restockDispatches.status} IN ('enRoute', 'restocking', 'repairing')`,
        lte(restockDispatches.estimatedArrival, now)
      )
    );

  let completed = 0;
  let failed = 0;

  for (const dispatch of overdueDispatches) {
    // Small chance of failure based on employee adaptability
    const empResult = await db
      .select()
      .from(employees)
      .where(eq(employees.id, dispatch.employeeId))
      .limit(1);

    const adaptability = empResult[0]?.statAdaptability || 50;
    const failureChance = Math.max(0.01, 0.15 - (adaptability / 100) * 0.14); // 1%-15% failure rate

    if (Math.random() < failureChance) {
      await failDispatch(dispatch.id, "Task failed due to unforeseen circumstances");
      failed++;
    } else {
      await completeRestock(dispatch.id);
      completed++;
    }
  }

  return { completed, failed };
}
