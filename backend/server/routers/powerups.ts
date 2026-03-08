/**
 * Power-Up & Machine Upgrade tRPC Router
 * =======================================
 * Handles power-up purchasing, installation, repair, and machine upgrade
 * tier progression. Power-ups use the premium wallet; upgrades use the
 * competition wallet.
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as PowerUpEngine from "../engines/powerUps";

export const powerupsRouter = router({
  // ========================================================================
  // POWER-UP CATALOG
  // ========================================================================

  /** Get the full power-up catalog with availability based on player tier */
  getCatalog: protectedProcedure
    .input(
      z.object({
        playerTier: z.string().default("startup"),
      })
    )
    .query(({ input }) => {
      return PowerUpEngine.getCatalog(input.playerTier);
    }),

  /** Get the machine upgrade catalog with availability */
  getUpgradeCatalog: protectedProcedure
    .input(
      z.object({
        playerTier: z.string().default("startup"),
      })
    )
    .query(({ input }) => {
      return PowerUpEngine.getUpgradeCatalog(input.playerTier);
    }),

  // ========================================================================
  // POWER-UP OPERATIONS
  // ========================================================================

  /** Seed the power-up catalog into the database */
  seedCatalog: protectedProcedure.mutation(async () => {
    const seeded = await PowerUpEngine.seedPowerUpCatalog();
    return { seeded, message: `Seeded ${seeded} new power-up definitions` };
  }),

  /** Purchase and install a power-up on a machine */
  purchase: protectedProcedure
    .input(
      z.object({
        machineId: z.string(),
        powerUpKey: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return PowerUpEngine.purchaseAndInstallPowerUp(
        ctx.user.id,
        input.machineId,
        input.powerUpKey
      );
    }),

  /** Uninstall a power-up from a machine */
  uninstall: protectedProcedure
    .input(
      z.object({
        installedPowerUpId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return PowerUpEngine.uninstallPowerUp(ctx.user.id, input.installedPowerUpId);
    }),

  /** Repair a broken or degraded power-up */
  repair: protectedProcedure
    .input(
      z.object({
        installedPowerUpId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return PowerUpEngine.repairPowerUp(ctx.user.id, input.installedPowerUpId);
    }),

  /** Get all active power-ups on a machine */
  getMachinePowerUps: protectedProcedure
    .input(z.object({ machineId: z.string() }))
    .query(async ({ input }) => {
      return PowerUpEngine.getMachinePowerUps(input.machineId);
    }),

  /** Simulate power-up malfunctions (admin/cron) */
  simulateMalfunctions: protectedProcedure.mutation(async () => {
    return PowerUpEngine.simulatePowerUpMalfunctions();
  }),

  // ========================================================================
  // MACHINE UPGRADE OPERATIONS
  // ========================================================================

  /** Purchase a machine upgrade or upgrade to next tier */
  purchaseUpgrade: protectedProcedure
    .input(
      z.object({
        machineId: z.string(),
        upgradeType: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return PowerUpEngine.purchaseMachineUpgrade(
        ctx.user.id,
        input.machineId,
        input.upgradeType
      );
    }),

  /** Get all upgrades for a machine */
  getMachineUpgrades: protectedProcedure
    .input(z.object({ machineId: z.string() }))
    .query(async ({ input }) => {
      return PowerUpEngine.getMachineUpgrades(input.machineId);
    }),

  /** Get aggregated machine stats including power-ups and upgrades */
  getAggregatedStats: protectedProcedure
    .input(z.object({ machineId: z.string() }))
    .query(async ({ input }) => {
      return PowerUpEngine.getAggregatedMachineStats(input.machineId);
    }),

  /** Get player-wide power-up and upgrade summary across all machines */
  getPlayerSummary: protectedProcedure.query(async ({ ctx }) => {
    return PowerUpEngine.getPlayerPowerUpSummary(ctx.user.id);
  }),

  // ========================================================================
  // COST CALCULATORS
  // ========================================================================

  /** Calculate cost for a specific upgrade tier */
  calculateUpgradeCost: protectedProcedure
    .input(
      z.object({
        upgradeType: z.string(),
        targetTier: z.number().min(1).max(5),
      })
    )
    .query(({ input }) => {
      try {
        const cost = PowerUpEngine.calculateUpgradeCost(input.upgradeType, input.targetTier);
        const totalCost = PowerUpEngine.calculateTotalUpgradeCost(
          input.upgradeType,
          input.targetTier
        );
        return { cost, totalCost, tier: input.targetTier };
      } catch (e: any) {
        return { error: e.message };
      }
    }),
});
