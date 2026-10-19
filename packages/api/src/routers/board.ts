import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { WorkItemStatus, SprintStatus } from "@centraxis/db";
import {
  createTRPCRouter,
  protectedProcedure,
  developerProcedure,
} from "../trpc";

export const boardRouter = createTRPCRouter({
  /**
   * Fetch board lanes and cards for an active sprint
   */
  getBoardData: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        sprintId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      let targetSprintId = input.sprintId;

      // If no sprint specified, default to the currently active sprint
      if (!targetSprintId) {
        const activeSprint = await ctx.db.sprint.findFirst({
          where: {
            projectId: input.projectId,
            status: SprintStatus.ACTIVE,
          },
          select: { id: true },
        });
        targetSprintId = activeSprint?.id;
      }

      if (!targetSprintId) {
        return {
          sprint: null,
          columns: {
            [WorkItemStatus.TODO]: [],
            [WorkItemStatus.IN_PROGRESS]: [],
            [WorkItemStatus.IN_REVIEW]: [],
            [WorkItemStatus.DONE]: [],
          },
          metrics: {
            totalItems: 0,
            completedItems: 0,
            totalPoints: 0,
            completedPoints: 0,
            progressPercentage: 0,
          },
        };
      }

      const sprint = await ctx.db.sprint.findUnique({
        where: { id: targetSprintId },
        include: {
          team: {
            select: { id: true, name: true },
          },
        },
      });

      const items = await ctx.db.workItem.findMany({
        where: {
          sprintId: targetSprintId,
          parentId: null,
        },
        include: {
          assignee: {
            select: { id: true, name: true, email: true, image: true },
          },
          reporter: {
            select: { id: true, name: true, image: true },
          },
          parent: {
            select: { id: true, key: true, title: true, type: true },
          },
          children: {
            select: { id: true, status: true, title: true },
          },
        },
        orderBy: { rankOrder: "asc" },
      });

      // Group cards into Kanban lanes
      const columns = {
        [WorkItemStatus.TODO]: items.filter(
          (item) => item.status === WorkItemStatus.TODO || item.status === WorkItemStatus.BACKLOG,
        ),
        [WorkItemStatus.IN_PROGRESS]: items.filter(
          (item) => item.status === WorkItemStatus.IN_PROGRESS,
        ),
        [WorkItemStatus.IN_REVIEW]: items.filter(
          (item) => item.status === WorkItemStatus.IN_REVIEW,
        ),
        [WorkItemStatus.DONE]: items.filter(
          (item) => item.status === WorkItemStatus.DONE,
        ),
      };

      const totalItems = items.length;
      const completedItems = columns[WorkItemStatus.DONE].length;
      const totalPoints = items.reduce(
        (acc, item) => acc + (item.storyPoints ?? 0),
        0,
      );
      const completedPoints = columns[WorkItemStatus.DONE].reduce(
        (acc, item) => acc + (item.storyPoints ?? 0),
        0,
      );
      const progressPercentage =
        totalPoints > 0
          ? Math.round((completedPoints / totalPoints) * 100)
          : totalItems > 0
            ? Math.round((completedItems / totalItems) * 100)
            : 0;

      return {
        sprint,
        columns,
        metrics: {
          totalItems,
          completedItems,
          totalPoints,
          completedPoints,
          progressPercentage,
        },
      };
    }),

  /**
   * Mutate card status and enforce subtask completion rules
   */
  updateItemStatus: developerProcedure
    .input(
      z.object({
        itemId: z.string(),
        status: z.nativeEnum(WorkItemStatus),
        prevRank: z.number().nullable().optional(),
        nextRank: z.number().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { itemId, status, prevRank, nextRank } = input;

      const currentItem = await ctx.db.workItem.findUnique({
        where: { id: itemId },
        include: {
          children: {
            select: { id: true, key: true, status: true },
          },
        },
      });

      if (!currentItem) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Work item not found.",
        });
      }

      // Rule Enforcement: Cannot move parent story to DONE if children remain unfinished
      if (status === WorkItemStatus.DONE && currentItem.children.length > 0) {
        const incompleteSubtasks = currentItem.children.filter(
          (c) => c.status !== WorkItemStatus.DONE,
        );

        if (incompleteSubtasks.length > 0) {
          const keys = incompleteSubtasks.map((c) => c.key).join(", ");
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: `Cannot resolve work item while child subtasks are incomplete (${keys}).`,
          });
        }
      }

      // Midpoint rank reorder calculation within target column
      const updateData: Record<string, unknown> = { status };

      if (prevRank !== undefined || nextRank !== undefined) {
        let newRank: number;
        if ((prevRank === null || prevRank === undefined) && (nextRank === null || nextRank === undefined)) {
          newRank = currentItem.rankOrder;
        } else if (prevRank === null || prevRank === undefined) {
          newRank = (nextRank ?? 1000) / 2;
        } else if (nextRank === null || nextRank === undefined) {
          newRank = prevRank + 1000;
        } else {
          newRank = (prevRank + nextRank) / 2;
        }
        updateData.rankOrder = newRank;
      }

      return ctx.db.workItem.update({
        where: { id: itemId },
        data: updateData,
        include: {
          assignee: {
            select: { id: true, name: true, image: true },
          },
        },
      });
    }),
});
