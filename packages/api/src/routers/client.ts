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
  create: scrumMasterProcedure
    .input(
      z.object({
        name: z.string().min(2, "Client name must be at least 2 characters"),
        slug: z
          .string()
          .min(2, "Slug must be at least 2 characters")
          .regex(/^[a-z0-9-]+$/, "Slug must only contain lowercase letters, numbers, and hyphens")
          .optional(),
        contactEmail: z.string().email("Invalid contact email").optional().nullable(),
        logo: z.string().url("Invalid logo URL").optional().nullable(),
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
          message: "User must belong to an organization to create clients.",
        });
      }

      const generatedSlug =
        input.slug ||
        input.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");

      const existing = await ctx.db.client.findUnique({
        where: {
          orgId_slug: {
            orgId,
            slug: generatedSlug,
          },
        },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Client with slug '${generatedSlug}' already exists in your organization.`,
        });
      }

      return ctx.db.client.create({
        data: {
          name: input.name,
          slug: generatedSlug,
          contactEmail: input.contactEmail ?? null,
          logo: input.logo ?? null,
          orgId,
        },
      });
    }),

  /**
   * Update client details
   */
  update: scrumMasterProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(2).optional(),
        contactEmail: z.string().email().optional().nullable(),
        logo: z.string().url().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.client.update({
        where: { id },
        data,
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
