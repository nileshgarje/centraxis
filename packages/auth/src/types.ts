import type { DefaultSession } from "next-auth";
import type { TeamRole } from "@centraxis/db";

export interface UserTeamMembership {
  teamId: string;
  role: TeamRole;
}

export interface CentraxisUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role: TeamRole;
  organizationId: string | null;
  memberships: UserTeamMembership[];
}

export interface CentraxisSession {
  user: CentraxisUser;
  expires: string;
}

declare module "next-auth" {
  interface Session {
    user: CentraxisUser & DefaultSession["user"];
  }

  interface User {
    role?: TeamRole;
    organizationId?: string | null;
    memberships?: UserTeamMembership[];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
    organizationId?: string | null;
    role?: TeamRole;
    memberships?: UserTeamMembership[];
  }
}
