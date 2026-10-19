import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { SprintStatus, WorkItemStatus } from "@centraxis/db";
import {
  createTRPCRouter,
  protectedProcedure,
  scrumMasterProcedure,
  developerProcedure,
} from "../trpc";

export const sprintRouter = createTRPCRouter({
  /**
   * List all sprints in project with story point calculations
   */
  list: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        status: z.nativeEnum(SprintStatus).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const sprints = await ctx.db.sprint.findMany({
        where: {
          projectId: input.projectId,
          ...(input.status ? { status: input.status } : {}),
        },
        include: {
          team: {
            select: { id: true, name: true },
          },
          workItems: {
            select: {
              id: true,
              status: true,
              storyPoints: true,
            },
          },
        },
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      });

      return sprints.map((sprint) => {
        const totalPoints = sprint.workItems.reduce(
          (acc, item) => acc + (item.storyPoints ?? 0),
          0,
        );
        const completedPoints = sprint.workItems
          .filter((item) => item.status === WorkItemStatus.DONE)
          .reduce((acc, item) => acc + (item.storyPoints ?? 0), 0);

        return {
          ...sprint,
          metrics: {
            totalItems: sprint.workItems.length,
            completedItems: sprint.workItems.filter(
              (item) => item.status === WorkItemStatus.DONE,
            ).length,
            totalPoints,
            completedPoints,
          },
        };
      });
    }),

  /**
   * Get the active sprint for a project
   */
  getActive: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const sprint = await ctx.db.sprint.findFirst({
        where: {
          projectId: input.projectId,
          status: SprintStatus.ACTIVE,
        },
        include: {
          team: {
            select: { id: true, name: true },
          },
          workItems: {
            include: {
              assignee: {
                select: { id: true, name: true, image: true },
              },
            },
            orderBy: { rankOrder: "asc" },
          },
        },
      });

      return sprint;
    }),

  /**
   * Create a new sprint in PLANNED status
   */
  create: scrumMasterProcedure
    .input(
      z.object({
        projectId: z.string(),
        name: z.string().min(2, "Sprint name must be at least 2 characters"),
        goal: z.string().optional(),
        startDate: z.coerce.date().optional(),
        endDate: z.coerce.date().optional(),
        teamId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.sprint.create({
        data: {
          name: input.name,
          goal: input.goal,
          startDate: input.startDate,
          endDate: input.endDate,
          projectId: input.projectId,
          teamId: input.teamId,
          status: SprintStatus.PLANNED,
        },
      });
    }),

  /**
   * Alias for create to support createSprint caller
   */
  createSprint: scrumMasterProcedure
    .input(
      z.object({
        projectId: z.string(),
        name: z.string().min(2, "Sprint name must be at least 2 characters"),
        goal: z.string().optional(),
        startDate: z.coerce.date().optional(),
        endDate: z.coerce.date().optional(),
        teamId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.sprint.create({
        data: {
          name: input.name,
          goal: input.goal,
          startDate: input.startDate,
          endDate: input.endDate,
          projectId: input.projectId,
          teamId: input.teamId,
          status: SprintStatus.PLANNED,
        },
      });
    }),

  /**
   * Update sprint details
   */
  updateSprint: scrumMasterProcedure
    .input(
      z.object({
        sprintId: z.string(),
        name: z.string().min(2, "Sprint name must be at least 2 characters").optional(),
        goal: z.string().nullable().optional(),
        startDate: z.coerce.date().nullable().optional(),
        endDate: z.coerce.date().nullable().optional(),
        teamId: z.string().nullable().optional(),
        status: z.nativeEnum(SprintStatus).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { sprintId, ...data } = input;
      return ctx.db.sprint.update({
        where: { id: sprintId },
        data,
      });
    }),

  update: scrumMasterProcedure
    .input(
      z.object({
        sprintId: z.string(),
        name: z.string().min(2, "Sprint name must be at least 2 characters").optional(),
        goal: z.string().nullable().optional(),
        startDate: z.coerce.date().nullable().optional(),
        endDate: z.coerce.date().nullable().optional(),
        teamId: z.string().nullable().optional(),
        status: z.nativeEnum(SprintStatus).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { sprintId, ...data } = input;
      return ctx.db.sprint.update({
        where: { id: sprintId },
        data,
      });
    }),

  /**
   * Start a planned sprint
   */
  start: scrumMasterProcedure
    .input(
      z.object({
        sprintId: z.string(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const sprint = await ctx.db.sprint.findUnique({
        where: { id: input.sprintId },
        include: { project: true },
      });

      if (!sprint) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Sprint not found.",
        });
      }

      if (sprint.status !== SprintStatus.PLANNED) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot start a sprint that is already ${sprint.status}.`,
        });
      }

      // Check for any currently active sprint in the same project
      const existingActive = await ctx.db.sprint.findFirst({
        where: {
          projectId: sprint.projectId,
          status: SprintStatus.ACTIVE,
        },
      });

      if (existingActive) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Sprint "${existingActive.name}" is already active. Complete it before starting a new sprint.`,
        });
      }

      const now = new Date();
      const startDate = input.startDate ?? now;
      const durationDays = sprint.project.defaultSprintDurationDays || 14;
      const endDate =
        input.endDate ??
        new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

      return ctx.db.sprint.update({
        where: { id: input.sprintId },
        data: {
          status: SprintStatus.ACTIVE,
          startDate,
          endDate,
        },
      });
    }),

  /**
   * Complete active sprint and roll over unfinished items
   */
  complete: scrumMasterProcedure
    .input(
      z.object({
        sprintId: z.string(),
        targetSprintId: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const sprint = await ctx.db.sprint.findUnique({
        where: { id: input.sprintId },
        include: {
          workItems: true,
        },
      });

      if (!sprint) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Sprint not found.",
        });
      }

      if (sprint.status !== SprintStatus.ACTIVE) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only ACTIVE sprints can be completed.",
        });
      }

      // Identify unfinished work items
      const incompleteItemIds = sprint.workItems
        .filter((item) => item.status !== WorkItemStatus.DONE)
        .map((item) => item.id);

      // Execute sprint completion and item rollover in a transaction
      return ctx.db.$transaction(async (tx) => {
        if (incompleteItemIds.length > 0) {
          await tx.workItem.updateMany({
            where: { id: { in: incompleteItemIds } },
            data: {
              sprintId: input.targetSprintId ?? null,
            },
          });
        }

        const completedSprint = await tx.sprint.update({
          where: { id: input.sprintId },
          data: {
            status: SprintStatus.COMPLETED,
          },
        });

        return {
          sprint: completedSprint,
          rolledOverCount: incompleteItemIds.length,
          targetDestination: input.targetSprintId ? "next_sprint" : "backlog",
        };
      });
    }),

  /**
   * Batch assign items to a sprint or backlog
   */
  moveItemsToSprint: developerProcedure
    .input(
      z.object({
        sprintId: z.string().nullable(),
        itemIds: z.array(z.string()).min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.workItem.updateMany({
        where: { id: { in: input.itemIds } },
        data: {
          sprintId: input.sprintId,
        },
      });
    }),
});
