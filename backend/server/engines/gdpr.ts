/**
 * VendFX GDPR Compliance Engine
 *
 * Handles all GDPR-related operations:
 * - Full player data export (right to portability)
 * - Account deletion with anonymization (right to erasure)
 * - Consent tracking and management
 * - Data retention policies
 */

import { getDb } from "../db";
import {
  users,
  players,
  vendingMachines,
  employees,
  transactions,
  alliances,
  allianceMembers,
  customerComplaints,
  disputeTickets,
  kycVerifications,
  warehouseInventory,
  machineInventory,
  marketplaceListings,
  marketplaceTrades,
  seasonBrackets,
  restockDispatches,
  installedPowerUps,
} from "../../drizzle/schema";
import { eq, sql } from "drizzle-orm";

// ============================================================================
// DATA EXPORT (Right to Portability)
// ============================================================================

export interface PlayerDataExport {
  exportDate: string;
  player: {
    profile: Record<string, unknown>;
    account: Record<string, unknown>;
  };
  financials: {
    walletBalances: Record<string, unknown>;
    transactions: Array<Record<string, unknown>>;
    annualSummary: Record<string, unknown>;
  };
  gameData: {
    machines: Array<Record<string, unknown>>;
    employees: Array<Record<string, unknown>>;
    warehouseInventory: Array<Record<string, unknown>>;
    machineInventory: Array<Record<string, unknown>>;
    restockDispatches: Array<Record<string, unknown>>;
    installedPowerUps: Array<Record<string, unknown>>;
  };
  social: {
    allianceMemberships: Array<Record<string, unknown>>;
    marketplaceListings: Array<Record<string, unknown>>;
    marketplaceTrades: Array<Record<string, unknown>>;
  };
  compliance: {
    kycVerification: Record<string, unknown> | null;
    complaints: Array<Record<string, unknown>>;
    disputes: Array<Record<string, unknown>>;
  };
  seasons: Array<Record<string, unknown>>;
}

/**
 * Export all player data in a structured JSON format.
 * This fulfills the GDPR right to data portability (Article 20).
 */
export async function exportPlayerData(
  playerId: number,
  userId: number
): Promise<PlayerDataExport> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 1. User account data
  const userResult = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  // 2. Player profile
  const playerResult = await db
    .select()
    .from(players)
    .where(eq(players.id, playerId))
    .limit(1);

  // 3. Vending machines
  const machinesResult = await db
    .select()
    .from(vendingMachines)
    .where(eq(vendingMachines.playerId, playerId));

  // 4. Employees
  const employeesResult = await db
    .select()
    .from(employees)
    .where(eq(employees.playerId, playerId));

  // 5. Warehouse inventory
  const warehouseResult = await db
    .select()
    .from(warehouseInventory)
    .where(eq(warehouseInventory.playerId, playerId));

  // 6. Machine inventory (via machines)
  const machineIds = machinesResult.map((m) => m.id);
  let machineInvResult: Array<Record<string, unknown>> = [];
  if (machineIds.length > 0) {
    const allMachineInv = [];
    for (const machineId of machineIds) {
      const inv = await db
        .select()
        .from(machineInventory)
        .where(eq(machineInventory.machineId, machineId));
      allMachineInv.push(...inv);
    }
    machineInvResult = allMachineInv;
  }

  // 7. Transactions
  const transactionsResult = await db
    .select()
    .from(transactions)
    .where(eq(transactions.playerId, playerId))
    .orderBy(sql`${transactions.timestamp} DESC`);

  // 8. Alliance memberships
  const allianceMembershipsResult = await db
    .select()
    .from(allianceMembers)
    .where(eq(allianceMembers.playerId, playerId));

  // 9. Marketplace listings
  const listingsResult = await db
    .select()
    .from(marketplaceListings)
    .where(eq(marketplaceListings.sellerId, playerId));

  // 10. Marketplace trades (as buyer or seller)
  const tradesAsSeller = await db
    .select()
    .from(marketplaceTrades)
    .where(eq(marketplaceTrades.sellerId, playerId));

  const tradesAsBuyer = await db
    .select()
    .from(marketplaceTrades)
    .where(eq(marketplaceTrades.buyerId, playerId));

  // 11. KYC verification
  const kycResult = await db
    .select()
    .from(kycVerifications)
    .where(eq(kycVerifications.playerId, playerId))
    .limit(1);

  // 12. Complaints
  const complaintsResult = await db
    .select()
    .from(customerComplaints)
    .where(eq(customerComplaints.playerId, playerId));

  // 13. Disputes
  const disputesResult = await db
    .select()
    .from(disputeTickets)
    .where(eq(disputeTickets.playerId, playerId));

  // 14. Season brackets
  const seasonsResult = await db
    .select()
    .from(seasonBrackets)
    .where(eq(seasonBrackets.playerId, playerId));

  // 15. Restock dispatches (via employees)
  const playerEmployees = await db
    .select({ id: employees.id })
    .from(employees)
    .where(eq(employees.playerId, playerId));
  const employeeIds = playerEmployees.map((e) => e.id);
  let dispatchesResult: Array<Record<string, unknown>> = [];
  for (const empId of employeeIds) {
    const dispatches = await db
      .select()
      .from(restockDispatches)
      .where(eq(restockDispatches.employeeId, empId));
    dispatchesResult.push(...dispatches);
  }

  // 16. Installed power-ups (via machines)
  let powerUpsResult: Array<Record<string, unknown>> = [];
  if (machineIds.length > 0) {
    const allPowerUps = [];
    for (const machineId of machineIds) {
      const pups = await db
        .select()
        .from(installedPowerUps)
        .where(eq(installedPowerUps.machineId, machineId));
      allPowerUps.push(...pups);
    }
    powerUpsResult = allPowerUps;
  }

  // Calculate annual summary
  const currentYear = new Date().getFullYear();
  const totalDeposits = transactionsResult
    .filter((t) => t.type === "deposit" && t.status === "completed")
    .reduce((sum, t) => sum + parseFloat(t.amount ?? "0"), 0);
  const totalWithdrawals = transactionsResult
    .filter((t) => t.type === "withdrawal" && t.status === "completed")
    .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount ?? "0")), 0);
  const totalWinnings = transactionsResult
    .filter((t) => t.type === "season_payout" && t.status === "completed")
    .reduce((sum, t) => sum + parseFloat(t.amount ?? "0"), 0);

  // Sanitize KYC data (mask SSN)
  const kycData = kycResult.length > 0
    ? {
        ...kycResult[0],
        ssn: kycResult[0].ssn ? `***-**-${kycResult[0].ssn.slice(-4)}` : null,
      }
    : null;

  return {
    exportDate: new Date().toISOString(),
    player: {
      profile: playerResult[0] ?? {},
      account: userResult[0]
        ? {
            id: userResult[0].id,
            name: userResult[0].name,
            email: userResult[0].email,
            createdAt: userResult[0].createdAt,
            lastSignedIn: userResult[0].lastSignedIn,
          }
        : {},
    },
    financials: {
      walletBalances: {
        competitionWallet: playerResult[0]?.competitionWalletBalance ?? "0",
        premiumWallet: playerResult[0]?.premiumWalletBalance ?? "0",
      },
      transactions: transactionsResult as any,
      annualSummary: {
        year: currentYear,
        totalDeposits,
        totalWithdrawals,
        totalWinnings,
        netProfit: totalWinnings - totalDeposits,
      },
    },
    gameData: {
      machines: machinesResult as any,
      employees: employeesResult as any,
      warehouseInventory: warehouseResult as any,
      machineInventory: machineInvResult as any,
      restockDispatches: dispatchesResult as any,
      installedPowerUps: powerUpsResult as any,
    },
    social: {
      allianceMemberships: allianceMembershipsResult as any,
      marketplaceListings: listingsResult as any,
      marketplaceTrades: [...tradesAsSeller, ...tradesAsBuyer] as any,
    },
    compliance: {
      kycVerification: kycData as any,
      complaints: complaintsResult as any,
      disputes: disputesResult as any,
    },
    seasons: seasonsResult as any,
  };
}

// ============================================================================
// ACCOUNT DELETION (Right to Erasure)
// ============================================================================

/**
 * Delete a player's account and anonymize their data.
 * This fulfills the GDPR right to erasure (Article 17).
 *
 * Strategy:
 * - Personal data is anonymized (name, email, brand)
 * - Financial records are retained for tax/legal compliance (7 years)
 * - Game data is deleted
 * - KYC documents are deleted
 * - Alliance memberships are removed
 */
export async function deletePlayerAccount(
  playerId: number,
  userId: number
): Promise<{
  success: boolean;
  deletedRecords: Record<string, number>;
  retainedRecords: Record<string, number>;
  message: string;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const deletedRecords: Record<string, number> = {};
  const retainedRecords: Record<string, number> = {};

  // 1. Get all machine IDs for cascading deletes
  const machinesResult = await db
    .select({ id: vendingMachines.id })
    .from(vendingMachines)
    .where(eq(vendingMachines.playerId, playerId));
  const machineIds = machinesResult.map((m) => m.id);

  // 2. Delete machine inventory
  let machineInvCount = 0;
  for (const machineId of machineIds) {
    const result = await db
      .delete(machineInventory)
      .where(eq(machineInventory.machineId, machineId));
    machineInvCount += (result as any)[0]?.affectedRows ?? 0;
  }
  deletedRecords.machineInventory = machineInvCount;

  // 3. Delete installed power-ups
  let powerUpCount = 0;
  for (const machineId of machineIds) {
    const result = await db
      .delete(installedPowerUps)
      .where(eq(installedPowerUps.machineId, machineId));
    powerUpCount += (result as any)[0]?.affectedRows ?? 0;
  }
  deletedRecords.installedPowerUps = powerUpCount;

  // 4. Delete restock dispatches (via employees)
  const playerEmps = await db
    .select({ id: employees.id })
    .from(employees)
    .where(eq(employees.playerId, playerId));
  let dispatchDeleteCount = 0;
  for (const emp of playerEmps) {
    const result = await db
      .delete(restockDispatches)
      .where(eq(restockDispatches.employeeId, emp.id));
    dispatchDeleteCount += (result as any)[0]?.affectedRows ?? 0;
  }
  deletedRecords.restockDispatches = dispatchDeleteCount;

  // 5. Delete vending machines
  const machineResult = await db
    .delete(vendingMachines)
    .where(eq(vendingMachines.playerId, playerId));
  deletedRecords.vendingMachines =
    (machineResult as any)[0]?.affectedRows ?? 0;

  // 6. Delete employees
  const empResult = await db
    .delete(employees)
    .where(eq(employees.playerId, playerId));
  deletedRecords.employees = (empResult as any)[0]?.affectedRows ?? 0;

  // 7. Delete warehouse inventory
  const warehouseResult = await db
    .delete(warehouseInventory)
    .where(eq(warehouseInventory.playerId, playerId));
  deletedRecords.warehouseInventory =
    (warehouseResult as any)[0]?.affectedRows ?? 0;

  // 8. Delete KYC records (sensitive documents)
  const kycResult = await db
    .delete(kycVerifications)
    .where(eq(kycVerifications.playerId, playerId));
  deletedRecords.kycVerifications =
    (kycResult as any)[0]?.affectedRows ?? 0;

  // 9. Remove alliance memberships
  const allianceResult = await db
    .delete(allianceMembers)
    .where(eq(allianceMembers.playerId, playerId));
  deletedRecords.allianceMembers =
    (allianceResult as any)[0]?.affectedRows ?? 0;

  // 10. Cancel active marketplace listings
  await db
    .update(marketplaceListings)
    .set({ status: "cancelled", cancelledAt: new Date() })
    .where(eq(marketplaceListings.sellerId, playerId));

  // 11. Delete complaints
  const complaintResult = await db
    .delete(customerComplaints)
    .where(eq(customerComplaints.playerId, playerId));
  deletedRecords.complaints =
    (complaintResult as any)[0]?.affectedRows ?? 0;

  // 12. Delete disputes
  const disputeResult = await db
    .delete(disputeTickets)
    .where(eq(disputeTickets.playerId, playerId));
  deletedRecords.disputes =
    (disputeResult as any)[0]?.affectedRows ?? 0;

  // 13. Delete season brackets
  const seasonResult = await db
    .delete(seasonBrackets)
    .where(eq(seasonBrackets.playerId, playerId));
  deletedRecords.seasonBrackets =
    (seasonResult as any)[0]?.affectedRows ?? 0;

  // 14. Anonymize player profile (retain for financial records)
  const anonymizedBrand = `[Deleted-${playerId}]`;
  await db
    .update(players)
    .set({
      brandName: anonymizedBrand,
      brandLogoIcon: null,
      primaryColor: "#808080",
      secondaryColor: "#808080",
      tagline: null,
      reputation: 0,
      kycStatus: "deleted",
      geoBlockedState: null,
      dailySpendingLimit: null,
      weeklySpendingLimit: null,
      monthlySpendingLimit: null,
      selfExclusionUntil: null,
    })
    .where(eq(players.id, playerId));

  // 15. Anonymize user account
  await db
    .update(users)
    .set({
      name: `[Deleted User]`,
      email: `deleted-${userId}@vendfx.local`,
    })
    .where(eq(users.id, userId));

  // 16. Retain financial records (legal requirement - 7 years)
  const txnCount = await db
    .select({ count: sql<string>`COUNT(*)` })
    .from(transactions)
    .where(eq(transactions.playerId, playerId));
  retainedRecords.transactions = parseInt(txnCount[0]?.count ?? "0");
  retainedRecords.playerProfile = 1; // Anonymized but retained
  retainedRecords.userAccount = 1; // Anonymized but retained

  return {
    success: true,
    deletedRecords,
    retainedRecords,
    message:
      "Account data has been deleted. Financial transaction records are retained for 7 years per legal requirements. Personal information has been anonymized.",
  };
}

// ============================================================================
// DATA RETENTION POLICY
// ============================================================================

/**
 * Get the data retention policy for display to users.
 */
export function getDataRetentionPolicy(): {
  categories: Array<{
    category: string;
    retentionPeriod: string;
    reason: string;
    deletable: boolean;
  }>;
} {
  return {
    categories: [
      {
        category: "Account Information",
        retentionPeriod: "Until account deletion",
        reason: "Required for service operation",
        deletable: true,
      },
      {
        category: "Game Data (Machines, Employees, Inventory)",
        retentionPeriod: "Until account deletion",
        reason: "Core game functionality",
        deletable: true,
      },
      {
        category: "Financial Transactions",
        retentionPeriod: "7 years after account deletion",
        reason: "Tax and legal compliance (IRS requirements)",
        deletable: false,
      },
      {
        category: "KYC Documents",
        retentionPeriod: "Deleted on account deletion",
        reason: "Identity verification",
        deletable: true,
      },
      {
        category: "Chat Messages",
        retentionPeriod: "90 days",
        reason: "Community moderation",
        deletable: true,
      },
      {
        category: "Marketplace Trade History",
        retentionPeriod: "1 year",
        reason: "Dispute resolution and audit trail",
        deletable: false,
      },
      {
        category: "Season Performance Records",
        retentionPeriod: "Deleted on account deletion",
        reason: "Competitive integrity",
        deletable: true,
      },
      {
        category: "Complaint and Dispute Records",
        retentionPeriod: "Deleted on account deletion",
        reason: "Customer service",
        deletable: true,
      },
    ],
  };
}
