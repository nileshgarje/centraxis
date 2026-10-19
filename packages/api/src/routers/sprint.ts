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
   * Get sprint completion summary, incomplete items, and rollover destinations
   */
  getSprintSummary: protectedProcedure
    .input(z.object({ sprintId: z.string() }))
    .query(async ({ ctx, input }) => {
      const sprint = await ctx.db.sprint.findUnique({
        where: { id: input.sprintId },
        include: {
          project: { select: { id: true, name: true, key: true } },
          team: { select: { id: true, name: true } },
          workItems: {
            include: {
              assignee: { select: { id: true, name: true, image: true } },
              children: { select: { id: true, title: true, status: true } },
            },
            orderBy: { rankOrder: "asc" },
          },
        },
      });

      if (!sprint) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Sprint not found.",
        });
      }

      const completedItems = sprint.workItems.filter(
        (i) => i.status === WorkItemStatus.DONE,
      );
      const incompleteItems = sprint.workItems.filter(
        (i) => i.status !== WorkItemStatus.DONE,
      );

      const totalPoints = sprint.workItems.reduce(
        (sum, i) => sum + (i.storyPoints ?? 0),
        0,
      );
      const completedPoints = completedItems.reduce(
        (sum, i) => sum + (i.storyPoints ?? 0),
        0,
      );
      const incompletePoints = incompleteItems.reduce(
        (sum, i) => sum + (i.storyPoints ?? 0),
        0,
      );

      // Parent items where some child tasks are done
      const partialItems = incompleteItems.filter((item) =>
        item.children?.some((c) => c.status === WorkItemStatus.DONE),
      );

      // Find PLANNED sprints for rollover
      const plannedSprints = await ctx.db.sprint.findMany({
        where: {
          projectId: sprint.projectId,
          status: SprintStatus.PLANNED,
          id: { not: sprint.id },
          ...(sprint.teamId ? { teamId: sprint.teamId } : {}),
        },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          startDate: true,
          endDate: true,
        },
      });

      const nextPlannedSprint = plannedSprints[0] ?? null;

      // Suggest next sprint name
      const sprintNumberMatch = sprint.name.match(/\d+$/);
      const nextNumber = sprintNumberMatch
        ? parseInt(sprintNumberMatch[0], 10) + 1
        : plannedSprints.length + 2;
      const suggestedNewSprintName = sprint.team?.name
        ? `${sprint.team.name} Sprint ${nextNumber}`
        : `${sprint.project.name} Sprint ${nextNumber}`;

      return {
        sprint: {
          id: sprint.id,
          name: sprint.name,
          goal: sprint.goal,
          status: sprint.status,
          startDate: sprint.startDate,
          endDate: sprint.endDate,
          projectId: sprint.projectId,
          teamId: sprint.teamId,
          projectName: sprint.project.name,
        },
        metrics: {
          totalItems: sprint.workItems.length,
          completedCount: completedItems.length,
          incompleteCount: incompleteItems.length,
          totalPoints,
          completedPoints,
          incompletePoints,
          burnedPercentage:
            totalPoints > 0
              ? Math.round((completedPoints / totalPoints) * 100)
              : 100,
        },
        completedItems: completedItems.map((i) => ({
          id: i.id,
          key: i.key,
          title: i.title,
          type: i.type,
          storyPoints: i.storyPoints,
        })),
        incompleteItems: incompleteItems.map((i) => ({
          id: i.id,
          key: i.key,
          title: i.title,
          type: i.type,
          status: i.status,
          storyPoints: i.storyPoints,
          doneSubtasksCount:
            i.children?.filter((c) => c.status === WorkItemStatus.DONE)
              .length ?? 0,
          totalSubtasksCount: i.children?.length ?? 0,
        })),
        hasPartialItems: partialItems.length > 0,
        plannedSprints,
        nextPlannedSprint,
        suggestedNewSprintName,
      };
    }),

  /**
   * Complete active sprint, snapshot metrics, and execute automated rollover
   */
  completeSprint: scrumMasterProcedure
    .input(
      z.object({
        sprintId: z.string(),
        targetAction: z.enum([
          "MOVE_TO_NEXT_SPRINT",
          "MOVE_TO_BACKLOG",
          "NEW_SPRINT",
        ]),
        targetSprintId: z.string().nullable().optional(),
        newSprintName: z.string().optional(),
        retainDoneSubtasks: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const sprint = await ctx.db.sprint.findUnique({
        where: { id: input.sprintId },
        include: {
          workItems: true,
          project: true,
          team: true,
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
          message: `Cannot complete sprint with status "${sprint.status}". Only ACTIVE sprints can be completed.`,
        });
      }

      const completedItems = sprint.workItems.filter(
        (item) => item.status === WorkItemStatus.DONE,
      );
      const incompleteItems = sprint.workItems.filter(
        (item) => item.status !== WorkItemStatus.DONE,
      );

      const totalCommittedPoints = sprint.workItems.reduce(
        (acc, item) => acc + (item.storyPoints ?? 0),
        0,
      );
      const totalBurnedPoints = completedItems.reduce(
        (acc, item) => acc + (item.storyPoints ?? 0),
        0,
      );

      return ctx.db.$transaction(async (tx) => {
        let destinationSprintId: string | null = null;
        let destinationName = "Backlog";

        // 1. Determine rollover destination
        if (input.targetAction === "NEW_SPRINT") {
          const newSprint = await tx.sprint.create({
            data: {
              name: input.newSprintName || `${sprint.name} (Next)`,
              projectId: sprint.projectId,
              teamId: sprint.teamId,
              status: SprintStatus.PLANNED,
            },
          });
          destinationSprintId = newSprint.id;
          destinationName = newSprint.name;
        } else if (input.targetAction === "MOVE_TO_NEXT_SPRINT") {
          destinationSprintId = input.targetSprintId ?? null;
          if (destinationSprintId) {
            const target = await tx.sprint.findUnique({
              where: { id: destinationSprintId },
            });
            destinationName = target?.name ?? "Next Sprint";
          }
        } else {
          destinationSprintId = null;
          destinationName = "Unassigned Backlog";
        }

        // 2. Rollover incomplete work items
        if (incompleteItems.length > 0) {
          const incompleteIds = incompleteItems.map((i) => i.id);
          await tx.workItem.updateMany({
            where: { id: { in: incompleteIds } },
            data: {
              sprintId: destinationSprintId,
            },
          });
        }

        // 3. Mark current sprint completed and record completion timestamp
        const completedSprint = await tx.sprint.update({
          where: { id: input.sprintId },
          data: {
            status: SprintStatus.COMPLETED,
            endDate: new Date(),
          },
        });

        return {
          sprint: completedSprint,
          totalCommittedPoints,
          totalBurnedPoints,
          rolloverCount: incompleteItems.length,
          completedCount: completedItems.length,
          targetDestination: destinationName,
          targetSprintId: destinationSprintId,
        };
      });
    }),

  /**
   * Complete active sprint alias for backward compatibility
   */
  complete: scrumMasterProcedure
    .input(
      z.object({
        sprintId: z.string(),
        targetSprintId: z.string().nullable().optional(),
        targetAction: z
          .enum(["MOVE_TO_NEXT_SPRINT", "MOVE_TO_BACKLOG", "NEW_SPRINT"])
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const sprint = await ctx.db.sprint.findUnique({
        where: { id: input.sprintId },
        include: {
          workItems: true,
          project: true,
          team: true,
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

      const action =
        input.targetAction ??
        (input.targetSprintId ? "MOVE_TO_NEXT_SPRINT" : "MOVE_TO_BACKLOG");

      const incompleteItems = sprint.workItems.filter(
        (item) => item.status !== WorkItemStatus.DONE,
      );

      return ctx.db.$transaction(async (tx) => {
        if (incompleteItems.length > 0) {
          await tx.workItem.updateMany({
            where: { id: { in: incompleteItems.map((i) => i.id) } },
            data: {
              sprintId: input.targetSprintId ?? null,
            },
          });
        }

        const completedSprint = await tx.sprint.update({
          where: { id: input.sprintId },
          data: {
            status: SprintStatus.COMPLETED,
            endDate: new Date(),
          },
        });

        return {
          sprint: completedSprint,
          rolledOverCount: incompleteItems.length,
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
