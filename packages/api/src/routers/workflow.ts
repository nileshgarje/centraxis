import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
  developerProcedure,
  adminProcedure,
} from "../trpc";
import {
  type PrismaClient,
  WorkflowScope,
  StateCategory,
  WorkItemStatus,
  ProjectRole,
  NotificationType,
} from "@centraxis/db";

// ============================================================================
// Helpers & Resolution Engine
// ============================================================================

export function mapCategoryToStatus(category: StateCategory): WorkItemStatus {
  switch (category) {
    case StateCategory.START:
      return WorkItemStatus.BACKLOG;
    case StateCategory.TODO:
      return WorkItemStatus.TODO;
    case StateCategory.IN_PROGRESS:
      return WorkItemStatus.IN_PROGRESS;
    case StateCategory.IN_REVIEW:
      return WorkItemStatus.IN_REVIEW;
    case StateCategory.DONE:
      return WorkItemStatus.DONE;
    default:
      return WorkItemStatus.TODO;
  }
}

export function mapStatusToDefaultSlug(status: WorkItemStatus): string {
  switch (status) {
    case WorkItemStatus.BACKLOG:
    case WorkItemStatus.TODO:
      return "todo";
    case WorkItemStatus.IN_PROGRESS:
      return "in_development";
    case WorkItemStatus.IN_REVIEW:
      return "ready_for_qa";
    case WorkItemStatus.DONE:
      return "done";
    default:
      return "todo";
  }
}

/**
 * Hierarchical Workflow Resolver
 * Project-Level -> Client-Level -> Global Default
 */
export async function resolveWorkflowForProject(
  db: PrismaClient,
  projectId: string,
) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      workflow: {
        include: {
          states: { orderBy: { orderIndex: "asc" } },
          transitions: {
            include: {
              fromState: true,
              toState: true,
            },
          },
        },
      },
      client: {
        include: {
          workflow: {
            include: {
              states: { orderBy: { orderIndex: "asc" } },
              transitions: {
                include: {
                  fromState: true,
                  toState: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!project) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: `Project with ID ${projectId} not found.`,
    });
  }

  // 1. Project-level published workflow
  if (project.workflow && project.workflow.isPublished) {
    return {
      workflow: project.workflow,
      level: "PROJECT" as const,
      project,
    };
  }

  // 2. Client-level published workflow
  if (project.client?.workflow && project.client.workflow.isPublished) {
    return {
      workflow: project.client.workflow,
      level: "CLIENT" as const,
      project,
    };
  }

  // 3. Fallback to GLOBAL published workflow
  const globalWorkflow = await db.workflow.findFirst({
    where: {
      scope: WorkflowScope.GLOBAL,
      isPublished: true,
    },
    orderBy: { version: "desc" },
    include: {
      states: { orderBy: { orderIndex: "asc" } },
      transitions: {
        include: {
          fromState: true,
          toState: true,
        },
      },
    },
  });

  if (globalWorkflow) {
    return {
      workflow: globalWorkflow,
      level: "GLOBAL" as const,
      project,
    };
  }

  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "No published workflow found in the system.",
  });
}

// ============================================================================
// Workflow Router
// ============================================================================

export const workflowRouter = createTRPCRouter({
  /**
   * Resolve active workflow for a specific project
   */
  getForProject: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const resolved = await resolveWorkflowForProject(ctx.db, input.projectId);
      return {
        workflow: resolved.workflow,
        level: resolved.level,
        projectName: resolved.project.name,
        clientName: resolved.project.client?.name ?? null,
      };
    }),

  /**
   * Get available state transitions for a work item
   */
  getAvailableTransitions: protectedProcedure
    .input(z.object({ workItemId: z.string() }))
    .query(async ({ ctx, input }) => {
      const workItem = await ctx.db.workItem.findUnique({
        where: { id: input.workItemId },
        include: {
          children: {
            select: { id: true, key: true, status: true, title: true },
          },
        },
      });

      if (!workItem) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Work item not found.",
        });
      }

      const { workflow, level } = await resolveWorkflowForProject(
        ctx.db,
        workItem.projectId,
      );

      // Determine current workflow state
      const currentSlug =
        workItem.stateSlug ?? mapStatusToDefaultSlug(workItem.status);
      let currentState = workflow.states.find((s) => s.slug === currentSlug);

      if (!currentState) {
        // Fallback matching by category/status
        currentState =
          workflow.states.find(
            (s) => mapCategoryToStatus(s.category) === workItem.status,
          ) ?? workflow.states[0];
      }

      // Find transitions where fromStateId is currentState.id OR null (Any State)
      const availableTransitions = workflow.transitions.filter(
        (t) => t.fromStateId === null || t.fromStateId === currentState?.id,
      );

      // Distinct permitted target states
      const targetStateMap = new Map<string, (typeof workflow.states)[number]>();
      for (const t of availableTransitions) {
        if (t.toState.id !== currentState?.id) {
          targetStateMap.set(t.toState.id, t.toState);
        }
      }

      return {
        workItemId: workItem.id,
        itemKey: workItem.key,
        currentState: currentState ?? null,
        availableTransitions,
        availableTargetStates: Array.from(targetStateMap.values()),
        workflow: {
          id: workflow.id,
          name: workflow.name,
          scope: workflow.scope,
          version: workflow.version,
          resolutionLevel: level,
          states: workflow.states,
          transitions: workflow.transitions,
        },
        hasIncompleteSubtasks: workItem.children.some(
          (c) => c.status !== WorkItemStatus.DONE,
        ),
      };
    }),

  /**
   * Validate whether a Kanban card drag between columns is permitted by workflow
   */
  validateKanbanMove: protectedProcedure
    .input(
      z.object({
        workItemId: z.string(),
        targetStatus: z.nativeEnum(WorkItemStatus),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { workItemId, targetStatus } = input;

      const workItem = await ctx.db.workItem.findUnique({
        where: { id: workItemId },
        include: {
          children: {
            select: { id: true, key: true, status: true },
          },
        },
      });

      if (!workItem) {
        return { allowed: false, reason: "Work item not found." };
      }

      if (workItem.status === targetStatus) {
        return { allowed: true };
      }

      const { workflow } = await resolveWorkflowForProject(
        ctx.db,
        workItem.projectId,
      );

      const currentSlug =
        workItem.stateSlug ?? mapStatusToDefaultSlug(workItem.status);
      const currentState =
        workflow.states.find((s) => s.slug === currentSlug) ??
        workflow.states.find(
          (s) => mapCategoryToStatus(s.category) === workItem.status,
        ) ??
        workflow.states[0];

      // Check Quality Gate: incomplete subtasks preventing DONE
      if (
        targetStatus === WorkItemStatus.DONE &&
        workItem.children.length > 0
      ) {
        const incomplete = workItem.children.filter(
          (c) => c.status !== WorkItemStatus.DONE,
        );
        if (incomplete.length > 0) {
          const keys = incomplete.map((c) => c.key).join(", ");
          return {
            allowed: false,
            reason: `Cannot resolve work item while child subtasks are incomplete (${keys}).`,
          };
        }
      }

      // Check workflow transitions
      const availableTransitions = workflow.transitions.filter(
        (t) => t.fromStateId === null || t.fromStateId === currentState?.id,
      );

      const matchingTransition = availableTransitions.find(
        (t) => mapCategoryToStatus(t.toState.category) === targetStatus,
      );

      if (!matchingTransition) {
        return {
          allowed: false,
          reason: `Transition not permitted by workflow from "${currentState?.name}" to "${targetStatus}". Check task workflow diagram.`,
        };
      }

      return {
        allowed: true,
        targetState: matchingTransition.toState,
        transition: matchingTransition,
      };
    }),

  /**
   * Execute an actionable state transition on a work item
   */
  executeTransition: developerProcedure
    .input(
      z.object({
        workItemId: z.string(),
        transitionId: z.string().optional(),
        targetStateSlug: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { workItemId, transitionId, targetStateSlug } = input;

      const workItem = await ctx.db.workItem.findUnique({
        where: { id: workItemId },
        include: {
          children: {
            select: { id: true, key: true, status: true },
          },
          assignee: true,
          reporter: true,
        },
      });

      if (!workItem) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Work item not found.",
        });
      }

      const { workflow } = await resolveWorkflowForProject(
        ctx.db,
        workItem.projectId,
      );

      const currentSlug =
        workItem.stateSlug ?? mapStatusToDefaultSlug(workItem.status);
      const currentState =
        workflow.states.find((s) => s.slug === currentSlug) ??
        workflow.states.find(
          (s) => mapCategoryToStatus(s.category) === workItem.status,
        ) ??
        workflow.states[0];

      // Available transitions from current state or any-state
      const availableTransitions = workflow.transitions.filter(
        (t) => t.fromStateId === null || t.fromStateId === currentState?.id,
      );

      let matchedTransition = transitionId
        ? availableTransitions.find((t) => t.id === transitionId)
        : undefined;

      if (!matchedTransition && targetStateSlug) {
        matchedTransition = availableTransitions.find(
          (t) => t.toState.slug === targetStateSlug,
        );
      }

      if (!matchedTransition) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `Transition not permitted by workflow from "${currentState?.name}".`,
        });
      }

      const toState = matchedTransition.toState;
      const newStatus = mapCategoryToStatus(toState.category);

      // Quality Gate check: Moving to DONE with incomplete subtasks
      if (
        (toState.category === StateCategory.DONE ||
          newStatus === WorkItemStatus.DONE) &&
        workItem.children.length > 0
      ) {
        const incomplete = workItem.children.filter(
          (c) => c.status !== WorkItemStatus.DONE,
        );
        if (incomplete.length > 0) {
          const keys = incomplete.map((c) => c.key).join(", ");
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: `Cannot resolve work item while child subtasks are incomplete (${keys}).`,
          });
        }
      }

      // Update work item with new stateSlug and status
      const updatedItem = await ctx.db.workItem.update({
        where: { id: workItemId },
        data: {
          stateSlug: toState.slug,
          status: newStatus,
        },
      });

      // Notification dispatch (STATUS_CHANGED)
      const recipientId =
        workItem.assigneeId && workItem.assigneeId !== ctx.session.user.id
          ? workItem.assigneeId
          : workItem.reporterId && workItem.reporterId !== ctx.session.user.id
            ? workItem.reporterId
            : null;

      if (recipientId) {
        await ctx.db.notification.create({
          data: {
            userId: recipientId,
            type: NotificationType.STATUS_CHANGED,
            title: `Status changed on ${workItem.key}`,
            message: `${ctx.session.user.name ?? "User"} transitioned ${workItem.key} to ${toState.name} via '${matchedTransition.name}'.`,
            link: `?item=${workItem.key}`,
          },
        });
      }

      return {
        success: true,
        workItem: updatedItem,
        newState: toState,
        transition: matchedTransition,
      };
    }),

  /**
   * List all workflows across scopes
   */
  listWorkflows: protectedProcedure
    .input(
      z
        .object({
          scope: z.nativeEnum(WorkflowScope).optional(),
          clientId: z.string().optional(),
          projectId: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {};
      if (input?.scope) where.scope = input.scope;
      if (input?.clientId) where.clientId = input.clientId;
      if (input?.projectId) where.projectId = input.projectId;

      return ctx.db.workflow.findMany({
        where,
        orderBy: [{ isPublished: "desc" }, { updatedAt: "desc" }],
        include: {
          states: { orderBy: { orderIndex: "asc" } },
          transitions: {
            include: {
              fromState: true,
              toState: true,
            },
          },
          client: { select: { id: true, name: true, slug: true } },
          project: { select: { id: true, name: true, key: true } },
          _count: {
            select: {
              states: true,
              transitions: true,
              activeProjects: true,
              activeClients: true,
            },
          },
        },
      });
    }),

  /**
   * Get single workflow by ID
   */
  getById: protectedProcedure
    .input(z.object({ workflowId: z.string() }))
    .query(async ({ ctx, input }) => {
      const workflow = await ctx.db.workflow.findUnique({
        where: { id: input.workflowId },
        include: {
          states: { orderBy: { orderIndex: "asc" } },
          transitions: {
            include: {
              fromState: true,
              toState: true,
            },
          },
          activeProjects: { select: { id: true, name: true, key: true } },
          activeClients: { select: { id: true, name: true, slug: true } },
          client: { select: { id: true, name: true, slug: true } },
          project: { select: { id: true, name: true, key: true } },
        },
      });

      if (!workflow) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workflow not found.",
        });
      }

      return workflow;
    }),

  /**
   * Create new custom workflow (Draft mode)
   */
  createWorkflow: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2, "Workflow name must be at least 2 characters"),
        description: z.string().optional(),
        scope: z.nativeEnum(WorkflowScope).default(WorkflowScope.GLOBAL),
        clientId: z.string().optional(),
        projectId: z.string().optional(),
        states: z
          .array(
            z.object({
              name: z.string(),
              slug: z.string(),
              category: z.nativeEnum(StateCategory),
              color: z.string().optional(),
              orderIndex: z.number().default(0),
            }),
          )
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { name, description, scope, clientId, projectId, states } = input;

      return ctx.db.$transaction(async (tx) => {
        const workflow = await tx.workflow.create({
          data: {
            name,
            description,
            scope,
            clientId: scope === WorkflowScope.CLIENT ? clientId : null,
            projectId: scope === WorkflowScope.PROJECT ? projectId : null,
            isPublished: false,
            version: 1,
          },
        });

        // Insert initial states if provided
        if (states && states.length > 0) {
          for (let i = 0; i < states.length; i++) {
            const st = states[i]!;
            await tx.workflowState.create({
              data: {
                workflowId: workflow.id,
                name: st.name,
                slug: st.slug,
                category: st.category,
                color: st.color,
                orderIndex: st.orderIndex ?? i,
              },
            });
          }
        }

        return workflow;
      });
    }),

  /**
   * Publish workflow scheme and increment version
   */
  publishWorkflow: adminProcedure
    .input(z.object({ workflowId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const workflow = await ctx.db.workflow.findUnique({
        where: { id: input.workflowId },
        include: {
          states: true,
          transitions: true,
        },
      });

      if (!workflow) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workflow not found.",
        });
      }

      if (workflow.states.length < 2) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Workflow must have at least 2 states before publishing.",
        });
      }

      return ctx.db.workflow.update({
        where: { id: input.workflowId },
        data: {
          isPublished: true,
          version: { increment: 1 },
        },
      });
    }),

  /**
   * Associate published workflow with Client or Project
   */
  associateWorkflow: adminProcedure
    .input(
      z.object({
        workflowId: z.string(),
        targetType: z.enum(["CLIENT", "PROJECT"]),
        targetId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { workflowId, targetType, targetId } = input;

      const workflow = await ctx.db.workflow.findUnique({
        where: { id: workflowId },
      });

      if (!workflow) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workflow not found.",
        });
      }

      if (targetType === "CLIENT") {
        await ctx.db.client.update({
          where: { id: targetId },
          data: { workflowId },
        });
      } else {
        await ctx.db.project.update({
          where: { id: targetId },
          data: { workflowId },
        });
      }

      return { success: true };
    }),
});
