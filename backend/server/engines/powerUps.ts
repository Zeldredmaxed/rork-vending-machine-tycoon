/**
 * VendFX Power-Up & Machine Upgrade Engine
 *
 * Handles:
 * - Power-up catalog with predefined types, costs, durations, and effects
 * - Power-up purchasing from premium wallet
 * - Power-up installation on machines with stacking rules
 * - Power-up duration tracking and expiration
 * - Power-up malfunction simulation and repair
 * - Machine upgrade tier progression with stat bonuses
 * - Upgrade cost scaling per tier
 * - Aggregate machine stats with all active power-ups and upgrades
 */

import { eq, and, sql, lte, gt, inArray } from "drizzle-orm";
import { getDb } from "../db";
import {
  powerUps,
  installedPowerUps,
  machineUpgrades,
  vendingMachines,
  players,
} from "../../drizzle/schema";
import { nanoid } from "nanoid";

// ============================================================================
// POWER-UP CATALOG
// ============================================================================

export interface PowerUpDefinition {
  name: string;
  description: string;
  category: "revenue" | "capacity" | "maintenance" | "speed" | "special";
  costMin: number;
  costMax: number;
  effectDescription: string;
  iconName: string;
  durabilityType: "timed" | "permanent" | "uses";
  durationDays: number | null;
  malfunctionChancePercent: number;
  repairCostPercent: number;
  /** Effect multiplier or value applied when active */
  effectValue: number;
  /** Maximum number of this power-up per machine */
  maxPerMachine: number;
  /** Minimum business tier required to purchase */
  requiredTier: string;
}

export const POWER_UP_CATALOG: Record<string, PowerUpDefinition> = {
  // Revenue Boosters
  digital_display: {
    name: "Digital Display Panel",
    description: "LED screen showing product ads and promotions, attracting more customers",
    category: "revenue",
    costMin: 150,
    costMax: 250,
    effectDescription: "+15% daily revenue",
    iconName: "monitor",
    durabilityType: "timed",
    durationDays: 30,
    malfunctionChancePercent: 3,
    repairCostPercent: 20,
    effectValue: 0.15,
    maxPerMachine: 1,
    requiredTier: "startup",
  },
  loyalty_scanner: {
    name: "Loyalty Card Scanner",
    description: "NFC reader for loyalty program, increases repeat customers",
    category: "revenue",
    costMin: 200,
    costMax: 350,
    effectDescription: "+10% customer retention, +8% revenue",
    iconName: "credit-card",
    durabilityType: "timed",
    durationDays: 60,
    malfunctionChancePercent: 2,
    repairCostPercent: 15,
    effectValue: 0.08,
    maxPerMachine: 1,
    requiredTier: "startup",
  },
  premium_branding: {
    name: "Premium Branding Wrap",
    description: "Custom vinyl wrap with your brand, boosts reputation and foot traffic",
    category: "revenue",
    costMin: 100,
    costMax: 180,
    effectDescription: "+5% reputation, +10% foot traffic",
    iconName: "palette",
    durabilityType: "timed",
    durationDays: 90,
    malfunctionChancePercent: 0,
    repairCostPercent: 0,
    effectValue: 0.10,
    maxPerMachine: 1,
    requiredTier: "startup",
  },

  // Capacity Boosters
  extra_shelf: {
    name: "Extra Shelf Module",
    description: "Adds additional product shelf, increasing machine capacity",
    category: "capacity",
    costMin: 300,
    costMax: 500,
    effectDescription: "+25 capacity slots",
    iconName: "layers",
    durabilityType: "permanent",
    durationDays: null,
    malfunctionChancePercent: 1,
    repairCostPercent: 10,
    effectValue: 25,
    maxPerMachine: 3,
    requiredTier: "localOperator",
  },
  compact_stacker: {
    name: "Compact Stacker",
    description: "Reorganizes internal layout for more efficient product stacking",
    category: "capacity",
    costMin: 200,
    costMax: 350,
    effectDescription: "+15 capacity slots",
    iconName: "package",
    durabilityType: "permanent",
    durationDays: null,
    malfunctionChancePercent: 2,
    repairCostPercent: 12,
    effectValue: 15,
    maxPerMachine: 2,
    requiredTier: "startup",
  },

  // Maintenance Reducers
  auto_cleaner: {
    name: "Auto-Cleaning System",
    description: "Self-cleaning mechanism that reduces maintenance degradation",
    category: "maintenance",
    costMin: 400,
    costMax: 600,
    effectDescription: "-30% maintenance degradation rate",
    iconName: "sparkles",
    durabilityType: "timed",
    durationDays: 45,
    malfunctionChancePercent: 5,
    repairCostPercent: 25,
    effectValue: 0.30,
    maxPerMachine: 1,
    requiredTier: "localOperator",
  },
  reinforced_mechanism: {
    name: "Reinforced Dispensing Mechanism",
    description: "Heavy-duty parts that resist wear and tear",
    category: "maintenance",
    costMin: 350,
    costMax: 500,
    effectDescription: "-20% breakdown chance",
    iconName: "shield",
    durabilityType: "permanent",
    durationDays: null,
    malfunctionChancePercent: 0,
    repairCostPercent: 0,
    effectValue: 0.20,
    maxPerMachine: 1,
    requiredTier: "localOperator",
  },

  // Speed Boosters
  turbo_dispenser: {
    name: "Turbo Dispenser",
    description: "High-speed product delivery mechanism, serves customers faster",
    category: "speed",
    costMin: 250,
    costMax: 400,
    effectDescription: "+20% service speed, +5% customer satisfaction",
    iconName: "zap",
    durabilityType: "timed",
    durationDays: 30,
    malfunctionChancePercent: 8,
    repairCostPercent: 30,
    effectValue: 0.20,
    maxPerMachine: 1,
    requiredTier: "startup",
  },
  quick_change_module: {
    name: "Quick-Change Module",
    description: "Modular product trays that speed up restocking by workers",
    category: "speed",
    costMin: 180,
    costMax: 280,
    effectDescription: "-25% restock time",
    iconName: "timer",
    durabilityType: "permanent",
    durationDays: null,
    malfunctionChancePercent: 1,
    repairCostPercent: 8,
    effectValue: 0.25,
    maxPerMachine: 1,
    requiredTier: "startup",
  },

  // Special / Seasonal
  golden_facade: {
    name: "Golden Facade",
    description: "Luxurious gold-plated exterior that dramatically boosts reputation",
    category: "special",
    costMin: 1000,
    costMax: 1500,
    effectDescription: "+25% reputation, +15% revenue, prestige status",
    iconName: "crown",
    durabilityType: "timed",
    durationDays: 14,
    malfunctionChancePercent: 0,
    repairCostPercent: 0,
    effectValue: 0.25,
    maxPerMachine: 1,
    requiredTier: "regionalManager",
  },
  lucky_charm: {
    name: "Lucky Charm Attachment",
    description: "Mysterious charm that occasionally doubles a sale's revenue",
    category: "special",
    costMin: 500,
    costMax: 800,
    effectDescription: "5% chance to double individual sale revenue",
    iconName: "clover",
    durabilityType: "timed",
    durationDays: 7,
    malfunctionChancePercent: 0,
    repairCostPercent: 0,
    effectValue: 0.05,
    maxPerMachine: 1,
    requiredTier: "localOperator",
  },
  frost_guard: {
    name: "Frost Guard Cooler",
    description: "Advanced cooling system that extends product freshness",
    category: "special",
    costMin: 450,
    costMax: 650,
    effectDescription: "+50% product shelf life extension",
    iconName: "snowflake",
    durabilityType: "timed",
    durationDays: 60,
    malfunctionChancePercent: 4,
    repairCostPercent: 20,
    effectValue: 0.50,
    maxPerMachine: 1,
    requiredTier: "localOperator",
  },
};

// ============================================================================
// MACHINE UPGRADE DEFINITIONS
// ============================================================================

export interface UpgradeDefinition {
  type: string;
  name: string;
  description: string;
  maxTier: number;
  /** Base cost for tier 1; scales exponentially */
  baseCost: number;
  /** Cost multiplier per tier: cost = baseCost * (costMultiplier ^ (tier - 1)) */
  costMultiplier: number;
  /** Stat bonus per tier (additive) */
  bonusPerTier: number;
  /** What stat this upgrade affects */
  statAffected: string;
  /** Minimum business tier required */
  requiredTier: string;
}

export const UPGRADE_CATALOG: Record<string, UpgradeDefinition> = {
  capacity: {
    type: "capacity",
    name: "Storage Expansion",
    description: "Increases the maximum product capacity of the machine",
    maxTier: 5,
    baseCost: 200,
    costMultiplier: 1.8,
    bonusPerTier: 20, // +20 capacity per tier
    statAffected: "capacity",
    requiredTier: "startup",
  },
  speed: {
    type: "speed",
    name: "Turbo Dispensing",
    description: "Faster product dispensing reduces customer wait time and increases throughput",
    maxTier: 5,
    baseCost: 250,
    costMultiplier: 2.0,
    bonusPerTier: 10, // +10% speed per tier
    statAffected: "serviceSpeed",
    requiredTier: "startup",
  },
  reliability: {
    type: "reliability",
    name: "Reinforced Internals",
    description: "Stronger internal components reduce breakdown frequency",
    maxTier: 5,
    baseCost: 300,
    costMultiplier: 1.9,
    bonusPerTier: 8, // -8% breakdown chance per tier
    statAffected: "breakdownReduction",
    requiredTier: "localOperator",
  },
  energy_efficiency: {
    type: "energy_efficiency",
    name: "Eco Power Module",
    description: "Reduces operating costs through energy-efficient components",
    maxTier: 5,
    baseCost: 350,
    costMultiplier: 1.7,
    bonusPerTier: 5, // -5% operating cost per tier
    statAffected: "operatingCostReduction",
    requiredTier: "localOperator",
  },
  security: {
    type: "security",
    name: "Anti-Vandal System",
    description: "Protects against vandalism and theft, reducing unexpected losses",
    maxTier: 3,
    baseCost: 400,
    costMultiplier: 2.2,
    bonusPerTier: 15, // -15% vandalism/theft loss per tier
    statAffected: "vandalismReduction",
    requiredTier: "regionalManager",
  },
  temperature_control: {
    type: "temperature_control",
    name: "Climate Control System",
    description: "Precise temperature management extends product freshness",
    maxTier: 4,
    baseCost: 500,
    costMultiplier: 2.0,
    bonusPerTier: 12, // +12% freshness duration per tier
    statAffected: "freshnessExtension",
    requiredTier: "localOperator",
  },
};

// ============================================================================
// BUSINESS TIER REQUIREMENTS
// ============================================================================

const TIER_ORDER = ["startup", "localOperator", "regionalManager", "executive"];

export function meetsBusinessTierRequirement(
  playerTier: string,
  requiredTier: string
): boolean {
  const playerIdx = TIER_ORDER.indexOf(playerTier);
  const requiredIdx = TIER_ORDER.indexOf(requiredTier);
  if (playerIdx === -1 || requiredIdx === -1) return false;
  return playerIdx >= requiredIdx;
}

// ============================================================================
// POWER-UP OPERATIONS
// ============================================================================

/**
 * Get the full power-up catalog with availability based on player tier
 */
export function getCatalog(playerTier: string) {
  return Object.entries(POWER_UP_CATALOG).map(([key, def]) => ({
    key,
    ...def,
    available: meetsBusinessTierRequirement(playerTier, def.requiredTier),
  }));
}

/**
 * Get the upgrade catalog with availability based on player tier
 */
export function getUpgradeCatalog(playerTier: string) {
  return Object.entries(UPGRADE_CATALOG).map(([key, def]) => ({
    key,
    ...def,
    available: meetsBusinessTierRequirement(playerTier, def.requiredTier),
  }));
}

/**
 * Calculate the actual cost of a power-up (random within range)
 */
export function calculatePowerUpCost(powerUpKey: string): number {
  const def = POWER_UP_CATALOG[powerUpKey];
  if (!def) throw new Error(`Unknown power-up: ${powerUpKey}`);
  return Math.floor(Math.random() * (def.costMax - def.costMin + 1)) + def.costMin;
}

/**
 * Calculate upgrade cost for a specific tier
 */
export function calculateUpgradeCost(upgradeType: string, targetTier: number): number {
  const def = UPGRADE_CATALOG[upgradeType];
  if (!def) throw new Error(`Unknown upgrade type: ${upgradeType}`);
  if (targetTier < 1 || targetTier > def.maxTier) {
    throw new Error(`Invalid tier ${targetTier} for ${upgradeType} (max: ${def.maxTier})`);
  }
  return Math.round(def.baseCost * Math.pow(def.costMultiplier, targetTier - 1));
}

/**
 * Get total cumulative cost to reach a tier from 0
 */
export function calculateTotalUpgradeCost(upgradeType: string, targetTier: number): number {
  let total = 0;
  for (let t = 1; t <= targetTier; t++) {
    total += calculateUpgradeCost(upgradeType, t);
  }
  return total;
}

/**
 * Seed the power-up catalog into the database
 */
export async function seedPowerUpCatalog(): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  let seeded = 0;
  for (const [_key, def] of Object.entries(POWER_UP_CATALOG)) {
    const existing = await db
      .select()
      .from(powerUps)
      .where(eq(powerUps.name, def.name))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(powerUps).values({
        id: nanoid(),
        name: def.name,
        description: def.description,
        category: def.category,
        costMin: def.costMin,
        costMax: def.costMax,
        effectDescription: def.effectDescription,
        iconName: def.iconName,
        durabilityType: def.durabilityType,
        durationDays: def.durationDays,
        malfunctionChancePercent: def.malfunctionChancePercent,
        repairCostPercent: def.repairCostPercent,
      });
      seeded++;
    }
  }
  return seeded;
}

/**
 * Purchase and install a power-up on a machine
 */
export async function purchaseAndInstallPowerUp(
  playerId: number,
  machineId: string,
  powerUpKey: string
): Promise<{
  success: boolean;
  installedPowerUpId?: string;
  cost?: number;
  error?: string;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const def = POWER_UP_CATALOG[powerUpKey];
  if (!def) return { success: false, error: `Unknown power-up: ${powerUpKey}` };

  // Check player exists and get wallet + tier
  const playerRows = await db
    .select()
    .from(players)
    .where(eq(players.id, playerId))
    .limit(1);

  if (playerRows.length === 0) return { success: false, error: "Player not found" };
  const player = playerRows[0];

  // Check business tier requirement
  if (!meetsBusinessTierRequirement(player.currentBusinessTier || "startup", def.requiredTier)) {
    return {
      success: false,
      error: `Requires ${def.requiredTier} tier or higher. You are ${player.currentBusinessTier}.`,
    };
  }

  // Check machine ownership
  const machineRows = await db
    .select()
    .from(vendingMachines)
    .where(and(eq(vendingMachines.id, machineId), eq(vendingMachines.playerId, playerId)))
    .limit(1);

  if (machineRows.length === 0) return { success: false, error: "Machine not found or not owned by you" };

  // Check stacking limit
  const existingInstalls = await db
    .select()
    .from(installedPowerUps)
    .where(
      and(
        eq(installedPowerUps.machineId, machineId),
        eq(installedPowerUps.condition, "active")
      )
    );

  // Find the powerUp DB record by name
  const powerUpRows = await db
    .select()
    .from(powerUps)
    .where(eq(powerUps.name, def.name))
    .limit(1);

  if (powerUpRows.length === 0) {
    return { success: false, error: "Power-up not found in database. Run seed first." };
  }
  const powerUpRecord = powerUpRows[0];

  // Count how many of this type are already installed
  const sameTypeCount = existingInstalls.filter(
    (ip) => ip.powerUpId === powerUpRecord.id
  ).length;

  if (sameTypeCount >= def.maxPerMachine) {
    return {
      success: false,
      error: `Maximum ${def.maxPerMachine} of "${def.name}" per machine. Already have ${sameTypeCount}.`,
    };
  }

  // Calculate cost
  const cost = calculatePowerUpCost(powerUpKey);

  // Check premium wallet balance
  const balance = parseFloat(player.premiumWalletBalance || "0");
  if (balance < cost) {
    return {
      success: false,
      error: `Insufficient premium wallet balance. Need $${cost}, have $${balance.toFixed(2)}.`,
    };
  }

  // Deduct cost from premium wallet
  await db
    .update(players)
    .set({
      premiumWalletBalance: sql`${players.premiumWalletBalance} - ${cost}`,
      totalExpenses: sql`${players.totalExpenses} + ${cost}`,
    })
    .where(eq(players.id, playerId));

  // Calculate expiration date
  let expirationDate: Date | null = null;
  if (def.durabilityType === "timed" && def.durationDays) {
    expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + def.durationDays);
  }

  // Install the power-up
  const installId = nanoid();
  await db.insert(installedPowerUps).values({
    id: installId,
    machineId,
    powerUpId: powerUpRecord.id,
    condition: "active",
    installedDate: new Date(),
    expirationDate,
    healthPercent: 100,
  });

  // Apply capacity bonus immediately if it's a capacity power-up
  if (def.category === "capacity") {
    await db
      .update(vendingMachines)
      .set({
        capacity: sql`${vendingMachines.capacity} + ${Math.floor(def.effectValue)}`,
      })
      .where(eq(vendingMachines.id, machineId));
  }

  return { success: true, installedPowerUpId: installId, cost };
}

/**
 * Remove/uninstall a power-up from a machine
 */
export async function uninstallPowerUp(
  playerId: number,
  installedPowerUpId: string
): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const installRows = await db
    .select()
    .from(installedPowerUps)
    .where(eq(installedPowerUps.id, installedPowerUpId))
    .limit(1);

  if (installRows.length === 0) return { success: false, error: "Installed power-up not found" };
  const install = installRows[0];

  // Verify machine ownership
  const machineRows = await db
    .select()
    .from(vendingMachines)
    .where(and(eq(vendingMachines.id, install.machineId), eq(vendingMachines.playerId, playerId)))
    .limit(1);

  if (machineRows.length === 0) return { success: false, error: "Machine not owned by you" };

  // Get the power-up definition to check if we need to revert capacity
  const powerUpRows = await db
    .select()
    .from(powerUps)
    .where(eq(powerUps.id, install.powerUpId))
    .limit(1);

  if (powerUpRows.length > 0) {
    const puRecord = powerUpRows[0];
    // Find the catalog entry by name to get effectValue
    const catalogEntry = Object.values(POWER_UP_CATALOG).find(
      (d) => d.name === puRecord.name
    );
    if (catalogEntry && catalogEntry.category === "capacity") {
      await db
        .update(vendingMachines)
        .set({
          capacity: sql`GREATEST(${vendingMachines.capacity} - ${Math.floor(catalogEntry.effectValue)}, 0)`,
        })
        .where(eq(vendingMachines.id, install.machineId));
    }
  }

  // Mark as removed
  await db
    .update(installedPowerUps)
    .set({ condition: "removed" })
    .where(eq(installedPowerUps.id, installedPowerUpId));

  return { success: true };
}

/**
 * Get all active power-ups installed on a machine
 */
export async function getMachinePowerUps(machineId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const installs = await db
    .select()
    .from(installedPowerUps)
    .where(
      and(
        eq(installedPowerUps.machineId, machineId),
        eq(installedPowerUps.condition, "active")
      )
    );

  // Enrich with catalog data
  const enriched = [];
  for (const install of installs) {
    const puRows = await db
      .select()
      .from(powerUps)
      .where(eq(powerUps.id, install.powerUpId))
      .limit(1);

    const puRecord = puRows[0];
    const catalogEntry = puRecord
      ? Object.entries(POWER_UP_CATALOG).find(([, d]) => d.name === puRecord.name)
      : null;

    enriched.push({
      ...install,
      powerUpName: puRecord?.name || "Unknown",
      powerUpCategory: puRecord?.category || "unknown",
      effectDescription: puRecord?.effectDescription || "",
      iconName: puRecord?.iconName || "",
      catalogKey: catalogEntry?.[0] || null,
      effectValue: catalogEntry?.[1]?.effectValue || 0,
      isExpired: install.expirationDate ? new Date() > install.expirationDate : false,
    });
  }

  return enriched;
}

/**
 * Simulate power-up malfunction (called by cron job)
 */
export async function simulatePowerUpMalfunctions(): Promise<{
  checked: number;
  malfunctioned: number;
  expired: number;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const activeInstalls = await db
    .select()
    .from(installedPowerUps)
    .where(eq(installedPowerUps.condition, "active"));

  let malfunctioned = 0;
  let expired = 0;

  for (const install of activeInstalls) {
    // Check expiration
    if (install.expirationDate && new Date() > install.expirationDate) {
      await db
        .update(installedPowerUps)
        .set({ condition: "expired" })
        .where(eq(installedPowerUps.id, install.id));
      expired++;
      continue;
    }

    // Check malfunction
    const puRows = await db
      .select()
      .from(powerUps)
      .where(eq(powerUps.id, install.powerUpId))
      .limit(1);

    if (puRows.length > 0) {
      const malfunctionChance = puRows[0].malfunctionChancePercent || 0;
      if (Math.random() * 100 < malfunctionChance) {
        // Degrade health
        const newHealth = Math.max((install.healthPercent || 100) - 20, 0);
        const newCondition = newHealth <= 0 ? "broken" : "degraded";

        await db
          .update(installedPowerUps)
          .set({
            healthPercent: newHealth,
            condition: newCondition,
          })
          .where(eq(installedPowerUps.id, install.id));
        malfunctioned++;
      }
    }
  }

  return { checked: activeInstalls.length, malfunctioned, expired };
}

/**
 * Repair a broken or degraded power-up
 */
export async function repairPowerUp(
  playerId: number,
  installedPowerUpId: string
): Promise<{ success: boolean; repairCost?: number; error?: string }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const installRows = await db
    .select()
    .from(installedPowerUps)
    .where(eq(installedPowerUps.id, installedPowerUpId))
    .limit(1);

  if (installRows.length === 0) return { success: false, error: "Installed power-up not found" };
  const install = installRows[0];

  if (install.condition !== "degraded" && install.condition !== "broken") {
    return { success: false, error: "Power-up does not need repair" };
  }

  // Verify machine ownership
  const machineRows = await db
    .select()
    .from(vendingMachines)
    .where(and(eq(vendingMachines.id, install.machineId), eq(vendingMachines.playerId, playerId)))
    .limit(1);

  if (machineRows.length === 0) return { success: false, error: "Machine not owned by you" };

  // Get repair cost
  const puRows = await db
    .select()
    .from(powerUps)
    .where(eq(powerUps.id, install.powerUpId))
    .limit(1);

  if (puRows.length === 0) return { success: false, error: "Power-up definition not found" };

  const repairCostPercent = puRows[0].repairCostPercent || 10;
  const avgCost = (puRows[0].costMin + puRows[0].costMax) / 2;
  const repairCost = Math.round(avgCost * (repairCostPercent / 100));

  // Check balance
  const playerRows = await db
    .select()
    .from(players)
    .where(eq(players.id, playerId))
    .limit(1);

  if (playerRows.length === 0) return { success: false, error: "Player not found" };

  const balance = parseFloat(playerRows[0].premiumWalletBalance || "0");
  if (balance < repairCost) {
    return {
      success: false,
      error: `Insufficient balance. Repair costs $${repairCost}, you have $${balance.toFixed(2)}.`,
    };
  }

  // Deduct and repair
  await db
    .update(players)
    .set({
      premiumWalletBalance: sql`${players.premiumWalletBalance} - ${repairCost}`,
      totalExpenses: sql`${players.totalExpenses} + ${repairCost}`,
    })
    .where(eq(players.id, playerId));

  await db
    .update(installedPowerUps)
    .set({ condition: "active", healthPercent: 100 })
    .where(eq(installedPowerUps.id, installedPowerUpId));

  return { success: true, repairCost };
}

// ============================================================================
// MACHINE UPGRADE OPERATIONS
// ============================================================================

/**
 * Purchase a machine upgrade (or upgrade to next tier)
 */
export async function purchaseMachineUpgrade(
  playerId: number,
  machineId: string,
  upgradeType: string
): Promise<{
  success: boolean;
  newTier?: number;
  cost?: number;
  statBonus?: number;
  error?: string;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const def = UPGRADE_CATALOG[upgradeType];
  if (!def) return { success: false, error: `Unknown upgrade type: ${upgradeType}` };

  // Check player
  const playerRows = await db
    .select()
    .from(players)
    .where(eq(players.id, playerId))
    .limit(1);

  if (playerRows.length === 0) return { success: false, error: "Player not found" };
  const player = playerRows[0];

  // Check business tier
  if (!meetsBusinessTierRequirement(player.currentBusinessTier || "startup", def.requiredTier)) {
    return {
      success: false,
      error: `Requires ${def.requiredTier} tier or higher. You are ${player.currentBusinessTier}.`,
    };
  }

  // Check machine ownership
  const machineRows = await db
    .select()
    .from(vendingMachines)
    .where(and(eq(vendingMachines.id, machineId), eq(vendingMachines.playerId, playerId)))
    .limit(1);

  if (machineRows.length === 0) return { success: false, error: "Machine not found or not owned by you" };

  // Get current upgrade state
  const upgradeRows = await db
    .select()
    .from(machineUpgrades)
    .where(
      and(
        eq(machineUpgrades.machineId, machineId),
        eq(machineUpgrades.upgradeType, upgradeType)
      )
    )
    .limit(1);

  const currentTier = upgradeRows.length > 0 ? upgradeRows[0].currentTier : 0;
  const nextTier = currentTier + 1;

  if (nextTier > def.maxTier) {
    return {
      success: false,
      error: `${def.name} is already at maximum tier ${def.maxTier}.`,
    };
  }

  // Calculate cost
  const cost = calculateUpgradeCost(upgradeType, nextTier);

  // Check competition wallet balance (upgrades use competition wallet)
  const balance = parseFloat(player.competitionWalletBalance || "0");
  if (balance < cost) {
    return {
      success: false,
      error: `Insufficient competition wallet balance. Need $${cost}, have $${balance.toFixed(2)}.`,
    };
  }

  // Deduct cost
  await db
    .update(players)
    .set({
      competitionWalletBalance: sql`${players.competitionWalletBalance} - ${cost}`,
      totalExpenses: sql`${players.totalExpenses} + ${cost}`,
    })
    .where(eq(players.id, playerId));

  const newStatBonus = nextTier * def.bonusPerTier;
  const totalInvested =
    (upgradeRows.length > 0 ? parseFloat(upgradeRows[0].totalInvested || "0") : 0) + cost;

  if (upgradeRows.length > 0) {
    // Update existing upgrade
    await db
      .update(machineUpgrades)
      .set({
        currentTier: nextTier,
        statBonus: newStatBonus,
        totalInvested: totalInvested.toFixed(2),
        lastUpgradedAt: new Date(),
      })
      .where(eq(machineUpgrades.id, upgradeRows[0].id));
  } else {
    // Create new upgrade record
    await db.insert(machineUpgrades).values({
      id: nanoid(),
      machineId,
      playerId,
      upgradeType,
      currentTier: nextTier,
      maxTier: def.maxTier,
      statBonus: newStatBonus,
      totalInvested: totalInvested.toFixed(2),
      lastUpgradedAt: new Date(),
    });
  }

  // Apply capacity upgrade directly to machine
  if (upgradeType === "capacity") {
    await db
      .update(vendingMachines)
      .set({
        capacity: sql`${vendingMachines.capacity} + ${def.bonusPerTier}`,
      })
      .where(eq(vendingMachines.id, machineId));
  }

  return { success: true, newTier: nextTier, cost, statBonus: newStatBonus };
}

/**
 * Get all upgrades for a machine
 */
export async function getMachineUpgrades(machineId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const upgrades = await db
    .select()
    .from(machineUpgrades)
    .where(eq(machineUpgrades.machineId, machineId));

  return upgrades.map((u) => {
    const def = UPGRADE_CATALOG[u.upgradeType];
    return {
      ...u,
      name: def?.name || u.upgradeType,
      description: def?.description || "",
      maxTierReached: u.currentTier >= (def?.maxTier || 5),
      nextTierCost:
        u.currentTier < (def?.maxTier || 5)
          ? calculateUpgradeCost(u.upgradeType, u.currentTier + 1)
          : null,
      statAffected: def?.statAffected || "",
    };
  });
}

/**
 * Get aggregate machine stats including all active power-ups and upgrades
 */
export async function getAggregatedMachineStats(machineId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get base machine
  const machineRows = await db
    .select()
    .from(vendingMachines)
    .where(eq(vendingMachines.id, machineId))
    .limit(1);

  if (machineRows.length === 0) return null;
  const machine = machineRows[0];

  // Get active power-ups
  const activePowerUps = await getMachinePowerUps(machineId);

  // Get upgrades
  const upgrades = await getMachineUpgrades(machineId);

  // Calculate aggregate bonuses
  let revenueBonus = 0;
  let capacityBonus = 0;
  let maintenanceReduction = 0;
  let speedBonus = 0;
  let breakdownReduction = 0;
  let freshnessExtension = 0;
  let operatingCostReduction = 0;
  let vandalismReduction = 0;

  // Power-up bonuses
  for (const pu of activePowerUps) {
    if (pu.isExpired || pu.condition !== "active") continue;
    const catalogEntry = pu.catalogKey ? POWER_UP_CATALOG[pu.catalogKey] : null;
    if (!catalogEntry) continue;

    switch (catalogEntry.category) {
      case "revenue":
        revenueBonus += catalogEntry.effectValue;
        break;
      case "capacity":
        // Already applied directly to machine capacity
        break;
      case "maintenance":
        maintenanceReduction += catalogEntry.effectValue;
        break;
      case "speed":
        speedBonus += catalogEntry.effectValue;
        break;
      case "special":
        if (catalogEntry.name === "Golden Facade") revenueBonus += 0.15;
        if (catalogEntry.name === "Frost Guard Cooler") freshnessExtension += catalogEntry.effectValue;
        break;
    }
  }

  // Upgrade bonuses
  for (const upgrade of upgrades) {
    switch (upgrade.upgradeType) {
      case "speed":
        speedBonus += (upgrade.statBonus || 0) / 100;
        break;
      case "reliability":
        breakdownReduction += (upgrade.statBonus || 0) / 100;
        break;
      case "energy_efficiency":
        operatingCostReduction += (upgrade.statBonus || 0) / 100;
        break;
      case "security":
        vandalismReduction += (upgrade.statBonus || 0) / 100;
        break;
      case "temperature_control":
        freshnessExtension += (upgrade.statBonus || 0) / 100;
        break;
      // capacity is applied directly
    }
  }

  return {
    machineId,
    machineName: machine.name,
    baseCapacity: machine.capacity || 100,
    baseMaintenanceLevel: machine.maintenanceLevel || 100,
    bonuses: {
      revenueBonus: Math.round(revenueBonus * 100),
      capacityBonus: Math.round(capacityBonus),
      maintenanceReduction: Math.round(maintenanceReduction * 100),
      speedBonus: Math.round(speedBonus * 100),
      breakdownReduction: Math.round(breakdownReduction * 100),
      freshnessExtension: Math.round(freshnessExtension * 100),
      operatingCostReduction: Math.round(operatingCostReduction * 100),
      vandalismReduction: Math.round(vandalismReduction * 100),
    },
    activePowerUps: activePowerUps.filter((p) => !p.isExpired),
    upgrades,
    totalPowerUps: activePowerUps.length,
    totalUpgradeTiers: upgrades.reduce((sum, u) => sum + u.currentTier, 0),
  };
}

/**
 * Get a summary of all power-ups and upgrades for a player across all machines
 */
export async function getPlayerPowerUpSummary(playerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get all player machines
  const machines = await db
    .select()
    .from(vendingMachines)
    .where(eq(vendingMachines.playerId, playerId));

  if (machines.length === 0) return { machines: [], totalPowerUps: 0, totalUpgrades: 0, totalInvested: 0 };

  const machineIds = machines.map((m) => m.id);

  // Get all installed power-ups
  const allInstalls = await db
    .select()
    .from(installedPowerUps)
    .where(inArray(installedPowerUps.machineId, machineIds));

  // Get all upgrades
  const allUpgrades = await db
    .select()
    .from(machineUpgrades)
    .where(inArray(machineUpgrades.machineId, machineIds));

  const activePowerUps = allInstalls.filter((i) => i.condition === "active");
  const totalUpgradeInvestment = allUpgrades.reduce(
    (sum, u) => sum + parseFloat(u.totalInvested || "0"),
    0
  );

  return {
    machines: machines.map((m) => ({
      id: m.id,
      name: m.name,
      powerUpCount: allInstalls.filter(
        (i) => i.machineId === m.id && i.condition === "active"
      ).length,
      upgradeCount: allUpgrades.filter((u) => u.machineId === m.id).length,
    })),
    totalPowerUps: activePowerUps.length,
    totalUpgrades: allUpgrades.length,
    totalInvested: totalUpgradeInvestment,
    brokenPowerUps: allInstalls.filter((i) => i.condition === "broken").length,
    degradedPowerUps: allInstalls.filter((i) => i.condition === "degraded").length,
    expiredPowerUps: allInstalls.filter((i) => i.condition === "expired").length,
  };
}
