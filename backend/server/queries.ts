/**
 * Database query helpers for VendFX game operations
 * These functions encapsulate business logic and return raw Drizzle results
 * 
 * NOTE: MySQL does not support .returning() — we use insert + select-back pattern
 */

import { eq, and, desc, asc, gte, lte, sql } from "drizzle-orm";
import { getDb } from "./db";
import {
  players,
  vendingMachines,
  products,
  productMarketPrices,
  warehouseInventory,
  machineInventory,
  employees,
  applicants,
  transactions,
  seasons,
  seasonBrackets,
  seasonLeaderboard,
  alliances,
  allianceMembers,
  kycVerifications,
  type Player,
  type VendingMachine,
  type Product,
  type Employee,
  type Transaction,
  type Season,
  type SeasonBracket,
} from "../drizzle/schema";

// ============================================================================
// PLAYER QUERIES
// ============================================================================

export async function getPlayerByUserId(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(players).where(eq(players.userId, userId)).limit(1);
  return result[0] || null;
}

export async function createPlayer(data: {
  userId: number;
  brandName: string;
  brandLogoIcon?: string;
  primaryColor?: string;
  secondaryColor?: string;
  tagline?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(players).values({
    userId: data.userId,
    brandName: data.brandName,
    brandLogoIcon: data.brandLogoIcon,
    primaryColor: data.primaryColor,
    secondaryColor: data.secondaryColor,
    tagline: data.tagline,
    competitionWalletBalance: "0",
    premiumWalletBalance: "0",
    currentBusinessTier: "startup",
  });

  // Select back the newly created player
  const result = await db
    .select()
    .from(players)
    .where(eq(players.userId, data.userId))
    .limit(1);

  return result[0];
}

export async function updatePlayerBalance(
  playerId: number,
  walletType: "competition" | "premium",
  amount: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const player = await db.select().from(players).where(eq(players.id, playerId)).limit(1);
  if (!player[0]) throw new Error("Player not found");

  const currentBalance =
    walletType === "competition"
      ? player[0].competitionWalletBalance
      : player[0].premiumWalletBalance;

  const newBalance = (parseFloat(currentBalance || "0") + parseFloat(amount)).toFixed(2);

  const updateData =
    walletType === "competition"
      ? { competitionWalletBalance: newBalance }
      : { premiumWalletBalance: newBalance };

  await db.update(players).set(updateData).where(eq(players.id, playerId));

  // Select back the updated player
  const result = await db.select().from(players).where(eq(players.id, playerId)).limit(1);
  return result[0];
}

export async function getPlayerStats(playerId: number) {
  const db = await getDb();
  if (!db) return null;

  const player = await db.select().from(players).where(eq(players.id, playerId)).limit(1);
  if (!player[0]) return null;

  const machineCount = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(vendingMachines)
    .where(eq(vendingMachines.playerId, playerId));

  const totalRevenue = await db
    .select({ sum: sql<string>`COALESCE(SUM(${vendingMachines.totalRevenue}), '0')` })
    .from(vendingMachines)
    .where(eq(vendingMachines.playerId, playerId));

  return {
    player: player[0],
    machineCount: machineCount[0]?.count || 0,
    totalMachineRevenue: totalRevenue[0]?.sum || "0",
  };
}

// ============================================================================
// MACHINE QUERIES
// ============================================================================

export async function createVendingMachine(data: {
  id: string;
  playerId: number;
  name: string;
  latitude: number;
  longitude: number;
  demographicProfile: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(vendingMachines).values({
    id: data.id,
    playerId: data.playerId,
    name: data.name,
    latitude: data.latitude,
    longitude: data.longitude,
    demographicProfile: data.demographicProfile,
    status: "healthy",
    restockState: "idle",
  });

  // Select back by known ID
  const result = await db
    .select()
    .from(vendingMachines)
    .where(eq(vendingMachines.id, data.id))
    .limit(1);

  return result[0];
}

export async function getPlayerMachines(playerId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(vendingMachines).where(eq(vendingMachines.playerId, playerId));
}

export async function getMachineById(machineId: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(vendingMachines)
    .where(eq(vendingMachines.id, machineId))
    .limit(1);

  return result[0] || null;
}

export async function updateMachineStatus(
  machineId: string,
  status: string,
  dailyRevenue?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: Record<string, unknown> = { status };
  if (dailyRevenue) {
    updateData.dailyRevenue = dailyRevenue;
  }

  await db
    .update(vendingMachines)
    .set(updateData)
    .where(eq(vendingMachines.id, machineId));

  const result = await db
    .select()
    .from(vendingMachines)
    .where(eq(vendingMachines.id, machineId))
    .limit(1);

  return result[0];
}

// ============================================================================
// PRODUCT & INVENTORY QUERIES
// ============================================================================

export async function getAllProducts() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(products);
}

export async function getProductById(productId: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(products).where(eq(products.id, productId)).limit(1);
  return result[0] || null;
}

export async function getProductMarketPrice(productId: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(productMarketPrices)
    .where(eq(productMarketPrices.productId, productId))
    .limit(1);

  return result[0] || null;
}

export async function getPlayerWarehouseInventory(playerId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(warehouseInventory)
    .where(eq(warehouseInventory.playerId, playerId));
}

export async function addToWarehouseInventory(data: {
  id: string;
  playerId: number;
  productId: string;
  quantity: number;
  purchasePrice: string;
  expirationDate: Date;
  isExtraFresh?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(warehouseInventory).values({
    id: data.id,
    playerId: data.playerId,
    productId: data.productId,
    quantity: data.quantity,
    purchasePrice: data.purchasePrice,
    expirationDate: data.expirationDate,
    isExtraFresh: data.isExtraFresh || false,
  });

  const result = await db
    .select()
    .from(warehouseInventory)
    .where(eq(warehouseInventory.id, data.id))
    .limit(1);

  return result[0];
}

export async function allocateToMachine(data: {
  id: string;
  machineId: string;
  warehouseItemId: string;
  productId: string;
  quantityAllocated: number;
  priceSet: string;
  expirationDate: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(machineInventory).values({
    id: data.id,
    machineId: data.machineId,
    warehouseItemId: data.warehouseItemId,
    productId: data.productId,
    quantityAllocated: data.quantityAllocated,
    priceSet: data.priceSet,
    expirationDate: data.expirationDate,
  });

  const result = await db
    .select()
    .from(machineInventory)
    .where(eq(machineInventory.id, data.id))
    .limit(1);

  return result[0];
}

export async function getMachineInventory(machineId: string) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(machineInventory)
    .where(eq(machineInventory.machineId, machineId));
}

// ============================================================================
// TRANSACTION QUERIES
// ============================================================================

export async function recordTransaction(data: {
  id: string;
  playerId: number;
  type: string;
  amount: string;
  description?: string;
  walletType: "competition" | "premium";
  relatedEntityId?: string;
  relatedEntityType?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(transactions).values({
    id: data.id,
    playerId: data.playerId,
    type: data.type,
    amount: data.amount,
    description: data.description,
    walletType: data.walletType,
    relatedEntityId: data.relatedEntityId,
    relatedEntityType: data.relatedEntityType,
  });

  const result = await db
    .select()
    .from(transactions)
    .where(eq(transactions.id, data.id))
    .limit(1);

  return result[0];
}

export async function getPlayerTransactions(playerId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(transactions)
    .where(eq(transactions.playerId, playerId))
    .orderBy(desc(transactions.timestamp))
    .limit(limit);
}

// ============================================================================
// SEASON QUERIES
// ============================================================================

export async function getCurrentSeason() {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(seasons)
    .where(eq(seasons.state, "active"))
    .limit(1);

  return result[0] || null;
}

export async function getSeasonById(seasonId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(seasons).where(eq(seasons.id, seasonId)).limit(1);
  return result[0] || null;
}

export async function createSeason(data: {
  seasonNumber: number;
  entryFee: string;
  startDate: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(seasons).values({
    seasonNumber: data.seasonNumber,
    state: "preseason",
    entryFee: data.entryFee,
    startDate: data.startDate,
  });

  const result = await db
    .select()
    .from(seasons)
    .where(eq(seasons.seasonNumber, data.seasonNumber))
    .limit(1);

  return result[0];
}

export async function getSeasonBracket(seasonId: number, playerId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(seasonBrackets)
    .where(and(eq(seasonBrackets.seasonId, seasonId), eq(seasonBrackets.playerId, playerId)))
    .limit(1);

  return result[0] || null;
}

export async function createSeasonBracket(data: {
  seasonId: number;
  playerId: number;
  entryFeeAmount: string;
  bracketTier?: string;
  startingCapital?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(seasonBrackets).values({
    seasonId: data.seasonId,
    playerId: data.playerId,
    entryFeeAmount: data.entryFeeAmount,
    bracketTier: data.bracketTier || "standard",
    startingCapital: data.startingCapital || "10000",
  });

  const result = await db
    .select()
    .from(seasonBrackets)
    .where(
      and(
        eq(seasonBrackets.seasonId, data.seasonId),
        eq(seasonBrackets.playerId, data.playerId)
      )
    )
    .limit(1);

  return result[0];
}

export async function getSeasonLeaderboard(seasonId: number, limit: number = 100) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(seasonLeaderboard)
    .where(eq(seasonLeaderboard.seasonId, seasonId))
    .orderBy(asc(seasonLeaderboard.rank))
    .limit(limit);
}

// ============================================================================
// EMPLOYEE QUERIES
// ============================================================================

export async function getPlayerEmployees(playerId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(employees).where(eq(employees.playerId, playerId));
}

export async function hireApplicant(applicantId: string, playerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get applicant data
  const applicant = await db
    .select()
    .from(applicants)
    .where(eq(applicants.id, applicantId))
    .limit(1);

  if (!applicant[0]) throw new Error("Applicant not found");

  const app = applicant[0];

  // Create employee from applicant
  await db.insert(employees).values({
    id: applicantId,
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
  });

  // Select back by known ID
  const result = await db
    .select()
    .from(employees)
    .where(eq(employees.id, applicantId))
    .limit(1);

  return result[0];
}

export async function generateApplicants(playerId: number, count: number = 3) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const newApplicants = Array.from({ length: count }).map(() => ({
    id: `app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    playerId,
    name: generateRandomName(),
    wagePerRestock: (Math.random() * 50 + 10).toFixed(2),
    statSpeed: Math.floor(Math.random() * 100),
    statQualityControl: Math.floor(Math.random() * 100),
    statAttendance: Math.floor(Math.random() * 100),
    statDriving: Math.floor(Math.random() * 100),
    statAdaptability: Math.floor(Math.random() * 100),
    statRepairSkill: Math.floor(Math.random() * 100),
    capacityCost: 5,
  }));

  await db.insert(applicants).values(newApplicants);

  // Select back all applicants for this player ordered by newest
  const ids = newApplicants.map((a) => a.id);
  const result = await db
    .select()
    .from(applicants)
    .where(eq(applicants.playerId, playerId))
    .orderBy(desc(applicants.createdAt))
    .limit(count);

  return result;
}

function generateRandomName(): string {
  const firstNames = [
    "Alex", "Jordan", "Casey", "Morgan", "Taylor", "Riley", "Avery", "Quinn",
    "Blake", "Cameron", "Dakota", "Emery", "Finley", "Harper", "Jessie", "Kendall",
  ];
  const lastNames = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
    "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas",
  ];

  const first = firstNames[Math.floor(Math.random() * firstNames.length)];
  const last = lastNames[Math.floor(Math.random() * lastNames.length)];

  return `${first} ${last}`;
}

// ============================================================================
// ALLIANCE QUERIES
// ============================================================================

export async function getPlayerAlliance(playerId: number) {
  const db = await getDb();
  if (!db) return null;

  const member = await db
    .select()
    .from(allianceMembers)
    .where(eq(allianceMembers.playerId, playerId))
    .limit(1);

  if (!member[0]) return null;

  const alliance = await db
    .select()
    .from(alliances)
    .where(eq(alliances.id, member[0].allianceId))
    .limit(1);

  return alliance[0] || null;
}

export async function getAllianceMembers(allianceId: string) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(allianceMembers)
    .where(eq(allianceMembers.allianceId, allianceId));
}

// ============================================================================
// KYC QUERIES
// ============================================================================

export async function getKycVerification(playerId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(kycVerifications)
    .where(eq(kycVerifications.playerId, playerId))
    .limit(1);

  return result[0] || null;
}

export async function updateKycStatus(playerId: number, status: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(kycVerifications)
    .set({ status })
    .where(eq(kycVerifications.playerId, playerId));

  const result = await db
    .select()
    .from(kycVerifications)
    .where(eq(kycVerifications.playerId, playerId))
    .limit(1);

  return result[0];
}
