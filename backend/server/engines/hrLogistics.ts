/**
 * HR Logistics Engine
 * Manages employee hiring, task assignment with 48-hour locks,
 * employee efficiency calculations, and capacity constraints.
 */

import { eq, and, sql, desc, lte, gte, isNull } from "drizzle-orm";
import { getDb } from "../db";
import {
  employees,
  applicants,
  vendingMachines,
  restockDispatches,
  type Employee,
  type Applicant,
} from "../../drizzle/schema";

// ============================================================================
// CONSTANTS
// ============================================================================

const ASSIGNMENT_LOCK_HOURS = 48;
const MAX_EMPLOYEES_PER_TIER: Record<string, number> = {
  startup: 3,
  localOperator: 8,
  regionalManager: 20,
  executive: 50,
};

const APPLICANT_POOL_SIZE = 5;
const APPLICANT_REFRESH_HOURS = 12;

// Stat weight profiles for different task types
const TASK_STAT_WEIGHTS: Record<string, Record<string, number>> = {
  restock: {
    speed: 0.25,
    qualityControl: 0.15,
    attendance: 0.20,
    driving: 0.25,
    adaptability: 0.10,
    repairSkill: 0.05,
  },
  maintenance: {
    speed: 0.10,
    qualityControl: 0.20,
    attendance: 0.15,
    driving: 0.10,
    adaptability: 0.15,
    repairSkill: 0.30,
  },
  emergency: {
    speed: 0.30,
    qualityControl: 0.10,
    attendance: 0.25,
    driving: 0.20,
    adaptability: 0.10,
    repairSkill: 0.05,
  },
};

// Name generation pools
const FIRST_NAMES = [
  "Alex", "Jordan", "Casey", "Morgan", "Taylor", "Riley", "Avery", "Quinn",
  "Blake", "Cameron", "Dakota", "Emery", "Finley", "Harper", "Jessie", "Kendall",
  "Logan", "Peyton", "Reese", "Skyler", "Devon", "Drew", "Ellis", "Frankie",
  "Jamie", "Kerry", "Lee", "Marley", "Noel", "Pat", "Robin", "Sam",
  "Marcus", "Elena", "Raj", "Yuki", "Omar", "Lena", "Chen", "Priya",
  "Aiden", "Sophia", "Mateo", "Zara", "Kai", "Luna", "Nico", "Mila",
];

const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
  "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas",
  "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson", "White",
  "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker", "Young",
  "Patel", "Kim", "Nguyen", "Chen", "Singh", "Ali", "Tanaka", "Mueller",
];

// ============================================================================
// APPLICANT GENERATION
// ============================================================================

/**
 * Generate a pool of applicants with randomized stats.
 * Stats are influenced by the player's business tier — higher tiers
 * attract better candidates on average.
 */
export function generateApplicantPool(
  playerId: number,
  businessTier: string,
  count: number = APPLICANT_POOL_SIZE
): Array<{
  id: string;
  playerId: number;
  name: string;
  wagePerRestock: string;
  statSpeed: number;
  statQualityControl: number;
  statAttendance: number;
  statDriving: number;
  statAdaptability: number;
  statRepairSkill: number;
  capacityCost: number;
}> {
  // Higher tiers get better stat floors
  const tierBonus: Record<string, number> = {
    startup: 0,
    localOperator: 10,
    regionalManager: 20,
    executive: 30,
  };

  const bonus = tierBonus[businessTier] || 0;

  return Array.from({ length: count }).map(() => {
    const stats = generateRandomStats(bonus);
    const avgStat = Object.values(stats).reduce((a, b) => a + b, 0) / 6;

    // Wage scales with stat quality: better workers demand more
    const baseWage = 10 + (avgStat / 100) * 40; // $10-$50 range
    const wageVariance = (Math.random() - 0.5) * 10; // ±$5 variance
    const wage = Math.max(8, baseWage + wageVariance);

    // Capacity cost: better workers take more capacity (3-8)
    const capacityCost = Math.max(3, Math.min(8, Math.round(3 + (avgStat / 100) * 5)));

    return {
      id: `app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      playerId,
      name: generateRandomName(),
      wagePerRestock: wage.toFixed(2),
      ...stats,
      capacityCost,
    };
  });
}

function generateRandomStats(bonus: number): {
  statSpeed: number;
  statQualityControl: number;
  statAttendance: number;
  statDriving: number;
  statAdaptability: number;
  statRepairSkill: number;
} {
  const randomStat = () => Math.min(100, Math.max(1, Math.floor(Math.random() * 80 + bonus + 10)));

  return {
    statSpeed: randomStat(),
    statQualityControl: randomStat(),
    statAttendance: randomStat(),
    statDriving: randomStat(),
    statAdaptability: randomStat(),
    statRepairSkill: randomStat(),
  };
}

function generateRandomName(): string {
  const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const last = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  return `${first} ${last}`;
}

// ============================================================================
// HIRING & CAPACITY
// ============================================================================

/**
 * Check if a player can hire more employees based on their business tier.
 */
export function canHireMore(
  currentEmployeeCount: number,
  businessTier: string
): { allowed: boolean; maxCapacity: number; current: number; reason?: string } {
  const maxCapacity = MAX_EMPLOYEES_PER_TIER[businessTier] || 3;

  if (currentEmployeeCount >= maxCapacity) {
    return {
      allowed: false,
      maxCapacity,
      current: currentEmployeeCount,
      reason: `Employee capacity reached (${currentEmployeeCount}/${maxCapacity}). Upgrade your business tier to hire more.`,
    };
  }

  return { allowed: true, maxCapacity, current: currentEmployeeCount };
}

/**
 * Hire an applicant: validate capacity, create employee record, remove applicant.
 */
export async function hireApplicant(
  applicantId: string,
  playerId: number,
  businessTier: string
): Promise<{ success: boolean; employee?: Employee; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: "Database not available" };

  // Get current employee count
  const empCount = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(employees)
    .where(eq(employees.playerId, playerId));

  const currentCount = empCount[0]?.count || 0;
  const capacityCheck = canHireMore(currentCount, businessTier);

  if (!capacityCheck.allowed) {
    return { success: false, error: capacityCheck.reason };
  }

  // Get applicant
  const appResult = await db
    .select()
    .from(applicants)
    .where(and(eq(applicants.id, applicantId), eq(applicants.playerId, playerId)))
    .limit(1);

  if (!appResult[0]) {
    return { success: false, error: "Applicant not found or does not belong to this player" };
  }

  const app = appResult[0];

  // Create employee from applicant
  const employeeId = `emp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  await db.insert(employees).values({
    id: employeeId,
    playerId,
    name: app.name,
    wagePerTask: app.wagePerRestock,
    statSpeed: app.statSpeed,
    statQualityControl: app.statQualityControl,
    statAttendance: app.statAttendance,
    statDriving: app.statDriving,
    statAdaptability: app.statAdaptability,
    statRepairSkill: app.statRepairSkill,
    capacityCost: app.capacityCost,
    status: "idle",
  });

  // Remove applicant
  await db.delete(applicants).where(eq(applicants.id, applicantId));

  // Select back the new employee
  const empResult = await db
    .select()
    .from(employees)
    .where(eq(employees.id, employeeId))
    .limit(1);

  return { success: true, employee: empResult[0] };
}

/**
 * Fire an employee. Cannot fire if they are currently on a task.
 */
export async function fireEmployee(
  employeeId: string,
  playerId: number
): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: "Database not available" };

  const empResult = await db
    .select()
    .from(employees)
    .where(and(eq(employees.id, employeeId), eq(employees.playerId, playerId)))
    .limit(1);

  if (!empResult[0]) {
    return { success: false, error: "Employee not found" };
  }

  const emp = empResult[0];

  if (emp.status === "enRoute" || emp.status === "restocking" || emp.status === "repairing") {
    return {
      success: false,
      error: `Cannot fire employee while they are ${emp.status}. Wait for their current task to complete.`,
    };
  }

  await db.delete(employees).where(eq(employees.id, employeeId));

  return { success: true };
}

// ============================================================================
// TASK ASSIGNMENT WITH 48-HOUR LOCK
// ============================================================================

/**
 * Assign an employee to a machine with a 48-hour reassignment lock.
 * Once assigned, the employee cannot be reassigned for 48 hours.
 */
export async function assignEmployeeToMachine(
  employeeId: string,
  machineId: string,
  playerId: number
): Promise<{ success: boolean; employee?: Employee; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: "Database not available" };

  // Verify employee belongs to player
  const empResult = await db
    .select()
    .from(employees)
    .where(and(eq(employees.id, employeeId), eq(employees.playerId, playerId)))
    .limit(1);

  if (!empResult[0]) {
    return { success: false, error: "Employee not found" };
  }

  const emp = empResult[0];

  // Check assignment lock
  if (emp.assignmentLockUntil && new Date(emp.assignmentLockUntil) > new Date()) {
    const lockRemaining = Math.ceil(
      (new Date(emp.assignmentLockUntil).getTime() - Date.now()) / (1000 * 60 * 60)
    );
    return {
      success: false,
      error: `Employee is locked to current assignment for ${lockRemaining} more hours. Lock expires at ${new Date(emp.assignmentLockUntil).toISOString()}.`,
    };
  }

  // Check employee is not currently on a task
  if (emp.status === "enRoute" || emp.status === "restocking" || emp.status === "repairing") {
    return {
      success: false,
      error: `Employee is currently ${emp.status}. Wait for task completion before reassigning.`,
    };
  }

  // Verify machine belongs to player
  const machineResult = await db
    .select()
    .from(vendingMachines)
    .where(and(eq(vendingMachines.id, machineId), eq(vendingMachines.playerId, playerId)))
    .limit(1);

  if (!machineResult[0]) {
    return { success: false, error: "Machine not found or does not belong to this player" };
  }

  // Set assignment lock (48 hours from now)
  const lockUntil = new Date();
  lockUntil.setHours(lockUntil.getHours() + ASSIGNMENT_LOCK_HOURS);

  await db
    .update(employees)
    .set({
      assignedMachineId: machineId,
      assignmentLockUntil: lockUntil,
      status: "idle",
    })
    .where(eq(employees.id, employeeId));

  // Select back updated employee
  const updated = await db
    .select()
    .from(employees)
    .where(eq(employees.id, employeeId))
    .limit(1);

  return { success: true, employee: updated[0] };
}

/**
 * Unassign an employee from their machine (respects lock).
 */
export async function unassignEmployee(
  employeeId: string,
  playerId: number
): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: "Database not available" };

  const empResult = await db
    .select()
    .from(employees)
    .where(and(eq(employees.id, employeeId), eq(employees.playerId, playerId)))
    .limit(1);

  if (!empResult[0]) {
    return { success: false, error: "Employee not found" };
  }

  const emp = empResult[0];

  // Check lock
  if (emp.assignmentLockUntil && new Date(emp.assignmentLockUntil) > new Date()) {
    const lockRemaining = Math.ceil(
      (new Date(emp.assignmentLockUntil).getTime() - Date.now()) / (1000 * 60 * 60)
    );
    return {
      success: false,
      error: `Cannot unassign: locked for ${lockRemaining} more hours.`,
    };
  }

  // Check not on task
  if (emp.status === "enRoute" || emp.status === "restocking" || emp.status === "repairing") {
    return {
      success: false,
      error: `Cannot unassign while employee is ${emp.status}.`,
    };
  }

  await db
    .update(employees)
    .set({
      assignedMachineId: null,
      status: "idle",
    })
    .where(eq(employees.id, employeeId));

  return { success: true };
}

// ============================================================================
// EMPLOYEE EFFICIENCY & PERFORMANCE
// ============================================================================

/**
 * Calculate task-specific efficiency for an employee.
 * Different tasks weight stats differently.
 */
export function calculateTaskEfficiency(
  employee: {
    statSpeed: number | null;
    statQualityControl: number | null;
    statAttendance: number | null;
    statDriving: number | null;
    statAdaptability: number | null;
    statRepairSkill: number | null;
  },
  taskType: "restock" | "maintenance" | "emergency"
): number {
  const weights = TASK_STAT_WEIGHTS[taskType];
  if (!weights) return 50; // Default mid-range

  const stats = {
    speed: employee.statSpeed || 50,
    qualityControl: employee.statQualityControl || 50,
    attendance: employee.statAttendance || 50,
    driving: employee.statDriving || 50,
    adaptability: employee.statAdaptability || 50,
    repairSkill: employee.statRepairSkill || 50,
  };

  const weighted =
    stats.speed * weights.speed +
    stats.qualityControl * weights.qualityControl +
    stats.attendance * weights.attendance +
    stats.driving * weights.driving +
    stats.adaptability * weights.adaptability +
    stats.repairSkill * weights.repairSkill;

  return Math.round(weighted);
}

/**
 * Calculate overall employee rating (0-100) for display.
 */
export function calculateOverallRating(employee: {
  statSpeed: number | null;
  statQualityControl: number | null;
  statAttendance: number | null;
  statDriving: number | null;
  statAdaptability: number | null;
  statRepairSkill: number | null;
}): number {
  const stats = [
    employee.statSpeed || 0,
    employee.statQualityControl || 0,
    employee.statAttendance || 0,
    employee.statDriving || 0,
    employee.statAdaptability || 0,
    employee.statRepairSkill || 0,
  ];

  return Math.round(stats.reduce((a, b) => a + b, 0) / stats.length);
}

/**
 * Simulate attendance check — employee might not show up based on attendance stat.
 * Returns true if employee shows up for work.
 */
export function simulateAttendance(attendanceStat: number): boolean {
  // Attendance stat 0 = 50% show rate, 100 = 99% show rate
  const showRate = 0.5 + (attendanceStat / 100) * 0.49;
  return Math.random() < showRate;
}

/**
 * Get the best available employee for a specific task type.
 * Considers efficiency, availability, and assignment.
 */
export async function getBestEmployeeForTask(
  playerId: number,
  machineId: string,
  taskType: "restock" | "maintenance" | "emergency"
): Promise<{ employee: Employee | null; efficiency: number; reason?: string }> {
  const db = await getDb();
  if (!db) return { employee: null, efficiency: 0, reason: "Database not available" };

  // Get all idle employees for this player
  const playerEmployees = await db
    .select()
    .from(employees)
    .where(
      and(
        eq(employees.playerId, playerId),
        eq(employees.status, "idle")
      )
    );

  if (playerEmployees.length === 0) {
    return { employee: null, efficiency: 0, reason: "No idle employees available" };
  }

  // Prefer employees assigned to this machine
  const assignedToMachine = playerEmployees.filter((e) => e.assignedMachineId === machineId);
  const unassigned = playerEmployees.filter((e) => !e.assignedMachineId);
  const assignedElsewhere = playerEmployees.filter(
    (e) => e.assignedMachineId && e.assignedMachineId !== machineId
  );

  // Priority: assigned to this machine > unassigned > assigned elsewhere (if lock expired)
  const candidates = [
    ...assignedToMachine,
    ...unassigned,
    ...assignedElsewhere.filter(
      (e) => !e.assignmentLockUntil || new Date(e.assignmentLockUntil) <= new Date()
    ),
  ];

  if (candidates.length === 0) {
    return {
      employee: null,
      efficiency: 0,
      reason: "All employees are either busy or locked to other machines",
    };
  }

  // Score each candidate for this task type
  let bestEmployee: Employee | null = null;
  let bestEfficiency = -1;

  for (const emp of candidates) {
    const efficiency = calculateTaskEfficiency(emp, taskType);
    if (efficiency > bestEfficiency) {
      bestEfficiency = efficiency;
      bestEmployee = emp;
    }
  }

  return { employee: bestEmployee, efficiency: bestEfficiency };
}

// ============================================================================
// EMPLOYEE ROSTER QUERIES
// ============================================================================

/**
 * Get full employee roster with computed fields.
 */
export async function getEmployeeRoster(playerId: number): Promise<
  Array<
    Employee & {
      overallRating: number;
      restockEfficiency: number;
      maintenanceEfficiency: number;
      isLocked: boolean;
      lockRemainingHours: number | null;
      isOnTask: boolean;
    }
  >
> {
  const db = await getDb();
  if (!db) return [];

  const playerEmployees = await db
    .select()
    .from(employees)
    .where(eq(employees.playerId, playerId));

  return playerEmployees.map((emp) => {
    const isLocked =
      !!emp.assignmentLockUntil && new Date(emp.assignmentLockUntil) > new Date();
    const lockRemainingHours = isLocked && emp.assignmentLockUntil
      ? Math.ceil(
          (new Date(emp.assignmentLockUntil).getTime() - Date.now()) / (1000 * 60 * 60)
        )
      : null;

    return {
      ...emp,
      overallRating: calculateOverallRating(emp),
      restockEfficiency: calculateTaskEfficiency(emp, "restock"),
      maintenanceEfficiency: calculateTaskEfficiency(emp, "maintenance"),
      isLocked,
      lockRemainingHours,
      isOnTask: ["enRoute", "restocking", "repairing"].includes(emp.status || ""),
    };
  });
}

/**
 * Get applicant pool for a player. Clears stale applicants older than refresh window.
 */
export async function getApplicantPool(playerId: number): Promise<Applicant[]> {
  const db = await getDb();
  if (!db) return [];

  // Clear stale applicants (older than 12 hours)
  const staleThreshold = new Date();
  staleThreshold.setHours(staleThreshold.getHours() - APPLICANT_REFRESH_HOURS);

  await db
    .delete(applicants)
    .where(
      and(
        eq(applicants.playerId, playerId),
        lte(applicants.createdAt, staleThreshold)
      )
    );

  // Return remaining applicants
  return await db
    .select()
    .from(applicants)
    .where(eq(applicants.playerId, playerId))
    .orderBy(desc(applicants.createdAt));
}

/**
 * Save generated applicants to the database.
 */
export async function saveApplicantPool(
  applicantData: Array<{
    id: string;
    playerId: number;
    name: string;
    wagePerRestock: string;
    statSpeed: number;
    statQualityControl: number;
    statAttendance: number;
    statDriving: number;
    statAdaptability: number;
    statRepairSkill: number;
    capacityCost: number;
  }>
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (applicantData.length === 0) return;

  await db.insert(applicants).values(applicantData);
}
