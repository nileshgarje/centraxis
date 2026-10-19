import { createTRPCRouter } from "./trpc";
import { projectRouter } from "./routers/project";
import { backlogRouter } from "./routers/backlog";
import { sprintRouter } from "./routers/sprint";
import { boardRouter } from "./routers/board";
import { aiRouter } from "./routers/ai";
import { metricsRouter } from "./routers/metrics";

export const appRouter = createTRPCRouter({
  project: projectRouter,
  backlog: backlogRouter,
  sprint: sprintRouter,
  board: boardRouter,
  ai: aiRouter,
  metrics: metricsRouter,
});

export type AppRouter = typeof appRouter;
