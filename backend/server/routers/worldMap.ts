/**
 * World Map tRPC Router
 * Handles procedural world generation, location queries, and black market interactions
 */

import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import {
  generateBlock,
  generateViewport,
  getLocationSummary,
  attemptBlackMarketPurchase,
  DISTRICT_CONFIGS,
  SUPPLIER_CONFIGS,
  VENDING_MACHINE_SPRITES,
  type DistrictType,
  type SupplierType,
} from "../engines/worldMap";
import { getPlayerByUserId, getPlayerMachines, updatePlayerBalance, recordTransaction } from "../queries";
import { v4 as uuidv4 } from "uuid";

export const worldMapRouter = router({
  // ========================================================================
  // WORLD GENERATION
  // ========================================================================

  /**
   * Generate a single block at given coordinates.
   * Returns all layers (roads, buildings, props, NPCs, vehicles, suppliers).
   */
  getBlock: publicProcedure
    .input(
      z.object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
        seasonId: z.number().int().positive(),
      })
    )
    .query(({ input }) => {
      const block = generateBlock(input.lat, input.lng, input.seasonId);
      // Strip the full districtConfig to reduce payload — client only needs key info
      return {
        blockLat: block.blockLat,
        blockLng: block.blockLng,
        centerLat: block.centerLat,
        centerLng: block.centerLng,
        districtType: block.districtType,
        districtLabel: block.districtConfig.label,
        footTraffic: block.footTraffic,
        rentMultiplier: block.districtConfig.rentMultiplier,
        vendingDemandMultiplier: block.districtConfig.vendingDemandMultiplier,
        roads: block.roads,
        buildings: block.buildings,
        props: block.props,
        npcs: block.npcs,
        vehicles: block.vehicles,
        suppliers: block.suppliers,
      };
    }),

  /**
   * Generate a viewport (5x5 grid of blocks) centered on coordinates.
   * This is the main call when a player zooms into an area.
   */
  getViewport: publicProcedure
    .input(
      z.object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
        seasonId: z.number().int().positive(),
        radius: z.number().int().min(1).max(5).default(2),
      })
    )
    .query(({ input }) => {
      const blocks = generateViewport(input.lat, input.lng, input.seasonId, input.radius);
      return blocks.map((block) => ({
        blockLat: block.blockLat,
        blockLng: block.blockLng,
        centerLat: block.centerLat,
        centerLng: block.centerLng,
        districtType: block.districtType,
        districtLabel: block.districtConfig.label,
        footTraffic: block.footTraffic,
        rentMultiplier: block.districtConfig.rentMultiplier,
        vendingDemandMultiplier: block.districtConfig.vendingDemandMultiplier,
        roads: block.roads,
        buildings: block.buildings,
        props: block.props,
        npcs: block.npcs,
        vehicles: block.vehicles,
        suppliers: block.suppliers,
      }));
    }),

  /**
   * Get a quick summary of a location without full generation.
   * Used for the map overview / hover preview.
   */
  getLocationSummary: publicProcedure
    .input(
      z.object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
        seasonId: z.number().int().positive(),
      })
    )
    .query(({ input }) => {
      return getLocationSummary(input.lat, input.lng, input.seasonId);
    }),

  /**
   * Get all district type configurations.
   * Used by the client to display district info in the UI.
   */
  getDistrictConfigs: publicProcedure.query(() => {
    return Object.entries(DISTRICT_CONFIGS).map(([key, config]) => ({
      type: key as DistrictType,
      label: config.label,
      footTrafficMultiplier: config.footTrafficMultiplier,
      rentMultiplier: config.rentMultiplier,
      vendingDemandMultiplier: config.vendingDemandMultiplier,
    }));
  }),

  /**
   * Get all supplier configurations (excluding black market details).
   * Used by the client to show known supplier info.
   */
  getSupplierInfo: publicProcedure.query(() => {
    return SUPPLIER_CONFIGS.filter((s) => !s.isBlackMarket).map((s) => ({
      type: s.type,
      label: s.label,
      priceMultiplier: s.priceMultiplier,
      spriteKey: s.spriteKey,
    }));
  }),

  /**
   * Get all vending machine sprite mappings.
   */
  getVendingMachineSprites: publicProcedure.query(() => {
    return Object.entries(VENDING_MACHINE_SPRITES).map(([type, spriteKey]) => ({
      type,
      spriteKey,
    }));
  }),

  // ========================================================================
  // PLAYER MACHINES ON MAP
  // ========================================================================

  /**
   * Get all player-placed vending machines in a viewport area.
   * These are the DB-stored machines overlaid on the procedural world.
   */
  getMachinesInArea: publicProcedure
    .input(
      z.object({
        minLat: z.number(),
        maxLat: z.number(),
        minLng: z.number(),
        maxLng: z.number(),
      })
    )
    .query(async ({ input }) => {
      // This would query the vendingMachines table with a bounding box
      // For now, return the interface shape
      // In production: SELECT * FROM vendingMachines WHERE lat BETWEEN ? AND ? AND lng BETWEEN ? AND ?
      return {
        machines: [] as Array<{
          id: string;
          playerId: number;
          name: string;
          lat: number;
          lng: number;
          status: string;
          machineType: string;
          brandName: string;
          brandColor: string;
        }>,
      };
    }),

  /**
   * Get the current player's machines for the map overlay.
   */
  getMyMachines: protectedProcedure.query(async ({ ctx }) => {
    const player = await getPlayerByUserId(ctx.user.id);
    if (!player) return { machines: [] };

    const machines = await getPlayerMachines(player.id);
    return {
      machines: machines.map((m) => ({
        id: m.id,
        name: m.name,
        lat: m.latitude,
        lng: m.longitude,
        status: m.status,
        footTraffic: m.footTraffic,
        dailyRevenue: m.dailyRevenue,
        maintenanceLevel: m.maintenanceLevel,
      })),
    };
  }),

  // ========================================================================
  // BLACK MARKET INTERACTIONS
  // ========================================================================

  /**
   * Attempt to purchase from a black market alley.
   * Risk/reward: 60% discount but 25% chance of getting caught with a $5,000 fine.
   */
  blackMarketPurchase: protectedProcedure
    .input(
      z.object({
        supplierType: z.string(),
        productId: z.string(),
        quantity: z.number().int().positive(),
        basePrice: z.number().positive(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const player = await getPlayerByUserId(ctx.user.id);
      if (!player) throw new Error("Player not found");

      const totalBasePrice = input.basePrice * input.quantity;
      const result = attemptBlackMarketPurchase(
        input.supplierType as SupplierType,
        totalBasePrice
      );

      if (!result.success) {
        throw new Error("Invalid supplier type for black market purchase");
      }

      // Check if player can afford the discounted price
      const playerBalance = Number(player.competitionWalletBalance);
      if (playerBalance < result.discountedPrice) {
        throw new Error("Insufficient funds for black market purchase");
      }

      // Deduct the discounted price
      await updatePlayerBalance(
        player.id,
        "competition",
        String(-result.discountedPrice)
      );

      // Record the purchase transaction
      await recordTransaction({
        id: uuidv4(),
        playerId: player.id,
        type: "black_market_purchase",
        amount: String(-result.discountedPrice),
        description: `Black market purchase: ${input.quantity}x ${input.productId} at ${Math.round(result.discountedPrice * 100) / 100}`,
        walletType: "competition",
        relatedEntityType: "supplier",
        relatedEntityId: input.supplierType,
      });

      // If caught, apply the fine
      if (result.caught) {
        const fineAmount = result.fineAmount;
        
        // Deduct fine (can go negative — player owes debt)
        await updatePlayerBalance(player.id, "competition", String(-fineAmount));
        
        await recordTransaction({
          id: uuidv4(),
          playerId: player.id,
          type: "black_market_fine",
          amount: String(-fineAmount),
          description: `Caught with stolen goods! Fine: $${fineAmount}`,
          walletType: "competition",
          relatedEntityType: "supplier",
          relatedEntityId: input.supplierType,
        });
      }

      return {
        purchased: true,
        discountedPrice: result.discountedPrice,
        originalPrice: totalBasePrice,
        savings: totalBasePrice - result.discountedPrice,
        caught: result.caught,
        fineAmount: result.caught ? result.fineAmount : 0,
        netCost: result.discountedPrice + (result.caught ? result.fineAmount : 0),
        message: result.caught
          ? `You got caught with stolen goods! The authorities fined you $${result.fineAmount}. Your total cost: $${Math.round((result.discountedPrice + result.fineAmount) * 100) / 100}`
          : `Deal done. You saved $${Math.round((totalBasePrice - result.discountedPrice) * 100) / 100} on this purchase. Nobody saw a thing.`,
      };
    }),

  // ========================================================================
  // LOCATION ANALYTICS
  // ========================================================================

  /**
   * Analyze a location for vending machine placement potential.
   * Helps players decide where to place machines.
   */
  analyzeLocation: protectedProcedure
    .input(
      z.object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
        seasonId: z.number().int().positive(),
      })
    )
    .query(({ input }) => {
      const block = generateBlock(input.lat, input.lng, input.seasonId);
      const config = block.districtConfig;

      // Calculate a placement score (0-100)
      const trafficScore = Math.min(block.footTraffic / 2, 40);
      const demandScore = config.vendingDemandMultiplier * 20;
      const costPenalty = config.rentMultiplier * 5;
      const placementScore = Math.round(
        Math.max(0, Math.min(100, trafficScore + demandScore - costPenalty))
      );

      // Recommend machine types based on district
      const recommendedTypes: string[] = [];
      switch (block.districtType) {
        case "downtown":
          recommendedTypes.push("coffee_espresso", "combo_unit", "electronics");
          break;
        case "residential":
          recommendedTypes.push("glass_front_snack", "classic_beverage", "healthy_organic");
          break;
        case "retail":
          recommendedTypes.push("combo_unit", "gacha_capsule", "ice_cream_frozen");
          break;
        case "industrial":
          recommendedTypes.push("hot_food_noodle", "classic_beverage", "coffee_espresso");
          break;
        case "transit":
          recommendedTypes.push("combo_unit", "coffee_espresso", "pharmacy_otc");
          break;
        case "park":
          recommendedTypes.push("ice_cream_frozen", "classic_beverage", "healthy_organic");
          break;
      }

      return {
        placementScore,
        placementGrade:
          placementScore >= 80 ? "A" :
          placementScore >= 60 ? "B" :
          placementScore >= 40 ? "C" :
          placementScore >= 20 ? "D" : "F",
        districtType: block.districtType,
        districtLabel: config.label,
        footTraffic: block.footTraffic,
        monthlyRentEstimate: Math.round(500 * config.rentMultiplier),
        expectedDailyRevenue: Math.round(block.footTraffic * config.vendingDemandMultiplier * 0.5),
        recommendedMachineTypes: recommendedTypes,
        nearbySuppliers: block.suppliers.filter((s) => !s.isBlackMarket).map((s) => s.label),
        warnings: [
          ...(config.rentMultiplier > 2 ? ["High rent area — ensure revenue covers costs"] : []),
          ...(block.footTraffic < 30 ? ["Low foot traffic — consider a different location"] : []),
          ...(block.districtType === "industrial" ? ["Industrial zone — limited customer base"] : []),
        ],
      };
    }),
});
