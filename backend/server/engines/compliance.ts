/**
 * VendFX Compliance Engine
 *
 * Handles all legal and regulatory compliance:
 * - KYC verification (ID + SSN)
 * - Geo-blocking for restricted US states
 * - Responsible gaming limits (daily/weekly/monthly)
 * - Self-exclusion periods (24h, 7d, 30d, permanent)
 * - Spending tracking and limit enforcement
 */

import { getDb } from "../db";
import {
  players,
  kycVerifications,
  transactions,
} from "../../drizzle/schema";
import { eq, and, gte, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

// ============================================================================
// GEO-BLOCKING
// ============================================================================

/**
 * The 12 US states where real-money skill-based gaming is restricted.
 * Players in these states cannot deposit, withdraw, or enter paid seasons.
 */
export const RESTRICTED_STATES: Record<string, string> = {
  AZ: "Arizona",
  AR: "Arkansas",
  CT: "Connecticut",
  DE: "Delaware",
  LA: "Louisiana",
  MT: "Montana",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  WA: "Washington",
  WI: "Wisconsin",
  ID: "Idaho",
};

/**
 * Check if a US state code is restricted for real-money play.
 */
export function isStateRestricted(stateCode: string): boolean {
  return stateCode.toUpperCase() in RESTRICTED_STATES;
}

/**
 * Get the full list of restricted states with names.
 */
export function getRestrictedStates(): Array<{
  code: string;
  name: string;
}> {
  return Object.entries(RESTRICTED_STATES).map(([code, name]) => ({
    code,
    name,
  }));
}

/**
 * Validate a player's state against the restricted list.
 * Returns a compliance result with blocking details.
 */
export function checkGeoCompliance(stateCode: string | null): {
  allowed: boolean;
  stateCode: string | null;
  stateName: string | null;
  reason: string | null;
} {
  if (!stateCode) {
    return {
      allowed: false,
      stateCode: null,
      stateName: null,
      reason: "State verification required before real-money transactions.",
    };
  }

  const upper = stateCode.toUpperCase();
  if (isStateRestricted(upper)) {
    return {
      allowed: false,
      stateCode: upper,
      stateName: RESTRICTED_STATES[upper] ?? null,
      reason: `Real-money gaming is not available in ${RESTRICTED_STATES[upper] ?? upper}. This restriction is based on state regulations.`,
    };
  }

  return {
    allowed: true,
    stateCode: upper,
    stateName: null,
    reason: null,
  };
}

/**
 * Update a player's geo-blocked state in the database.
 */
export async function updatePlayerState(
  playerId: number,
  stateCode: string
): Promise<{ blocked: boolean; state: string }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const upper = stateCode.toUpperCase();
  const blocked = isStateRestricted(upper);

  await db
    .update(players)
    .set({ geoBlockedState: blocked ? upper : null })
    .where(eq(players.id, playerId));

  return { blocked, state: upper };
}

// ============================================================================
// KYC VERIFICATION
// ============================================================================

export type KycStatus =
  | "notStarted"
  | "pending"
  | "submitted"
  | "verified"
  | "rejected";

/**
 * KYC thresholds — players must verify before certain actions.
 */
export const KYC_THRESHOLDS = {
  /** Minimum withdrawal amount before KYC is required */
  withdrawalRequiresKyc: 0, // Always required for withdrawals
  /** Maximum lifetime deposits without KYC */
  maxDepositsWithoutKyc: 2000,
  /** Maximum single deposit without KYC */
  maxSingleDepositWithoutKyc: 500,
  /** Minimum season entry fee that requires KYC */
  seasonEntryKycThreshold: 50,
};

/**
 * Check if a player's KYC status allows a specific action.
 */
export function checkKycRequirement(
  kycStatus: string | null,
  action: "deposit" | "withdraw" | "season_entry",
  amount: number
): {
  allowed: boolean;
  kycRequired: boolean;
  reason: string | null;
} {
  const status = (kycStatus ?? "notStarted") as KycStatus;

  if (status === "verified") {
    return { allowed: true, kycRequired: false, reason: null };
  }

  // Withdrawals always require KYC
  if (action === "withdraw") {
    return {
      allowed: false,
      kycRequired: true,
      reason:
        "KYC verification is required before withdrawing funds. Please complete identity verification.",
    };
  }

  // Large deposits require KYC
  if (
    action === "deposit" &&
    amount > KYC_THRESHOLDS.maxSingleDepositWithoutKyc
  ) {
    return {
      allowed: false,
      kycRequired: true,
      reason: `Deposits over $${KYC_THRESHOLDS.maxSingleDepositWithoutKyc} require KYC verification.`,
    };
  }

  // High-stakes season entries require KYC
  if (
    action === "season_entry" &&
    amount > KYC_THRESHOLDS.seasonEntryKycThreshold
  ) {
    return {
      allowed: false,
      kycRequired: true,
      reason: `Season entries over $${KYC_THRESHOLDS.seasonEntryKycThreshold} require KYC verification.`,
    };
  }

  return { allowed: true, kycRequired: false, reason: null };
}

/**
 * Submit KYC verification documents.
 */
export async function submitKycVerification(
  playerId: number,
  documentUrl: string,
  ssnLastFour: string
): Promise<{ id: string; status: KycStatus }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const id = nanoid();
  const now = new Date();

  // Check if KYC record already exists
  const existing = await db
    .select()
    .from(kycVerifications)
    .where(eq(kycVerifications.playerId, playerId))
    .limit(1);

  if (existing.length > 0) {
    // Update existing record
    await db
      .update(kycVerifications)
      .set({
        status: "submitted",
        documentUrl,
        ssn: ssnLastFour,
        submittedAt: now,
        rejectedAt: null,
        rejectionReason: null,
      })
      .where(eq(kycVerifications.playerId, playerId));

    // Update player status
    await db
      .update(players)
      .set({ kycStatus: "submitted" })
      .where(eq(players.id, playerId));

    return { id: existing[0].id, status: "submitted" };
  }

  // Create new KYC record
  await db.insert(kycVerifications).values({
    id,
    playerId,
    status: "submitted",
    documentUrl,
    ssn: ssnLastFour,
    submittedAt: now,
  });

  // Update player status
  await db
    .update(players)
    .set({ kycStatus: "submitted" })
    .where(eq(players.id, playerId));

  return { id, status: "submitted" };
}

/**
 * Admin: Approve KYC verification.
 */
export async function approveKyc(
  playerId: number
): Promise<{ success: boolean }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const now = new Date();

  await db
    .update(kycVerifications)
    .set({ status: "verified", verifiedAt: now })
    .where(eq(kycVerifications.playerId, playerId));

  await db
    .update(players)
    .set({ kycStatus: "verified", kycVerifiedAt: now })
    .where(eq(players.id, playerId));

  return { success: true };
}

/**
 * Admin: Reject KYC verification with reason.
 */
export async function rejectKyc(
  playerId: number,
  reason: string
): Promise<{ success: boolean }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const now = new Date();

  await db
    .update(kycVerifications)
    .set({
      status: "rejected",
      rejectedAt: now,
      rejectionReason: reason,
    })
    .where(eq(kycVerifications.playerId, playerId));

  await db
    .update(players)
    .set({ kycStatus: "rejected" })
    .where(eq(players.id, playerId));

  return { success: true };
}

/**
 * Get a player's KYC verification status.
 */
export async function getKycStatus(playerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(kycVerifications)
    .where(eq(kycVerifications.playerId, playerId))
    .limit(1);

  if (result.length === 0) {
    return {
      status: "notStarted" as KycStatus,
      submittedAt: null,
      verifiedAt: null,
      rejectedAt: null,
      rejectionReason: null,
    };
  }

  const kyc = result[0];
  return {
    status: kyc.status as KycStatus,
    submittedAt: kyc.submittedAt,
    verifiedAt: kyc.verifiedAt,
    rejectedAt: kyc.rejectedAt,
    rejectionReason: kyc.rejectionReason,
  };
}

// ============================================================================
// RESPONSIBLE GAMING LIMITS
// ============================================================================

export interface SpendingLimits {
  dailyLimit: number | null;
  weeklyLimit: number | null;
  monthlyLimit: number | null;
}

export interface SpendingStatus {
  dailySpent: number;
  weeklySpent: number;
  monthlySpent: number;
  dailyLimit: number | null;
  weeklyLimit: number | null;
  monthlyLimit: number | null;
  dailyRemaining: number | null;
  weeklyRemaining: number | null;
  monthlyRemaining: number | null;
}

/**
 * Default spending limits for new players.
 */
export const DEFAULT_LIMITS = {
  daily: null as number | null,
  weekly: null as number | null,
  monthly: null as number | null,
};

/**
 * Maximum allowed limits (platform-wide caps).
 */
export const MAX_LIMITS = {
  daily: 10000,
  weekly: 50000,
  monthly: 100000,
};

/**
 * Set spending limits for a player.
 * Limits can only be decreased immediately; increases take 72 hours.
 */
export async function setSpendingLimits(
  playerId: number,
  limits: Partial<SpendingLimits>
): Promise<{
  success: boolean;
  applied: SpendingLimits;
  pendingIncrease: boolean;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get current limits
  const player = await db
    .select({
      dailySpendingLimit: players.dailySpendingLimit,
      weeklySpendingLimit: players.weeklySpendingLimit,
      monthlySpendingLimit: players.monthlySpendingLimit,
    })
    .from(players)
    .where(eq(players.id, playerId))
    .limit(1);

  if (player.length === 0) throw new Error("Player not found");

  const current = player[0];
  const updateSet: Record<string, string | null> = {};
  let pendingIncrease = false;

  // Process each limit
  if (limits.dailyLimit !== undefined) {
    const newLimit = limits.dailyLimit;
    const currentLimit = current.dailySpendingLimit
      ? parseFloat(current.dailySpendingLimit)
      : null;

    if (newLimit !== null && newLimit > MAX_LIMITS.daily) {
      throw new Error(
        `Daily limit cannot exceed $${MAX_LIMITS.daily}`
      );
    }

    // Decreases apply immediately, increases are flagged
    if (
      currentLimit !== null &&
      newLimit !== null &&
      newLimit > currentLimit
    ) {
      pendingIncrease = true;
    }
    updateSet.dailySpendingLimit =
      newLimit !== null ? newLimit.toFixed(2) : null;
  }

  if (limits.weeklyLimit !== undefined) {
    const newLimit = limits.weeklyLimit;
    const currentLimit = current.weeklySpendingLimit
      ? parseFloat(current.weeklySpendingLimit)
      : null;

    if (newLimit !== null && newLimit > MAX_LIMITS.weekly) {
      throw new Error(
        `Weekly limit cannot exceed $${MAX_LIMITS.weekly}`
      );
    }

    if (
      currentLimit !== null &&
      newLimit !== null &&
      newLimit > currentLimit
    ) {
      pendingIncrease = true;
    }
    updateSet.weeklySpendingLimit =
      newLimit !== null ? newLimit.toFixed(2) : null;
  }

  if (limits.monthlyLimit !== undefined) {
    const newLimit = limits.monthlyLimit;
    const currentLimit = current.monthlySpendingLimit
      ? parseFloat(current.monthlySpendingLimit)
      : null;

    if (newLimit !== null && newLimit > MAX_LIMITS.monthly) {
      throw new Error(
        `Monthly limit cannot exceed $${MAX_LIMITS.monthly}`
      );
    }

    if (
      currentLimit !== null &&
      newLimit !== null &&
      newLimit > currentLimit
    ) {
      pendingIncrease = true;
    }
    updateSet.monthlySpendingLimit =
      newLimit !== null ? newLimit.toFixed(2) : null;
  }

  if (Object.keys(updateSet).length > 0) {
    await db
      .update(players)
      .set(updateSet)
      .where(eq(players.id, playerId));
  }

  return {
    success: true,
    applied: {
      dailyLimit:
        updateSet.dailySpendingLimit !== undefined
          ? updateSet.dailySpendingLimit !== null
            ? parseFloat(updateSet.dailySpendingLimit)
            : null
          : current.dailySpendingLimit
            ? parseFloat(current.dailySpendingLimit)
            : null,
      weeklyLimit:
        updateSet.weeklySpendingLimit !== undefined
          ? updateSet.weeklySpendingLimit !== null
            ? parseFloat(updateSet.weeklySpendingLimit)
            : null
          : current.weeklySpendingLimit
            ? parseFloat(current.weeklySpendingLimit)
            : null,
      monthlyLimit:
        updateSet.monthlySpendingLimit !== undefined
          ? updateSet.monthlySpendingLimit !== null
            ? parseFloat(updateSet.monthlySpendingLimit)
            : null
          : current.monthlySpendingLimit
            ? parseFloat(current.monthlySpendingLimit)
            : null,
    },
    pendingIncrease,
  };
}

/**
 * Check if a spending amount is within the player's limits.
 */
export async function checkSpendingLimit(
  playerId: number,
  amount: number
): Promise<{
  allowed: boolean;
  reason: string | null;
  status: SpendingStatus;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get player limits
  const player = await db
    .select({
      dailySpendingLimit: players.dailySpendingLimit,
      weeklySpendingLimit: players.weeklySpendingLimit,
      monthlySpendingLimit: players.monthlySpendingLimit,
    })
    .from(players)
    .where(eq(players.id, playerId))
    .limit(1);

  if (player.length === 0) throw new Error("Player not found");

  const p = player[0];
  const dailyLimit = p.dailySpendingLimit
    ? parseFloat(p.dailySpendingLimit)
    : null;
  const weeklyLimit = p.weeklySpendingLimit
    ? parseFloat(p.weeklySpendingLimit)
    : null;
  const monthlyLimit = p.monthlySpendingLimit
    ? parseFloat(p.monthlySpendingLimit)
    : null;

  // Calculate spending in each period
  const now = new Date();
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);

  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Query spending totals for each period
  const spendingTypes = ["deposit", "season_entry", "purchase"];

  const dailySpentResult = await db
    .select({ total: sql<string>`COALESCE(SUM(ABS(${transactions.amount})), 0)` })
    .from(transactions)
    .where(
      and(
        eq(transactions.playerId, playerId),
        gte(transactions.timestamp, dayStart),
        sql`${transactions.type} IN ('deposit', 'season_entry', 'purchase')`
      )
    );

  const weeklySpentResult = await db
    .select({ total: sql<string>`COALESCE(SUM(ABS(${transactions.amount})), 0)` })
    .from(transactions)
    .where(
      and(
        eq(transactions.playerId, playerId),
        gte(transactions.timestamp, weekStart),
        sql`${transactions.type} IN ('deposit', 'season_entry', 'purchase')`
      )
    );

  const monthlySpentResult = await db
    .select({ total: sql<string>`COALESCE(SUM(ABS(${transactions.amount})), 0)` })
    .from(transactions)
    .where(
      and(
        eq(transactions.playerId, playerId),
        gte(transactions.timestamp, monthStart),
        sql`${transactions.type} IN ('deposit', 'season_entry', 'purchase')`
      )
    );

  const dailySpent = parseFloat(dailySpentResult[0]?.total ?? "0");
  const weeklySpent = parseFloat(weeklySpentResult[0]?.total ?? "0");
  const monthlySpent = parseFloat(monthlySpentResult[0]?.total ?? "0");

  const status: SpendingStatus = {
    dailySpent,
    weeklySpent,
    monthlySpent,
    dailyLimit,
    weeklyLimit,
    monthlyLimit,
    dailyRemaining:
      dailyLimit !== null ? Math.max(0, dailyLimit - dailySpent) : null,
    weeklyRemaining:
      weeklyLimit !== null ? Math.max(0, weeklyLimit - weeklySpent) : null,
    monthlyRemaining:
      monthlyLimit !== null
        ? Math.max(0, monthlyLimit - monthlySpent)
        : null,
  };

  // Check each limit
  if (dailyLimit !== null && dailySpent + amount > dailyLimit) {
    return {
      allowed: false,
      reason: `Daily spending limit of $${dailyLimit.toFixed(2)} would be exceeded. You have $${status.dailyRemaining?.toFixed(2)} remaining today.`,
      status,
    };
  }

  if (weeklyLimit !== null && weeklySpent + amount > weeklyLimit) {
    return {
      allowed: false,
      reason: `Weekly spending limit of $${weeklyLimit.toFixed(2)} would be exceeded. You have $${status.weeklyRemaining?.toFixed(2)} remaining this week.`,
      status,
    };
  }

  if (monthlyLimit !== null && monthlySpent + amount > monthlyLimit) {
    return {
      allowed: false,
      reason: `Monthly spending limit of $${monthlyLimit.toFixed(2)} would be exceeded. You have $${status.monthlyRemaining?.toFixed(2)} remaining this month.`,
      status,
    };
  }

  return { allowed: true, reason: null, status };
}

/**
 * Get current spending status for a player.
 */
export async function getSpendingStatus(
  playerId: number
): Promise<SpendingStatus> {
  const result = await checkSpendingLimit(playerId, 0);
  return result.status;
}

// ============================================================================
// SELF-EXCLUSION
// ============================================================================

export type ExclusionPeriod = "24h" | "7d" | "30d" | "permanent";

const EXCLUSION_DURATIONS: Record<ExclusionPeriod, number | null> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
  permanent: null, // No end date
};

/**
 * Activate self-exclusion for a player.
 * During exclusion, the player cannot:
 * - Deposit funds
 * - Enter seasons
 * - Make purchases
 * - Place marketplace listings
 */
export async function activateSelfExclusion(
  playerId: number,
  period: ExclusionPeriod
): Promise<{
  success: boolean;
  excludedUntil: Date | null;
  period: ExclusionPeriod;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const duration = EXCLUSION_DURATIONS[period];
  const excludedUntil = duration
    ? new Date(Date.now() + duration)
    : new Date("2099-12-31T23:59:59Z"); // "permanent" = far future

  await db
    .update(players)
    .set({ selfExclusionUntil: excludedUntil })
    .where(eq(players.id, playerId));

  return {
    success: true,
    excludedUntil: period === "permanent" ? null : excludedUntil,
    period,
  };
}

/**
 * Check if a player is currently self-excluded.
 */
export async function checkSelfExclusion(playerId: number): Promise<{
  excluded: boolean;
  excludedUntil: Date | null;
  reason: string | null;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const player = await db
    .select({ selfExclusionUntil: players.selfExclusionUntil })
    .from(players)
    .where(eq(players.id, playerId))
    .limit(1);

  if (player.length === 0) throw new Error("Player not found");

  const exclusionDate = player[0].selfExclusionUntil;
  if (!exclusionDate || exclusionDate <= new Date()) {
    return { excluded: false, excludedUntil: null, reason: null };
  }

  // Check if permanent (year 2099)
  const isPermanent = exclusionDate.getFullYear() >= 2099;

  return {
    excluded: true,
    excludedUntil: isPermanent ? null : exclusionDate,
    reason: isPermanent
      ? "You have permanently self-excluded from real-money activities. Contact support to discuss reversal."
      : `You are self-excluded until ${exclusionDate.toISOString()}. This restriction cannot be lifted early.`,
  };
}

/**
 * Admin: Lift a self-exclusion (only for non-permanent exclusions).
 */
export async function liftSelfExclusion(
  playerId: number
): Promise<{ success: boolean; message: string }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const player = await db
    .select({ selfExclusionUntil: players.selfExclusionUntil })
    .from(players)
    .where(eq(players.id, playerId))
    .limit(1);

  if (player.length === 0) throw new Error("Player not found");

  const exclusionDate = player[0].selfExclusionUntil;
  if (exclusionDate && exclusionDate.getFullYear() >= 2099) {
    return {
      success: false,
      message:
        "Permanent self-exclusion cannot be lifted through admin action. Player must contact support.",
    };
  }

  await db
    .update(players)
    .set({ selfExclusionUntil: null })
    .where(eq(players.id, playerId));

  return { success: true, message: "Self-exclusion lifted successfully." };
}

// ============================================================================
// COMPREHENSIVE COMPLIANCE CHECK
// ============================================================================

/**
 * Run all compliance checks for a player action.
 * This is the main entry point for any real-money operation.
 */
export async function runComplianceCheck(
  playerId: number,
  action: "deposit" | "withdraw" | "season_entry",
  amount: number,
  stateCode?: string | null
): Promise<{
  allowed: boolean;
  checks: {
    geoBlocking: { passed: boolean; reason: string | null };
    kyc: { passed: boolean; reason: string | null };
    selfExclusion: { passed: boolean; reason: string | null };
    spendingLimits: { passed: boolean; reason: string | null };
  };
  failedCheck: string | null;
}> {
  const checks = {
    geoBlocking: { passed: true, reason: null as string | null },
    kyc: { passed: true, reason: null as string | null },
    selfExclusion: { passed: true, reason: null as string | null },
    spendingLimits: { passed: true, reason: null as string | null },
  };

  // 1. Geo-blocking check
  if (stateCode !== undefined) {
    const geoResult = checkGeoCompliance(stateCode ?? null);
    if (!geoResult.allowed) {
      checks.geoBlocking = { passed: false, reason: geoResult.reason };
      return { allowed: false, checks, failedCheck: "geoBlocking" };
    }
  }

  // 2. Self-exclusion check
  const exclusionResult = await checkSelfExclusion(playerId);
  if (exclusionResult.excluded) {
    checks.selfExclusion = {
      passed: false,
      reason: exclusionResult.reason,
    };
    return { allowed: false, checks, failedCheck: "selfExclusion" };
  }

  // 3. KYC check
  const player = await (async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const p = await db
      .select({ kycStatus: players.kycStatus })
      .from(players)
      .where(eq(players.id, playerId))
      .limit(1);
    return p[0];
  })();

  const kycResult = checkKycRequirement(
    player?.kycStatus ?? null,
    action,
    amount
  );
  if (!kycResult.allowed) {
    checks.kyc = { passed: false, reason: kycResult.reason };
    return { allowed: false, checks, failedCheck: "kyc" };
  }

  // 4. Spending limits check (only for deposits and entries)
  if (action !== "withdraw") {
    const spendingResult = await checkSpendingLimit(playerId, amount);
    if (!spendingResult.allowed) {
      checks.spendingLimits = {
        passed: false,
        reason: spendingResult.reason,
      };
      return { allowed: false, checks, failedCheck: "spendingLimits" };
    }
  }

  return { allowed: true, checks, failedCheck: null };
}
