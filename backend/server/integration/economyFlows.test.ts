/**
 * Integration Tests: Economy Flows
 * ==================================
 * End-to-end tests for the dual-wallet economy, ELO matchmaking,
 * season lifecycle with payouts, and player marketplace trading.
 */

import { describe, expect, it } from "vitest";
import {
  calculateTycoonScore,
  calculateEloChange,
  getExpectedWinProbability,
  calculatePayouts,
  calculateHouseRake,
  checkSpendingLimits,
} from "../gameLogic";
import {
  BRACKET_TIERS,
  getBracketTier,
} from "../engines/eloMatchmaking";
import {
  MARKETPLACE_FEE_RATE,
} from "../engines/wholesaleMarket";
import {
  checkKycRequirement,
  KYC_THRESHOLDS,
  isStateRestricted,
  checkGeoCompliance,
} from "../engines/compliance";

// ============================================================================
// FLOW 1: SEASON ENTRY → BRACKET ASSIGNMENT → COMPETITION → PAYOUT
// ============================================================================

describe("Flow: Season Entry → Bracket Assignment → Competition → Payout", () => {
  it("should assign correct bracket based on ELO rating", () => {
    const tiers = [
      { elo: 800, expected: "bronze" },
      { elo: 999, expected: "bronze" },
      { elo: 1000, expected: "silver" },
      { elo: 1199, expected: "silver" },
      { elo: 1200, expected: "gold" },
      { elo: 1399, expected: "gold" },
      { elo: 1400, expected: "platinum" },
      { elo: 1599, expected: "platinum" },
      { elo: 1600, expected: "diamond" },
      { elo: 1799, expected: "diamond" },
      { elo: 1800, expected: "champion" },
      { elo: 2500, expected: "champion" },
    ];

    for (const t of tiers) {
      const tier = getBracketTier(t.elo);
      expect(tier.name).toBe(t.expected);
    }
  });

  it("should calculate entry fee multiplier scaling with bracket tier", () => {
    const multipliers = BRACKET_TIERS.map((t) => t.entryFeeMultiplier);
    // Each tier should have equal or higher entry fee
    for (let i = 1; i < multipliers.length; i++) {
      expect(multipliers[i]).toBeGreaterThanOrEqual(multipliers[i - 1]);
    }
  });

  it("should calculate prize pool multiplier scaling with bracket tier", () => {
    const multipliers = BRACKET_TIERS.map((t) => t.prizePoolMultiplier);
    for (let i = 1; i < multipliers.length; i++) {
      expect(multipliers[i]).toBeGreaterThanOrEqual(multipliers[i - 1]);
    }
  });

  it("should simulate full season with 10 players and distribute payouts", () => {
    const entryFee = 100;
    const playerCount = 10;
    const totalPrizePool = entryFee * playerCount; // $1000

    // Create rankings based on tycoon scores
    const rankings = Array.from({ length: playerCount }, (_, i) => ({
      rank: i + 1,
      tycoonScore: 100 - i * 8, // Descending scores
    }));

    const payouts = calculatePayouts(totalPrizePool, rankings);
    const houseRake = calculateHouseRake(totalPrizePool);

    // House rake should be 15%
    expect(houseRake).toBe(150);

    // Top 40% (4 players) should receive payouts
    const winnersCount = Math.ceil(playerCount * 0.4);
    expect(winnersCount).toBe(4);

    // Verify winners get payouts
    let totalDistributed = 0;
    for (let rank = 1; rank <= playerCount; rank++) {
      const payout = payouts.get(rank) || 0;
      if (rank <= winnersCount) {
        expect(payout).toBeGreaterThan(0);
      }
      totalDistributed += payout;
    }

    // Total distributed should be positive
    expect(totalDistributed).toBeGreaterThan(0);
  });

  it("should give rank 1 the largest payout (exponential distribution)", () => {
    const payouts = calculatePayouts(10000, [
      { rank: 1, tycoonScore: 95 },
      { rank: 2, tycoonScore: 88 },
      { rank: 3, tycoonScore: 80 },
      { rank: 4, tycoonScore: 72 },
      { rank: 5, tycoonScore: 65 },
      { rank: 6, tycoonScore: 58 },
      { rank: 7, tycoonScore: 50 },
      { rank: 8, tycoonScore: 42 },
      { rank: 9, tycoonScore: 35 },
      { rank: 10, tycoonScore: 28 },
    ]);

    const rank1 = payouts.get(1) || 0;
    const rank2 = payouts.get(2) || 0;
    const rank3 = payouts.get(3) || 0;
    const rank4 = payouts.get(4) || 0;

    expect(rank1).toBeGreaterThan(rank2);
    expect(rank2).toBeGreaterThan(rank3);
    expect(rank3).toBeGreaterThan(rank4);
  });

  it("should handle minimum season (2 players)", () => {
    const payouts = calculatePayouts(200, [
      { rank: 1, tycoonScore: 80 },
      { rank: 2, tycoonScore: 60 },
    ]);

    // With 2 players, top 40% = 1 winner
    const rank1 = payouts.get(1) || 0;
    expect(rank1).toBeGreaterThan(0);
  });

  it("should handle large season (100 players)", () => {
    const rankings = Array.from({ length: 100 }, (_, i) => ({
      rank: i + 1,
      tycoonScore: 100 - i,
    }));

    const payouts = calculatePayouts(100 * 50, rankings);
    const winnersCount = Math.ceil(100 * 0.4); // 40 winners

    let winnerCount = 0;
    payouts.forEach((amount) => {
      if (amount > 0) winnerCount++;
    });

    expect(winnerCount).toBe(winnersCount);
  });
});

// ============================================================================
// FLOW 2: ELO RATING CHANGES ACROSS MULTIPLE SEASONS
// ============================================================================

describe("Flow: ELO Rating Changes Across Multiple Seasons", () => {
  it("should increase ELO for winning against equal opponent", () => {
    const change = calculateEloChange(1200, 1200, true);
    expect(change).toBeGreaterThan(0);
    expect(change).toBe(16); // K/2 for 50/50 match
  });

  it("should decrease ELO for losing against equal opponent", () => {
    const change = calculateEloChange(1200, 1200, false);
    expect(change).toBeLessThan(0);
    expect(change).toBe(-16);
  });

  it("should give bigger ELO gain for upset wins (beating higher-rated)", () => {
    const upsetWin = calculateEloChange(1000, 1400, true);
    const normalWin = calculateEloChange(1200, 1200, true);

    expect(upsetWin).toBeGreaterThan(normalWin);
  });

  it("should give smaller ELO loss for expected losses (losing to higher-rated)", () => {
    const expectedLoss = calculateEloChange(1000, 1400, false);
    const normalLoss = calculateEloChange(1200, 1200, false);

    // Expected loss should be less negative (smaller magnitude)
    expect(Math.abs(expectedLoss)).toBeLessThan(Math.abs(normalLoss));
  });

  it("should simulate multi-season ELO progression for a winning player", () => {
    let elo = 1200; // Starting ELO
    const opponents = [1200, 1250, 1300, 1350, 1400]; // Progressively harder

    for (const oppElo of opponents) {
      const change = calculateEloChange(elo, oppElo, true); // Win all
      elo += change;
    }

    // After 5 wins against increasingly tough opponents, should be well above start
    expect(elo).toBeGreaterThan(1280);
  });

  it("should simulate multi-season ELO decline for a losing player", () => {
    let elo = 1400;
    const opponents = [1200, 1200, 1200, 1200, 1200];

    for (const oppElo of opponents) {
      const change = calculateEloChange(elo, oppElo, false);
      elo += change;
    }

    // After 5 losses to lower-rated, should drop significantly
    expect(elo).toBeLessThan(1300);
  });

  it("should converge to expected win probability", () => {
    // Equal players should have ~50% win probability
    const equal = getExpectedWinProbability(1200, 1200);
    expect(equal).toBeCloseTo(0.5, 2);

    // 200 ELO advantage should give ~75% win probability
    const advantage = getExpectedWinProbability(1400, 1200);
    expect(advantage).toBeGreaterThan(0.7);
    expect(advantage).toBeLessThan(0.8);

    // 400 ELO advantage should give ~90% win probability
    const bigAdvantage = getExpectedWinProbability(1600, 1200);
    expect(bigAdvantage).toBeGreaterThan(0.88);
    expect(bigAdvantage).toBeLessThan(0.95);
  });

  it("should be zero-sum: winner gain + loser loss = 0", () => {
    const winnerChange = calculateEloChange(1300, 1100, true);
    const loserChange = calculateEloChange(1100, 1300, false);

    // Due to rounding, allow ±1
    expect(Math.abs(winnerChange + loserChange)).toBeLessThanOrEqual(1);
  });

  it("should track bracket transitions as ELO changes", () => {
    // Player starts in gold, wins enough to reach platinum
    let elo = 1350; // High gold
    const tier1 = getBracketTier(elo);
    expect(tier1.name).toBe("gold");

    // Win against a platinum player
    elo += calculateEloChange(elo, 1500, true);
    // Could still be gold or now platinum
    if (elo >= 1400) {
      expect(getBracketTier(elo).name).toBe("platinum");
    }
  });
});

// ============================================================================
// FLOW 3: MARKETPLACE TRADING ECONOMICS
// ============================================================================

describe("Flow: Marketplace Trading Economics", () => {
  it("should calculate correct platform fee (5%)", () => {
    expect(MARKETPLACE_FEE_RATE).toBe(0.05);

    const salePrice = 100;
    const fee = salePrice * MARKETPLACE_FEE_RATE;
    const sellerReceives = salePrice - fee;

    expect(fee).toBe(5);
    expect(sellerReceives).toBe(95);
  });

  it("should simulate profitable trade for seller who bought wholesale", () => {
    const wholesaleCost = 1.50; // Bought at $1.50/unit
    const listingPrice = 2.00; // Listed at $2.00/unit
    const quantity = 100;

    const totalSale = listingPrice * quantity;
    const fee = totalSale * MARKETPLACE_FEE_RATE;
    const sellerReceives = totalSale - fee;
    const totalCost = wholesaleCost * quantity;
    const profit = sellerReceives - totalCost;

    expect(totalSale).toBe(200);
    expect(fee).toBe(10);
    expect(sellerReceives).toBe(190);
    expect(profit).toBe(40); // $40 profit
  });

  it("should simulate unprofitable trade when selling below cost + fees", () => {
    const wholesaleCost = 2.00;
    const listingPrice = 1.80; // Below cost
    const quantity = 50;

    const totalSale = listingPrice * quantity;
    const fee = totalSale * MARKETPLACE_FEE_RATE;
    const sellerReceives = totalSale - fee;
    const totalCost = wholesaleCost * quantity;
    const profit = sellerReceives - totalCost;

    expect(profit).toBeLessThan(0); // Loss
  });

  it("should simulate market arbitrage opportunity", () => {
    // Player buys in cheap demographic, sells in expensive one
    const cheapMarketPrice = 1.00;
    const expensiveMarketPrice = 2.50;

    const buyCost = cheapMarketPrice * 200;
    const sellRevenue = expensiveMarketPrice * 200;
    const fee = sellRevenue * MARKETPLACE_FEE_RATE;
    const netProfit = sellRevenue - fee - buyCost;

    expect(netProfit).toBeGreaterThan(0);
    // Profit margin should be substantial
    expect(netProfit / buyCost).toBeGreaterThan(1.0); // >100% ROI
  });
});

// ============================================================================
// FLOW 4: DUAL-WALLET ECONOMY RULES
// ============================================================================

describe("Flow: Dual-Wallet Economy Rules", () => {
  it("should enforce spending limits across daily/weekly/monthly", () => {
    // Player with $100 daily, $500 weekly, $2000 monthly limits
    const limits = { daily: 100, weekly: 500, monthly: 2000 };

    // Under all limits
    const ok = checkSpendingLimits(50, 200, 800, limits);
    expect(ok.allowed).toBe(true);

    // Over daily limit
    const dailyExceeded = checkSpendingLimits(150, 200, 800, limits);
    expect(dailyExceeded.allowed).toBe(false);
    expect(dailyExceeded.reason).toContain("Daily");

    // Over weekly limit
    const weeklyExceeded = checkSpendingLimits(50, 600, 800, limits);
    expect(weeklyExceeded.allowed).toBe(false);
    expect(weeklyExceeded.reason).toContain("Weekly");

    // Over monthly limit
    const monthlyExceeded = checkSpendingLimits(50, 200, 2500, limits);
    expect(monthlyExceeded.allowed).toBe(false);
    expect(monthlyExceeded.reason).toContain("Monthly");
  });

  it("should allow unlimited spending when no limits set", () => {
    const noLimits = {};
    const result = checkSpendingLimits(99999, 99999, 99999, noLimits);
    expect(result.allowed).toBe(true);
  });

  it("should enforce KYC for withdrawals regardless of amount", () => {
    const result = checkKycRequirement(null, "withdraw", 1);
    expect(result.allowed).toBe(false);
    expect(result.kycRequired).toBe(true);
  });

  it("should allow small deposits without KYC", () => {
    const result = checkKycRequirement(null, "deposit", 100);
    expect(result.allowed).toBe(true);
    expect(result.kycRequired).toBe(false);
  });

  it("should block large deposits without KYC", () => {
    const result = checkKycRequirement(null, "deposit", 1000);
    expect(result.allowed).toBe(false);
    expect(result.kycRequired).toBe(true);
  });

  it("should allow all operations with verified KYC", () => {
    const deposit = checkKycRequirement("verified", "deposit", 10000);
    const withdraw = checkKycRequirement("verified", "withdraw", 5000);
    const season = checkKycRequirement("verified", "season_entry", 200);

    expect(deposit.allowed).toBe(true);
    expect(withdraw.allowed).toBe(true);
    expect(season.allowed).toBe(true);
  });

  it("should simulate full deposit → play → withdraw lifecycle", () => {
    // Step 1: Player deposits $500 (no KYC needed for amounts ≤ $500)
    const depositCheck = checkKycRequirement(null, "deposit", 500);
    expect(depositCheck.allowed).toBe(true);

    // Step 2: Player enters season ($50 entry, no KYC needed for ≤ $50)
    const seasonCheck = checkKycRequirement(null, "season_entry", 50);
    expect(seasonCheck.allowed).toBe(true);

    // Step 3: Player wins $200, tries to withdraw
    const withdrawCheck = checkKycRequirement(null, "withdraw", 200);
    expect(withdrawCheck.allowed).toBe(false); // Must verify KYC first

    // Step 4: After KYC verification
    const withdrawAfterKyc = checkKycRequirement("verified", "withdraw", 200);
    expect(withdrawAfterKyc.allowed).toBe(true);
  });
});

// ============================================================================
// FLOW 5: SEASON PAYOUT EDGE CASES
// ============================================================================

describe("Flow: Season Payout Edge Cases", () => {
  it("should handle single-player season", () => {
    const payouts = calculatePayouts(100, [
      { rank: 1, tycoonScore: 50 },
    ]);

    const rank1 = payouts.get(1) || 0;
    expect(rank1).toBeGreaterThan(0);
  });

  it("should handle very large prize pool ($1M)", () => {
    const rankings = Array.from({ length: 50 }, (_, i) => ({
      rank: i + 1,
      tycoonScore: 100 - i * 2,
    }));

    const payouts = calculatePayouts(1000000, rankings);
    const houseRake = calculateHouseRake(1000000);

    expect(houseRake).toBe(150000);

    // Top player should get a significant share
    const topPayout = payouts.get(1) || 0;
    expect(topPayout).toBeGreaterThan(10000);
  });

  it("should handle tied tycoon scores (same rank)", () => {
    const payouts = calculatePayouts(1000, [
      { rank: 1, tycoonScore: 80 },
      { rank: 2, tycoonScore: 80 }, // Tied
      { rank: 3, tycoonScore: 60 },
      { rank: 4, tycoonScore: 40 },
      { rank: 5, tycoonScore: 20 },
    ]);

    // Both tied players should get payouts (top 40% = 2 winners)
    const rank1 = payouts.get(1) || 0;
    const rank2 = payouts.get(2) || 0;

    expect(rank1).toBeGreaterThan(0);
    expect(rank2).toBeGreaterThan(0);
  });

  it("should ensure house rake is always exactly 15%", () => {
    const pools = [100, 500, 1000, 5000, 10000, 100000];
    for (const pool of pools) {
      const rake = calculateHouseRake(pool);
      expect(rake).toBeCloseTo(pool * 0.15, 2);
    }
  });
});
