/**
 * Cron Job Scheduler Tests
 *
 * Tests the job registry, health tracking, manual triggering,
 * and enable/disable functionality.
 */

import { describe, expect, it, beforeEach, vi } from "vitest";

// We test the pure logic functions without starting actual cron schedules.
// The scheduler module registers jobs on import, so we test the public API.

describe("Cron Job Scheduler", () => {
  describe("Job Registry", () => {
    it("should export getJobStatus function", async () => {
      const { getJobStatus } = await import("./scheduler");
      expect(typeof getJobStatus).toBe("function");
    });

    it("should export getJobNames function", async () => {
      const { getJobNames } = await import("./scheduler");
      expect(typeof getJobNames).toBe("function");
    });

    it("should export triggerJob function", async () => {
      const { triggerJob } = await import("./scheduler");
      expect(typeof triggerJob).toBe("function");
    });

    it("should export setJobEnabled function", async () => {
      const { setJobEnabled } = await import("./scheduler");
      expect(typeof setJobEnabled).toBe("function");
    });

    it("should export initScheduler function", async () => {
      const { initScheduler } = await import("./scheduler");
      expect(typeof initScheduler).toBe("function");
    });

    it("should export stopScheduler function", async () => {
      const { stopScheduler } = await import("./scheduler");
      expect(typeof stopScheduler).toBe("function");
    });
  });

  describe("Job Health Tracking", () => {
    it("getJobStatus should return array of job records", async () => {
      const { initScheduler, getJobStatus } = await import("./scheduler");
      initScheduler();
      const status = getJobStatus();
      expect(Array.isArray(status)).toBe(true);
    });

    it("each job record should have required fields", async () => {
      const { initScheduler, getJobStatus } = await import("./scheduler");
      initScheduler();
      const status = getJobStatus();

      if (status.length > 0) {
        const job = status[0];
        expect(job).toHaveProperty("name");
        expect(job).toHaveProperty("schedule");
        expect(job).toHaveProperty("description");
        expect(job).toHaveProperty("lastRun");
        expect(job).toHaveProperty("lastDuration");
        expect(job).toHaveProperty("lastStatus");
        expect(job).toHaveProperty("lastError");
        expect(job).toHaveProperty("runCount");
        expect(job).toHaveProperty("errorCount");
        expect(job).toHaveProperty("enabled");
        // Should NOT have the task property (it's omitted)
        expect(job).not.toHaveProperty("task");
      }
    });

    it("newly registered jobs should have never_run status", async () => {
      const { initScheduler, getJobStatus } = await import("./scheduler");
      initScheduler();
      const status = getJobStatus();

      for (const job of status) {
        expect(job.lastStatus).toBe("never_run");
        expect(job.runCount).toBe(0);
        expect(job.errorCount).toBe(0);
        expect(job.lastRun).toBeNull();
        expect(job.lastDuration).toBeNull();
        expect(job.lastError).toBeNull();
      }
    });
  });

  describe("Job Names", () => {
    it("should return all registered job names", async () => {
      const { initScheduler, getJobNames } = await import("./scheduler");
      initScheduler();
      const names = getJobNames();

      expect(Array.isArray(names)).toBe(true);
      expect(names.length).toBeGreaterThan(0);

      // Check that expected jobs are registered
      expect(names).toContain("machine-status-degradation");
      expect(names).toContain("dispatch-eta-check");
      expect(names).toContain("marketplace-cleanup");
      expect(names).toContain("complaint-expiration");
      expect(names).toContain("daily-market-prices");
      expect(names).toContain("expired-inventory-purge");
      expect(names).toContain("season-lifecycle-check");
      expect(names).toContain("player-inactivity-recap");
      expect(names).toContain("location-data-cleanup");
      expect(names).toContain("market-event-expiration");
    });

    it("should have exactly 10 registered jobs", async () => {
      const { initScheduler, getJobNames } = await import("./scheduler");
      initScheduler();
      const names = getJobNames();
      expect(names.length).toBe(10);
    });
  });

  describe("Job Enable/Disable", () => {
    it("should enable a job", async () => {
      const { initScheduler, setJobEnabled, getJobStatus } = await import(
        "./scheduler"
      );
      initScheduler();

      const result = setJobEnabled("machine-status-degradation", true);
      expect(result.success).toBe(true);

      const status = getJobStatus();
      const job = status.find((j) => j.name === "machine-status-degradation");
      expect(job?.enabled).toBe(true);
    });

    it("should disable a job", async () => {
      const { initScheduler, setJobEnabled, getJobStatus } = await import(
        "./scheduler"
      );
      initScheduler();

      const result = setJobEnabled("machine-status-degradation", false);
      expect(result.success).toBe(true);

      const status = getJobStatus();
      const job = status.find((j) => j.name === "machine-status-degradation");
      expect(job?.enabled).toBe(false);
    });

    it("should fail for non-existent job", async () => {
      const { initScheduler, setJobEnabled } = await import("./scheduler");
      initScheduler();

      const result = setJobEnabled("non-existent-job", true);
      expect(result.success).toBe(false);
      expect(result.message).toContain("not found");
    });
  });

  describe("Manual Job Triggering", () => {
    it("should fail for non-existent job", async () => {
      const { initScheduler, triggerJob } = await import("./scheduler");
      initScheduler();

      const result = await triggerJob("non-existent-job");
      expect(result.success).toBe(false);
      expect(result.message).toContain("not found");
    });

    // Note: We don't test actual job execution here because it requires
    // a live database connection. Those are integration tests.
  });

  describe("Scheduler Lifecycle", () => {
    it("should initialize without throwing", async () => {
      const { initScheduler } = await import("./scheduler");
      expect(() => initScheduler()).not.toThrow();
    });

    it("should stop without throwing", async () => {
      const { initScheduler, stopScheduler } = await import("./scheduler");
      initScheduler();
      expect(() => stopScheduler()).not.toThrow();
    });
  });

  describe("Job Schedules", () => {
    it("all jobs should have valid cron expressions", async () => {
      const { initScheduler, getJobStatus } = await import("./scheduler");
      initScheduler();
      const status = getJobStatus();

      for (const job of status) {
        expect(job.schedule).toBeTruthy();
        // Basic cron format validation: should have 6 space-separated fields
        const fields = job.schedule.split(" ");
        expect(fields.length).toBe(6);
      }
    });

    it("all jobs should have descriptions", async () => {
      const { initScheduler, getJobStatus } = await import("./scheduler");
      initScheduler();
      const status = getJobStatus();

      for (const job of status) {
        expect(job.description).toBeTruthy();
        expect(job.description.length).toBeGreaterThan(10);
      }
    });
  });
});

describe("Job Schedule Correctness", () => {
  it("machine-status-degradation runs every 5 minutes", async () => {
    const { initScheduler, getJobStatus } = await import("./scheduler");
    initScheduler();
    const status = getJobStatus();
    const job = status.find((j) => j.name === "machine-status-degradation");
    expect(job?.schedule).toBe("0 */5 * * * *");
  });

  it("dispatch-eta-check runs every 15 minutes", async () => {
    const { initScheduler, getJobStatus } = await import("./scheduler");
    initScheduler();
    const status = getJobStatus();
    const job = status.find((j) => j.name === "dispatch-eta-check");
    expect(job?.schedule).toBe("0 */15 * * * *");
  });

  it("marketplace-cleanup runs every hour", async () => {
    const { initScheduler, getJobStatus } = await import("./scheduler");
    initScheduler();
    const status = getJobStatus();
    const job = status.find((j) => j.name === "marketplace-cleanup");
    expect(job?.schedule).toBe("0 0 * * * *");
  });

  it("daily-market-prices runs at 3 AM", async () => {
    const { initScheduler, getJobStatus } = await import("./scheduler");
    initScheduler();
    const status = getJobStatus();
    const job = status.find((j) => j.name === "daily-market-prices");
    expect(job?.schedule).toBe("0 0 3 * * *");
  });

  it("season-lifecycle-check runs at 5 AM", async () => {
    const { initScheduler, getJobStatus } = await import("./scheduler");
    initScheduler();
    const status = getJobStatus();
    const job = status.find((j) => j.name === "season-lifecycle-check");
    expect(job?.schedule).toBe("0 0 5 * * *");
  });

  it("location-data-cleanup runs weekly on Sunday at 2 AM", async () => {
    const { initScheduler, getJobStatus } = await import("./scheduler");
    initScheduler();
    const status = getJobStatus();
    const job = status.find((j) => j.name === "location-data-cleanup");
    expect(job?.schedule).toBe("0 0 2 * * 0");
  });
});
