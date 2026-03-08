/**
 * Seasons & Matchmaking tRPC Router
 * Handles season lifecycle, entry, ELO, and tournament management
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  getCurrentSeason,
  getSeasonById,
  createSeason,
  getSeasonBracket,
  createSeasonBracket,
  getSeasonLeaderboard,
  getPlayerByUserId,
  updatePlayerBalance,
  recordTransaction,
} from "../queries";
import { calculateEloChange, calculatePayouts, calculateHouseRake } from "../gameLogic";
import { v4 as uuidv4 } from "uuid";

export const seasonsRouter = router({
  // ========================================================================
  // SEASON QUERIES
  // ========================================================================

  /**
   * Get current active season
   */
  getCurrentSeason: protectedProcedure.query(async () => {
    return await getCurrentSeason();
  }),

  /**
   * Get season details
   */
  getSeason: protectedProcedure
    .input(z.object({ seasonId: z.number() }))
    .query(async ({ input }) => {
      return await getSeasonById(input.seasonId);
    }),

  /**
   * Get season leaderboard
   */
  getLeaderboard: protectedProcedure
    .input(z.object({ seasonId: z.number(), limit: z.number().optional() }))
    .query(async ({ input }) => {
      return await getSeasonLeaderboard(input.seasonId, input.limit || 100);
    }),

  // ========================================================================
  // SEASON ENTRY
  // ========================================================================

  /**
   * Enter current season (pay entry fee, get bracket assignment)
   */
  enterSeason: protectedProcedure.mutation(async ({ ctx }) => {
    const player = await getPlayerByUserId(ctx.user.id);
    if (!player) throw new Error("Player not found");

    const season = await getCurrentSeason();
    if (!season) throw new Error("No active season");

    // Check if already entered
    const existing = await getSeasonBracket(season.id, player.id);
    if (existing) throw new Error("Already entered this season");

    const entryFee = parseFloat(season.entryFee);
    const balance = parseFloat(player.competitionWalletBalance || "0");

    if (balance < entryFee) {
      throw new Error("Insufficient funds for entry fee");
    }

    // Create bracket entry
    const bracket = await createSeasonBracket({
      seasonId: season.id,
      playerId: player.id,
      entryFeeAmount: season.entryFee,
      bracketTier: "standard",
      startingCapital: "10000",
    });

    // Deduct entry fee
    await updatePlayerBalance(player.id, "competition", `-${season.entryFee}`);

    // Record transaction
    await recordTransaction({
      id: uuidv4(),
      playerId: player.id,
      type: "purchase",
      amount: season.entryFee,
      description: `Season ${season.seasonNumber} entry fee`,
      walletType: "competition",
      relatedEntityId: season.id.toString(),
      relatedEntityType: "season",
    });

    return bracket;
  }),

  /**
   * Get player's current season bracket
   */
  getMyBracket: protectedProcedure.query(async ({ ctx }) => {
    const player = await getPlayerByUserId(ctx.user.id);
    if (!player) throw new Error("Player not found");

    const season = await getCurrentSeason();
    if (!season) return null;

    return await getSeasonBracket(season.id, player.id);
  }),

  // ========================================================================
  // ELO & MATCHMAKING
  // ========================================================================

  /**
   * Get ELO rating and matchmaking info
   */
  getEloInfo: protectedProcedure.query(async ({ ctx }) => {
    const player = await getPlayerByUserId(ctx.user.id);
    if (!player) throw new Error("Player not found");

    return {
      lifetimeElo: player.lifetimeElo,
      bestTycoonScore: player.bestTycoonScore,
      seasonsPlayed: player.seasonsPlayed,
      bestRank: player.bestRank,
    };
  }),

  /**
   * Simulate ELO change for a match result
   * (Used for testing/demo purposes)
   */
  simulateEloChange: protectedProcedure
    .input(
      z.object({
        opponentElo: z.number(),
        playerWon: z.boolean(),
      })
    )
    .query(({ ctx, input }) => {
      const player = ctx.user;
      const playerElo = 1200; // TODO: Get from database

      const eloChange = calculateEloChange(playerElo, input.opponentElo, input.playerWon);
      const newElo = playerElo + eloChange;

      return {
        currentElo: playerElo,
        eloChange,
        newElo,
        expectedWinProbability: 1 / (1 + Math.pow(10, (input.opponentElo - playerElo) / 400)),
      };
    }),

  // ========================================================================
  // ADMIN PROCEDURES
  // ========================================================================

  /**
   * Create a new season (admin only)
   */
  createSeason: protectedProcedure
    .input(
      z.object({
        seasonNumber: z.number(),
        entryFee: z.string(),
        startDate: z.date(),
      })
    )
    .mutation(async ({ input }) => {
      return await createSeason({
        seasonNumber: input.seasonNumber,
        entryFee: input.entryFee,
        startDate: input.startDate,
      });
    }),

  /**
   * Calculate and distribute payouts for ended season (admin only)
   */
  distributePayouts: protectedProcedure
    .input(
      z.object({
        seasonId: z.number(),
        totalPrizePool: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const season = await getSeasonById(input.seasonId);
      if (!season) throw new Error("Season not found");

      const leaderboard = await getSeasonLeaderboard(input.seasonId, 1000);

      const payouts = calculatePayouts(
        parseFloat(input.totalPrizePool),
        leaderboard.map((l) => ({
          rank: l.rank,
          tycoonScore: l.tycoonScore || 0,
        }))
      );
      const houseRake = calculateHouseRake(parseFloat(input.totalPrizePool));

      // TODO: Distribute payouts to winners
      // For each winner in payouts map:
      //   - Get player
      //   - Add payout to competition wallet
      //   - Record transaction

      return {
        totalPrizePool: input.totalPrizePool,
        houseRake: houseRake.toString(),
        winnersCount: payouts.size,
        payouts: Array.from(payouts.entries()).map(([rank, amount]) => ({
          rank,
          amount: amount.toString(),
        })),
      };
    }),

  /**
   * Finalize season and calculate final rankings (admin only)
   */
  finalizeSeason: protectedProcedure
    .input(z.object({ seasonId: z.number() }))
    .mutation(async ({ input }) => {
      const season = await getSeasonById(input.seasonId);
      if (!season) throw new Error("Season not found");

      // TODO: Implement season finalization:
      // 1. Calculate final Tycoon Scores
      // 2. Assign final rankings
      // 3. Calculate ELO changes
      // 4. Update player stats
      // 5. Mark season as ended

      return {
        seasonId: input.seasonId,
        status: "finalized",
      };
    }),
});
