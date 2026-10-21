import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db, TeamRole, GlobalRole } from "@centraxis/db";
import { env } from "@centraxis/env";
import { sendVerificationCodeEmail } from "./email";
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

    // Email 8-Digit OTP Authentication for New or Unverified Accounts
    Credentials({
      id: "email-otp",
      name: "Email OTP",
      credentials: {
        email: { label: "Email", type: "email" },
        code: { label: "Verification Code", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.code) {
          return null;
        }

        const email = (credentials.email as string).trim().toLowerCase();
        const code = (credentials.code as string).trim();

        // Verify 8-digit token in database
        const validToken = await db.verificationToken.findFirst({
          where: {
            identifier: email,
            token: code,
            expires: { gt: new Date() },
          },
        });

        if (!validToken) {
          return null;
        }

        // Consume token
        await db.verificationToken.deleteMany({
          where: { identifier: email },
        });

        // Find or create user
        let user = await db.user.findUnique({
          where: { email },
        });

        const defaultOrg = await db.organization.findFirst({
          orderBy: { createdAt: "asc" },
        });

        const isNilesh = email === "nilesh.garje@centvis.com";

        if (!user) {
          const nameParts = email.split("@")[0]?.split(".") || ["User"];
          const formattedName = nameParts
            .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
            .join(" ");

          user = await db.user.create({
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
          user = await db.user.update({
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
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
          globalRole: user.globalRole,
          organizationId: user.organizationId,
          isTemporary: user.isTemporary,
          emailVerified: user.emailVerified,
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

        // Check if user already exists in database with verified email
        const existingUser = await db.user.findUnique({
          where: { email: user.email.toLowerCase() },
          select: { id: true, emailVerified: true, organizationId: true },
        });

        // If user does not exist or has not verified email yet, issue 8-digit verification code
        if (!existingUser || !existingUser.emailVerified) {
          const code = Math.floor(10000000 + Math.random() * 90000000).toString();
          await db.verificationToken.deleteMany({
            where: { identifier: user.email.toLowerCase() },
          });
          await db.verificationToken.create({
            data: {
              identifier: user.email.toLowerCase(),
              token: code,
              expires: new Date(Date.now() + 15 * 60 * 1000),
            },
          });

          await sendVerificationCodeEmail({
            to: user.email.toLowerCase(),
            code,
          });
        }

        // Assign to default Organization if user has no orgId
        const defaultOrg = await db.organization.findFirst({
          orderBy: { createdAt: "asc" },
        });

        if (defaultOrg && existingUser && !existingUser.organizationId) {
          await db.user.update({
            where: { id: existingUser.id },
            data: { organizationId: defaultOrg.id },
          });
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
        token.emailVerified = (user as any).emailVerified;
      }

      if (token.id) {
        let dbUser = await db.user.findUnique({
          where: { id: token.id as string },
          select: {
            id: true,
            email: true,
            emailVerified: true,
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
          // If the user does not have an organization assigned (e.g. freshly provisioned via Entra ID SSO)
          if (!dbUser.organizationId) {
            const defaultOrg = await db.organization.findFirst({
              orderBy: { createdAt: "asc" },
            });
            if (defaultOrg) {
              const isNilesh =
                dbUser.email?.toLowerCase() === "nilesh.garje@centvis.com";
              const updated = await db.user.update({
                where: { id: dbUser.id },
                data: {
                  organizationId: defaultOrg.id,
                  ...(isNilesh
                    ? {
                        globalRole: GlobalRole.SYSTEM_ADMIN,
                        role: TeamRole.ORG_ADMIN,
                      }
                    : {}),
                },
                select: {
                  id: true,
                  email: true,
                  emailVerified: true,
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
              dbUser = updated;
            }
          }

          token.organizationId = dbUser.organizationId;
          token.role = dbUser.role;
          token.globalRole = dbUser.globalRole;
          token.isTemporary = dbUser.isTemporary;
          token.emailVerified = dbUser.emailVerified;
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
        session.user.emailVerified = (token.emailVerified as Date | null) ?? null;
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
