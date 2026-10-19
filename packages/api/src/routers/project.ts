import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
  scrumMasterProcedure,
} from "../trpc";

export const projectRouter = createTRPCRouter({
  /**
   * List all projects belonging to the user's organization
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const orgId = ctx.session.user.organizationId;

    return ctx.db.project.findMany({
      where: orgId ? { organizationId: orgId } : undefined,
      include: {
        client: true,
        projectTeams: {
          include: {
            team: true,
          },
        },
        sprints: {
          where: { status: "ACTIVE" },
          take: 1,
        },
        _count: {
          select: {
            workItems: true,
            sprints: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });
  }),

  /**
   * Get single project by ID with assigned squads, sprints, and metrics
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.project.findUnique({
        where: { id: input.id },
        include: {
          client: true,
          projectTeams: {
            include: {
              team: {
                include: {
                  memberships: {
                    include: {
                      user: {
                        select: {
                          id: true,
                          name: true,
                          email: true,
                          image: true,
                          role: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          sprints: {
            orderBy: { createdAt: "desc" },
            take: 5,
          },
          _count: {
            select: {
              workItems: true,
            },
          },
        },
      });

      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Project with ID ${input.id} was not found.`,
        });
      }

      return project;
    }),

  /**
   * List teams/squads available in the organization or assigned to a project
   */
  listTeams: protectedProcedure
    .input(z.object({ projectId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const orgId = ctx.session.user.organizationId;

      if (input?.projectId) {
        const projectTeams = await ctx.db.projectTeam.findMany({
          where: { projectId: input.projectId },
          include: {
            team: {
              include: {
                _count: {
                  select: { memberships: true },
                },
              },
            },
          },
        });
        return projectTeams.map((pt) => pt.team);
      }

      return ctx.db.team.findMany({
        where: orgId ? { organizationId: orgId } : undefined,
        include: {
          _count: {
            select: { memberships: true },
          },
        },
        orderBy: { name: "asc" },
      });
    }),

  /**
   * List members across the project or squad
   */
  listMembers: protectedProcedure
    .input(
      z
        .object({
          projectId: z.string().optional(),
          teamId: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const orgId = ctx.session.user.organizationId;

      if (input?.teamId) {
        const memberships = await ctx.db.teamMembership.findMany({
          where: { teamId: input.teamId },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
                role: true,
              },
            },
          },
        });
        return memberships.map((m) => ({
          ...m.user,
          teamRole: m.role,
        }));
      }

      if (input?.projectId) {
        const projectTeams = await ctx.db.projectTeam.findMany({
          where: { projectId: input.projectId },
          select: { teamId: true },
        });
        const teamIds = projectTeams.map((pt) => pt.teamId);

        const memberships = await ctx.db.teamMembership.findMany({
          where: { teamId: { in: teamIds } },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
                role: true,
              },
            },
          },
        });

        // Deduplicate users belonging to multiple squads
        const userMap = new Map<string, typeof memberships[0]["user"] & { teamRole: string }>();
        for (const m of memberships) {
          if (!userMap.has(m.user.id)) {
            userMap.set(m.user.id, { ...m.user, teamRole: m.role });
          }
        }
        return Array.from(userMap.values());
      }

      return ctx.db.user.findMany({
        where: orgId ? { organizationId: orgId } : undefined,
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
        },
        orderBy: { name: "asc" },
      });
    }),

  /**
   * Check if a project key is unique/available
   */
  checkKey: protectedProcedure
    .input(z.object({ key: z.string().min(2).max(10) }))
    .query(async ({ ctx, input }) => {
      const existing = await ctx.db.project.findUnique({
        where: { key: input.key.toUpperCase() },
        select: { id: true },
      });
      return { available: !existing };
    }),

  /**
   * Create a new project (Scrum Master or Admin)
   */
  create: scrumMasterProcedure
    .input(
      z.object({
        name: z.string().min(2, "Project name must be at least 2 characters"),
        key: z
          .string()
          .min(2, "Project key must be at least 2 characters")
          .max(10, "Project key must be at most 10 characters")
          .toUpperCase(),
        description: z.string().optional(),
        defaultSprintDurationDays: z.number().int().min(7).max(30).default(14),
        clientId: z.string().optional(),
        teamIds: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      let orgId = ctx.session.user.organizationId;
      if (!orgId) {
        const user = await ctx.db.user.findUnique({
          where: { id: ctx.session.user.id },
          select: { organizationId: true },
        });
        orgId = user?.organizationId ?? null;
      }

      if (!orgId) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "User must belong to an organization to create projects.",
        });
      }

      const existing = await ctx.db.project.findUnique({
        where: { key: input.key },
      });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Project key ${input.key} is already in use.`,
        });
      }

      return ctx.db.project.create({
        data: {
          name: input.name,
          key: input.key,
          description: input.description,
          defaultSprintDurationDays: input.defaultSprintDurationDays,
          organizationId: orgId,
          clientId: input.clientId || null,
          projectTeams: input.teamIds
            ? {
                create: input.teamIds.map((teamId) => ({
                  teamId,
                })),
              }
            : undefined,
        },
      });
    }),

  /**
   * Alias for create to support createProject callers
   */
  createProject: scrumMasterProcedure
    .input(
      z.object({
        name: z.string().min(2, "Project name must be at least 2 characters"),
        key: z
          .string()
          .min(2, "Project key must be at least 2 characters")
          .max(10, "Project key must be at most 10 characters")
          .toUpperCase(),
        description: z.string().optional(),
        defaultSprintDurationDays: z.number().int().min(7).max(30).default(14),
        clientId: z.string().optional(),
        teamIds: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      let orgId = ctx.session.user.organizationId;
      if (!orgId) {
        const user = await ctx.db.user.findUnique({
          where: { id: ctx.session.user.id },
          select: { organizationId: true },
        });
        orgId = user?.organizationId ?? null;
      }

      if (!orgId) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "User must belong to an organization to create projects.",
        });
      }

      const existing = await ctx.db.project.findUnique({
        where: { key: input.key },
      });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Project key ${input.key} is already in use.`,
        });
      }

      return ctx.db.project.create({
        data: {
          name: input.name,
          key: input.key,
          description: input.description,
          defaultSprintDurationDays: input.defaultSprintDurationDays,
          organizationId: orgId,
          clientId: input.clientId || null,
          projectTeams: input.teamIds
            ? {
                create: input.teamIds.map((teamId) => ({
                  teamId,
                })),
              }
            : undefined,
        },
      });
    }),

  /**
   * Assign a squad to a project
   */
  assignTeam: scrumMasterProcedure
    .input(
      z.object({
        projectId: z.string(),
        teamId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.projectTeam.upsert({
        where: {
          projectId_teamId: {
            projectId: input.projectId,
            teamId: input.teamId,
          },
        },
        update: {},
        create: {
          projectId: input.projectId,
          teamId: input.teamId,
        },
      });
    }),
});
