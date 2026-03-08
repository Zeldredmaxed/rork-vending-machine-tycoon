/**
 * Alliance Engine
 * ===============
 * Handles all alliance operations: creation, member management,
 * role-based permissions, treasury management, chat persistence,
 * and invite system.
 */

import { eq, and, desc, asc, sql, inArray, lt, isNull } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "../db";
import {
  alliances,
  allianceMembers,
  allianceMessages,
  allianceInvites,
  treasuryTransactions,
  players,
} from "../../drizzle/schema";

// ============================================================================
// CONSTANTS
// ============================================================================

/** Maximum number of members per alliance */
export const MAX_ALLIANCE_SIZE = 50;

/** Maximum alliance name length */
export const MAX_NAME_LENGTH = 30;

/** Minimum alliance name length */
export const MIN_NAME_LENGTH = 3;

/** Maximum chat message length */
export const MAX_MESSAGE_LENGTH = 500;

/** Invite expiration in hours */
export const INVITE_EXPIRY_HOURS = 72;

/** Maximum pending invites per alliance */
export const MAX_PENDING_INVITES = 20;

/** Minimum business tier to create an alliance */
export const MIN_TIER_TO_CREATE = "localOperator";

/** Alliance creation cost */
export const ALLIANCE_CREATION_COST = 5000;

/** Maximum treasury withdrawal per transaction */
export const MAX_TREASURY_WITHDRAWAL = 10000;

/** Roles in order of authority */
export const ROLE_HIERARCHY = ["member", "officer", "leader"] as const;
export type AllianceRole = (typeof ROLE_HIERARCHY)[number];

/** Role permissions */
export const ROLE_PERMISSIONS: Record<AllianceRole, string[]> = {
  member: ["chat", "view_treasury", "deposit_treasury"],
  officer: [
    "chat",
    "view_treasury",
    "deposit_treasury",
    "invite_members",
    "kick_members",
    "send_announcements",
    "withdraw_treasury",
  ],
  leader: [
    "chat",
    "view_treasury",
    "deposit_treasury",
    "invite_members",
    "kick_members",
    "send_announcements",
    "withdraw_treasury",
    "promote_members",
    "demote_members",
    "disband_alliance",
    "transfer_leadership",
    "edit_alliance",
  ],
};

// ============================================================================
// PERMISSION HELPERS
// ============================================================================

/**
 * Check if a role has a specific permission.
 */
export function hasPermission(role: AllianceRole, permission: string): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Get the numeric authority level of a role (higher = more authority).
 */
export function getRoleAuthority(role: AllianceRole): number {
  return ROLE_HIERARCHY.indexOf(role);
}

/**
 * Check if roleA outranks roleB.
 */
export function outranks(roleA: AllianceRole, roleB: AllianceRole): boolean {
  return getRoleAuthority(roleA) > getRoleAuthority(roleB);
}

// ============================================================================
// ALLIANCE CREATION & MANAGEMENT
// ============================================================================

/**
 * Create a new alliance. The creator becomes the leader.
 */
export async function createAlliance(
  playerId: number,
  name: string,
  playerBrandName: string
): Promise<{
  success: boolean;
  allianceId?: string;
  error?: string;
}> {
  const db = await getDb();
  if (!db) return { success: false, error: "Database not available" };

  // Validate name
  const trimmedName = name.trim();
  if (trimmedName.length < MIN_NAME_LENGTH) {
    return { success: false, error: `Alliance name must be at least ${MIN_NAME_LENGTH} characters` };
  }
  if (trimmedName.length > MAX_NAME_LENGTH) {
    return { success: false, error: `Alliance name must be at most ${MAX_NAME_LENGTH} characters` };
  }
  if (!/^[a-zA-Z0-9\s\-_]+$/.test(trimmedName)) {
    return { success: false, error: "Alliance name can only contain letters, numbers, spaces, hyphens, and underscores" };
  }

  // Check if player is already in an alliance
  const existingMembership = await db
    .select()
    .from(allianceMembers)
    .where(eq(allianceMembers.playerId, playerId))
    .limit(1);

  if (existingMembership.length > 0) {
    return { success: false, error: "You are already in an alliance. Leave your current alliance first." };
  }

  // Check if name is taken
  const existingAlliance = await db
    .select()
    .from(alliances)
    .where(eq(alliances.name, trimmedName))
    .limit(1);

  if (existingAlliance.length > 0) {
    return { success: false, error: "An alliance with that name already exists" };
  }

  // Check player balance (deduct creation cost from competition wallet)
  const playerData = await db
    .select({ competitionWalletBalance: players.competitionWalletBalance })
    .from(players)
    .where(eq(players.userId, playerId))
    .limit(1);

  if (playerData.length === 0) {
    return { success: false, error: "Player not found" };
  }

  const balance = parseFloat(playerData[0].competitionWalletBalance ?? "0");
  if (balance < ALLIANCE_CREATION_COST) {
    return {
      success: false,
      error: `Insufficient funds. Alliance creation costs $${ALLIANCE_CREATION_COST}. Your balance: $${balance.toFixed(2)}`,
    };
  }

  // Create alliance and leader membership
  const allianceId = nanoid();
  const memberId = nanoid();

  await db.insert(alliances).values({
    id: allianceId,
    name: trimmedName,
    leaderPlayerId: playerId,
    treasuryBalance: "0",
  });

  await db.insert(allianceMembers).values({
    id: memberId,
    allianceId,
    playerId,
    role: "leader",
    isLeader: true,
    contribution: "0",
  });

  // Deduct creation cost
  await db
    .update(players)
    .set({
      competitionWalletBalance: sql`CAST(${players.competitionWalletBalance} - ${ALLIANCE_CREATION_COST} AS DECIMAL(12,2))`,
    })
    .where(eq(players.userId, playerId));

  // Add system message
  await addSystemMessage(allianceId, `${playerBrandName} founded the alliance "${trimmedName}"`);

  return { success: true, allianceId };
}

/**
 * Get alliance details including member count.
 */
export async function getAllianceDetails(allianceId: string) {
  const db = await getDb();
  if (!db) return null;

  const alliance = await db
    .select()
    .from(alliances)
    .where(eq(alliances.id, allianceId))
    .limit(1);

  if (alliance.length === 0) return null;

  const members = await db
    .select()
    .from(allianceMembers)
    .where(eq(allianceMembers.allianceId, allianceId));

  return {
    ...alliance[0],
    memberCount: members.length,
    members,
  };
}

/**
 * List all alliances with basic info, sorted by treasury balance.
 */
export async function listAlliances(limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];

  const results = await db
    .select({
      id: alliances.id,
      name: alliances.name,
      leaderPlayerId: alliances.leaderPlayerId,
      treasuryBalance: alliances.treasuryBalance,
      createdAt: alliances.createdAt,
      memberCount: sql<number>`(SELECT COUNT(*) FROM allianceMembers WHERE allianceMembers.allianceId = alliances.id)`,
    })
    .from(alliances)
    .orderBy(desc(alliances.treasuryBalance))
    .limit(limit)
    .offset(offset);

  return results;
}

/**
 * Disband an alliance. Only the leader can do this.
 */
export async function disbandAlliance(
  allianceId: string,
  playerId: number
): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: "Database not available" };

  const membership = await getMembershipWithRole(allianceId, playerId);
  if (!membership) return { success: false, error: "You are not a member of this alliance" };
  if (membership.role !== "leader") return { success: false, error: "Only the leader can disband the alliance" };

  // Check treasury balance — must be 0 or distributed first
  const alliance = await db
    .select({ treasuryBalance: alliances.treasuryBalance })
    .from(alliances)
    .where(eq(alliances.id, allianceId))
    .limit(1);

  const treasuryBalance = parseFloat(alliance[0]?.treasuryBalance ?? "0");
  if (treasuryBalance > 0) {
    return {
      success: false,
      error: `Treasury has $${treasuryBalance.toFixed(2)} remaining. Withdraw or distribute funds before disbanding.`,
    };
  }

  // Delete all related data
  await db.delete(allianceMessages).where(eq(allianceMessages.allianceId, allianceId));
  await db.delete(allianceInvites).where(eq(allianceInvites.allianceId, allianceId));
  await db.delete(treasuryTransactions).where(eq(treasuryTransactions.allianceId, allianceId));
  await db.delete(allianceMembers).where(eq(allianceMembers.allianceId, allianceId));
  await db.delete(alliances).where(eq(alliances.id, allianceId));

  return { success: true };
}

// ============================================================================
// MEMBER MANAGEMENT
// ============================================================================

/**
 * Get a player's membership and role in an alliance.
 */
export async function getMembershipWithRole(
  allianceId: string,
  playerId: number
): Promise<{ id: string; role: AllianceRole; contribution: string | null } | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select({
      id: allianceMembers.id,
      role: allianceMembers.role,
      contribution: allianceMembers.contribution,
    })
    .from(allianceMembers)
    .where(
      and(
        eq(allianceMembers.allianceId, allianceId),
        eq(allianceMembers.playerId, playerId)
      )
    )
    .limit(1);

  if (result.length === 0) return null;
  return {
    id: result[0].id,
    role: result[0].role as AllianceRole,
    contribution: result[0].contribution,
  };
}

/**
 * Get a player's current alliance (if any).
 */
export async function getPlayerAlliance(playerId: number) {
  const db = await getDb();
  if (!db) return null;

  const membership = await db
    .select({
      memberId: allianceMembers.id,
      allianceId: allianceMembers.allianceId,
      role: allianceMembers.role,
      contribution: allianceMembers.contribution,
      joinDate: allianceMembers.joinDate,
    })
    .from(allianceMembers)
    .where(eq(allianceMembers.playerId, playerId))
    .limit(1);

  if (membership.length === 0) return null;

  const alliance = await db
    .select()
    .from(alliances)
    .where(eq(alliances.id, membership[0].allianceId))
    .limit(1);

  if (alliance.length === 0) return null;

  const memberCount = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(allianceMembers)
    .where(eq(allianceMembers.allianceId, membership[0].allianceId));

  return {
    alliance: alliance[0],
    membership: membership[0],
    memberCount: memberCount[0]?.count ?? 0,
  };
}

/**
 * Get all members of an alliance with player details.
 */
export async function getAllianceMembers(allianceId: string) {
  const db = await getDb();
  if (!db) return [];

  const members = await db
    .select({
      memberId: allianceMembers.id,
      playerId: allianceMembers.playerId,
      role: allianceMembers.role,
      contribution: allianceMembers.contribution,
      joinDate: allianceMembers.joinDate,
      brandName: players.brandName,
      eloRating: players.lifetimeElo,
      tycoonScore: players.bestTycoonScore,
    })
    .from(allianceMembers)
    .innerJoin(players, eq(allianceMembers.playerId, players.userId))
    .where(eq(allianceMembers.allianceId, allianceId))
    .orderBy(
      sql`FIELD(${allianceMembers.role}, 'leader', 'officer', 'member')`,
      desc(allianceMembers.contribution)
    );

  return members;
}

/**
 * Leave an alliance. Leaders must transfer leadership first.
 */
export async function leaveAlliance(
  allianceId: string,
  playerId: number,
  playerBrandName: string
): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: "Database not available" };

  const membership = await getMembershipWithRole(allianceId, playerId);
  if (!membership) return { success: false, error: "You are not a member of this alliance" };

  if (membership.role === "leader") {
    // Check if there are other members
    const memberCount = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(allianceMembers)
      .where(eq(allianceMembers.allianceId, allianceId));

    if ((memberCount[0]?.count ?? 0) > 1) {
      return {
        success: false,
        error: "Leaders must transfer leadership before leaving. Use 'Transfer Leadership' or disband the alliance.",
      };
    }
    // Last member leaving — disband
    return disbandAlliance(allianceId, playerId);
  }

  await db
    .delete(allianceMembers)
    .where(
      and(
        eq(allianceMembers.allianceId, allianceId),
        eq(allianceMembers.playerId, playerId)
      )
    );

  await addSystemMessage(allianceId, `${playerBrandName} left the alliance`);

  return { success: true };
}

/**
 * Kick a member from the alliance. Officers can kick members; leaders can kick anyone.
 */
export async function kickMember(
  allianceId: string,
  kickerId: number,
  targetPlayerId: number,
  kickerBrandName: string,
  targetBrandName: string
): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: "Database not available" };

  if (kickerId === targetPlayerId) {
    return { success: false, error: "You cannot kick yourself. Use 'Leave Alliance' instead." };
  }

  const kickerMembership = await getMembershipWithRole(allianceId, kickerId);
  if (!kickerMembership) return { success: false, error: "You are not a member of this alliance" };
  if (!hasPermission(kickerMembership.role, "kick_members")) {
    return { success: false, error: "You do not have permission to kick members" };
  }

  const targetMembership = await getMembershipWithRole(allianceId, targetPlayerId);
  if (!targetMembership) return { success: false, error: "Target player is not a member of this alliance" };

  // Cannot kick someone of equal or higher rank
  if (!outranks(kickerMembership.role, targetMembership.role)) {
    return { success: false, error: "You cannot kick a member of equal or higher rank" };
  }

  await db
    .delete(allianceMembers)
    .where(
      and(
        eq(allianceMembers.allianceId, allianceId),
        eq(allianceMembers.playerId, targetPlayerId)
      )
    );

  await addSystemMessage(allianceId, `${targetBrandName} was kicked by ${kickerBrandName}`);

  return { success: true };
}

/**
 * Promote a member to a higher role.
 */
export async function promoteMember(
  allianceId: string,
  promoterId: number,
  targetPlayerId: number,
  targetBrandName: string
): Promise<{ success: boolean; newRole?: string; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: "Database not available" };

  const promoterMembership = await getMembershipWithRole(allianceId, promoterId);
  if (!promoterMembership) return { success: false, error: "You are not a member of this alliance" };
  if (!hasPermission(promoterMembership.role, "promote_members")) {
    return { success: false, error: "Only the leader can promote members" };
  }

  const targetMembership = await getMembershipWithRole(allianceId, targetPlayerId);
  if (!targetMembership) return { success: false, error: "Target player is not a member of this alliance" };

  const currentIdx = ROLE_HIERARCHY.indexOf(targetMembership.role);
  if (currentIdx >= ROLE_HIERARCHY.length - 2) {
    // Can only promote to officer (index 1), not to leader
    return { success: false, error: "This member is already at the highest promotable rank (officer). Use 'Transfer Leadership' to make them leader." };
  }

  const newRole = ROLE_HIERARCHY[currentIdx + 1];
  if (newRole === "leader") {
    return { success: false, error: "Cannot promote to leader. Use 'Transfer Leadership' instead." };
  }

  await db
    .update(allianceMembers)
    .set({ role: newRole })
    .where(
      and(
        eq(allianceMembers.allianceId, allianceId),
        eq(allianceMembers.playerId, targetPlayerId)
      )
    );

  await addSystemMessage(allianceId, `${targetBrandName} was promoted to ${newRole}`);

  return { success: true, newRole };
}

/**
 * Demote a member to a lower role.
 */
export async function demoteMember(
  allianceId: string,
  demoterId: number,
  targetPlayerId: number,
  targetBrandName: string
): Promise<{ success: boolean; newRole?: string; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: "Database not available" };

  const demoterMembership = await getMembershipWithRole(allianceId, demoterId);
  if (!demoterMembership) return { success: false, error: "You are not a member of this alliance" };
  if (!hasPermission(demoterMembership.role, "demote_members")) {
    return { success: false, error: "Only the leader can demote members" };
  }

  const targetMembership = await getMembershipWithRole(allianceId, targetPlayerId);
  if (!targetMembership) return { success: false, error: "Target player is not a member of this alliance" };

  const currentIdx = ROLE_HIERARCHY.indexOf(targetMembership.role);
  if (currentIdx <= 0) {
    return { success: false, error: "This member is already at the lowest rank" };
  }

  const newRole = ROLE_HIERARCHY[currentIdx - 1];

  await db
    .update(allianceMembers)
    .set({ role: newRole })
    .where(
      and(
        eq(allianceMembers.allianceId, allianceId),
        eq(allianceMembers.playerId, targetPlayerId)
      )
    );

  await addSystemMessage(allianceId, `${targetBrandName} was demoted to ${newRole}`);

  return { success: true, newRole };
}

/**
 * Transfer leadership to another member.
 */
export async function transferLeadership(
  allianceId: string,
  currentLeaderId: number,
  newLeaderId: number,
  currentLeaderBrandName: string,
  newLeaderBrandName: string
): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: "Database not available" };

  const currentMembership = await getMembershipWithRole(allianceId, currentLeaderId);
  if (!currentMembership) return { success: false, error: "You are not a member of this alliance" };
  if (currentMembership.role !== "leader") return { success: false, error: "Only the leader can transfer leadership" };

  const newLeaderMembership = await getMembershipWithRole(allianceId, newLeaderId);
  if (!newLeaderMembership) return { success: false, error: "Target player is not a member of this alliance" };

  // Promote new leader
  await db
    .update(allianceMembers)
    .set({ role: "leader", isLeader: true })
    .where(
      and(
        eq(allianceMembers.allianceId, allianceId),
        eq(allianceMembers.playerId, newLeaderId)
      )
    );

  // Demote current leader to officer
  await db
    .update(allianceMembers)
    .set({ role: "officer", isLeader: false })
    .where(
      and(
        eq(allianceMembers.allianceId, allianceId),
        eq(allianceMembers.playerId, currentLeaderId)
      )
    );

  // Update alliance leader reference
  await db
    .update(alliances)
    .set({ leaderPlayerId: newLeaderId })
    .where(eq(alliances.id, allianceId));

  await addSystemMessage(
    allianceId,
    `${currentLeaderBrandName} transferred leadership to ${newLeaderBrandName}`
  );

  return { success: true };
}

// ============================================================================
// INVITE SYSTEM
// ============================================================================

/**
 * Send an invite to a player.
 */
export async function sendInvite(
  allianceId: string,
  inviterId: number,
  inviteeId: number
): Promise<{ success: boolean; inviteId?: string; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: "Database not available" };

  // Check inviter permissions
  const inviterMembership = await getMembershipWithRole(allianceId, inviterId);
  if (!inviterMembership) return { success: false, error: "You are not a member of this alliance" };
  if (!hasPermission(inviterMembership.role, "invite_members")) {
    return { success: false, error: "You do not have permission to invite members" };
  }

  // Check alliance size
  const memberCount = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(allianceMembers)
    .where(eq(allianceMembers.allianceId, allianceId));

  if ((memberCount[0]?.count ?? 0) >= MAX_ALLIANCE_SIZE) {
    return { success: false, error: `Alliance is full (${MAX_ALLIANCE_SIZE} members maximum)` };
  }

  // Check if invitee is already in an alliance
  const existingMembership = await db
    .select()
    .from(allianceMembers)
    .where(eq(allianceMembers.playerId, inviteeId))
    .limit(1);

  if (existingMembership.length > 0) {
    return { success: false, error: "This player is already in an alliance" };
  }

  // Check for existing pending invite
  const existingInvite = await db
    .select()
    .from(allianceInvites)
    .where(
      and(
        eq(allianceInvites.allianceId, allianceId),
        eq(allianceInvites.inviteeId, inviteeId),
        eq(allianceInvites.status, "pending")
      )
    )
    .limit(1);

  if (existingInvite.length > 0) {
    return { success: false, error: "This player already has a pending invite to your alliance" };
  }

  // Check pending invite limit
  const pendingCount = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(allianceInvites)
    .where(
      and(
        eq(allianceInvites.allianceId, allianceId),
        eq(allianceInvites.status, "pending")
      )
    );

  if ((pendingCount[0]?.count ?? 0) >= MAX_PENDING_INVITES) {
    return { success: false, error: `Too many pending invites (${MAX_PENDING_INVITES} maximum). Wait for responses or cancel some.` };
  }

  const inviteId = nanoid();
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_HOURS * 60 * 60 * 1000);

  await db.insert(allianceInvites).values({
    id: inviteId,
    allianceId,
    inviterId,
    inviteeId,
    status: "pending",
    expiresAt,
  });

  return { success: true, inviteId };
}

/**
 * Accept an invite and join the alliance.
 */
export async function acceptInvite(
  inviteId: string,
  playerId: number,
  playerBrandName: string
): Promise<{ success: boolean; allianceId?: string; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: "Database not available" };

  const invite = await db
    .select()
    .from(allianceInvites)
    .where(
      and(
        eq(allianceInvites.id, inviteId),
        eq(allianceInvites.inviteeId, playerId)
      )
    )
    .limit(1);

  if (invite.length === 0) return { success: false, error: "Invite not found" };
  if (invite[0].status !== "pending") return { success: false, error: "This invite is no longer valid" };
  if (new Date(invite[0].expiresAt) < new Date()) {
    await db.update(allianceInvites).set({ status: "expired" }).where(eq(allianceInvites.id, inviteId));
    return { success: false, error: "This invite has expired" };
  }

  // Check if player is already in an alliance
  const existingMembership = await db
    .select()
    .from(allianceMembers)
    .where(eq(allianceMembers.playerId, playerId))
    .limit(1);

  if (existingMembership.length > 0) {
    return { success: false, error: "You are already in an alliance" };
  }

  // Check alliance size
  const memberCount = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(allianceMembers)
    .where(eq(allianceMembers.allianceId, invite[0].allianceId));

  if ((memberCount[0]?.count ?? 0) >= MAX_ALLIANCE_SIZE) {
    return { success: false, error: "Alliance is now full" };
  }

  // Add member
  const memberId = nanoid();
  await db.insert(allianceMembers).values({
    id: memberId,
    allianceId: invite[0].allianceId,
    playerId,
    role: "member",
    isLeader: false,
    contribution: "0",
  });

  // Update invite status
  await db.update(allianceInvites).set({ status: "accepted" }).where(eq(allianceInvites.id, inviteId));

  // Cancel other pending invites for this player
  await db
    .update(allianceInvites)
    .set({ status: "expired" })
    .where(
      and(
        eq(allianceInvites.inviteeId, playerId),
        eq(allianceInvites.status, "pending")
      )
    );

  await addSystemMessage(invite[0].allianceId, `${playerBrandName} joined the alliance`);

  return { success: true, allianceId: invite[0].allianceId };
}

/**
 * Decline an invite.
 */
export async function declineInvite(
  inviteId: string,
  playerId: number
): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: "Database not available" };

  const result = await db
    .update(allianceInvites)
    .set({ status: "declined" })
    .where(
      and(
        eq(allianceInvites.id, inviteId),
        eq(allianceInvites.inviteeId, playerId),
        eq(allianceInvites.status, "pending")
      )
    );

  return { success: true };
}

/**
 * Get pending invites for a player.
 */
export async function getPlayerInvites(playerId: number) {
  const db = await getDb();
  if (!db) return [];

  const invites = await db
    .select({
      inviteId: allianceInvites.id,
      allianceId: allianceInvites.allianceId,
      allianceName: alliances.name,
      inviterId: allianceInvites.inviterId,
      expiresAt: allianceInvites.expiresAt,
      createdAt: allianceInvites.createdAt,
    })
    .from(allianceInvites)
    .innerJoin(alliances, eq(allianceInvites.allianceId, alliances.id))
    .where(
      and(
        eq(allianceInvites.inviteeId, playerId),
        eq(allianceInvites.status, "pending")
      )
    )
    .orderBy(desc(allianceInvites.createdAt));

  // Filter out expired invites
  return invites.filter((inv) => new Date(inv.expiresAt) > new Date());
}

/**
 * Get pending invites sent by an alliance.
 */
export async function getAlliancePendingInvites(allianceId: string) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      inviteId: allianceInvites.id,
      inviteeId: allianceInvites.inviteeId,
      inviteeBrandName: players.brandName,
      inviterId: allianceInvites.inviterId,
      expiresAt: allianceInvites.expiresAt,
      createdAt: allianceInvites.createdAt,
    })
    .from(allianceInvites)
    .innerJoin(players, eq(allianceInvites.inviteeId, players.userId))
    .where(
      and(
        eq(allianceInvites.allianceId, allianceId),
        eq(allianceInvites.status, "pending")
      )
    )
    .orderBy(desc(allianceInvites.createdAt));
}

/**
 * Cancel a pending invite (by the inviter or an officer/leader).
 */
export async function cancelInvite(
  inviteId: string,
  allianceId: string,
  playerId: number
): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: "Database not available" };

  const membership = await getMembershipWithRole(allianceId, playerId);
  if (!membership) return { success: false, error: "You are not a member of this alliance" };
  if (!hasPermission(membership.role, "invite_members")) {
    return { success: false, error: "You do not have permission to manage invites" };
  }

  await db
    .update(allianceInvites)
    .set({ status: "expired" })
    .where(
      and(
        eq(allianceInvites.id, inviteId),
        eq(allianceInvites.allianceId, allianceId),
        eq(allianceInvites.status, "pending")
      )
    );

  return { success: true };
}

// ============================================================================
// TREASURY MANAGEMENT
// ============================================================================

/**
 * Deposit funds into the alliance treasury from a player's competition wallet.
 */
export async function depositToTreasury(
  allianceId: string,
  playerId: number,
  playerBrandName: string,
  amount: number,
  reason?: string
): Promise<{ success: boolean; newTreasuryBalance?: number; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: "Database not available" };

  if (amount <= 0) return { success: false, error: "Amount must be positive" };

  const membership = await getMembershipWithRole(allianceId, playerId);
  if (!membership) return { success: false, error: "You are not a member of this alliance" };
  if (!hasPermission(membership.role, "deposit_treasury")) {
    return { success: false, error: "You do not have permission to deposit" };
  }

  // Check player balance
  const playerData = await db
    .select({ competitionWalletBalance: players.competitionWalletBalance })
    .from(players)
    .where(eq(players.userId, playerId))
    .limit(1);

  const balance = parseFloat(playerData[0]?.competitionWalletBalance ?? "0");
  if (balance < amount) {
    return { success: false, error: `Insufficient funds. Your balance: $${balance.toFixed(2)}` };
  }

  // Deduct from player wallet
  await db
    .update(players)
    .set({
      competitionWalletBalance: sql`CAST(${players.competitionWalletBalance} - ${amount} AS DECIMAL(12,2))`,
    })
    .where(eq(players.userId, playerId));

  // Add to treasury
  await db
    .update(alliances)
    .set({
      treasuryBalance: sql`CAST(${alliances.treasuryBalance} + ${amount} AS DECIMAL(12,2))`,
    })
    .where(eq(alliances.id, allianceId));

  // Update member contribution
  await db
    .update(allianceMembers)
    .set({
      contribution: sql`CAST(${allianceMembers.contribution} + ${amount} AS DECIMAL(12,2))`,
    })
    .where(
      and(
        eq(allianceMembers.allianceId, allianceId),
        eq(allianceMembers.playerId, playerId)
      )
    );

  // Get new treasury balance
  const updatedAlliance = await db
    .select({ treasuryBalance: alliances.treasuryBalance })
    .from(alliances)
    .where(eq(alliances.id, allianceId))
    .limit(1);

  const newBalance = parseFloat(updatedAlliance[0]?.treasuryBalance ?? "0");

  // Record transaction
  await db.insert(treasuryTransactions).values({
    id: nanoid(),
    allianceId,
    playerId,
    playerName: playerBrandName,
    type: "deposit",
    amount: amount.toFixed(2),
    balanceAfter: newBalance.toFixed(2),
    reason: reason ?? "Treasury deposit",
  });

  await addSystemMessage(
    allianceId,
    `${playerBrandName} deposited $${amount.toFixed(2)} to the treasury`
  );

  return { success: true, newTreasuryBalance: newBalance };
}

/**
 * Withdraw funds from the alliance treasury to a player's competition wallet.
 * Only officers and leaders can withdraw.
 */
export async function withdrawFromTreasury(
  allianceId: string,
  playerId: number,
  playerBrandName: string,
  amount: number,
  reason?: string
): Promise<{ success: boolean; newTreasuryBalance?: number; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: "Database not available" };

  if (amount <= 0) return { success: false, error: "Amount must be positive" };
  if (amount > MAX_TREASURY_WITHDRAWAL) {
    return { success: false, error: `Maximum withdrawal per transaction is $${MAX_TREASURY_WITHDRAWAL}` };
  }

  const membership = await getMembershipWithRole(allianceId, playerId);
  if (!membership) return { success: false, error: "You are not a member of this alliance" };
  if (!hasPermission(membership.role, "withdraw_treasury")) {
    return { success: false, error: "You do not have permission to withdraw from the treasury" };
  }

  // Check treasury balance
  const alliance = await db
    .select({ treasuryBalance: alliances.treasuryBalance })
    .from(alliances)
    .where(eq(alliances.id, allianceId))
    .limit(1);

  const treasuryBalance = parseFloat(alliance[0]?.treasuryBalance ?? "0");
  if (treasuryBalance < amount) {
    return { success: false, error: `Insufficient treasury funds. Balance: $${treasuryBalance.toFixed(2)}` };
  }

  // Deduct from treasury
  await db
    .update(alliances)
    .set({
      treasuryBalance: sql`CAST(${alliances.treasuryBalance} - ${amount} AS DECIMAL(12,2))`,
    })
    .where(eq(alliances.id, allianceId));

  // Add to player wallet
  await db
    .update(players)
    .set({
      competitionWalletBalance: sql`CAST(${players.competitionWalletBalance} + ${amount} AS DECIMAL(12,2))`,
    })
    .where(eq(players.userId, playerId));

  // Get new treasury balance
  const updatedAlliance = await db
    .select({ treasuryBalance: alliances.treasuryBalance })
    .from(alliances)
    .where(eq(alliances.id, allianceId))
    .limit(1);

  const newBalance = parseFloat(updatedAlliance[0]?.treasuryBalance ?? "0");

  // Record transaction
  await db.insert(treasuryTransactions).values({
    id: nanoid(),
    allianceId,
    playerId,
    playerName: playerBrandName,
    type: "withdrawal",
    amount: amount.toFixed(2),
    balanceAfter: newBalance.toFixed(2),
    reason: reason ?? "Treasury withdrawal",
  });

  await addSystemMessage(
    allianceId,
    `${playerBrandName} withdrew $${amount.toFixed(2)} from the treasury`
  );

  return { success: true, newTreasuryBalance: newBalance };
}

/**
 * Get treasury transaction history.
 */
export async function getTreasuryHistory(
  allianceId: string,
  limit = 50,
  offset = 0
) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(treasuryTransactions)
    .where(eq(treasuryTransactions.allianceId, allianceId))
    .orderBy(desc(treasuryTransactions.createdAt))
    .limit(limit)
    .offset(offset);
}

/**
 * Get contribution leaderboard for an alliance.
 */
export async function getContributionLeaderboard(allianceId: string) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      playerId: allianceMembers.playerId,
      brandName: players.brandName,
      role: allianceMembers.role,
      contribution: allianceMembers.contribution,
    })
    .from(allianceMembers)
    .innerJoin(players, eq(allianceMembers.playerId, players.userId))
    .where(eq(allianceMembers.allianceId, allianceId))
    .orderBy(desc(allianceMembers.contribution));
}

// ============================================================================
// CHAT PERSISTENCE
// ============================================================================

/**
 * Send a chat message in an alliance.
 */
export async function sendChatMessage(
  allianceId: string,
  senderId: number,
  senderName: string,
  content: string,
  messageType: "chat" | "announcement" = "chat"
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: "Database not available" };

  const trimmedContent = content.trim();
  if (trimmedContent.length === 0) return { success: false, error: "Message cannot be empty" };
  if (trimmedContent.length > MAX_MESSAGE_LENGTH) {
    return { success: false, error: `Message too long (${MAX_MESSAGE_LENGTH} characters max)` };
  }

  const membership = await getMembershipWithRole(allianceId, senderId);
  if (!membership) return { success: false, error: "You are not a member of this alliance" };

  if (messageType === "announcement" && !hasPermission(membership.role, "send_announcements")) {
    return { success: false, error: "Only officers and leaders can send announcements" };
  }

  const messageId = nanoid();
  await db.insert(allianceMessages).values({
    id: messageId,
    allianceId,
    senderId,
    senderName,
    senderRole: membership.role,
    content: trimmedContent,
    messageType,
  });

  return { success: true, messageId };
}

/**
 * Get chat message history for an alliance.
 */
export async function getChatHistory(
  allianceId: string,
  limit = 50,
  beforeId?: string
) {
  const db = await getDb();
  if (!db) return [];

  let query = db
    .select()
    .from(allianceMessages)
    .where(
      and(
        eq(allianceMessages.allianceId, allianceId),
        eq(allianceMessages.isDeleted, false)
      )
    )
    .orderBy(desc(allianceMessages.createdAt))
    .limit(limit);

  const results = await query;

  // Return in chronological order
  return results.reverse();
}

/**
 * Delete a chat message. Officers+ can delete any message; members can only delete their own.
 */
export async function deleteChatMessage(
  messageId: string,
  allianceId: string,
  playerId: number
): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: "Database not available" };

  const membership = await getMembershipWithRole(allianceId, playerId);
  if (!membership) return { success: false, error: "You are not a member of this alliance" };

  const message = await db
    .select()
    .from(allianceMessages)
    .where(
      and(
        eq(allianceMessages.id, messageId),
        eq(allianceMessages.allianceId, allianceId)
      )
    )
    .limit(1);

  if (message.length === 0) return { success: false, error: "Message not found" };

  // Members can only delete their own messages
  if (message[0].senderId !== playerId && !hasPermission(membership.role, "kick_members")) {
    return { success: false, error: "You can only delete your own messages" };
  }

  await db
    .update(allianceMessages)
    .set({ isDeleted: true })
    .where(eq(allianceMessages.id, messageId));

  return { success: true };
}

/**
 * Add a system message to an alliance chat.
 */
async function addSystemMessage(allianceId: string, content: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.insert(allianceMessages).values({
    id: nanoid(),
    allianceId,
    senderId: 0, // System
    senderName: "System",
    senderRole: "leader",
    content,
    messageType: "system",
  });
}

// ============================================================================
// SEARCH & DISCOVERY
// ============================================================================

/**
 * Search alliances by name.
 */
export async function searchAlliances(query: string, limit = 20) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      id: alliances.id,
      name: alliances.name,
      leaderPlayerId: alliances.leaderPlayerId,
      treasuryBalance: alliances.treasuryBalance,
      createdAt: alliances.createdAt,
      memberCount: sql<number>`(SELECT COUNT(*) FROM allianceMembers WHERE allianceMembers.allianceId = alliances.id)`,
    })
    .from(alliances)
    .where(sql`${alliances.name} LIKE ${`%${query}%`}`)
    .orderBy(desc(alliances.treasuryBalance))
    .limit(limit);
}

/**
 * Clean up expired invites.
 */
export async function cleanupExpiredInvites(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const result = await db
    .update(allianceInvites)
    .set({ status: "expired" })
    .where(
      and(
        eq(allianceInvites.status, "pending"),
        lt(allianceInvites.expiresAt, new Date())
      )
    );

  return 0; // MySQL doesn't return affected rows easily
}
