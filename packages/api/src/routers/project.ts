import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { TeamRole } from "@centraxis/db";
import {
  createTRPCRouter,
  protectedProcedure,
  scrumMasterProcedure,
} from "../trpc";
import { resolveValidOrgId } from "../services/organization";

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
        members: {
          select: {
            userId: true,
            role: true,
          },
        },
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
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                  role: true,
                  globalRole: true,
                },
              },
            },
          },
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
   * Get single project by client slug and project key with access verification
   */
  getByClientAndKey: protectedProcedure
    .input(
      z.object({
        clientSlug: z.string(),
        projectKey: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const isSystemAdmin =
        ctx.session.user.globalRole === "SYSTEM_ADMIN" ||
        ctx.session.user.role === TeamRole.ORG_ADMIN;

      const project = await ctx.db.project.findFirst({
        where: {
          key: { equals: input.projectKey, mode: "insensitive" },
          client: {
            slug: input.clientSlug,
          },
        },
        include: {
          client: true,
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                  role: true,
                  globalRole: true,
                },
              },
            },
          },
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
              sprints: true,
            },
          },
        },
      });

      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Project with key ${input.projectKey} under client ${input.clientSlug} was not found.`,
        });
      }

      // Check access for non-system admins
      if (!isSystemAdmin) {
        const isClientMember = project.clientId
          ? await ctx.db.clientMember.findFirst({
              where: {
                clientId: project.clientId,
                userId: ctx.session.user.id,
              },
            })
          : null;

        const isProjectMember = await ctx.db.projectMember.findFirst({
          where: {
            projectId: project.id,
            userId: ctx.session.user.id,
          },
        });

        if (!isClientMember && !isProjectMember) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have permission to access this project.",
          });
        }
      }

      return project;
    }),

  /**
   * Get all users assignable to a project based on RBAC scoping:
   * 1. SYSTEM_ADMIN (globalRole === 'SYSTEM_ADMIN' or role === ORG_ADMIN)
   * 2. CLIENT_ADMIN or member of the project's parent client
   * 3. Explicit PROJECT_MEMBER for this specific project
   */
  getAssignableUsers: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.project.findUnique({
        where: { id: input.projectId },
        select: { id: true, clientId: true },
      });

      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Target project does not exist.",
        });
      }

      const users = await ctx.db.user.findMany({
        where: {
          OR: [
            { globalRole: "SYSTEM_ADMIN" },
            { role: TeamRole.ORG_ADMIN },
            ...(project.clientId
              ? [
                  {
                    clientMemberships: { some: { clientId: project.clientId } },
                  },
                ]
              : []),
            { projectMemberships: { some: { projectId: input.projectId } } },
          ],
        },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
          globalRole: true,
          clientMemberships: project.clientId
            ? {
                where: { clientId: project.clientId },
                select: { role: true, clientId: true },
              }
            : undefined,
          projectMemberships: {
            where: { projectId: input.projectId },
            select: { role: true, projectId: true },
          },
        },
        orderBy: { name: "asc" },
      });

      return users;
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
        const userMap = new Map<
          string,
          (typeof memberships)[0]["user"] & { teamRole: string }
        >();
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
      let orgId: string;
      if (input.clientId) {
        const client = await ctx.db.client.findUnique({
          where: { id: input.clientId },
          select: { orgId: true },
        });
        if (client?.orgId) {
          orgId = client.orgId;
        } else {
          orgId = await resolveValidOrgId(
            ctx.db,
            ctx.session.user.id,
            ctx.session.user.organizationId,
          );
        }
      } else {
        orgId = await resolveValidOrgId(
          ctx.db,
          ctx.session.user.id,
          ctx.session.user.organizationId,
        );
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
      let orgId: string;
      if (input.clientId) {
        const client = await ctx.db.client.findUnique({
          where: { id: input.clientId },
          select: { orgId: true },
        });
        if (client?.orgId) {
          orgId = client.orgId;
        } else {
          orgId = await resolveValidOrgId(
            ctx.db,
            ctx.session.user.id,
            ctx.session.user.organizationId,
          );
        }
      } else {
        orgId = await resolveValidOrgId(
          ctx.db,
          ctx.session.user.id,
          ctx.session.user.organizationId,
        );
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
