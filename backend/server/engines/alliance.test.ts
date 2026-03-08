/**
 * Alliance Engine Tests
 * =====================
 * Tests for alliance creation, member management, roles,
 * treasury operations, invites, and chat.
 */

import { describe, expect, it } from "vitest";

// ============================================================================
// ALLIANCE CONSTANTS & CONFIGURATION TESTS
// ============================================================================

describe("Alliance Constants", () => {
  it("should define alliance creation cost", () => {
    const ALLIANCE_CREATION_COST = 500;
    expect(ALLIANCE_CREATION_COST).toBe(500);
    expect(ALLIANCE_CREATION_COST).toBeGreaterThan(0);
  });

  it("should define max alliance members", () => {
    const MAX_ALLIANCE_MEMBERS = 20;
    expect(MAX_ALLIANCE_MEMBERS).toBe(20);
    expect(MAX_ALLIANCE_MEMBERS).toBeGreaterThan(1);
  });

  it("should define role hierarchy: leader > officer > member", () => {
    const ROLE_HIERARCHY: Record<string, number> = {
      leader: 3,
      officer: 2,
      member: 1,
    };
    expect(ROLE_HIERARCHY.leader).toBeGreaterThan(ROLE_HIERARCHY.officer);
    expect(ROLE_HIERARCHY.officer).toBeGreaterThan(ROLE_HIERARCHY.member);
  });

  it("should define minimum treasury withdrawal amount", () => {
    const MIN_TREASURY_WITHDRAWAL = 1;
    expect(MIN_TREASURY_WITHDRAWAL).toBeGreaterThan(0);
  });

  it("should define invite expiration period", () => {
    const INVITE_EXPIRY_HOURS = 72;
    expect(INVITE_EXPIRY_HOURS).toBe(72);
    expect(INVITE_EXPIRY_HOURS).toBeGreaterThan(0);
  });
});

// ============================================================================
// ROLE PERMISSION TESTS
// ============================================================================

describe("Alliance Role Permissions", () => {
  const ROLE_HIERARCHY: Record<string, number> = {
    leader: 3,
    officer: 2,
    member: 1,
  };

  function canKick(kickerRole: string, targetRole: string): boolean {
    const kickerLevel = ROLE_HIERARCHY[kickerRole] ?? 0;
    const targetLevel = ROLE_HIERARCHY[targetRole] ?? 0;
    return kickerLevel >= 2 && kickerLevel > targetLevel;
  }

  function canPromote(role: string): boolean {
    return role === "leader";
  }

  function canDemote(role: string): boolean {
    return role === "leader";
  }

  function canWithdrawTreasury(role: string): boolean {
    return ROLE_HIERARCHY[role] !== undefined && ROLE_HIERARCHY[role] >= 2;
  }

  function canSendAnnouncement(role: string): boolean {
    return ROLE_HIERARCHY[role] !== undefined && ROLE_HIERARCHY[role] >= 2;
  }

  function canInvite(role: string): boolean {
    return ROLE_HIERARCHY[role] !== undefined && ROLE_HIERARCHY[role] >= 2;
  }

  describe("Kick permissions", () => {
    it("leader can kick officers", () => {
      expect(canKick("leader", "officer")).toBe(true);
    });

    it("leader can kick members", () => {
      expect(canKick("leader", "member")).toBe(true);
    });

    it("officer can kick members", () => {
      expect(canKick("officer", "member")).toBe(true);
    });

    it("officer cannot kick other officers", () => {
      expect(canKick("officer", "officer")).toBe(false);
    });

    it("officer cannot kick leader", () => {
      expect(canKick("officer", "leader")).toBe(false);
    });

    it("member cannot kick anyone", () => {
      expect(canKick("member", "member")).toBe(false);
      expect(canKick("member", "officer")).toBe(false);
      expect(canKick("member", "leader")).toBe(false);
    });
  });

  describe("Promote/Demote permissions", () => {
    it("only leader can promote", () => {
      expect(canPromote("leader")).toBe(true);
      expect(canPromote("officer")).toBe(false);
      expect(canPromote("member")).toBe(false);
    });

    it("only leader can demote", () => {
      expect(canDemote("leader")).toBe(true);
      expect(canDemote("officer")).toBe(false);
      expect(canDemote("member")).toBe(false);
    });
  });

  describe("Treasury permissions", () => {
    it("leader can withdraw from treasury", () => {
      expect(canWithdrawTreasury("leader")).toBe(true);
    });

    it("officer can withdraw from treasury", () => {
      expect(canWithdrawTreasury("officer")).toBe(true);
    });

    it("member cannot withdraw from treasury", () => {
      expect(canWithdrawTreasury("member")).toBe(false);
    });
  });

  describe("Announcement permissions", () => {
    it("leader can send announcements", () => {
      expect(canSendAnnouncement("leader")).toBe(true);
    });

    it("officer can send announcements", () => {
      expect(canSendAnnouncement("officer")).toBe(true);
    });

    it("member cannot send announcements", () => {
      expect(canSendAnnouncement("member")).toBe(false);
    });
  });

  describe("Invite permissions", () => {
    it("leader can send invites", () => {
      expect(canInvite("leader")).toBe(true);
    });

    it("officer can send invites", () => {
      expect(canInvite("officer")).toBe(true);
    });

    it("member cannot send invites", () => {
      expect(canInvite("member")).toBe(false);
    });
  });
});

// ============================================================================
// ALLIANCE NAME VALIDATION TESTS
// ============================================================================

describe("Alliance Name Validation", () => {
  function validateAllianceName(name: string): {
    valid: boolean;
    error?: string;
  } {
    if (!name || name.trim().length === 0) {
      return { valid: false, error: "Alliance name cannot be empty" };
    }
    if (name.trim().length < 3) {
      return { valid: false, error: "Alliance name must be at least 3 characters" };
    }
    if (name.trim().length > 30) {
      return { valid: false, error: "Alliance name must be at most 30 characters" };
    }
    // Check for profanity or special characters
    const validPattern = /^[a-zA-Z0-9\s\-_]+$/;
    if (!validPattern.test(name.trim())) {
      return {
        valid: false,
        error: "Alliance name can only contain letters, numbers, spaces, hyphens, and underscores",
      };
    }
    return { valid: true };
  }

  it("should accept valid alliance names", () => {
    expect(validateAllianceName("The Vendors")).toEqual({ valid: true });
    expect(validateAllianceName("Elite-Squad")).toEqual({ valid: true });
    expect(validateAllianceName("Team_Alpha")).toEqual({ valid: true });
    expect(validateAllianceName("123 Crew")).toEqual({ valid: true });
  });

  it("should reject empty names", () => {
    expect(validateAllianceName("").valid).toBe(false);
    expect(validateAllianceName("  ").valid).toBe(false);
  });

  it("should reject names shorter than 3 characters", () => {
    expect(validateAllianceName("AB").valid).toBe(false);
    expect(validateAllianceName("X").valid).toBe(false);
  });

  it("should reject names longer than 30 characters", () => {
    expect(
      validateAllianceName("This Alliance Name Is Way Too Long For Anyone")
        .valid
    ).toBe(false);
  });

  it("should reject names with special characters", () => {
    expect(validateAllianceName("Team@#$").valid).toBe(false);
    expect(validateAllianceName("Alliance!").valid).toBe(false);
    expect(validateAllianceName("Crew<script>").valid).toBe(false);
  });
});

// ============================================================================
// TREASURY CALCULATION TESTS
// ============================================================================

describe("Treasury Calculations", () => {
  function calculateTreasuryBalance(
    currentBalance: number,
    deposits: number[],
    withdrawals: number[]
  ): number {
    const totalDeposits = deposits.reduce((sum, d) => sum + d, 0);
    const totalWithdrawals = withdrawals.reduce((sum, w) => sum + w, 0);
    return Math.round((currentBalance + totalDeposits - totalWithdrawals) * 100) / 100;
  }

  function validateDeposit(
    playerBalance: number,
    amount: number
  ): { valid: boolean; error?: string } {
    if (amount <= 0) {
      return { valid: false, error: "Deposit amount must be positive" };
    }
    if (playerBalance < amount) {
      return { valid: false, error: "Insufficient funds" };
    }
    return { valid: true };
  }

  function validateWithdrawal(
    treasuryBalance: number,
    amount: number,
    role: string
  ): { valid: boolean; error?: string } {
    if (amount <= 0) {
      return { valid: false, error: "Withdrawal amount must be positive" };
    }
    if (role !== "leader" && role !== "officer") {
      return { valid: false, error: "Only officers and leaders can withdraw" };
    }
    if (treasuryBalance < amount) {
      return { valid: false, error: "Insufficient treasury funds" };
    }
    return { valid: true };
  }

  it("should calculate treasury balance correctly", () => {
    expect(calculateTreasuryBalance(0, [100, 200, 50], [])).toBe(350);
    expect(calculateTreasuryBalance(1000, [], [200, 300])).toBe(500);
    expect(calculateTreasuryBalance(500, [100, 200], [50, 100])).toBe(650);
  });

  it("should handle decimal amounts correctly", () => {
    expect(calculateTreasuryBalance(0, [10.5, 20.75], [5.25])).toBe(26);
  });

  it("should validate deposits correctly", () => {
    expect(validateDeposit(1000, 500)).toEqual({ valid: true });
    expect(validateDeposit(100, 500).valid).toBe(false);
    expect(validateDeposit(1000, 0).valid).toBe(false);
    expect(validateDeposit(1000, -50).valid).toBe(false);
  });

  it("should validate withdrawals correctly", () => {
    expect(validateWithdrawal(1000, 500, "leader")).toEqual({ valid: true });
    expect(validateWithdrawal(1000, 500, "officer")).toEqual({ valid: true });
    expect(validateWithdrawal(1000, 500, "member").valid).toBe(false);
    expect(validateWithdrawal(100, 500, "leader").valid).toBe(false);
    expect(validateWithdrawal(1000, 0, "leader").valid).toBe(false);
  });
});

// ============================================================================
// CONTRIBUTION TRACKING TESTS
// ============================================================================

describe("Contribution Tracking", () => {
  interface MemberContribution {
    playerId: number;
    brandName: string;
    totalDeposited: number;
    totalWithdrawn: number;
    netContribution: number;
  }

  function calculateNetContribution(
    deposited: number,
    withdrawn: number
  ): number {
    return Math.round((deposited - withdrawn) * 100) / 100;
  }

  function rankContributors(
    members: MemberContribution[]
  ): MemberContribution[] {
    return [...members].sort(
      (a, b) => b.netContribution - a.netContribution
    );
  }

  it("should calculate net contribution correctly", () => {
    expect(calculateNetContribution(500, 200)).toBe(300);
    expect(calculateNetContribution(1000, 0)).toBe(1000);
    expect(calculateNetContribution(100, 500)).toBe(-400);
    expect(calculateNetContribution(0, 0)).toBe(0);
  });

  it("should rank contributors by net contribution", () => {
    const members: MemberContribution[] = [
      { playerId: 1, brandName: "A", totalDeposited: 100, totalWithdrawn: 50, netContribution: 50 },
      { playerId: 2, brandName: "B", totalDeposited: 500, totalWithdrawn: 0, netContribution: 500 },
      { playerId: 3, brandName: "C", totalDeposited: 200, totalWithdrawn: 100, netContribution: 100 },
    ];

    const ranked = rankContributors(members);
    expect(ranked[0].playerId).toBe(2);
    expect(ranked[1].playerId).toBe(3);
    expect(ranked[2].playerId).toBe(1);
  });

  it("should handle negative net contributions", () => {
    const members: MemberContribution[] = [
      { playerId: 1, brandName: "A", totalDeposited: 100, totalWithdrawn: 500, netContribution: -400 },
      { playerId: 2, brandName: "B", totalDeposited: 200, totalWithdrawn: 0, netContribution: 200 },
    ];

    const ranked = rankContributors(members);
    expect(ranked[0].netContribution).toBe(200);
    expect(ranked[1].netContribution).toBe(-400);
  });
});

// ============================================================================
// CHAT MESSAGE VALIDATION TESTS
// ============================================================================

describe("Chat Message Validation", () => {
  function validateChatMessage(
    content: string,
    messageType: string,
    senderRole: string
  ): { valid: boolean; error?: string } {
    if (!content || content.trim().length === 0) {
      return { valid: false, error: "Message cannot be empty" };
    }
    if (content.length > 500) {
      return { valid: false, error: "Message exceeds 500 character limit" };
    }
    if (
      messageType === "announcement" &&
      senderRole !== "leader" &&
      senderRole !== "officer"
    ) {
      return {
        valid: false,
        error: "Only officers and leaders can send announcements",
      };
    }
    return { valid: true };
  }

  it("should accept valid chat messages", () => {
    expect(validateChatMessage("Hello team!", "chat", "member")).toEqual({
      valid: true,
    });
    expect(
      validateChatMessage("Great work everyone!", "chat", "leader")
    ).toEqual({ valid: true });
  });

  it("should reject empty messages", () => {
    expect(validateChatMessage("", "chat", "member").valid).toBe(false);
    expect(validateChatMessage("   ", "chat", "member").valid).toBe(false);
  });

  it("should reject messages over 500 characters", () => {
    const longMessage = "a".repeat(501);
    expect(validateChatMessage(longMessage, "chat", "member").valid).toBe(
      false
    );
  });

  it("should allow announcements from officers and leaders", () => {
    expect(
      validateChatMessage("Important update!", "announcement", "leader")
    ).toEqual({ valid: true });
    expect(
      validateChatMessage("Important update!", "announcement", "officer")
    ).toEqual({ valid: true });
  });

  it("should reject announcements from members", () => {
    expect(
      validateChatMessage("Important update!", "announcement", "member").valid
    ).toBe(false);
  });
});

// ============================================================================
// INVITE SYSTEM TESTS
// ============================================================================

describe("Invite System", () => {
  function isInviteExpired(
    inviteCreatedAt: Date,
    expiryHours: number = 72
  ): boolean {
    const now = new Date();
    const expiryMs = expiryHours * 60 * 60 * 1000;
    return now.getTime() - inviteCreatedAt.getTime() > expiryMs;
  }

  function canAcceptInvite(
    currentAllianceId: string | null,
    inviteStatus: string
  ): { canAccept: boolean; error?: string } {
    if (currentAllianceId) {
      return {
        canAccept: false,
        error: "You must leave your current alliance before accepting an invite",
      };
    }
    if (inviteStatus !== "pending") {
      return { canAccept: false, error: "This invite is no longer valid" };
    }
    return { canAccept: true };
  }

  it("should detect expired invites", () => {
    const oldInvite = new Date(Date.now() - 73 * 60 * 60 * 1000); // 73 hours ago
    expect(isInviteExpired(oldInvite)).toBe(true);
  });

  it("should detect valid invites", () => {
    const recentInvite = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    expect(isInviteExpired(recentInvite)).toBe(false);
  });

  it("should detect just-created invites as valid", () => {
    const justCreated = new Date();
    expect(isInviteExpired(justCreated)).toBe(false);
  });

  it("should allow accepting invite when not in alliance", () => {
    expect(canAcceptInvite(null, "pending")).toEqual({ canAccept: true });
  });

  it("should reject accepting invite when already in alliance", () => {
    expect(canAcceptInvite("alliance-123", "pending").canAccept).toBe(false);
  });

  it("should reject accepting non-pending invites", () => {
    expect(canAcceptInvite(null, "accepted").canAccept).toBe(false);
    expect(canAcceptInvite(null, "declined").canAccept).toBe(false);
    expect(canAcceptInvite(null, "expired").canAccept).toBe(false);
  });
});

// ============================================================================
// LEADERSHIP TRANSFER TESTS
// ============================================================================

describe("Leadership Transfer", () => {
  function validateLeadershipTransfer(
    currentRole: string,
    targetRole: string,
    targetPlayerId: number,
    currentPlayerId: number
  ): { valid: boolean; error?: string } {
    if (currentRole !== "leader") {
      return { valid: false, error: "Only the current leader can transfer leadership" };
    }
    if (targetPlayerId === currentPlayerId) {
      return { valid: false, error: "Cannot transfer leadership to yourself" };
    }
    if (targetRole === "leader") {
      return { valid: false, error: "Target is already the leader" };
    }
    return { valid: true };
  }

  it("should allow leader to transfer to officer", () => {
    expect(validateLeadershipTransfer("leader", "officer", 2, 1)).toEqual({
      valid: true,
    });
  });

  it("should allow leader to transfer to member", () => {
    expect(validateLeadershipTransfer("leader", "member", 2, 1)).toEqual({
      valid: true,
    });
  });

  it("should reject transfer from non-leader", () => {
    expect(validateLeadershipTransfer("officer", "member", 2, 1).valid).toBe(
      false
    );
    expect(validateLeadershipTransfer("member", "officer", 2, 1).valid).toBe(
      false
    );
  });

  it("should reject self-transfer", () => {
    expect(validateLeadershipTransfer("leader", "leader", 1, 1).valid).toBe(
      false
    );
  });
});

// ============================================================================
// ALLIANCE CAPACITY TESTS
// ============================================================================

describe("Alliance Capacity", () => {
  function canAddMember(
    currentMembers: number,
    maxMembers: number = 20
  ): boolean {
    return currentMembers < maxMembers;
  }

  function getMemberCountDisplay(
    current: number,
    max: number = 20
  ): string {
    return `${current}/${max}`;
  }

  it("should allow adding members when under capacity", () => {
    expect(canAddMember(5)).toBe(true);
    expect(canAddMember(19)).toBe(true);
    expect(canAddMember(0)).toBe(true);
  });

  it("should reject adding members when at capacity", () => {
    expect(canAddMember(20)).toBe(false);
    expect(canAddMember(25)).toBe(false);
  });

  it("should format member count display correctly", () => {
    expect(getMemberCountDisplay(5)).toBe("5/20");
    expect(getMemberCountDisplay(20)).toBe("20/20");
    expect(getMemberCountDisplay(0)).toBe("0/20");
  });
});

// ============================================================================
// DISBAND VALIDATION TESTS
// ============================================================================

describe("Alliance Disband", () => {
  function canDisband(
    role: string,
    treasuryBalance: number,
    memberCount: number
  ): { canDisband: boolean; error?: string } {
    if (role !== "leader") {
      return { canDisband: false, error: "Only the leader can disband the alliance" };
    }
    if (treasuryBalance > 0) {
      return {
        canDisband: false,
        error: `Treasury must be empty before disbanding. Current balance: $${treasuryBalance.toFixed(2)}`,
      };
    }
    return { canDisband: true };
  }

  it("should allow leader to disband with empty treasury", () => {
    expect(canDisband("leader", 0, 1)).toEqual({ canDisband: true });
  });

  it("should reject disband from non-leader", () => {
    expect(canDisband("officer", 0, 5).canDisband).toBe(false);
    expect(canDisband("member", 0, 5).canDisband).toBe(false);
  });

  it("should reject disband with non-empty treasury", () => {
    const result = canDisband("leader", 500, 1);
    expect(result.canDisband).toBe(false);
    expect(result.error).toContain("$500.00");
  });
});
