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
import {
  resolveWorkflowForProject,
  mapCategoryToStatus,
  mapStatusToDefaultSlug,
} from "./workflow";

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

export const backlogRouter = createTRPCRouter({
  /**
   * Fetch single work item by ID with full relations
   */
  getItem: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const item = await ctx.db.workItem.findUnique({
        where: { id: input.id },
        include: {
          project: {
            select: {
              id: true,
              key: true,
              name: true,
              client: {
                select: { id: true, slug: true, name: true },
              },
            },
          },
          assignee: {
            select: { id: true, name: true, email: true, image: true },
          },
          reporter: {
            select: { id: true, name: true, email: true, image: true },
          },
          sprint: {
            select: { id: true, name: true, status: true },
          },
          parent: {
            select: { id: true, key: true, title: true, type: true },
          },
          children: {
            select: {
              id: true,
              key: true,
              title: true,
              type: true,
              status: true,
              priority: true,
              storyPoints: true,
              dueDate: true,
            },
            orderBy: { rankOrder: "asc" },
          },
          attachments: {
            include: {
              uploader: {
                select: { id: true, name: true, image: true, email: true },
              },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!item) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Work item not found",
        });
      }

      return item;
    }),

  /**
   * Fetch single work item by client slug and item key (e.g. key="CTX-1", clientSlug="client-apex")
   */
  getItemByKey: protectedProcedure
    .input(
      z.object({
        clientSlug: z.string(),
        key: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const item = await ctx.db.workItem.findFirst({
        where: {
          key: { equals: input.key, mode: "insensitive" },
          project: {
            client: {
              slug: { equals: input.clientSlug, mode: "insensitive" },
            },
          },
        },
        include: {
          project: {
            include: {
              client: true,
            },
          },
          assignee: {
            select: { id: true, name: true, email: true, image: true },
          },
          reporter: {
            select: { id: true, name: true, email: true, image: true },
          },
          sprint: {
            select: { id: true, name: true, status: true },
          },
          parent: {
            select: { id: true, key: true, title: true, type: true },
          },
          children: {
            select: {
              id: true,
              key: true,
              title: true,
              type: true,
              status: true,
              priority: true,
              storyPoints: true,
              dueDate: true,
            },
            orderBy: { rankOrder: "asc" },
          },
          attachments: {
            include: {
              uploader: {
                select: { id: true, name: true, image: true, email: true },
              },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!item) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Work item "${input.key}" under client "${input.clientSlug}" was not found.`,
        });
      }

      // Check access: user must be SYSTEM_ADMIN or have membership in client or project
      const user = ctx.session.user;
      if (user.globalRole !== "SYSTEM_ADMIN") {
        const hasAccess =
          (await ctx.db.clientMember.findFirst({
            where: { clientId: item.project.clientId!, userId: user.id },
          })) ||
          (await ctx.db.projectMember.findFirst({
            where: { projectId: item.projectId, userId: user.id },
          }));

        if (!hasAccess) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have access to this work item.",
          });
        }
      }

      return item;
    }),

  /**
   * Fetch flat list of work items with optional filtering
   */
  getItems: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        sprintId: z.string().nullable().optional(),
        type: z.nativeEnum(WorkItemType).optional(),
        status: z.nativeEnum(WorkItemStatus).optional(),
        assigneeId: z.string().optional(),
        search: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const whereClause: Record<string, unknown> = {
        projectId: input.projectId,
      };

      if (input.sprintId !== undefined) {
        whereClause.sprintId = input.sprintId;
      }
      if (input.type) {
        whereClause.type = input.type;
      }
      if (input.status) {
        whereClause.status = input.status;
      }
      if (input.assigneeId) {
        whereClause.assigneeId = input.assigneeId;
      }
      if (input.search) {
        whereClause.OR = [
          { title: { contains: input.search, mode: "insensitive" } },
          { key: { contains: input.search, mode: "insensitive" } },
          { description: { contains: input.search, mode: "insensitive" } },
        ];
      }

      return ctx.db.workItem.findMany({
        where: whereClause,
        include: {
          assignee: {
            select: { id: true, name: true, email: true, image: true },
          },
          reporter: {
            select: { id: true, name: true, email: true, image: true },
          },
          sprint: {
            select: { id: true, name: true, status: true },
          },
          parent: {
            select: { id: true, key: true, title: true, type: true },
          },
          _count: {
            select: { children: true },
          },
        },
        orderBy: { rankOrder: "asc" },
      });
    }),

  /**
   * Fetch hierarchical backlog tree (Epics -> Features -> Stories -> Tasks/Bugs)
   */
  getTree: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        sprintId: z.string().nullable().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const rootItems = await ctx.db.workItem.findMany({
        where: {
          projectId: input.projectId,
          parentId: null,
          ...(input.sprintId !== undefined ? { sprintId: input.sprintId } : {}),
        },
        include: {
          assignee: {
            select: { id: true, name: true, image: true },
          },
          children: {
            include: {
              assignee: {
                select: { id: true, name: true, image: true },
              },
              children: {
                include: {
                  assignee: {
                    select: { id: true, name: true, image: true },
                  },
                },
                orderBy: { rankOrder: "asc" },
              },
            },
            orderBy: { rankOrder: "asc" },
          },
        },
        orderBy: { rankOrder: "asc" },
      });

      return rootItems;
    }),

  /**
   * Create a new work item with automated key generation and initial rank
   */
  createItem: developerProcedure
    .input(
      z.object({
        projectId: z.string(),
        title: z.string().min(1, "Title is required").max(200),
        description: z.string().optional(),
        acceptanceCriteria: z.string().optional(),
        type: z.nativeEnum(WorkItemType).default(WorkItemType.STORY),
        priority: z
          .nativeEnum(WorkItemPriority)
          .default(WorkItemPriority.MEDIUM),
        status: z.nativeEnum(WorkItemStatus).default(WorkItemStatus.BACKLOG),
        storyPoints: z.number().nullable().optional(),
        dueDate: z.coerce.date().nullable().optional(),
        parentId: z.string().nullable().optional(),
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
          message: "Target project does not exist.",
        });
      }

      if (input.assigneeId) {
        const isAssignable = await isUserAssignableToProject(
          ctx.db,
          input.projectId,
          input.assigneeId,
        );
        if (!isAssignable) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Selected user is not a member of this project or client.",
          });
        }
      }

      // Generate next project-scoped issue number
      const highestItem = await ctx.db.workItem.findFirst({
        where: { projectId: input.projectId },
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

      const generatedKey = `${project.key}-${nextIndex}`;
      const nextRank = (highestItem?.rankOrder ?? 0) + 1000;

      return ctx.db.workItem.create({
        data: {
          key: generatedKey,
          title: input.title,
          description: input.description,
          acceptanceCriteria: input.acceptanceCriteria,
          type: input.type,
          priority: input.priority,
          status: input.status,
          storyPoints: input.storyPoints,
          dueDate: input.dueDate,
          rankOrder: nextRank,
          parentId: input.parentId,
          projectId: input.projectId,
          sprintId: input.sprintId,
          assigneeId: input.assigneeId,
          reporterId: ctx.session.user.id,
        },
      });
    }),

  /**
   * Update work item fields
   */
  updateItem: developerProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).optional(),
        description: z.string().nullable().optional(),
        acceptanceCriteria: z.string().nullable().optional(),
        type: z.nativeEnum(WorkItemType).optional(),
        status: z.nativeEnum(WorkItemStatus).optional(),
        priority: z.nativeEnum(WorkItemPriority).optional(),
        storyPoints: z.number().nullable().optional(),
        dueDate: z.coerce.date().nullable().optional(),
        parentId: z.string().nullable().optional(),
        sprintId: z.string().nullable().optional(),
        assigneeId: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      if (data.assigneeId) {
        const existing = await ctx.db.workItem.findUnique({
          where: { id },
          select: { projectId: true },
        });
        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Target work item does not exist.",
          });
        }
        const isAssignable = await isUserAssignableToProject(
          ctx.db,
          existing.projectId,
          data.assigneeId,
        );
        if (!isAssignable) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Selected user is not a member of this project or client.",
          });
        }
      }

      // Workflow State-Machine Enforcement
      if (data.status) {
        const currentItem = await ctx.db.workItem.findUnique({
          where: { id },
          select: { id: true, projectId: true, status: true, stateSlug: true },
        });

        if (currentItem && currentItem.status !== data.status) {
          const { workflow } = await resolveWorkflowForProject(
            ctx.db,
            currentItem.projectId,
          );

          const currentSlug =
            currentItem.stateSlug ?? mapStatusToDefaultSlug(currentItem.status);
          const currentState =
            workflow.states.find((s) => s.slug === currentSlug) ??
            workflow.states.find(
              (s) => mapCategoryToStatus(s.category) === currentItem.status,
            ) ??
            workflow.states[0];

          const validTransitions = workflow.transitions.filter(
            (t) => t.fromStateId === null || t.fromStateId === currentState?.id,
          );

          const matchingTransition = validTransitions.find(
            (t) => mapCategoryToStatus(t.toState.category) === data.status,
          );

          if (!matchingTransition) {
            throw new TRPCError({
              code: "PRECONDITION_FAILED",
              message: `Transition not permitted by workflow from "${currentState?.name ?? currentItem.status}" to "${data.status}".`,
            });
          }

          (data as any).stateSlug = matchingTransition.toState.slug;
        }
      }

      // Quality Gate: Prevent marking parent story as DONE if incomplete subtasks remain
      if (data.status === WorkItemStatus.DONE) {
        const itemWithChildren = await ctx.db.workItem.findUnique({
          where: { id },
          include: {
            children: {
              select: { id: true, key: true, status: true },
            },
          },
        });
        if (itemWithChildren && itemWithChildren.children.length > 0) {
          const incompleteSubtasks = itemWithChildren.children.filter(
            (c) => c.status !== WorkItemStatus.DONE,
          );
          if (incompleteSubtasks.length > 0) {
            const keys = incompleteSubtasks.map((c) => c.key).join(", ");
            throw new TRPCError({
              code: "PRECONDITION_FAILED",
              message: `Cannot resolve work item while child sub-tasks are incomplete (${keys}).`,
            });
          }
        }
      }

      return ctx.db.workItem.update({
        where: { id },
        data,
      });
    }),

  /**
   * Fractional rank reordering (supports midpoint calculations between cards)
   */
  reorder: developerProcedure
    .input(
      z.object({
        itemId: z.string(),
        prevRank: z.number().nullable(),
        nextRank: z.number().nullable(),
        targetSprintId: z.string().nullable().optional(),
        targetStatus: z.nativeEnum(WorkItemStatus).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { itemId, prevRank, nextRank, targetSprintId, targetStatus } =
        input;

      let newRank: number;
      if (prevRank === null && nextRank === null) {
        newRank = 1000;
      } else if (prevRank === null && nextRank !== null) {
        newRank = nextRank / 2;
      } else if (prevRank !== null && nextRank === null) {
        newRank = prevRank + 1000;
      } else {
        newRank = (prevRank! + nextRank!) / 2;
      }

      const updateData: Record<string, unknown> = {
        rankOrder: newRank,
      };

      if (targetSprintId !== undefined) {
        updateData.sprintId = targetSprintId;
      }
      if (targetStatus !== undefined) {
        updateData.status = targetStatus;
      }

      return ctx.db.workItem.update({
        where: { id: itemId },
        data: updateData,
      });
    }),

  /**
   * Delete work item
   */
  deleteItem: developerProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.workItem.delete({
        where: { id: input.id },
      });
    }),
});
