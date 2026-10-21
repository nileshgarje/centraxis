import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db, TeamRole, GlobalRole } from "@centraxis/db";
import { env } from "@centraxis/env";
import type { UserTeamMembership } from "./types";
import "./types";

export * from "./types";
export type { Session } from "next-auth";

const isDev = process.env.NODE_ENV !== "production";

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
      profile(profile) {
        return {
          id: profile.sub,
          name:
            profile.name ||
            `${profile.given_name ?? ""} ${profile.family_name ?? ""}`.trim() ||
            profile.email,
          email: profile.email || profile.preferred_username,
          image: profile.picture ?? null,
          globalRole: GlobalRole.USER,
          role: TeamRole.DEVELOPER,
        };
      },
    }),

    // Local Testing Bypass via Credentials (Restricted to Development Mode)
    ...(isDev
      ? [
          Credentials({
            id: "credentials",
            name: "Development Credentials",
            credentials: {
              email: { label: "Email or Username", type: "text" },
              password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
              if (!credentials?.email || !credentials?.password) {
                return null;
              }

              const rawUsername = (
                process.env.BOOTSTRAP_ADMIN_USERNAME ||
                process.env.KC_BOOTSTRAP_ADMIN_USERNAME ||
                "admin@centvis.com"
              ).trim();
              const bootstrapPassword =
                process.env.BOOTSTRAP_ADMIN_PASSWORD ||
                process.env.KC_BOOTSTRAP_ADMIN_PASSWORD ||
                "AdminPassword123!";

              const bootstrapEmail = rawUsername.includes("@")
                ? rawUsername.toLowerCase()
                : `${rawUsername.toLowerCase()}@centvis.com`;
              const bootstrapUsername = rawUsername.includes("@")
                ? rawUsername.split("@")[0]!.toLowerCase()
                : rawUsername.toLowerCase();

              const input = (credentials.email as string).trim().toLowerCase();
              const isInputBootstrapMatch =
                input === bootstrapEmail || input === bootstrapUsername;

              let user = await db.user.findFirst({
                where: {
                  OR: [
                    { email: input },
                    ...(isInputBootstrapMatch
                      ? [{ email: bootstrapEmail }]
                      : []),
                  ],
                },
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                  password: true,
                  role: true,
                  globalRole: true,
                  organizationId: true,
                  isTemporary: true,
                },
              });

              if (!user) {
                // If database has 0 users (fresh/empty database), auto-bootstrap the initial organization & SYSTEM_ADMIN from BOOTSTRAP_ADMIN_*
                const userCount = await db.user.count();
                if (userCount === 0) {
                  let org = await db.organization.findFirst();
                  if (!org) {
                    org = await db.organization.create({
                      data: {
                        name: "Centvis",
                        slug: "centvis",
                      },
                    });
                  }
                  const passStr = credentials.password as string;
                  const initialPass = isInputBootstrapMatch
                    ? bootstrapPassword
                    : passStr;
                  const hashedPassword = await bcrypt.hash(
                    initialPass || "password123",
                    10,
                  );
                  const nameParts = input.split("@")[0]?.split(".") || [
                    "admin",
                  ];
                  const baseName = nameParts
                    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
                    .join(" ");

                  user = await db.user.create({
                    data: {
                      email: isInputBootstrapMatch ? bootstrapEmail : input,
                      name: `${baseName || "Bootstrap Administrator"} (Temporary)`,
                      password: hashedPassword,
                      role: TeamRole.ORG_ADMIN,
                      globalRole: GlobalRole.SYSTEM_ADMIN,
                      isTemporary: true,
                      organizationId: org.id,
                    },
                    select: {
                      id: true,
                      name: true,
                      email: true,
                      image: true,
                      password: true,
                      role: true,
                      globalRole: true,
                      organizationId: true,
                      isTemporary: true,
                    },
                  });

                  console.warn(
                    `[BOOTSTRAP_ADMIN] Initial temporary administrator provisioned from environment: ${user.email}`,
                  );
                } else {
                  return null;
                }
              }

              const passStr = credentials.password as string;
              const isBootstrapMatch =
                (user.email?.toLowerCase() === bootstrapEmail ||
                  user.isTemporary) &&
                passStr === bootstrapPassword;
              const isFallbackMatch =
                passStr === "AdminPassword123!" || passStr === "password123";
              const isValid =
                isBootstrapMatch ||
                isFallbackMatch ||
                (user.password
                  ? await bcrypt.compare(passStr, user.password)
                  : false);

              if (!isValid) {
                return null;
              }

              return {
                id: user.id,
                name: user.name,
                email: user.email,
                image: user.image,
                role: user.role,
                globalRole: user.globalRole,
                organizationId: user.organizationId,
                isTemporary: user.isTemporary,
              };
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "microsoft-entra-id" && user.email) {
        // Restrict auto-provisioning to allowed tenant domains if specified
        const allowedDomains = process.env.ALLOWED_EMAIL_DOMAINS
          ? process.env.ALLOWED_EMAIL_DOMAINS.split(",").map((d) =>
              d.trim().toLowerCase(),
            )
          : ["centvis.com"]; // Default allowed domain

        const userDomain = user.email.split("@")[1]?.toLowerCase();
        if (
          allowedDomains.length > 0 &&
          userDomain &&
          !allowedDomains.includes(userDomain)
        ) {
          const pendingInvite = await db.invitation.findFirst({
            where: {
              email: user.email.toLowerCase(),
              status: "PENDING",
            },
          });
          if (!pendingInvite) {
            console.warn(
              `[Auth] Blocked Entra ID signin from uninvited external domain: ${userDomain}`,
            );
            return false;
          }
        }

        // Assign to default Organization if user has no orgId
        const defaultOrg = await db.organization.findFirst({
          orderBy: { createdAt: "asc" },
        });

        if (defaultOrg) {
          const dbUser = await db.user.findUnique({
            where: { email: user.email.toLowerCase() },
          });

          if (dbUser && !dbUser.organizationId) {
            await db.user.update({
              where: { id: dbUser.id },
              data: { organizationId: defaultOrg.id },
            });
          }
        }
      }
      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.globalRole = (user as any).globalRole;
        token.organizationId = (user as any).organizationId;
        token.isTemporary = (user as any).isTemporary;
      }

      if (token.id) {
        const dbUser = await db.user.findUnique({
          where: { id: token.id as string },
          select: {
            id: true,
            role: true,
            globalRole: true,
            organizationId: true,
            isTemporary: true,
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
          token.globalRole = dbUser.globalRole;
          token.isTemporary = dbUser.isTemporary;
          token.memberships = dbUser.memberships as UserTeamMembership[];
        }
      }

      return token;
    },

    session({ session, token }) {
      if (session.user && token) {
        session.user.id = (token.id as string) ?? session.user.id;
        session.user.organizationId =
          (token.organizationId as string | null) ?? null;
        session.user.role = (token.role as TeamRole) ?? TeamRole.DEVELOPER;
        session.user.globalRole =
          (token.globalRole as GlobalRole) ??
          (session.user.role === TeamRole.ORG_ADMIN
            ? GlobalRole.SYSTEM_ADMIN
            : GlobalRole.USER);
        session.user.isTemporary = Boolean(token.isTemporary);
        session.user.memberships =
          (token.memberships as UserTeamMembership[]) ?? [];
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
});
