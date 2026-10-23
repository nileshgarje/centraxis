import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const dashboardRouter = createTRPCRouter({
  getMyWorkItems: protectedProcedure
    .input(
      z.object({
        tab: z.enum([
          "ASSIGNED_UNRESOLVED",
          "RESOLVED",
          "RECENTLY_MODIFIED",
          "REPORTED_BY_ME",
        ]),
        search: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const user = await ctx.db.user.findUnique({
        where: { id: userId },
        select: { globalRole: true, role: true, organizationId: true },
      });

      const isSystemAdmin =
        user?.globalRole === "SYSTEM_ADMIN" || user?.role === "ORG_ADMIN";

      const projectFilter = isSystemAdmin
        ? user?.organizationId
          ? { project: { organizationId: user.organizationId } }
          : {}
        : {
            project: {
              OR: [
                { members: { some: { userId } } },
                { client: { members: { some: { userId } } } },
              ],
            },
          };

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const conditions: any[] = [projectFilter];

      if (input.search && input.search.trim()) {
        const query = input.search.trim();
        conditions.push({
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { key: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
          ],
        });
      }

      switch (input.tab) {
        case "ASSIGNED_UNRESOLVED":
          conditions.push({
            assigneeId: userId,
            status: { not: "DONE" },
          });
          break;

        case "RESOLVED":
          conditions.push({
            assigneeId: userId,
            status: "DONE",
          });
          break;

        case "RECENTLY_MODIFIED":
          conditions.push({
            updatedAt: { gte: thirtyDaysAgo },
            OR: [{ assigneeId: userId }, { reporterId: userId }],
          });
          break;

        case "REPORTED_BY_ME":
          conditions.push({
            reporterId: userId,
          });
          break;
      }

      return ctx.db.workItem.findMany({
        where: { AND: conditions },
        include: {
          project: {
            select: {
              id: true,
              key: true,
              name: true,
              clientId: true,
              client: { select: { id: true, name: true, slug: true } },
            },
          },
          sprint: { select: { id: true, name: true, status: true } },
          assignee: {
            select: { id: true, name: true, image: true, email: true },
          },
          reporter: {
            select: { id: true, name: true, image: true, email: true },
          },
        },
        orderBy: { updatedAt: "desc" },
      });
    }),

  getMyWorkCounts: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const user = await ctx.db.user.findUnique({
      where: { id: userId },
      select: { globalRole: true, role: true, organizationId: true },
    });

    const isSystemAdmin =
      user?.globalRole === "SYSTEM_ADMIN" || user?.role === "ORG_ADMIN";

    const projectFilter = isSystemAdmin
      ? user?.organizationId
        ? { project: { organizationId: user.organizationId } }
        : {}
      : {
          project: {
            OR: [
              { members: { some: { userId } } },
              { client: { members: { some: { userId } } } },
            ],
          },
        };

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [assignedUnresolved, resolved, recentlyModified, reportedByMe] =
      await Promise.all([
        ctx.db.workItem.count({
          where: {
            AND: [
              projectFilter,
              { assigneeId: userId, status: { not: "DONE" } },
            ],
          },
        }),
        ctx.db.workItem.count({
          where: {
            AND: [projectFilter, { assigneeId: userId, status: "DONE" }],
          },
        }),
        ctx.db.workItem.count({
          where: {
            AND: [
              projectFilter,
              {
                updatedAt: { gte: thirtyDaysAgo },
                OR: [{ assigneeId: userId }, { reporterId: userId }],
              },
            ],
          },
        }),
        ctx.db.workItem.count({
          where: {
            AND: [projectFilter, { reporterId: userId }],
          },
        }),
      ]);

    return {
      assignedUnresolved,
      resolved,
      recentlyModified,
      reportedByMe,
    };
  }),
});
