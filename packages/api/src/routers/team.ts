import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { TeamRole } from "@centraxis/db";
import {
  createTRPCRouter,
  protectedProcedure,
  scrumMasterProcedure,
} from "../trpc";

export const teamRouter = createTRPCRouter({
  /**
   * List all teams in the user's organization
   */
  list: protectedProcedure
    .input(z.object({ projectId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      let orgId: string | null | undefined = ctx.session.user.organizationId;
      if (!orgId) {
        const user = await ctx.db.user.findUnique({
          where: { id: ctx.session.user.id },
          select: { organizationId: true },
        });
        orgId = user?.organizationId ?? null;
      }

      if (input?.projectId) {
        const projectTeams = await ctx.db.projectTeam.findMany({
          where: { projectId: input.projectId },
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
                _count: {
                  select: { memberships: true, sprints: true },
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
          projectTeams: {
            include: {
              project: {
                select: { id: true, name: true, key: true },
              },
            },
          },
          _count: {
            select: { memberships: true, sprints: true },
          },
        },
        orderBy: { name: "asc" },
      });
    }),

  /**
   * Get single team by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const team = await ctx.db.team.findUnique({
        where: { id: input.id },
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
          projectTeams: {
            include: {
              project: {
                select: { id: true, name: true, key: true },
              },
            },
          },
          _count: {
            select: { memberships: true, sprints: true },
          },
        },
      });

      if (!team) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Team with ID ${input.id} was not found.`,
        });
      }

      return team;
    }),

  /**
   * Create a new team / squad
   */
  createTeam: scrumMasterProcedure
    .input(
      z.object({
        name: z.string().min(2, "Team name must be at least 2 characters"),
        description: z.string().optional(),
        defaultCadenceWeeks: z.number().int().min(1).max(4).default(2),
        targetVelocity: z.number().int().min(1).max(200).optional(),
        memberIds: z.array(z.string()).optional(),
        projectId: z.string().optional(),
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
          message: "User must belong to an organization to create teams.",
        });
      }

      let finalDescription = input.description?.trim() ?? "";
      const metaParts: string[] = [];
      if (input.defaultCadenceWeeks) {
        metaParts.push(`Cadence: ${input.defaultCadenceWeeks}w`);
      }
      if (input.targetVelocity) {
        metaParts.push(`Target Velocity: ${input.targetVelocity} pts`);
      }
      if (metaParts.length > 0) {
        const metaStr = `[${metaParts.join(" • ")}]`;
        finalDescription = finalDescription
          ? `${finalDescription} ${metaStr}`
          : metaStr;
      }

      const team = await ctx.db.team.create({
        data: {
          name: input.name.trim(),
          description: finalDescription || null,
          organizationId: orgId,
          memberships:
            input.memberIds && input.memberIds.length > 0
              ? {
                  create: input.memberIds.map((userId) => ({
                    userId,
                    role: TeamRole.DEVELOPER,
                  })),
                }
              : undefined,
          projectTeams: input.projectId
            ? {
                create: {
                  projectId: input.projectId,
                },
              }
            : undefined,
        },
        include: {
          memberships: {
            include: {
              user: {
                select: { id: true, name: true, email: true },
              },
            },
          },
          projectTeams: true,
          _count: {
            select: { memberships: true },
          },
        },
      });

      return team;
    }),

  /**
   * Alias for createTeam
   */
  create: scrumMasterProcedure
    .input(
      z.object({
        name: z.string().min(2, "Team name must be at least 2 characters"),
        description: z.string().optional(),
        defaultCadenceWeeks: z.number().int().min(1).max(4).default(2),
        targetVelocity: z.number().int().min(1).max(200).optional(),
        memberIds: z.array(z.string()).optional(),
        projectId: z.string().optional(),
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
          message: "User must belong to an organization to create teams.",
        });
      }

      let finalDescription = input.description?.trim() ?? "";
      const metaParts: string[] = [];
      if (input.defaultCadenceWeeks) {
        metaParts.push(`Cadence: ${input.defaultCadenceWeeks}w`);
      }
      if (input.targetVelocity) {
        metaParts.push(`Target Velocity: ${input.targetVelocity} pts`);
      }
      if (metaParts.length > 0) {
        const metaStr = `[${metaParts.join(" • ")}]`;
        finalDescription = finalDescription
          ? `${finalDescription} ${metaStr}`
          : metaStr;
      }

      return ctx.db.team.create({
        data: {
          name: input.name.trim(),
          description: finalDescription || null,
          organizationId: orgId,
          memberships:
            input.memberIds && input.memberIds.length > 0
              ? {
                  create: input.memberIds.map((userId) => ({
                    userId,
                    role: TeamRole.DEVELOPER,
                  })),
                }
              : undefined,
          projectTeams: input.projectId
            ? {
                create: {
                  projectId: input.projectId,
                },
              }
            : undefined,
        },
        include: {
          memberships: {
            include: {
              user: {
                select: { id: true, name: true, email: true },
              },
            },
          },
          projectTeams: true,
          _count: {
            select: { memberships: true },
          },
        },
      });
    }),

  /**
   * List all organization users available to be added as team members
   */
  listOrgMembers: protectedProcedure.query(async ({ ctx }) => {
    let orgId = ctx.session.user.organizationId;
    if (!orgId) {
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { organizationId: true },
      });
      orgId = user?.organizationId ?? null;
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
});
