import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const notificationRouter = createTRPCRouter({
  /**
   * Get unread notification count for active user (badge counter)
   */
  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    const count = await ctx.db.notification.count({
      where: {
        userId: ctx.session.user.id,
        isRead: false,
      },
    });
    return { count };
  }),

  /**
   * List recent notifications for active user
   */
  listRecent: protectedProcedure
    .input(
      z.object({ limit: z.number().min(1).max(50).default(15) }).optional(),
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 15;
      return ctx.db.notification.findMany({
        where: { userId: ctx.session.user.id },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
    }),

  /**
   * Mark single notification as read
   */
  markAsRead: protectedProcedure
    .input(z.object({ notificationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.notification.updateMany({
        where: {
          id: input.notificationId,
          userId: ctx.session.user.id,
        },
        data: { isRead: true },
      });
    }),

  /**
   * Mark all notifications for active user as read
   */
  markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
    return ctx.db.notification.updateMany({
      where: {
        userId: ctx.session.user.id,
        isRead: false,
      },
      data: { isRead: true },
    });
  }),
});
