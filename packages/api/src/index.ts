export { appRouter, type AppRouter } from "./root";
export {
  createTRPCContext,
  createTRPCRouter,
  createCallerFactory,
  publicProcedure,
  protectedProcedure,
  adminProcedure,
  scrumMasterProcedure,
  developerProcedure,
  protectedMutationProcedure,
  aiProcedure,
  enforceRateLimit,
  type Context,
} from "./trpc";
export * from "./ratelimit";
export * from "./auth-guards";

import type { inferRouterOutputs, inferRouterInputs } from "@trpc/server";
import type { AppRouter } from "./root";

export type RouterOutputs = inferRouterOutputs<AppRouter>;
export type RouterInputs = inferRouterInputs<AppRouter>;
