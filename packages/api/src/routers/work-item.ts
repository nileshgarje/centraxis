import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  WorkItemType,
  WorkItemStatus,
  WorkItemPriority,
  TeamRole,
} from "@centraxis/db";
import {
  createTRPCRouter,
  protectedProcedure,
  developerProcedure,
} from "../trpc";

async function isUserAssignableToProject(
  db: any,
  projectId: string,
  userId: string,
): Promise<boolean> {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { id: true, clientId: true },
  });
  if (!project) return false;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      globalRole: true,
      clientMemberships: project.clientId
        ? { where: { clientId: project.clientId } }
        : false,
      projectMemberships: { where: { projectId } },
    },
  });

  if (!user) return false;
  if (user.globalRole === "SYSTEM_ADMIN" || user.role === TeamRole.ORG_ADMIN)
    return true;
  if (
    project.clientId &&
    user.clientMemberships &&
    user.clientMemberships.length > 0
  )
    return true;
  if (user.projectMemberships && user.projectMemberships.length > 0)
    return true;

  return false;
}

export const workItemRouter = createTRPCRouter({
  /**
   * Get all sub-tasks for a parent item with rollup progress metrics
   */
  getSubTasks: protectedProcedure
    .input(z.object({ parentId: z.string() }))
    .query(async ({ ctx, input }) => {
      const parent = await ctx.db.workItem.findUnique({
        where: { id: input.parentId },
        select: { id: true, key: true, title: true, status: true },
      });

      if (!parent) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Parent work item not found.",
        });
      }

      const items = await ctx.db.workItem.findMany({
        where: { parentId: input.parentId },
        include: {
          assignee: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
        orderBy: [{ createdAt: "asc" }, { rankOrder: "asc" }],
      });

      const total = items.length;
      const completedCount = items.filter(
        (t) => t.status === WorkItemStatus.DONE,
      ).length;
      const progressPercentage =
        total > 0 ? Math.round((completedCount / total) * 100) : 0;

      return {
        parentId: parent.id,
        parentKey: parent.key,
        total,
        completedCount,
        progressPercentage,
        items,
      };
    }),

  /**
   * Create a new sub-task linked to parent item
   */
  createSubTask: developerProcedure
    .input(
      z.object({
        parentId: z.string(),
        title: z.string().min(1, "Title is required").max(200),
        type: z.nativeEnum(WorkItemType).default(WorkItemType.TASK),
        priority: z
          .nativeEnum(WorkItemPriority)
          .default(WorkItemPriority.MEDIUM),
        assigneeId: z.string().nullable().optional(),
        storyPoints: z.number().nullable().optional(),
        dueDate: z.coerce.date().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const parent = await ctx.db.workItem.findUnique({
        where: { id: input.parentId },
        include: {
          project: {
            select: { id: true, key: true },
          },
        },
      });

      if (!parent) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Parent work item not found.",
        });
      }

      // Validate assignee scoping
      if (input.assigneeId) {
        const isAssignable = await isUserAssignableToProject(
          ctx.db,
          parent.projectId,
          input.assigneeId,
        );
        if (!isAssignable) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Selected user is not assigned to this project or client.",
          });
        }
      }

      // Generate next sequential project key
      const highestItem = await ctx.db.workItem.findFirst({
        where: { projectId: parent.projectId },
        orderBy: { createdAt: "desc" },
        select: { key: true, rankOrder: true },
      });

      let nextIndex = 1;
      if (highestItem?.key) {
        const parts = highestItem.key.split("-");
        const lastNum = parseInt(parts[1] ?? "0", 10);
        if (!isNaN(lastNum)) {
          nextIndex = lastNum + 1;
        }
      }

      const generatedKey = `${parent.project.key}-${nextIndex}`;
      const nextRank = (highestItem?.rankOrder ?? 0) + 1000;

      const subTask = await ctx.db.workItem.create({
        data: {
          key: generatedKey,
          title: input.title.trim(),
          type: input.type,
          priority: input.priority,
          status: WorkItemStatus.TODO,
          storyPoints: input.storyPoints,
          dueDate: input.dueDate,
          rankOrder: nextRank,
          parentId: parent.id,
          projectId: parent.projectId,
          sprintId: parent.sprintId, // Inherits sprint automatically from parent
          assigneeId: input.assigneeId,
          reporterId: ctx.session.user.id,
        },
        include: {
          assignee: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
      });

      return subTask;
    }),

  /**
   * Update sub-task status (e.g. toggle between TODO and DONE)
   */
  updateSubTaskStatus: developerProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.nativeEnum(WorkItemStatus),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const item = await ctx.db.workItem.findUnique({
        where: { id: input.id },
        select: { id: true, parentId: true },
      });

      if (!item) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Sub-task not found.",
        });
      }

      return ctx.db.workItem.update({
        where: { id: input.id },
        data: { status: input.status },
        include: {
          assignee: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
      });
    }),

  /**
   * Update sub-task details (title, assignee, priority)
   */
  updateSubTask: developerProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).optional(),
        assigneeId: z.string().nullable().optional(),
        priority: z.nativeEnum(WorkItemPriority).optional(),
        dueDate: z.coerce.date().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const item = await ctx.db.workItem.findUnique({
        where: { id },
        select: { id: true, projectId: true },
      });

      if (!item) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Sub-task not found.",
        });
      }

      if (data.assigneeId) {
        const isAssignable = await isUserAssignableToProject(
          ctx.db,
          item.projectId,
          data.assigneeId,
        );
        if (!isAssignable) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Selected user is not assigned to this project or client.",
          });
        }
      }

      return ctx.db.workItem.update({
        where: { id },
        data,
        include: {
          assignee: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
      });
    }),

  /**
   * Delete sub-task
   */
  deleteSubTask: developerProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.workItem.delete({
        where: { id: input.id },
      });
    }),

  /**
   * Get all attachments for a work item
   */
  getAttachments: protectedProcedure
    .input(z.object({ workItemId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.attachment.findMany({
        where: { workItemId: input.workItemId },
        include: {
          uploader: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  /**
   * Delete an attachment
   */
  deleteAttachment: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const attachment = await ctx.db.attachment.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          uploaderId: true,
          fileUrl: true,
          workItem: { select: { projectId: true } },
        },
      });

      if (!attachment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Attachment not found.",
        });
      }

      const isUploader = attachment.uploaderId === ctx.session.user.id;
      const isAdmin =
        ctx.session.user.globalRole === "SYSTEM_ADMIN" ||
        ctx.session.user.role === "ORG_ADMIN";

      let isProjectMember = false;
      if (!isUploader && !isAdmin && attachment.workItem?.projectId) {
        const pm = await ctx.db.projectMember.findFirst({
          where: {
            projectId: attachment.workItem.projectId,
            userId: ctx.session.user.id,
          },
        });
        isProjectMember = !!pm;
      }

      if (!isUploader && !isAdmin && !isProjectMember) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to delete this attachment.",
        });
      }

      return ctx.db.attachment.delete({
        where: { id: input.id },
      });
    }),
});
