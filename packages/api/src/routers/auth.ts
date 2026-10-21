import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "../trpc";
import { sendVerificationCodeEmail } from "../services/email";
import { GlobalRole, TeamRole } from "@centraxis/db";

export const authRouter = createTRPCRouter({
  /**
   * Check if an email exists and its verification status
   */
  checkEmail: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .query(async ({ ctx, input }) => {
      const email = input.email.trim().toLowerCase();
      const user = await ctx.db.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          name: true,
          emailVerified: true,
        },
      });

      return {
        exists: Boolean(user),
        isVerified: Boolean(user?.emailVerified),
        email,
      };
    }),

  /**
   * Request / Send an 8-digit verification code to email
   */
  sendCode: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        name: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const email = input.email.trim().toLowerCase();

      // Check allowed tenant domains if restricted
      const allowedDomains = process.env.ALLOWED_EMAIL_DOMAINS
        ? process.env.ALLOWED_EMAIL_DOMAINS.split(",").map((d) =>
            d.trim().toLowerCase(),
          )
        : ["centvis.com"];

      const domain = email.split("@")[1]?.toLowerCase();
      if (
        allowedDomains.length > 0 &&
        domain &&
        !allowedDomains.includes(domain)
      ) {
        // Check for invitation if external domain
        const invite = await ctx.db.invitation.findFirst({
          where: { email, status: "PENDING" },
        });
        if (!invite) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `Registrations are restricted to @${allowedDomains.join(", @")} accounts or invited external users.`,
          });
        }
      }

      // Generate 8-digit code
      const code = Math.floor(10000000 + Math.random() * 90000000).toString();

      // Clear previous tokens for this email
      await ctx.db.verificationToken.deleteMany({
        where: { identifier: email },
      });

      // Save new 8-digit code with 15 min expiry
      await ctx.db.verificationToken.create({
        data: {
          identifier: email,
          token: code,
          expires: new Date(Date.now() + 15 * 60 * 1000),
        },
      });

      // Ensure user placeholder exists if brand new
      let user = await ctx.db.user.findUnique({
        where: { email },
      });

      if (!user) {
        const defaultOrg = await ctx.db.organization.findFirst({
          orderBy: { createdAt: "asc" },
        });
        const nameParts = email.split("@")[0]?.split(".") || ["User"];
        const formattedName =
          input.name ||
          nameParts
            .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
            .join(" ");

        const isNilesh = email === "nilesh.garje@centvis.com";

        await ctx.db.user.create({
          data: {
            email,
            name: formattedName,
            emailVerified: null, // explicitly unverified
            organizationId: defaultOrg?.id,
            globalRole: isNilesh ? GlobalRole.SYSTEM_ADMIN : GlobalRole.USER,
            role: isNilesh ? TeamRole.ORG_ADMIN : TeamRole.DEVELOPER,
          },
        });
      }

      // Send the transactional email
      await sendVerificationCodeEmail({
        to: email,
        code,
        expiresMinutes: 15,
      });

      const isDev = process.env.NODE_ENV !== "production";

      return {
        success: true,
        message: `An 8-digit verification code has been sent to ${email}`,
        // Provide simulatedCode in dev for headless testing / developer convenience
        simulatedCode: isDev ? code : undefined,
      };
    }),

  /**
   * Verify the 8-digit code and activate the user's account
   */
  verifyCode: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        code: z.string().length(8, "Code must be exactly 8 digits"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const email = input.email.trim().toLowerCase();
      const code = input.code.trim();

      // Look up valid token
      const validToken = await ctx.db.verificationToken.findFirst({
        where: {
          identifier: email,
          token: code,
        },
      });

      if (!validToken) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid verification code. Please check and try again.",
        });
      }

      if (validToken.expires < new Date()) {
        await ctx.db.verificationToken.deleteMany({
          where: { identifier: email },
        });
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Verification code has expired. Please request a new code.",
        });
      }

      // Remove the consumed token
      await ctx.db.verificationToken.deleteMany({
        where: { identifier: email },
      });

      // Find or create user
      let user = await ctx.db.user.findUnique({
        where: { email },
      });

      const defaultOrg = await ctx.db.organization.findFirst({
        orderBy: { createdAt: "asc" },
      });

      const isNilesh = email === "nilesh.garje@centvis.com";

      if (!user) {
        const nameParts = email.split("@")[0]?.split(".") || ["User"];
        const formattedName = nameParts
          .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
          .join(" ");

        user = await ctx.db.user.create({
          data: {
            email,
            name: formattedName,
            emailVerified: new Date(),
            organizationId: defaultOrg?.id,
            globalRole: isNilesh ? GlobalRole.SYSTEM_ADMIN : GlobalRole.USER,
            role: isNilesh ? TeamRole.ORG_ADMIN : TeamRole.DEVELOPER,
          },
        });
      } else {
        user = await ctx.db.user.update({
          where: { id: user.id },
          data: {
            emailVerified: new Date(),
            organizationId: user.organizationId || defaultOrg?.id,
            ...(isNilesh
              ? {
                  globalRole: GlobalRole.SYSTEM_ADMIN,
                  role: TeamRole.ORG_ADMIN,
                }
              : {}),
          },
        });
      }

      return {
        success: true,
        email: user.email,
        name: user.name,
        isVerified: true,
      };
    }),

  /**
   * Get current verification status for the authenticated user
   */
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
      },
    });

    return {
      isVerified: Boolean(user?.emailVerified),
      email: user?.email,
      name: user?.name,
    };
  }),
});
