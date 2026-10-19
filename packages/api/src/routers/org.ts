import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { TeamRole } from "@centraxis/db";
import {
  createTRPCRouter,
  protectedProcedure,
  scrumMasterProcedure,
} from "../trpc";
import { sendEmail, renderUserInvitationEmail } from "../services/email";

export const orgRouter = createTRPCRouter({
  /**
   * List all members belonging to the user's organization
   */
  listMembers: protectedProcedure.query(async ({ ctx }) => {
    let orgId = ctx.session.user.organizationId;
    if (!orgId) {
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { organizationId: true },
      });
      orgId = user?.organizationId ?? null;
    }

    const members = await ctx.db.user.findMany({
      where: orgId ? { organizationId: orgId } : undefined,
      include: {
        memberships: {
          include: {
            team: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    });

    return members.map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      image: m.image,
      role: m.role,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
      teams: m.memberships.map((tm) => tm.team),
    }));
  }),

  /**
   * List pending invitations for the organization
   */
  listInvitations: protectedProcedure.query(async ({ ctx }) => {
    let orgId = ctx.session.user.organizationId;
    if (!orgId) {
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { organizationId: true },
      });
      orgId = user?.organizationId ?? null;
    }

    if (!orgId) return [];

    return ctx.db.invitation.findMany({
      where: {
        organizationId: orgId,
        status: "PENDING",
      },
      include: {
        invitedBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }),

  /**
   * Invite one or multiple users to the organization
   */
  inviteUser: scrumMasterProcedure
    .input(
      z.object({
        emails: z.array(z.string().email()).min(1, "At least one email is required"),
        role: z.nativeEnum(TeamRole).default(TeamRole.DEVELOPER),
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
          message: "User must belong to an organization to invite members.",
        });
      }

      const org = await ctx.db.organization.findUnique({
        where: { id: orgId },
        select: { name: true },
      });
      const inviter = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { name: true },
      });

      const results = [];
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3001";

      for (const email of input.emails) {
        const normalizedEmail = email.toLowerCase().trim();

        // Check if user already exists
        const existingUser = await ctx.db.user.findUnique({
          where: { email: normalizedEmail },
        });

        if (existingUser) {
          // If user exists, link to organization and assign role
          await ctx.db.user.update({
            where: { id: existingUser.id },
            data: {
              organizationId: orgId,
              role: input.role,
            },
          });

          // Link to squads if specified
          if (input.teamIds && input.teamIds.length > 0) {
            for (const teamId of input.teamIds) {
              await ctx.db.teamMembership.upsert({
                where: {
                  userId_teamId: {
                    userId: existingUser.id,
                    teamId,
                  },
                },
                update: { role: input.role },
                create: {
                  userId: existingUser.id,
                  teamId,
                  role: input.role,
                },
              });
            }
          }

          results.push({
            email: normalizedEmail,
            status: "ADDED_DIRECTLY",
          });
          continue;
        }

        // Create Invitation record
        const invitation = await ctx.db.invitation.create({
          data: {
            email: normalizedEmail,
            role: input.role,
            organizationId: orgId,
            invitedById: ctx.session.user.id,
            expiresAt,
            status: "PENDING",
            teamIds: input.teamIds ?? [],
          },
        });

        // Send invitation email
        try {
          await sendEmail({
            to: normalizedEmail,
            subject: `You've been invited to join ${org?.name || "Centraxis"}`,
            html: renderUserInvitationEmail({
              orgName: org?.name || "Centraxis",
              inviterName: inviter?.name || undefined,
              role: input.role,
              acceptUrl: `${baseUrl}/invitations/${invitation.id}`,
            }),
          });
        } catch (e) {
          console.error("Failed to send invitation email:", e);
        }

        results.push({
          email: normalizedEmail,
          invitationId: invitation.id,
          status: "INVITED",
        });
      }

      return {
        success: true,
        count: results.length,
        results,
      };
    }),

  /**
   * Update an organization member's role
   */
  updateMemberRole: scrumMasterProcedure
    .input(
      z.object({
        userId: z.string(),
        role: z.nativeEnum(TeamRole),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Prevent user from modifying own role to avoid lockouts
      if (ctx.session.user.id === input.userId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot change your own organization role.",
        });
      }

      return ctx.db.user.update({
        where: { id: input.userId },
        data: { role: input.role },
      });
    }),

  /**
   * Resend an invitation
   */
  resendInvite: scrumMasterProcedure
    .input(z.object({ invitationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const updated = await ctx.db.invitation.update({
        where: { id: input.invitationId },
        data: {
          expiresAt,
          status: "PENDING",
        },
        include: {
          organization: { select: { name: true } },
          invitedBy: { select: { name: true } },
        },
      });

      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3001";
      try {
        await sendEmail({
          to: updated.email,
          subject: `Reminder: You've been invited to join ${updated.organization.name}`,
          html: renderUserInvitationEmail({
            orgName: updated.organization.name,
            inviterName: updated.invitedBy?.name || undefined,
            role: updated.role,
            acceptUrl: `${baseUrl}/invitations/${updated.id}`,
          }),
        });
      } catch (e) {
        console.error("Failed to resend invitation email:", e);
      }

      return updated;
    }),

  /**
   * Revoke an invitation
   */
  revokeInvite: scrumMasterProcedure
    .input(z.object({ invitationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.invitation.update({
        where: { id: input.invitationId },
        data: {
          status: "REVOKED",
        },
      });
    }),

  /**
   * Remove a member from the organization
   */
  removeMember: scrumMasterProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.id === input.userId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot remove yourself from the organization.",
        });
      }

      // Unlink organization and delete squad memberships
      await ctx.db.teamMembership.deleteMany({
        where: { userId: input.userId },
      });

      return ctx.db.user.update({
        where: { id: input.userId },
        data: {
          organizationId: null,
        },
      });
    }),
});
