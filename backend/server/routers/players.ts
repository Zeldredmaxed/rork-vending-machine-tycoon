/**
 * Player Management tRPC Router
 * Handles player profiles, machines, inventory, and game operations
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import {
  getPlayerByUserId,
  createPlayer,
  getPlayerStats,
  updatePlayerBalance,
  getPlayerMachines,
  createVendingMachine,
  getPlayerWarehouseInventory,
  addToWarehouseInventory,
  recordTransaction,
  getPlayerTransactions,
  getPlayerEmployees,
  generateApplicants,
  getPlayerAlliance,
} from "../queries";
import {
  calculateTycoonScore,
  calculateBusinessTier,
  calculateGpsDistance,
} from "../gameLogic";
import { v4 as uuidv4 } from "uuid";

export const playersRouter = router({
  // ========================================================================
  // PROFILE MANAGEMENT
  // ========================================================================

  /**
   * Get or create player profile
   */
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    let player = await getPlayerByUserId(ctx.user.id);

    if (!player) {
      // Create new player profile
      player = await createPlayer({
        userId: ctx.user.id,
        brandName: `${ctx.user.name || "Player"}'s Vending Empire`,
        primaryColor: "#3B82F6",
        secondaryColor: "#1F2937",
      });
    }

    return player;
  }),

  /**
   * Update player profile
   */
  updateProfile: protectedProcedure
    .input(
      z.object({
        brandName: z.string().optional(),
        brandLogoIcon: z.string().optional(),
        primaryColor: z.string().optional(),
        secondaryColor: z.string().optional(),
        tagline: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const player = await getPlayerByUserId(ctx.user.id);
      if (!player) throw new Error("Player not found");

      // TODO: Update player in database
      return player;
    }),

  /**
   * Get player statistics and dashboard data
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const player = await getPlayerByUserId(ctx.user.id);
    if (!player) throw new Error("Player not found");

    const stats = await getPlayerStats(player.id);
    if (!stats) throw new Error("Could not retrieve player stats");

    // Calculate Tycoon Score
    const tycoonScore = calculateTycoonScore({
      totalRevenue: parseFloat(stats.totalMachineRevenue || "0"),
      netWorth: parseFloat(player.netWorth || "0"),
      totalExpenses: parseFloat(player.totalExpenses || "0"),
      reputation: player.reputation || 0,
      machineCount: stats.machineCount,
      machineHealthAverage: 75, // TODO: Calculate from actual machines
      restockSuccessRate: 0.85, // TODO: Calculate from actual restocks
      employeeEfficiencyAverage: 70, // TODO: Calculate from actual employees
    });

    // Calculate business tier
    const businessTier = calculateBusinessTier(stats.machineCount);

    return {
      player,
      machineCount: stats.machineCount,
      totalMachineRevenue: stats.totalMachineRevenue,
      tycoonScore,
      businessTier,
      competitionWalletBalance: player.competitionWalletBalance,
      premiumWalletBalance: player.premiumWalletBalance,
      lifetimeElo: player.lifetimeElo,
      seasonsPlayed: player.seasonsPlayed,
    };
  }),

  // ========================================================================
  // MACHINE MANAGEMENT
  // ========================================================================

  /**
   * Get all player machines
   */
  getMachines: protectedProcedure.query(async ({ ctx }) => {
    const player = await getPlayerByUserId(ctx.user.id);
    if (!player) throw new Error("Player not found");

    return await getPlayerMachines(player.id);
  }),

  /**
   * Purchase and place a new vending machine
   */
  purchaseMachine: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        latitude: z.number(),
        longitude: z.number(),
        demographicProfile: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const player = await getPlayerByUserId(ctx.user.id);
      if (!player) throw new Error("Player not found");

      const machineId = uuidv4();
      const purchaseCost = "500"; // Base cost

      // Check wallet balance
      const balance = parseFloat(player.competitionWalletBalance || "0");
      if (balance < 500) {
        throw new Error("Insufficient funds to purchase machine");
      }

      // Create machine
      const machine = await createVendingMachine({
        id: machineId,
        playerId: player.id,
        name: input.name,
        latitude: input.latitude,
        longitude: input.longitude,
        demographicProfile: input.demographicProfile,
      });

      // Deduct from wallet
      await updatePlayerBalance(player.id, "competition", `-${purchaseCost}`);

      // Record transaction
      await recordTransaction({
        id: uuidv4(),
        playerId: player.id,
        type: "purchase",
        amount: purchaseCost,
        description: `Purchased vending machine: ${input.name}`,
        walletType: "competition",
        relatedEntityId: machineId,
        relatedEntityType: "vendingMachine",
      });

      return machine;
    }),

  // ========================================================================
  // INVENTORY MANAGEMENT
  // ========================================================================

  /**
   * Get warehouse inventory
   */
  getWarehouseInventory: protectedProcedure.query(async ({ ctx }) => {
    const player = await getPlayerByUserId(ctx.user.id);
    if (!player) throw new Error("Player not found");

    return await getPlayerWarehouseInventory(player.id);
  }),

  /**
   * Purchase products for warehouse
   */
  purchaseProducts: protectedProcedure
    .input(
      z.object({
        productId: z.string(),
        quantity: z.number().min(1),
        purchasePrice: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const player = await getPlayerByUserId(ctx.user.id);
      if (!player) throw new Error("Player not found");

      const totalCost = (parseFloat(input.purchasePrice) * input.quantity).toFixed(2);

      // Check wallet balance
      const balance = parseFloat(player.competitionWalletBalance || "0");
      if (balance < parseFloat(totalCost)) {
        throw new Error("Insufficient funds");
      }

      // Add to warehouse
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 5); // 5 day expiration

      const inventoryItem = await addToWarehouseInventory({
        id: uuidv4(),
        playerId: player.id,
        productId: input.productId,
        quantity: input.quantity,
        purchasePrice: input.purchasePrice,
        expirationDate,
      });

      // Deduct from wallet
      await updatePlayerBalance(player.id, "competition", `-${totalCost}`);

      // Record transaction
      await recordTransaction({
        id: uuidv4(),
        playerId: player.id,
        type: "purchase",
        amount: totalCost,
        description: `Purchased ${input.quantity} units of product`,
        walletType: "competition",
        relatedEntityId: input.productId,
        relatedEntityType: "product",
      });

      return inventoryItem;
    }),

  // ========================================================================
  // EMPLOYEE MANAGEMENT
  // ========================================================================

  /**
   * Get player employees
   */
  getEmployees: protectedProcedure.query(async ({ ctx }) => {
    const player = await getPlayerByUserId(ctx.user.id);
    if (!player) throw new Error("Player not found");

    return await getPlayerEmployees(player.id);
  }),

  /**
   * Generate applicants for hiring
   */
  generateApplicants: protectedProcedure.mutation(async ({ ctx }) => {
    const player = await getPlayerByUserId(ctx.user.id);
    if (!player) throw new Error("Player not found");

    return await generateApplicants(player.id, 3);
  }),

  // ========================================================================
  // WALLET & TRANSACTIONS
  // ========================================================================

  /**
   * Get transaction history
   */
  getTransactions: protectedProcedure
    .input(z.object({ limit: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const player = await getPlayerByUserId(ctx.user.id);
      if (!player) throw new Error("Player not found");

      return await getPlayerTransactions(player.id, input.limit || 50);
    }),

  /**
   * Get wallet balances
   */
  getWallets: protectedProcedure.query(async ({ ctx }) => {
    const player = await getPlayerByUserId(ctx.user.id);
    if (!player) throw new Error("Player not found");

    return {
      competitionWallet: player.competitionWalletBalance,
      premiumWallet: player.premiumWalletBalance,
    };
  }),

  // ========================================================================
  // ALLIANCE
  // ========================================================================

  /**
   * Get player's alliance
   */
  getAlliance: protectedProcedure.query(async ({ ctx }) => {
    const player = await getPlayerByUserId(ctx.user.id);
    if (!player) throw new Error("Player not found");

    return await getPlayerAlliance(player.id);
  }),
});
