import { TRPCError } from "@trpc/server";
import { PrismaClient, TeamRole } from "@centraxis/db";

export interface GuardUser {
  id: string;
  role?: string | null;
  globalRole?: string | null;
}

/**
 * Asserts that a user has access to a project.
 * Allows SYSTEM_ADMIN, ORG_ADMIN, Project Members, Client Members, and Squad/Team Members.
 */
export async function assertUserHasProjectAccess(
  db: PrismaClient,
  user: GuardUser,
  projectId: string,
  options?: { requireWrite?: boolean },
) {
  const isSystemAdmin =
    user.globalRole === "SYSTEM_ADMIN" || user.role === TeamRole.ORG_ADMIN;

  if (isSystemAdmin) {
    return true;
  }

  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { id: true, clientId: true },
  });

  if (!project) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Target project does not exist.",
    });
  }

  // 1. Direct Project Membership
  const projectMember = await db.projectMember.findFirst({
    where: {
      projectId: project.id,
      userId: user.id,
    },
  });

  if (projectMember) {
    if (options?.requireWrite && projectMember.role === "VIEWER") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You have read-only access to this project.",
      });
    }
    return true;
  }

  // 2. Client Membership (for client-associated projects)
  if (project.clientId) {
    const clientMember = await db.clientMember.findFirst({
      where: {
        clientId: project.clientId,
        userId: user.id,
      },
    });

    if (clientMember) {
      return true;
    }
  }

  // 3. Team / Squad Membership assigned to this project
  const teamMember = await db.projectTeam.findFirst({
    where: {
      projectId: project.id,
      team: {
        memberships: {
          some: { userId: user.id },
        },
      },
    },
  });

  if (teamMember) {
    return true;
  }

  throw new TRPCError({
    code: "FORBIDDEN",
    message: "You do not have permission to access this project.",
  });
}

/**
 * Asserts that a work item exists and user has access to its project.
 * Returns the work item with its projectId.
 */
export async function assertUserCanAccessWorkItem(
  db: PrismaClient,
  user: GuardUser,
  workItemId: string,
  options?: { requireWrite?: boolean },
) {
  const item = await db.workItem.findUnique({
    where: { id: workItemId },
    select: { id: true, projectId: true, reporterId: true, assigneeId: true },
  });

  if (!item) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Target work item does not exist.",
    });
  }

  await assertUserHasProjectAccess(db, user, item.projectId, options);
  return item;
}

/**
 * Asserts that a comment exists and caller has rights to delete or modify it.
 * Author, Project Lead, Org Admin, or System Admin are permitted.
 */
export async function assertUserCanModifyComment(
  db: PrismaClient,
  user: GuardUser,
  commentId: string,
) {
  const comment = await db.comment.findUnique({
    where: { id: commentId },
    include: {
      workItem: {
        select: { id: true, projectId: true },
      },
    },
  });

  if (!comment) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Comment not found.",
    });
  }

  // Check project access first
  await assertUserHasProjectAccess(db, user, comment.workItem.projectId);

  const isSystemAdmin =
    user.globalRole === "SYSTEM_ADMIN" || user.role === TeamRole.ORG_ADMIN;

  if (isSystemAdmin || comment.authorId === user.id) {
    return comment;
  }

  const projectLead = await db.projectMember.findFirst({
    where: {
      projectId: comment.workItem.projectId,
      userId: user.id,
      role: "PROJECT_LEAD",
    },
  });

  if (projectLead) {
    return comment;
  }

  throw new TRPCError({
    code: "FORBIDDEN",
    message: "You do not have permission to modify this comment.",
  });
}

/**
 * Asserts that an attachment exists and caller has rights to delete it.
 * Uploader, Project Lead, Org Admin, or System Admin are permitted.
 */
export async function assertUserCanDeleteAttachment(
  db: PrismaClient,
  user: GuardUser,
  attachmentId: string,
) {
  const attachment = await db.attachment.findUnique({
    where: { id: attachmentId },
    include: {
      workItem: {
        select: { id: true, projectId: true },
      },
    },
  });

  if (!attachment) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Attachment not found.",
    });
  }

  // Check project access first
  await assertUserHasProjectAccess(db, user, attachment.workItem.projectId);

  const isSystemAdmin =
    user.globalRole === "SYSTEM_ADMIN" || user.role === TeamRole.ORG_ADMIN;

  if (isSystemAdmin || attachment.uploaderId === user.id) {
    return attachment;
  }

  const projectLead = await db.projectMember.findFirst({
    where: {
      projectId: attachment.workItem.projectId,
      userId: user.id,
      role: "PROJECT_LEAD",
    },
  });

  if (projectLead) {
    return attachment;
  }

  throw new TRPCError({
    code: "FORBIDDEN",
    message: "You do not have permission to delete this attachment.",
  });
}
