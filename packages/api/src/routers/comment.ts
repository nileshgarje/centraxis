import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { NotificationType, TeamRole } from "@centraxis/db";
import {
  createTRPCRouter,
  protectedProcedure,
  protectedMutationProcedure,
} from "../trpc";
import {
  assertUserCanAccessWorkItem,
  assertUserCanModifyComment,
} from "../auth-guards";

export const commentRouter = createTRPCRouter({
  /**
   * List all comments for a specific work item
   */
  listByWorkItem: protectedProcedure
    .input(z.object({ workItemId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertUserCanAccessWorkItem(
        ctx.db,
        ctx.session.user,
        input.workItemId,
      );

      return ctx.db.comment.findMany({
        where: { workItemId: input.workItemId },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              role: true,
              globalRole: true,
            },
          },
          mentions: {
            include: {
              mentionedUser: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      });
    }),

  /**
   * Create a new comment with rich @mention parsing and notifications
   */
  create: protectedMutationProcedure
    .input(
      z.object({
        workItemId: z.string(),
        body: z.string().min(1, "Comment body cannot be empty").max(10000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertUserCanAccessWorkItem(
        ctx.db,
        ctx.session.user,
        input.workItemId,
        { requireWrite: true },
      );

      const authorId = ctx.session.user.id;
      const authorName = ctx.session.user.name || "Team Member";

      const workItem = await ctx.db.workItem.findUnique({
        where: { id: input.workItemId },
        include: {
          project: {
            include: {
              client: { select: { slug: true } },
            },
          },
        },
      });

      if (!workItem) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Work item not found.",
        });
      }

      // 1. Parse mentioned user IDs from body
      // Supports formats:
      // a) @[User Name](userId) -> primary token syntax from mention input
      // b) @user_cuid
      const mentionedUserIds = new Set<string>();

      const tokenRegex = /@\[([^\]]+)\]\(([a-zA-Z0-9_-]+)\)/g;
      let tokenMatch: RegExpExecArray | null;
      while ((tokenMatch = tokenRegex.exec(input.body)) !== null) {
        if (tokenMatch[2]) {
          mentionedUserIds.add(tokenMatch[2]);
        }
      }

      // Also scan for plain @id format if any
      const plainRegex =
        /(?:^|\s)@([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/g;
      let plainMatch: RegExpExecArray | null;
      while ((plainMatch = plainRegex.exec(input.body)) !== null) {
        if (plainMatch[1]) {
          const userByEmail = await ctx.db.user.findUnique({
            where: { email: plainMatch[1].toLowerCase() },
            select: { id: true },
          });
          if (userByEmail) {
            mentionedUserIds.add(userByEmail.id);
          }
        }
      }

      // 2. Filter & validate mentioned users
      const validUserIds: string[] = [];
      for (const targetId of mentionedUserIds) {
        // Do not notify self
        if (targetId === authorId) continue;

        // Verify target user exists
        const targetUser = await ctx.db.user.findUnique({
          where: { id: targetId },
          select: {
            id: true,
            globalRole: true,
            role: true,
            organizationId: true,
            clientMemberships: workItem.project.clientId
              ? { where: { clientId: workItem.project.clientId } }
              : false,
            projectMemberships: { where: { projectId: workItem.projectId } },
          },
        });

        if (!targetUser) continue;

        // Check project or client scoping (SYSTEM_ADMIN or client/project member)
        const isScoped =
          targetUser.globalRole === "SYSTEM_ADMIN" ||
          targetUser.role === TeamRole.ORG_ADMIN ||
          (targetUser.projectMemberships &&
            targetUser.projectMemberships.length > 0) ||
          (targetUser.clientMemberships &&
            targetUser.clientMemberships.length > 0) ||
          targetUser.organizationId === workItem.project.organizationId;

        if (isScoped) {
          validUserIds.push(targetId);
        }
      }

      // 3. Construct direct link to work item
      const clientSlug = workItem.project.client?.slug;
      const targetLink = clientSlug
        ? `/${clientSlug}/${workItem.project.key}/board?item=${workItem.key}`
        : `/${workItem.project.key}/board?item=${workItem.key}`;

      // Snippet for notification
      const cleanSnippet =
        input.body
          .replace(/@\[([^\]]+)\]\([^)]+\)/g, "@$1")
          .trim()
          .slice(0, 100) + (input.body.length > 100 ? "..." : "");

      // 4. Create Comment and associated Mentions + Notifications in transaction
      return ctx.db.$transaction(async (tx) => {
        const comment = await tx.comment.create({
          data: {
            body: input.body,
            workItemId: input.workItemId,
            authorId,
          },
          include: {
            author: {
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
        });

        for (const userId of validUserIds) {
          const mention = await tx.mention.create({
            data: {
              commentId: comment.id,
              mentionedUserId: userId,
            },
          });

          await tx.notification.create({
            data: {
              userId,
              type: NotificationType.MENTION,
              title: `${authorName} mentioned you`,
              message: `${authorName} mentioned you on ${workItem.key} (${workItem.title}): "${cleanSnippet}"`,
              link: targetLink,
              isRead: false,
              mentionId: mention.id,
            },
          });
        }

        return tx.comment.findUnique({
          where: { id: comment.id },
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
                role: true,
                globalRole: true,
              },
            },
            mentions: {
              include: {
                mentionedUser: {
                  select: { id: true, name: true, email: true },
                },
              },
            },
          },
        });
      });
    }),

  /**
   * Delete comment (Author or Admin)
   */
  delete: protectedMutationProcedure
    .input(z.object({ commentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertUserCanModifyComment(ctx.db, ctx.session.user, input.commentId);

      return ctx.db.comment.delete({
        where: { id: input.commentId },
      });
    }),
});
