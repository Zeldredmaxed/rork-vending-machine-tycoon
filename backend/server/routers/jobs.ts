/**
 * Cron Jobs Admin Router
 *
 * Provides admin-only endpoints for monitoring and managing
 * the VendFX cron job scheduler.
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  getJobStatus,
  triggerJob,
  setJobEnabled,
  getJobNames,
} from "../jobs/scheduler";

// Admin guard middleware
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin access required",
    });
  }
  return next({ ctx });
});

export const jobsRouter = router({
  /**
   * List all registered cron jobs with their status and health info.
   */
  list: adminProcedure.query(() => {
    return getJobStatus();
  }),

  /**
   * Get the names of all registered jobs.
   */
  names: adminProcedure.query(() => {
    return getJobNames();
  }),

  /**
   * Manually trigger a specific job to run immediately.
   */
  trigger: adminProcedure
    .input(
      z.object({
        jobName: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      const result = await triggerJob(input.jobName);
      if (!result.success) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: result.message,
        });
      }
      return result;
    }),

  /**
   * Enable or disable a specific job.
   */
  setEnabled: adminProcedure
    .input(
      z.object({
        jobName: z.string().min(1),
        enabled: z.boolean(),
      })
    )
    .mutation(({ input }) => {
      const result = setJobEnabled(input.jobName, input.enabled);
      if (!result.success) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: result.message,
        });
      }
      return result;
    }),

  /**
   * Get a summary of scheduler health.
   */
  health: adminProcedure.query(() => {
    const jobs = getJobStatus();
    const totalJobs = jobs.length;
    const enabledJobs = jobs.filter((j) => j.enabled).length;
    const errorJobs = jobs.filter((j) => j.lastStatus === "error").length;
    const neverRunJobs = jobs.filter(
      (j) => j.lastStatus === "never_run"
    ).length;
    const totalRuns = jobs.reduce((sum, j) => sum + j.runCount, 0);
    const totalErrors = jobs.reduce((sum, j) => sum + j.errorCount, 0);

    return {
      totalJobs,
      enabledJobs,
      disabledJobs: totalJobs - enabledJobs,
      errorJobs,
      neverRunJobs,
      totalRuns,
      totalErrors,
      errorRate:
        totalRuns > 0
          ? Math.round((totalErrors / totalRuns) * 10000) / 100
          : 0,
      status:
        errorJobs > 0
          ? "degraded"
          : enabledJobs === totalJobs
            ? "healthy"
            : "partial",
    };
  }),
});
