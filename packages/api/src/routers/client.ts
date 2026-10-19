import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
  scrumMasterProcedure,
  adminProcedure,
} from "../trpc";

export const clientRouter = createTRPCRouter({
  /**
   * List all clients for the user's organization with assigned projects
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    let orgId = ctx.session.user.organizationId;
    if (!orgId) {
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { organizationId: true },
      });
      orgId = user?.organizationId ?? null;
    }

    if (!orgId) {
      return [];
    }

    return ctx.db.client.findMany({
      where: { orgId },
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
        _count: {
          select: {
            projects: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });
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
          .optional()
          .nullable()
          .or(z.literal("")),
        contactEmail: z
          .string()
          .optional()
          .nullable()
          .or(z.literal("")),
        logo: z.string().optional().nullable().or(z.literal("")),
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
        const firstOrg = await ctx.db.organization.findFirst({
          orderBy: { createdAt: "asc" },
        });
        if (firstOrg) {
          orgId = firstOrg.id;
          await ctx.db.user.update({
            where: { id: ctx.session.user.id },
            data: { organizationId: firstOrg.id },
          });
        }
      }

      if (!orgId) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "User must belong to an organization to create clients.",
        });
      }

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
          orgId,
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
