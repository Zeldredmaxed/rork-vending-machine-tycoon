/**
 * Tests for VendFX Compliance Engine
 *
 * Tests geo-blocking, KYC requirements, spending limits,
 * self-exclusion, and compliance check orchestration.
 */

import { describe, it, expect } from "vitest";
import {
  isStateRestricted,
  getRestrictedStates,
  checkGeoCompliance,
  checkKycRequirement,
  RESTRICTED_STATES,
  KYC_THRESHOLDS,
  DEFAULT_LIMITS,
  MAX_LIMITS,
} from "./compliance";
import { getDataRetentionPolicy } from "./gdpr";

// ============================================================================
// GEO-BLOCKING TESTS
// ============================================================================

describe("Geo-Blocking", () => {
  it("should identify all 12 restricted states", () => {
    const states = getRestrictedStates();
    expect(states.length).toBe(12);
  });

  it("should return true for restricted states", () => {
    expect(isStateRestricted("WA")).toBe(true);
    expect(isStateRestricted("ID")).toBe(true);
    expect(isStateRestricted("MT")).toBe(true);
    expect(isStateRestricted("SC")).toBe(true);
    expect(isStateRestricted("CT")).toBe(true);
  });

  it("should return false for allowed states", () => {
    expect(isStateRestricted("CA")).toBe(false);
    expect(isStateRestricted("NY")).toBe(false);
    expect(isStateRestricted("TX")).toBe(false);
    expect(isStateRestricted("FL")).toBe(false);
  });

  it("should be case-insensitive for state codes", () => {
    expect(isStateRestricted("wa")).toBe(true);
    expect(isStateRestricted("Wa")).toBe(true);
    expect(isStateRestricted("WA")).toBe(true);
  });

  it("should return compliance result for restricted state", () => {
    const result = checkGeoCompliance("WA");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("Washington");
  });

  it("should return compliance result for allowed state", () => {
    const result = checkGeoCompliance("CA");
    expect(result.allowed).toBe(true);
  });

  it("should require state verification for null state code", () => {
    const result = checkGeoCompliance(null);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("State verification required");
  });

  it("should have all restricted states with full names", () => {
    const expectedStates = ["WA", "ID", "MT", "SC", "CT", "AZ", "AR", "LA", "DE", "SD", "TN", "WI"];
    for (const code of expectedStates) {
      expect(RESTRICTED_STATES[code]).toBeDefined();
      expect(typeof RESTRICTED_STATES[code]).toBe("string");
    }
  });
});

// ============================================================================
// KYC REQUIREMENT TESTS
// ============================================================================

describe("KYC Requirements", () => {
  it("should have correct threshold values", () => {
    expect(KYC_THRESHOLDS.withdrawalRequiresKyc).toBe(0);
    expect(KYC_THRESHOLDS.maxDepositsWithoutKyc).toBe(2000);
    expect(KYC_THRESHOLDS.maxSingleDepositWithoutKyc).toBe(500);
    expect(KYC_THRESHOLDS.seasonEntryKycThreshold).toBe(50);
  });

  it("should require KYC for any withdrawal", () => {
    const result = checkKycRequirement("notStarted", "withdraw", 10);
    expect(result.kycRequired).toBe(true);
    expect(result.allowed).toBe(false);
  });

  it("should require KYC for deposits over $500", () => {
    const result = checkKycRequirement("notStarted", "deposit", 600);
    expect(result.kycRequired).toBe(true);
    expect(result.allowed).toBe(false);
  });

  it("should not require KYC for small deposits under $500", () => {
    const result = checkKycRequirement("notStarted", "deposit", 100);
    expect(result.kycRequired).toBe(false);
    expect(result.allowed).toBe(true);
  });

  it("should not require KYC if already verified", () => {
    const result = checkKycRequirement("verified", "withdraw", 100);
    expect(result.kycRequired).toBe(false);
    expect(result.allowed).toBe(true);
  });

  it("should block if KYC is pending", () => {
    const result = checkKycRequirement("pending", "withdraw", 100);
    expect(result.kycRequired).toBe(true);
    expect(result.allowed).toBe(false);
  });
});

// ============================================================================
// SPENDING LIMITS TESTS
// ============================================================================

describe("Spending Limits", () => {
  it("should have default limits as null (no limit by default)", () => {
    expect(DEFAULT_LIMITS.daily).toBeNull();
    expect(DEFAULT_LIMITS.weekly).toBeNull();
    expect(DEFAULT_LIMITS.monthly).toBeNull();
  });

  it("should have max limits defined as positive numbers", () => {
    expect(MAX_LIMITS.daily).toBe(10000);
    expect(MAX_LIMITS.weekly).toBe(50000);
    expect(MAX_LIMITS.monthly).toBe(100000);
  });

  it("should enforce max limits are positive", () => {
    expect(MAX_LIMITS.daily).toBeGreaterThan(0);
    expect(MAX_LIMITS.weekly).toBeGreaterThan(0);
    expect(MAX_LIMITS.monthly).toBeGreaterThan(0);
  });

  it("should have weekly limit greater than daily", () => {
    expect(MAX_LIMITS.weekly).toBeGreaterThan(MAX_LIMITS.daily);
  });

  it("should have monthly limit greater than weekly", () => {
    expect(MAX_LIMITS.monthly).toBeGreaterThan(MAX_LIMITS.weekly);
  });
});

// ============================================================================
// GDPR DATA RETENTION POLICY TESTS
// ============================================================================

describe("GDPR Data Retention Policy", () => {
  it("should return all data categories", () => {
    const policy = getDataRetentionPolicy();
    expect(policy.categories.length).toBeGreaterThanOrEqual(6);
  });

  it("should mark financial transactions as non-deletable", () => {
    const policy = getDataRetentionPolicy();
    const financial = policy.categories.find(
      (c) => c.category === "Financial Transactions"
    );
    expect(financial).toBeDefined();
    expect(financial?.deletable).toBe(false);
    expect(financial?.retentionPeriod).toContain("7 years");
  });

  it("should mark game data as deletable", () => {
    const policy = getDataRetentionPolicy();
    const gameData = policy.categories.find(
      (c) => c.category.includes("Game Data")
    );
    expect(gameData).toBeDefined();
    expect(gameData?.deletable).toBe(true);
  });

  it("should mark KYC documents as deletable", () => {
    const policy = getDataRetentionPolicy();
    const kyc = policy.categories.find(
      (c) => c.category === "KYC Documents"
    );
    expect(kyc).toBeDefined();
    expect(kyc?.deletable).toBe(true);
  });

  it("should have a reason for each category", () => {
    const policy = getDataRetentionPolicy();
    for (const category of policy.categories) {
      expect(category.reason).toBeTruthy();
      expect(category.retentionPeriod).toBeTruthy();
    }
  });
});

// ============================================================================
// RESTRICTED STATES COMPREHENSIVE
// ============================================================================

describe("Restricted States Map", () => {
  it("should contain exactly 12 restricted states", () => {
    const keys = Object.keys(RESTRICTED_STATES);
    expect(keys.length).toBe(12);
  });

  it("should have all state codes as 2-letter uppercase", () => {
    for (const code of Object.keys(RESTRICTED_STATES)) {
      expect(code).toMatch(/^[A-Z]{2}$/);
    }
  });

  it("should have non-empty state names", () => {
    for (const name of Object.values(RESTRICTED_STATES)) {
      expect(name.length).toBeGreaterThan(0);
    }
  });
});
