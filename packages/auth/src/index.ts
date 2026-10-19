import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db, TeamRole } from "@centraxis/db";
import { env } from "@centraxis/env";
import type { UserTeamMembership } from "./types";
import "./types";

export * from "./types";
export type { Session } from "next-auth";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: {
    strategy: "jwt",
  },
  secret: env.AUTH_SECRET,
  providers: [
    MicrosoftEntraID({
      clientId: env.AZURE_AD_CLIENT_ID,
      clientSecret: env.AZURE_AD_CLIENT_SECRET,
      issuer: `https://login.microsoftonline.com/${env.AZURE_AD_TENANT_ID}/v2.0`,
      authorization: {
        params: {
          scope: "openid profile email User.Read",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }

      if (token.id) {
        const dbUser = await db.user.findUnique({
          where: { id: token.id as string },
          select: {
            id: true,
            role: true,
            organizationId: true,
            memberships: {
              select: {
                teamId: true,
                role: true,
              },
            },
          },
        });

        if (dbUser) {
          token.organizationId = dbUser.organizationId;
          token.role = dbUser.role;
          token.memberships = dbUser.memberships as UserTeamMembership[];
        }
      }

      return token;
    },

    session({ session, token }) {
      if (session.user && token) {
        session.user.id = (token.id as string) ?? session.user.id;
        session.user.organizationId = (token.organizationId as string | null) ?? null;
        session.user.role = (token.role as TeamRole) ?? TeamRole.DEVELOPER;
        session.user.memberships = (token.memberships as UserTeamMembership[]) ?? [];
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
});
