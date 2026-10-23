import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import type { Session, UserTeamMembership } from "@centraxis/auth";
import { db, TeamRole } from "@centraxis/db";
import { checkRateLimit, type RateLimitTier } from "./ratelimit";

/**
 * 1. CONTEXT
 * Defines the inner context for all tRPC procedures.
 */
export interface CreateContextOptions {
  headers: Headers;
  session: Session | null;
}

export const createTRPCContext = async (opts: CreateContextOptions) => {
  return {
    db,
    session: opts.session,
    headers: opts.headers,
  };
};

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;

/**
 * 2. INITIALIZATION
 * Initialize tRPC with SuperJSON transformer and Zod error formatting.
 */
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

/**
 * 3. ROUTER & CALLER
 */
export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;

/**
 * 4. PROCEDURES & MIDDLEWARES
 */

/**
 * Public procedure accessible without session.
 */
export const publicProcedure = t.procedure;

/**
 * Protected procedure: requires an active authenticated session.
 */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session || !ctx.session.user || !ctx.session.user.id) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be signed in to perform this action.",
    });
  }

  return next({
    ctx: {
      session: {
        ...ctx.session,
        user: ctx.session.user,
      },
    },
  });
});

/**
 * Admin procedure: requires Organization Admin privileges.
 */
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  const user = ctx.session.user;
  if (user.role !== TeamRole.ORG_ADMIN) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Requires Organization Administrator privileges.",
    });
  }

  return next({ ctx });
});

/**
 * System Admin procedure: requires System Admin global role or Org Admin role.
 */
export const systemAdminProcedure = protectedProcedure.use(({ ctx, next }) => {
  const user = ctx.session.user;
  const isSysAdmin =
    user.globalRole === "SYSTEM_ADMIN" || user.role === TeamRole.ORG_ADMIN;
  if (!isSysAdmin) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Requires System Administrator privileges.",
    });
  }

  return next({ ctx });
});

/**
 * Scrum Master procedure: requires Scrum Master or Org Admin role.
 */
export const scrumMasterProcedure = protectedProcedure.use(({ ctx, next }) => {
  const user = ctx.session.user;
  const isGlobalLead =
    user.globalRole === "SYSTEM_ADMIN" ||
    user.role === TeamRole.ORG_ADMIN ||
    user.role === TeamRole.SCRUM_MASTER;
  const isSquadLead = (
    user.memberships as UserTeamMembership[] | undefined
  )?.some(
    (m: UserTeamMembership) =>
      m.role === TeamRole.SCRUM_MASTER || m.role === TeamRole.ORG_ADMIN,
  );

  if (!isGlobalLead && !isSquadLead) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "Requires Scrum Master or Organization Administrator privileges.",
    });
  }

  return next({ ctx });
});

/**
 * Reusable rate limiting middleware factory
 */
export const enforceRateLimit = (tier: RateLimitTier) =>
  t.middleware(async ({ ctx, next }) => {
    const forwarded = ctx.headers?.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0]?.trim() : "127.0.0.1";
    const identifier = ctx.session?.user?.id || ip || "127.0.0.1";

    const result = await checkRateLimit(tier, identifier);
    if (!result.success) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: "Rate limit exceeded. Please wait before making more requests.",
      });
    }

    return next();
  });

/**
 * Developer procedure: allows developers, scrum masters, and admins to contribute.
 * Rate limited to 60 requests per minute.
 */
export const developerProcedure = protectedProcedure
  .use(enforceRateLimit("mutation"))
  .use(({ ctx, next }) => {
    const user = ctx.session.user;
    const isViewerOnly =
      user.role === TeamRole.VIEWER &&
      !(user.memberships as UserTeamMembership[] | undefined)?.some(
        (m: UserTeamMembership) => m.role !== TeamRole.VIEWER,
      );

    if (isViewerOnly) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Read-only accounts cannot modify agile project records.",
      });
    }

    return next({ ctx });
  });

/**
 * Protected mutation procedure: rate limited to 60 requests per minute.
 */
export const protectedMutationProcedure = protectedProcedure.use(
  enforceRateLimit("mutation"),
);

/**
 * AI generation procedure: rate limited to 10 requests per minute.
 */
export const aiProcedure = protectedProcedure.use(enforceRateLimit("ai"));

