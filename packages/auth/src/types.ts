import type { DefaultSession } from "next-auth";
import type { TeamRole, GlobalRole } from "@centraxis/db";

export interface UserTeamMembership {
  teamId: string;
  role: TeamRole;
}

export interface CentraxisUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  globalRole: GlobalRole;
  role: TeamRole;
  organizationId: string | null;
  memberships: UserTeamMembership[];
  isTemporary?: boolean;
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
    globalRole?: GlobalRole;
    role?: TeamRole;
    organizationId?: string | null;
    memberships?: UserTeamMembership[];
    isTemporary?: boolean;
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
  }
}
