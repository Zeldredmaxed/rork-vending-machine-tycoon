import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { playersRouter } from "./routers/players";
import { seasonsRouter } from "./routers/seasons";
import { hrRouter } from "./routers/hr";
import { fleetRouter } from "./routers/fleet";
import { marketRouter } from "./routers/market";
import { marketplaceRouter } from "./routers/marketplace";
import { realtimeRouter } from "./routers/realtime";
import { jobsRouter } from "./routers/jobs";
import { paymentsRouter } from "./routers/payments";
import { complianceRouter } from "./routers/compliance";
import { allianceRouter } from "./routers/alliance";
import { powerupsRouter } from "./routers/powerups";
import { worldMapRouter } from "./routers/worldMap";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Game feature routers
  players: playersRouter,
  seasons: seasonsRouter,
  hr: hrRouter,
  fleet: fleetRouter,
  market: marketRouter,
  marketplace: marketplaceRouter,
  realtime: realtimeRouter,
  jobs: jobsRouter,
  payments: paymentsRouter,
  compliance: complianceRouter,
  alliance: allianceRouter,
  powerups: powerupsRouter,
  worldMap: worldMapRouter,
});

export type AppRouter = typeof appRouter;
