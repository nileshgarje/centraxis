# Centraxis Architecture & Technical Specifications

This document outlines the architectural blueprint, data model, API contracts, and security enforcement mechanisms of **Centraxis**.

---

## 1. Monorepo Package Topology

Centraxis is built as a high-velocity monorepo managed by [Turborepo](https://turbo.build/) and [pnpm workspaces](https://pnpm.io/workspaces):

```mermaid
flowchart TD
    subgraph Apps
        Web["@centraxis/web (Next.js 15 App Router)"]
    end

    subgraph Internal Packages
        API["@centraxis/api (tRPC v11 Server Routers)"]
        UI["@centraxis/ui (shadcn/ui & Tailwind Primitives)"]
        Auth["@centraxis/auth (NextAuth.js v5 / Entra ID)"]
        DB["@centraxis/db (Prisma ORM Client & Schema)"]
        AI["@centraxis/ai (Vercel AI SDK Story Generator)"]
        Env["@centraxis/env (Type-safe env validation via Zod)"]
    end

    Web --> API
    Web --> UI
    Web --> Auth
    Web --> DB
    Web --> Env

    API --> DB
    API --> Auth
    API --> AI
    API --> Env

    Auth --> DB
    Auth --> Env
```

---

## 2. Directory Hierarchy (`apps/web/src/app`)

The application routes are structured using the Next.js App Router:

```text
apps/web/src/app/
├── (auth)/
│   ├── login/
│   │   └── page.tsx                  # Public login gateway
│   └── auth/
│       └── signin/page.tsx           # Credentials & Entra ID signin form
│
├── (dashboard)/
│   ├── [clientSlug]/
│   │   ├── layout.tsx                # ClientLayout: validates slug, loads client, wraps ClientProvider
│   │   ├── page.tsx                  # ClientHomePage: client projects overview
│   │   ├── settings/
│   │   │   └── page.tsx              # Client Settings: profile, branding, client members
│   │   └── [projectKey]/
│   │       ├── layout.tsx            # ProjectLayout: validates project, loads active sprint, wraps ProjectProvider
│   │       ├── board/
│   │       │   └── page.tsx          # Interactive Kanban board
│   │       ├── backlog/
│   │       │   └── page.tsx          # Sprint backlog planning & rank ordering
│   │       ├── teams/
│   │       │   └── page.tsx          # Squad allocations & cross-functional teams
│   │       └── metrics/
│   │           └── page.tsx          # Sprint metrics & burndown analytics
│   │
│   ├── admin/
│   │   └── page.tsx                  # Global SYSTEM_ADMIN tenant overview
│   │
│   └── settings/
│       ├── profile/page.tsx          # User profile settings
│       ├── clients/page.tsx          # Client tenancy management
│       └── members/page.tsx          # Organization members & access management
│
├── api/
│   ├── auth/[...nextauth]/route.ts   # NextAuth API route handlers
│   └── trpc/[trpc]/route.ts          # tRPC HTTP batch request handler
│
├── layout.tsx                        # Root layout: ThemeProvider, TRPCReactProvider, Toaster
├── page.tsx                          # Root redirect: auto-resolves user's default client workspace
└── middleware.ts                     # Next.js Route Guard Middleware (session cookie verification)
```

---

## 3. Relational Schema & Entity Relationships

The data layer is managed with **Prisma ORM** connecting to **PostgreSQL 16**:

```mermaid
erDiagram
    Organization ||--o{ User : "contains"
    Organization ||--o{ Client : "contains"
    Organization ||--o{ Team : "contains"

    Client ||--o{ Project : "owns"
    Client ||--o{ ClientMember : "allocates"

    Project ||--o{ ProjectMember : "allocates"
    Project ||--o{ ProjectTeam : "links"
    Project ||--o{ Sprint : "schedules"
    Project ||--o{ WorkItem : "tracks"

    User ||--o{ ClientMember : "belongs to"
    User ||--o{ ProjectMember : "belongs to"
    User ||--o{ TeamMembership : "belongs to"
    User ||--o{ WorkItem : "assigned to"

    Team ||--o{ TeamMembership : "members"
    Team ||--o{ ProjectTeam : "assigned to"

    Sprint ||--o{ WorkItem : "contains"
    WorkItem ||--o{ WorkItem : "subtasks / children"
    WorkItem ||--o{ Comment : "contains"

    User ||--o{ Comment : "authors"
    User ||--o{ Mention : "targeted in"
    User ||--o{ Notification : "receives"

    Comment ||--o{ Mention : "contains"
    Mention ||--o| Notification : "triggers"
```

### Core Relational Models

- **`Organization`**: Multi-tenant top-level boundary (e.g. `Centvis`).
- **`Client`**: Client tenant space (e.g. `Client Apex`, slug `client-apex`). Unique by `[orgId, slug]`.
- **`ClientMember`**: Explicit join table associating users with clients, assigning `ClientRole` (`CLIENT_ADMIN`, `CLIENT_MEMBER`).
- **`Project`**: Agile project space (e.g. `Centraxis Core`, key `CTX`) linked to a parent `Client`.
- **`ProjectMember`**: Explicit join table associating users with projects, assigning `ProjectRole` (`PROJECT_LEAD`, `MEMBER`, `VIEWER`).
- **`Team` / `Squad`**: Cross-functional team (Frontend, Backend, Platform) linked to projects via `ProjectTeam`.
- **`Sprint`**: Time-boxed sprint cycle with `SprintStatus` (`PLANNED`, `ACTIVE`, `COMPLETED`).
- **`WorkItem`**: Agile issue with `WorkItemType` (`EPIC`, `FEATURE`, `STORY`, `TASK`, `BUG`), `WorkItemStatus` (`BACKLOG`, `TODO`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`), `WorkItemPriority`, hierarchical self-relation (`parentId`), and fractional `rankOrder`.
- **`Comment`**: Discussion entry on a work item with rich Markdown body and relational authorship.
- **`Mention`**: Extracted `@mention` entity linking comments to specific mentioned users.
- **`Notification`**: In-app alert record with `NotificationType` (`MENTION`, `ASSIGNED`, `STATUS_CHANGED`), unread state (`isRead`), direct links, and optional relation to `Mention`.
- **`User`**: Identity model containing `globalRole` (`SYSTEM_ADMIN`, `USER`), `isTemporary` boolean for bootstrap administration, and membership associations across clients, projects, and squads.

---

## 4. tRPC v11 API Architecture

All client-server communications use type-safe [tRPC](https://trpc.io/) procedures:

### Router Inventory

| Router         | File                                       | Procedures                                                                              | Purpose                                                                            |
| :------------- | :----------------------------------------- | :-------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------- |
| `clients`      | `packages/api/src/routers/client.ts`       | `list`, `getBySlug`, `getById`, `create`, `update`                                      | Client workspace resolution, tenancy, and slug enforcement                         |
| `project`      | `packages/api/src/routers/project.ts`      | `list`, `getByClientAndKey`, `getAssignableUsers`, `create`                             | Project metadata, cross-client resolution, and scoped assignee querying            |
| `workItem`     | `packages/api/src/routers/work-item.ts`    | `getSubTasks`, `createSubTask`, `updateSubTaskStatus`, `updateSubTask`, `deleteSubTask` | Sub-task lifecycle management, sequential keys, and roll-up metrics                |
| `comment`      | `packages/api/src/routers/comment.ts`      | `listByWorkItem`, `create`, `delete`                                                    | Markdown comment feeds, scoped `@mention` parsing, and transactional notifications |
| `notification` | `packages/api/src/routers/notification.ts` | `getUnreadCount`, `listRecent`, `markAsRead`, `markAllAsRead`                           | Header notification bell, unread counters, and notification feed                   |
| `board`        | `packages/api/src/routers/board.ts`        | `getBoardData`, `moveCard`                                                              | Active sprint Kanban board card fetching and column transitions                    |
| `backlog`      | `packages/api/src/routers/backlog.ts`      | `getTree`, `getItems`, `createItem`, `updateItem`, `reorder`                            | Hierarchical backlog tree, sprint pools, quality gate enforcement, and item CRUD   |
| `sprint`       | `packages/api/src/routers/sprint.ts`       | `list`, `getActive`, `create`, `start`, `complete`                                      | Sprint lifecycle planning, active sprint resolution, and completion                |
| `org`          | `packages/api/src/routers/org.ts`          | `getDetails`, `listMembers`, `updateUserAccess`                                         | Global organization management, user role matrices, and invitations                |
| `ai`           | `packages/api/src/routers/ai.ts`           | `generateStory`, `listLogs`                                                             | AI INVEST story drafting powered by Vercel AI SDK                                  |
| `metrics`      | `packages/api/src/routers/metrics.ts`      | `getSprintMetrics`, `getVelocity`                                                       | Burndown chart data points and velocity analytics                                  |

---

## 5. Security & Authorization Pipeline

### A. Route Guard Middleware (`apps/web/src/middleware.ts`)

- Runs on Edge runtime before page render.
- Validates the presence of session tokens in cookies (`authjs.session-token` / `next-auth.session-token`).
- Automatically intercepts unauthenticated requests and redirects to `/login?callbackUrl=...`.
- Bypasses static assets, `_next/*`, `favicon.ico`, and `/api/*` endpoints.

### B. Client & Project Layout Guards

- `[clientSlug]/layout.tsx`: Invokes `api.clients.getBySlug({ slug: clientSlug })`. If the client does not exist or the non-admin user is not a member of the client, it returns an "Access Denied / Not Found" error card.
- `[clientSlug]/[projectKey]/layout.tsx`: Invokes `api.project.getByClientAndKey({ clientSlug, projectKey })`. Validates that the project key strictly belongs to the requested client slug. Mismatched projects return a 404 "Project Not Found" block.

### C. tRPC Procedure Authentication

Procedures are protected using contextual middleware in `packages/api/src/trpc.ts`:

- `publicProcedure`: Unrestricted access.
- `protectedProcedure`: Enforces that `ctx.session.user` is present.
- `adminProcedure`: Enforces that `ctx.session.user.globalRole === "SYSTEM_ADMIN"` or `role === "ORG_ADMIN"`.
- `scrumMasterProcedure`: Enforces Scrum Master, Lead, or Admin privileges.

### D. Assignee Scoping Validation

When creating or modifying an issue (`backlog.createItem` / `backlog.updateItem` / `workItem.createSubTask`):

- The server checks whether `assigneeId` is associated with the project's parent `clientId` or `projectId`.
- If an unassociated user ID is submitted, the mutation throws:
  ```ts
  throw new TRPCError({
    code: "BAD_REQUEST",
    message:
      "Selected user is not a member of this project or client workspace.",
  });
  ```

### E. Sub-Task Quality Gate Enforcement

When marking any parent work item status as `DONE` or `RESOLVED` (`backlog.updateItem`):

- The server queries child sub-tasks linked via `parentId`.
- If any child item is not in status `DONE`, the mutation rejects the transition:
  ```ts
  throw new TRPCError({
    code: "PRECONDITION_FAILED",
    message:
      "Cannot resolve work item while child sub-tasks are incomplete. Please complete all sub-tasks first.",
  });
  ```

### F. Scoped @Mention Authorization

When parsing comments for `@mention` tags (`comment.create`):

- Mentions are parsed using structured syntax `@[Name](userId)` and `@username`.
- Target users are strictly validated against project and client memberships. Cross-tenant users cannot be notified.
- Transactional `Notification` rows are created exclusively for authorized scoped users. Self-mentions are ignored.

### G. Cold-Start Bootstrap Administration Security

- Cold-start initial environments read `BOOTSTRAP_ADMIN_USERNAME` and `BOOTSTRAP_ADMIN_PASSWORD` from `.env`.
- An initial `SYSTEM_ADMIN` user is provisioned with `isTemporary: true`.
- Sessions for temporary users reflect `isTemporary: true`, alerting UI consumers to display visible temporary warnings.

---

## 6. Design Tokens & Styling Architecture

The design system standardizes on [ui.shadcn.com](https://ui.shadcn.com/) with solid opaque tokens defined in `packages/ui/src/styles/globals.css`:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 224 71.4% 4.1%;
  --card: 0 0% 100%;
  --card-foreground: 224 71.4% 4.1%;
  --popover: 0 0% 100%;
  --popover-foreground: 224 71.4% 4.1%;
  --primary: 245 82% 62%; /* Centvis Electric Indigo */
  --primary-foreground: 210 40% 98%;
  --border: 220 13% 91%;
  --input: 220 13% 91%;
  --ring: 245 82% 62%;
  --radius: 0.5rem;
}

.dark {
  --background: 224 71% 4%; /* Deep Slate Neutral */
  --foreground: 210 40% 98%;
  --card: 224 71% 6%;
  --card-foreground: 210 40% 98%;
  --popover: 224 71% 5%;
  --popover-foreground: 210 40% 98%;
  --border: 215 27.9% 16.9%;
  --input: 215 27.9% 16.9%;
}
```

This guarantees high contrast and non-transparent backgrounds across all dropdown menus, selects, sheets, and popovers.
