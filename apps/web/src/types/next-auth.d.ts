import type { DefaultSession } from "@auth/core/types";
import type { CentraxisUser, UserTeamMembership } from "@centraxis/auth";
import type { TeamRole, GlobalRole } from "@centraxis/db";

declare module "@auth/core/types" {
  interface User {
    id?: string;
    name?: string | null;
    email?: string | null;
    emailVerified?: Date | string | null;
    image?: string | null;
    globalRole?: GlobalRole;
    role?: TeamRole;
    organizationId?: string | null;
    memberships?: UserTeamMembership[];
    isTemporary?: boolean;
  }

  interface Session {
    user: CentraxisUser & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
    organizationId?: string | null;
    globalRole?: GlobalRole;
    role?: TeamRole;
    memberships?: UserTeamMembership[];
    isTemporary?: boolean;
    emailVerified?: Date | string | null;
  }
}
