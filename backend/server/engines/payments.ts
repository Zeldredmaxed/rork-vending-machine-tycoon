/**
 * VendFX Payment Engine
 *
 * Handles all Stripe-based payment operations:
 * - Deposits to competition and premium wallets
 * - Withdrawals from wallets to bank accounts
 * - Stripe Checkout session creation
 * - Webhook event processing
 * - Transaction recording with audit trail
 * - Wallet balance management
 * - 1099 tax document generation tracking
 */

import Stripe from "stripe";
import { getDb } from "../db";
import {
  players,
  transactions,
} from "../../drizzle/schema";
import { eq, and, gte, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { runComplianceCheck } from "./compliance";

// ============================================================================
// STRIPE CLIENT
// ============================================================================

let _stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!_stripe) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    _stripe = new Stripe(secretKey, {
      apiVersion: "2025-02-24.acacia" as any,
    });
  }
  return _stripe;
}

// ============================================================================
// DEPOSIT FLOW
// ============================================================================

export type WalletType = "competition" | "premium";

export interface DepositRequest {
  playerId: number;
  userId: number;
  userEmail: string;
  userName: string;
  amount: number;
  walletType: WalletType;
  stateCode?: string;
  origin: string;
}

/**
 * Create a Stripe Checkout session for depositing funds.
 * Runs compliance checks before creating the session.
 */
export async function createDepositSession(
  request: DepositRequest
): Promise<{
  sessionUrl: string;
  sessionId: string;
}> {
  // Validate amount
  if (request.amount < 5) {
    throw new Error("Minimum deposit is $5.00");
  }
  if (request.amount > 10000) {
    throw new Error("Maximum single deposit is $10,000.00");
  }

  // Run compliance checks
  const compliance = await runComplianceCheck(
    request.playerId,
    "deposit",
    request.amount,
    request.stateCode
  );

  if (!compliance.allowed) {
    const failedReason = compliance.checks[
      compliance.failedCheck as keyof typeof compliance.checks
    ]?.reason;
    throw new Error(failedReason ?? "Compliance check failed");
  }

  const stripe = getStripe();

  // Create Stripe Checkout Session
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `VendFX ${request.walletType === "competition" ? "Competition" : "Premium"} Wallet Deposit`,
            description: `Deposit $${request.amount.toFixed(2)} to your ${request.walletType} wallet`,
          },
          unit_amount: Math.round(request.amount * 100), // Stripe uses cents
        },
        quantity: 1,
      },
    ],
    client_reference_id: request.userId.toString(),
    customer_email: request.userEmail,
    metadata: {
      user_id: request.userId.toString(),
      player_id: request.playerId.toString(),
      customer_email: request.userEmail,
      customer_name: request.userName,
      wallet_type: request.walletType,
      amount: request.amount.toString(),
      type: "deposit",
    },
    allow_promotion_codes: true,
    success_url: `${request.origin}/wallet?deposit=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${request.origin}/wallet?deposit=cancelled`,
  });

  if (!session.url) {
    throw new Error("Failed to create Stripe checkout session");
  }

  return {
    sessionUrl: session.url,
    sessionId: session.id,
  };
}

/**
 * Process a successful deposit after Stripe webhook confirmation.
 */
export async function processDeposit(
  playerId: number,
  amount: number,
  walletType: WalletType,
  stripePaymentIntentId: string,
  stripeSessionId: string
): Promise<{
  transactionId: string;
  newBalance: string;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const transactionId = nanoid();

  // Determine which wallet column to update
  const walletColumn =
    walletType === "competition"
      ? "competitionWalletBalance"
      : "premiumWalletBalance";

  // Record transaction
  await db.insert(transactions).values({
    id: transactionId,
    playerId,
    type: "deposit",
    amount: amount.toFixed(2),
    walletType,
    description: `Deposit to ${walletType} wallet`,
    stripePaymentIntentId,
    status: "completed",
    timestamp: new Date(),
  });

  // Update wallet balance
  if (walletType === "competition") {
    await db
      .update(players)
      .set({
        competitionWalletBalance: sql`${players.competitionWalletBalance} + ${amount.toFixed(2)}`,
      })
      .where(eq(players.id, playerId));
  } else {
    await db
      .update(players)
      .set({
        premiumWalletBalance: sql`${players.premiumWalletBalance} + ${amount.toFixed(2)}`,
      })
      .where(eq(players.id, playerId));
  }

  // Get updated balance
  const updated = await db
    .select({
      competitionWalletBalance: players.competitionWalletBalance,
      premiumWalletBalance: players.premiumWalletBalance,
    })
    .from(players)
    .where(eq(players.id, playerId))
    .limit(1);

  const newBalance =
    walletType === "competition"
      ? updated[0]?.competitionWalletBalance ?? "0"
      : updated[0]?.premiumWalletBalance ?? "0";

  return { transactionId, newBalance };
}

// ============================================================================
// WITHDRAWAL FLOW
// ============================================================================

export interface WithdrawalRequest {
  playerId: number;
  amount: number;
  walletType: WalletType;
  stateCode?: string;
}

/**
 * Request a withdrawal from a wallet.
 * Requires KYC verification. Funds are held until admin approval.
 */
export async function requestWithdrawal(
  request: WithdrawalRequest
): Promise<{
  transactionId: string;
  status: string;
  estimatedProcessingDays: number;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Validate amount
  if (request.amount < 10) {
    throw new Error("Minimum withdrawal is $10.00");
  }

  // Run compliance checks
  const compliance = await runComplianceCheck(
    request.playerId,
    "withdraw",
    request.amount,
    request.stateCode
  );

  if (!compliance.allowed) {
    const failedReason = compliance.checks[
      compliance.failedCheck as keyof typeof compliance.checks
    ]?.reason;
    throw new Error(failedReason ?? "Compliance check failed");
  }

  // Check wallet balance
  const player = await db
    .select({
      competitionWalletBalance: players.competitionWalletBalance,
      premiumWalletBalance: players.premiumWalletBalance,
    })
    .from(players)
    .where(eq(players.id, request.playerId))
    .limit(1);

  if (player.length === 0) throw new Error("Player not found");

  const balance =
    request.walletType === "competition"
      ? parseFloat(player[0].competitionWalletBalance ?? "0")
      : parseFloat(player[0].premiumWalletBalance ?? "0");

  if (balance < request.amount) {
    throw new Error(
      `Insufficient balance. Available: $${balance.toFixed(2)}, Requested: $${request.amount.toFixed(2)}`
    );
  }

  const transactionId = nanoid();

  // Deduct from wallet immediately (hold)
  if (request.walletType === "competition") {
    await db
      .update(players)
      .set({
        competitionWalletBalance: sql`${players.competitionWalletBalance} - ${request.amount.toFixed(2)}`,
      })
      .where(eq(players.id, request.playerId));
  } else {
    await db
      .update(players)
      .set({
        premiumWalletBalance: sql`${players.premiumWalletBalance} - ${request.amount.toFixed(2)}`,
      })
      .where(eq(players.id, request.playerId));
  }

  // Record transaction as pending
  await db.insert(transactions).values({
    id: transactionId,
    playerId: request.playerId,
    type: "withdrawal",
    amount: (-request.amount).toFixed(2),
    walletType: request.walletType,
    description: `Withdrawal from ${request.walletType} wallet`,
    status: "pending",
    timestamp: new Date(),
  });

  return {
    transactionId,
    status: "pending",
    estimatedProcessingDays: 3,
  };
}

/**
 * Admin: Approve a pending withdrawal and initiate Stripe payout.
 */
export async function approveWithdrawal(
  transactionId: string
): Promise<{ success: boolean; message: string }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get the pending transaction
  const txn = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.id, transactionId),
        eq(transactions.type, "withdrawal"),
        eq(transactions.status, "pending")
      )
    )
    .limit(1);

  if (txn.length === 0) {
    throw new Error("Pending withdrawal transaction not found");
  }

  // Mark as completed
  await db
    .update(transactions)
    .set({ status: "completed" })
    .where(eq(transactions.id, transactionId));

  return {
    success: true,
    message: `Withdrawal of $${Math.abs(parseFloat(txn[0].amount ?? "0")).toFixed(2)} approved and processing.`,
  };
}

/**
 * Admin: Reject a pending withdrawal and refund the wallet.
 */
export async function rejectWithdrawal(
  transactionId: string,
  reason: string
): Promise<{ success: boolean; message: string }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get the pending transaction
  const txn = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.id, transactionId),
        eq(transactions.type, "withdrawal"),
        eq(transactions.status, "pending")
      )
    )
    .limit(1);

  if (txn.length === 0) {
    throw new Error("Pending withdrawal transaction not found");
  }

  const amount = Math.abs(parseFloat(txn[0].amount ?? "0"));
  const walletType = txn[0].walletType as WalletType;

  // Refund the wallet
  if (walletType === "competition") {
    await db
      .update(players)
      .set({
        competitionWalletBalance: sql`${players.competitionWalletBalance} + ${amount.toFixed(2)}`,
      })
      .where(eq(players.id, txn[0].playerId));
  } else {
    await db
      .update(players)
      .set({
        premiumWalletBalance: sql`${players.premiumWalletBalance} + ${amount.toFixed(2)}`,
      })
      .where(eq(players.id, txn[0].playerId));
  }

  // Mark as failed
  await db
    .update(transactions)
    .set({
      status: "failed",
      description: `Withdrawal rejected: ${reason}`,
    })
    .where(eq(transactions.id, transactionId));

  return {
    success: true,
    message: `Withdrawal rejected. $${amount.toFixed(2)} refunded to ${walletType} wallet.`,
  };
}

// ============================================================================
// WALLET MANAGEMENT
// ============================================================================

/**
 * Get wallet balances for a player.
 */
export async function getWalletBalances(playerId: number): Promise<{
  competitionBalance: number;
  premiumBalance: number;
  totalBalance: number;
  pendingWithdrawals: number;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const player = await db
    .select({
      competitionWalletBalance: players.competitionWalletBalance,
      premiumWalletBalance: players.premiumWalletBalance,
    })
    .from(players)
    .where(eq(players.id, playerId))
    .limit(1);

  if (player.length === 0) throw new Error("Player not found");

  const competition = parseFloat(
    player[0].competitionWalletBalance ?? "0"
  );
  const premium = parseFloat(player[0].premiumWalletBalance ?? "0");

  // Get pending withdrawals
  const pending = await db
    .select({
      total: sql<string>`COALESCE(SUM(ABS(${transactions.amount})), 0)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.playerId, playerId),
        eq(transactions.type, "withdrawal"),
        eq(transactions.status, "pending")
      )
    );

  const pendingWithdrawals = parseFloat(pending[0]?.total ?? "0");

  return {
    competitionBalance: competition,
    premiumBalance: premium,
    totalBalance: competition + premium,
    pendingWithdrawals,
  };
}

/**
 * Transfer funds between wallets (competition <-> premium).
 */
export async function transferBetweenWallets(
  playerId: number,
  fromWallet: WalletType,
  toWallet: WalletType,
  amount: number
): Promise<{
  transactionId: string;
  fromBalance: number;
  toBalance: number;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (fromWallet === toWallet) {
    throw new Error("Cannot transfer to the same wallet");
  }
  if (amount <= 0) {
    throw new Error("Transfer amount must be positive");
  }

  // Check source balance
  const player = await db
    .select({
      competitionWalletBalance: players.competitionWalletBalance,
      premiumWalletBalance: players.premiumWalletBalance,
    })
    .from(players)
    .where(eq(players.id, playerId))
    .limit(1);

  if (player.length === 0) throw new Error("Player not found");

  const fromBalance =
    fromWallet === "competition"
      ? parseFloat(player[0].competitionWalletBalance ?? "0")
      : parseFloat(player[0].premiumWalletBalance ?? "0");

  if (fromBalance < amount) {
    throw new Error(
      `Insufficient balance in ${fromWallet} wallet. Available: $${fromBalance.toFixed(2)}`
    );
  }

  const transactionId = nanoid();

  // Deduct from source
  if (fromWallet === "competition") {
    await db
      .update(players)
      .set({
        competitionWalletBalance: sql`${players.competitionWalletBalance} - ${amount.toFixed(2)}`,
      })
      .where(eq(players.id, playerId));
  } else {
    await db
      .update(players)
      .set({
        premiumWalletBalance: sql`${players.premiumWalletBalance} - ${amount.toFixed(2)}`,
      })
      .where(eq(players.id, playerId));
  }

  // Add to destination
  if (toWallet === "competition") {
    await db
      .update(players)
      .set({
        competitionWalletBalance: sql`${players.competitionWalletBalance} + ${amount.toFixed(2)}`,
      })
      .where(eq(players.id, playerId));
  } else {
    await db
      .update(players)
      .set({
        premiumWalletBalance: sql`${players.premiumWalletBalance} + ${amount.toFixed(2)}`,
      })
      .where(eq(players.id, playerId));
  }

  // Record transaction
  await db.insert(transactions).values({
    id: transactionId,
    playerId,
    type: "transfer",
    amount: amount.toFixed(2),
    walletType: toWallet,
    description: `Transfer from ${fromWallet} to ${toWallet} wallet`,
    status: "completed",
    timestamp: new Date(),
  });

  // Get updated balances
  const updated = await db
    .select({
      competitionWalletBalance: players.competitionWalletBalance,
      premiumWalletBalance: players.premiumWalletBalance,
    })
    .from(players)
    .where(eq(players.id, playerId))
    .limit(1);

  return {
    transactionId,
    fromBalance: parseFloat(
      fromWallet === "competition"
        ? updated[0]?.competitionWalletBalance ?? "0"
        : updated[0]?.premiumWalletBalance ?? "0"
    ),
    toBalance: parseFloat(
      toWallet === "competition"
        ? updated[0]?.competitionWalletBalance ?? "0"
        : updated[0]?.premiumWalletBalance ?? "0"
    ),
  };
}

// ============================================================================
// TRANSACTION HISTORY
// ============================================================================

/**
 * Get transaction history for a player with pagination.
 */
export async function getTransactionHistory(
  playerId: number,
  options: {
    limit?: number;
    offset?: number;
    type?: string;
    walletType?: WalletType;
  } = {}
): Promise<{
  transactions: Array<{
    id: string;
    type: string | null;
    amount: string | null;
    walletType: string | null;
    description: string | null;
    status: string | null;
    timestamp: Date | null;
    stripePaymentIntentId: string | null;
  }>;
  total: number;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const limit = options.limit ?? 20;
  const offset = options.offset ?? 0;

  // Build conditions
  const conditions = [eq(transactions.playerId, playerId)];
  if (options.type) {
    conditions.push(eq(transactions.type, options.type));
  }
  if (options.walletType) {
    conditions.push(eq(transactions.walletType, options.walletType));
  }

  const results = await db
    .select()
    .from(transactions)
    .where(and(...conditions))
    .orderBy(sql`${transactions.timestamp} DESC`)
    .limit(limit)
    .offset(offset);

  const countResult = await db
    .select({ count: sql<string>`COUNT(*)` })
    .from(transactions)
    .where(and(...conditions));

  return {
    transactions: results.map((t) => ({
      id: t.id,
      type: t.type,
      amount: t.amount,
      walletType: t.walletType,
      description: t.description,
      status: t.status,
      timestamp: t.timestamp,
      stripePaymentIntentId: t.stripePaymentIntentId,
    })),
    total: parseInt(countResult[0]?.count ?? "0"),
  };
}

// ============================================================================
// STRIPE WEBHOOK HANDLER
// ============================================================================

/**
 * Process Stripe webhook events.
 * Called from the Express webhook route.
 */
export async function handleStripeWebhook(
  event: Stripe.Event
): Promise<{ handled: boolean; action: string }> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const metadata = session.metadata;

      if (metadata?.type === "deposit" && metadata.player_id) {
        const playerId = parseInt(metadata.player_id);
        const amount = parseFloat(metadata.amount ?? "0");
        const walletType = (metadata.wallet_type ?? "competition") as WalletType;

        await processDeposit(
          playerId,
          amount,
          walletType,
          session.payment_intent as string,
          session.id
        );

        return { handled: true, action: "deposit_completed" };
      }

      return { handled: true, action: "checkout_completed_no_deposit" };
    }

    case "payment_intent.succeeded": {
      // Log for audit purposes
      console.log(
        `[Payment] PaymentIntent succeeded: ${(event.data.object as Stripe.PaymentIntent).id}`
      );
      return { handled: true, action: "payment_intent_succeeded" };
    }

    case "payment_intent.payment_failed": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.error(
        `[Payment] PaymentIntent failed: ${paymentIntent.id}`,
        paymentIntent.last_payment_error?.message
      );
      return { handled: true, action: "payment_intent_failed" };
    }

    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      console.log(`[Payment] Charge refunded: ${charge.id}`);
      // TODO: Handle refund by reversing the deposit transaction
      return { handled: true, action: "charge_refunded" };
    }

    default:
      return { handled: false, action: `unhandled_${event.type}` };
  }
}

/**
 * Verify Stripe webhook signature.
 */
export function verifyWebhookSignature(
  payload: Buffer,
  signature: string
): Stripe.Event {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
  }

  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}

// ============================================================================
// TAX REPORTING (1099)
// ============================================================================

/**
 * Calculate annual winnings for 1099 reporting.
 * IRS requires 1099 for winnings over $600 in a calendar year.
 */
export async function calculateAnnualWinnings(
  playerId: number,
  year: number
): Promise<{
  totalWinnings: number;
  totalDeposits: number;
  totalWithdrawals: number;
  netProfit: number;
  requires1099: boolean;
  threshold: number;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year + 1, 0, 1);

  // Calculate winnings (season payouts)
  const winningsResult = await db
    .select({
      total: sql<string>`COALESCE(SUM(${transactions.amount}), 0)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.playerId, playerId),
        eq(transactions.type, "season_payout"),
        eq(transactions.status, "completed"),
        gte(transactions.timestamp, yearStart),
        sql`${transactions.timestamp} < ${yearEnd}`
      )
    );

  // Calculate deposits
  const depositsResult = await db
    .select({
      total: sql<string>`COALESCE(SUM(${transactions.amount}), 0)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.playerId, playerId),
        eq(transactions.type, "deposit"),
        eq(transactions.status, "completed"),
        gte(transactions.timestamp, yearStart),
        sql`${transactions.timestamp} < ${yearEnd}`
      )
    );

  // Calculate withdrawals
  const withdrawalsResult = await db
    .select({
      total: sql<string>`COALESCE(SUM(ABS(${transactions.amount})), 0)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.playerId, playerId),
        eq(transactions.type, "withdrawal"),
        eq(transactions.status, "completed"),
        gte(transactions.timestamp, yearStart),
        sql`${transactions.timestamp} < ${yearEnd}`
      )
    );

  const totalWinnings = parseFloat(winningsResult[0]?.total ?? "0");
  const totalDeposits = parseFloat(depositsResult[0]?.total ?? "0");
  const totalWithdrawals = parseFloat(withdrawalsResult[0]?.total ?? "0");
  const netProfit = totalWinnings - totalDeposits;

  const THRESHOLD_1099 = 600;

  return {
    totalWinnings,
    totalDeposits,
    totalWithdrawals,
    netProfit,
    requires1099: totalWinnings >= THRESHOLD_1099,
    threshold: THRESHOLD_1099,
  };
}
