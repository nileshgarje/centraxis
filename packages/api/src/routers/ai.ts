import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { WorkItemType, WorkItemStatus, WorkItemPriority } from "@centraxis/db";
import { UserStoryOutputSchema, generateStoryAgent } from "@centraxis/ai";
import {
  createTRPCRouter,
  protectedProcedure,
  developerProcedure,
} from "../trpc";

export const aiRouter = createTRPCRouter({
  /**
   * Generate an INVEST-compliant user story from a brief feature description
   */
  generateStoryFromPrompt: protectedProcedure
    .input(
      z.object({
        prompt: z.string().min(5, "Prompt must be at least 5 characters long"),
        projectId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      let projectContext: string | undefined;

      if (input.projectId) {
        const project = await ctx.db.project.findUnique({
          where: { id: input.projectId },
          select: { name: true, key: true, description: true },
        });
        if (project) {
          projectContext = `${project.name} (${project.key}): ${
            project.description ?? "Agile Workspace"
          }`;
        }
      }

      return generateStoryAgent({
        prompt: input.prompt,
        projectContext,
      });
    }),

  /**
   * Transactionally commit the generated story and technical subtasks into the backlog
   */
  commitStoryToBacklog: developerProcedure
    .input(
      z.object({
        projectId: z.string(),
        rawPrompt: z.string(),
        storyData: UserStoryOutputSchema,
        modelUsed: z.string().default("gpt-4o"),
        sprintId: z.string().nullable().optional(),
        assigneeId: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.project.findUnique({
        where: { id: input.projectId },
        select: { key: true },
      });

      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Target project not found.",
        });
      }

      return ctx.db.$transaction(async (tx) => {
        // Query the latest created work item to extract the sequential key index
        const lastItem = await tx.workItem.findFirst({
          where: { projectId: input.projectId },
          orderBy: { createdAt: "desc" },
          select: { key: true, rankOrder: true },
        });

        let nextIndex = 1;
        if (lastItem?.key) {
          const parts = lastItem.key.split("-");
          const lastNum = parseInt(parts[1] ?? "0", 10);
          if (!isNaN(lastNum)) {
            nextIndex = lastNum + 1;
          }
        }

        const baseRank = (lastItem?.rankOrder ?? 0) + 1000;
        const initialStatus = input.sprintId
          ? WorkItemStatus.TODO
          : WorkItemStatus.BACKLOG;

        // 1. Create the Parent Story
        const storyKey = `${project.key}-${nextIndex}`;
        const points = parseFloat(input.storyData.estimatedPoints);

        const story = await tx.workItem.create({
          data: {
            key: storyKey,
            title: input.storyData.title,
            description: input.storyData.story,
            acceptanceCriteria: input.storyData.acceptanceCriteria.join("\n\n"),
            type: WorkItemType.STORY,
            status: initialStatus,
            priority: WorkItemPriority.MEDIUM,
            storyPoints: isNaN(points) ? null : points,
            rankOrder: baseRank,
            projectId: input.projectId,
            sprintId: input.sprintId,
            assigneeId: input.assigneeId,
            reporterId: ctx.session.user.id,
          },
        });

        // 2. Create the Child Technical Subtasks
        const createdSubtasks = [];
        let taskOffset = 1;

        for (const taskTitle of input.storyData.subTasks) {
          const taskKey = `${project.key}-${nextIndex + taskOffset}`;
          const task = await tx.workItem.create({
            data: {
              key: taskKey,
              title: taskTitle,
              type: WorkItemType.TASK,
              status: initialStatus,
              priority: WorkItemPriority.MEDIUM,
              storyPoints: 1,
              rankOrder: baseRank + taskOffset * 10,
              parentId: story.id,
              projectId: input.projectId,
              sprintId: input.sprintId,
              assigneeId: input.assigneeId,
              reporterId: ctx.session.user.id,
            },
          });
          createdSubtasks.push(task);
          taskOffset++;
        }

        // 3. Persist AI Audit Log for traceability
        const log = await tx.aiStoryLog.create({
          data: {
            rawPrompt: input.rawPrompt,
            generatedPayload: input.storyData as any,
            modelUsed: input.modelUsed,
            acceptedByUserId: ctx.session.user.id,
            workItemId: story.id,
          },
        });

        return {
          story,
          subtasks: createdSubtasks,
          auditLogId: log.id,
        };
      });
    }),
});
