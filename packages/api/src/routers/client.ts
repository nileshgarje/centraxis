import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { TeamRole } from "@centraxis/db";
import {
  createTRPCRouter,
  protectedProcedure,
  scrumMasterProcedure,
  adminProcedure,
} from "../trpc";
import { resolveValidOrgId } from "../services/organization";

export const clientRouter = createTRPCRouter({
  /**
   * List all clients accessible to the current user with assigned projects and members
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const orgId = await resolveValidOrgId(
      ctx.db,
      ctx.session.user.id,
      ctx.session.user.organizationId,
    );

    const isSystemAdmin =
      ctx.session.user.globalRole === "SYSTEM_ADMIN" ||
      ctx.session.user.role === TeamRole.ORG_ADMIN;

    return ctx.db.client.findMany({
      where: {
        orgId,
        ...(!isSystemAdmin
          ? {
              members: {
                some: { userId: ctx.session.user.id },
              },
            }
          : {}),
      },
      include: {
        projects: {
          select: {
            id: true,
            key: true,
            name: true,
            description: true,
            _count: {
              select: {
                workItems: true,
                sprints: true,
              },
            },
          },
        },
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
        _count: {
          select: {
            projects: true,
            members: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });
  }),

  /**
   * Get single client by Slug with authorization check
   */
  getBySlug: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const isSystemAdmin =
        ctx.session.user.globalRole === "SYSTEM_ADMIN" ||
        ctx.session.user.role === TeamRole.ORG_ADMIN;

      const client = await ctx.db.client.findFirst({
        where: {
          slug: input.slug,
          ...(!isSystemAdmin
            ? {
                members: {
                  some: { userId: ctx.session.user.id },
                },
              }
            : {}),
        },
        include: {
          projects: {
            include: {
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
          },
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
          _count: {
            select: {
              projects: true,
              members: true,
            },
          },
        },
      });

      if (!client) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Client workspace not found or you do not have access.",
        });
      }

      return client;
    }),

  /**
   * Get single client by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const client = await ctx.db.client.findUnique({
        where: { id: input.id },
        include: {
          projects: {
            include: {
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
          },
        },
      });

      if (!client) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Client with ID ${input.id} was not found.`,
        });
      }

      return client;
    }),

  /**
   * Create a new Client
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Client name is required"),
        slug: z
          .string()
          .min(2, "Slug must be at least 2 characters")
          .regex(
            /^[a-z0-9-]+$/,
            "Slug must only contain lowercase letters, numbers, and hyphens",
          )
          .optional()
          .nullable()
          .or(z.literal("")),
        contactEmail: z
          .string()
          .email("Invalid email address")
          .optional()
          .nullable()
          .or(z.literal("")),
        logo: z.string().optional().nullable().or(z.literal("")),
        tenantId: z.string().optional().nullable().or(z.literal("")),
        allowedDomains: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = await resolveValidOrgId(
        ctx.db,
        ctx.session.user.id,
        ctx.session.user.organizationId,
      );

      let baseSlug = (
        input.slug?.trim() ||
        input.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
      ).toLowerCase();

      if (!baseSlug || baseSlug.length < 2) {
        baseSlug = `client-${Date.now().toString(36)}`;
      }

      // If user provided a specific slug, check for collision
      if (input.slug?.trim()) {
        const existing = await ctx.db.client.findUnique({
          where: {
            orgId_slug: {
              orgId,
              slug: baseSlug,
            },
          },
        });
        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `Client slug "${baseSlug}" is already in use.`,
          });
        }
      }

      let generatedSlug = baseSlug;
      let counter = 1;
      while (
        await ctx.db.client.findUnique({
          where: {
            orgId_slug: {
              orgId,
              slug: generatedSlug,
            },
          },
        })
      ) {
        generatedSlug = `${baseSlug}-${counter}`;
        counter++;
      }

      return ctx.db.client.create({
        data: {
          name: input.name.trim(),
          slug: generatedSlug,
          contactEmail: input.contactEmail?.trim() || null,
          logo: input.logo?.trim() || null,
          tenantId: input.tenantId?.trim() || null,
          allowedDomains: input.allowedDomains ?? [],
          orgId,
          members: {
            create: {
              userId: ctx.session.user.id,
              role: "CLIENT_ADMIN",
            },
          },
        },
      });
    }),

  /**
   * Update client details
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        contactEmail: z.string().optional().nullable().or(z.literal("")),
        logo: z.string().optional().nullable().or(z.literal("")),
        tenantId: z.string().optional().nullable().or(z.literal("")),
        allowedDomains: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.client.update({
        where: { id },
        data: {
          name: data.name?.trim(),
          contactEmail: data.contactEmail?.trim() || null,
          logo: data.logo?.trim() || null,
          ...(data.tenantId !== undefined
            ? { tenantId: data.tenantId?.trim() || null }
            : {}),
          ...(data.allowedDomains !== undefined
            ? { allowedDomains: data.allowedDomains }
            : {}),
        },
      });
    }),

  /**
   * Delete client
   */
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.client.delete({
        where: { id: input.id },
      });
    }),
});
