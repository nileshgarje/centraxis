import { createTRPCRouter } from "./trpc";
import { orgRouter } from "./routers/org";
import { projectRouter } from "./routers/project";
import { teamRouter } from "./routers/team";
import { backlogRouter } from "./routers/backlog";
import { sprintRouter } from "./routers/sprint";
import { boardRouter } from "./routers/board";
import { aiRouter } from "./routers/ai";
import { metricsRouter } from "./routers/metrics";

import { clientRouter } from "./routers/client";
import { workItemRouter } from "./routers/work-item";
import { commentRouter } from "./routers/comment";
import { notificationRouter } from "./routers/notification";
import { workflowRouter } from "./routers/workflow";

export const appRouter = createTRPCRouter({
  org: orgRouter,
  clients: clientRouter,
  project: projectRouter,
  team: teamRouter,
  backlog: backlogRouter,
  workItem: workItemRouter,
  comment: commentRouter,
  notification: notificationRouter,
  sprint: sprintRouter,
  board: boardRouter,
  ai: aiRouter,
  metrics: metricsRouter,
  workflow: workflowRouter,
});

export type AppRouter = typeof appRouter;
