# Centraxis Feature Guide & Functional Specifications

This document provides a comprehensive overview of all features and architectural capabilities available in **Centraxis**, an enterprise Agile management platform by Centvis.

---

## Table of Contents

- [1. Path-Based Multi-Client Routing & Tenancy](#1-path-based-multi-client-routing--tenancy)
- [2. Multi-Tier RBAC & Assignee Isolation Matrix](#2-multi-tier-rbac--assignee-isolation-matrix)
- [3. Interactive Kanban Sprint Board](#3-interactive-kanban-sprint-board)
- [4. Sprint Backlog & Item Hierarchy](#4-sprint-backlog--item-hierarchy)
- [5. AI User Story Agent (INVEST Framework)](#5-ai-user-story-agent-invest-framework)
- [6. Global Command Menu (Cmd+K)](#6-global-command-menu-cmdk)
- [7. Sprint Analytics & Metrics](#7-sprint-analytics--metrics)
- [8. Squads & Cross-Functional Teams](#8-squads--cross-functional-teams)
- [9. Client Settings & Global System Administration](#9-client-settings--global-system-administration)
- [10. Official shadcn/ui Design System & Tokens](#10-official-shadcnui-design-system--tokens)
- [11. Dual Authentication: Entra ID SSO & Local Bypass](#11-dual-authentication-entra-id-sso--local-bypass)
- [12. Global Keyboard Shortcuts](#12-global-keyboard-shortcuts)
- [13. Deep Sub-Tasks Management & Quality Gates](#13-deep-sub-tasks-management--quality-gates)
- [14. Discussion Feeds, @Mentions & Notifications](#14-discussion-feeds-mentions--notifications)
- [15. Zero-Touch Bootstrap Administration](#15-zero-touch-bootstrap-administration)

---

## 1. Path-Based Multi-Client Routing & Tenancy

Centraxis leverages the Next.js 15 App Router to enforce path-based tenancy where every client workspace and project is directly addressable and bookmarkable:

- **Client Workspace**: `http://domain.com/[clientSlug]`
  - Displays client branding, description, primary contact email, and active projects list.
  - Quick action buttons to launch project Kanban boards, open backlogs, or create new projects.
- **Sprint Board**: `http://domain.com/[clientSlug]/[projectKey]/board`
  - Real-time sprint board scoped to the specific project under the requested client.
- **Backlog Planning**: `http://domain.com/[clientSlug]/[projectKey]/backlog`
  - Backlog tree, sprint pools, and rank ordering scoped to the target project.
- **Squads View**: `http://domain.com/[clientSlug]/[projectKey]/teams`
  - Squad allocations, members, and cross-functional team breakdown.
- **Metrics View**: `http://domain.com/[clientSlug]/[projectKey]/metrics`
  - Burndown chart, velocity, and story point delivery metrics.
- **Client Workspace Settings**: `http://domain.com/[clientSlug]/settings`
  - Client profile editing (name, primary contact) and view of allocated client members.
- **Global Admin Hub**: `http://domain.com/admin`
  - High-level tenant overview reserved exclusively for `SYSTEM_ADMIN` users.

### Slug Validation & Enforceability

- Client slugs are auto-slugified during client creation (e.g. `"Acme Corp"` -> `"acme-corp"`).
- Strict regex validation: `^[a-z0-9-]+$` with a minimum length of 2 characters.
- Database uniqueness constraint: `@@unique([orgId, slug])` prevents duplicate slugs within an organization.
- Cross-client URL tampering (e.g., navigating to `/client-nexus/CTX/board` when project `CTX` belongs to `client-apex`) immediately returns a clean 404 "Project Not Found" page.

---

## 2. Multi-Tier RBAC & Assignee Isolation Matrix

Centraxis features a fine-grained, 3-tier Role-Based Access Control (RBAC) architecture designed for enterprise compliance and cross-client data security.

### Role Tiers

```
+-----------------------------------------------------------+
|                      SYSTEM_ADMIN                         |
|   (Global organization super-admin: billing, all clients) |
+-----------------------------+-----------------------------+
                              |
              +---------------+---------------+
              |                               |
+-------------v-------------+   +-------------v-------------+
|       Client 1 (Apex)     |   |      Client 2 (Nexus)     |
|  - CLIENT_ADMIN           |   |  - CLIENT_ADMIN           |
|  - CLIENT_MEMBER          |   |  - CLIENT_MEMBER          |
+-------------+-------------+   +-------------+-------------+
              |                               |
       +------+------+                 +------+------+
       |             |                 |             |
+------v----+ +------v----+     +------v----+ +------v----+
|  Project  | |  Project  |     |  Project  | |  Project  |
|  - LEAD   | |  - LEAD   |     |  - LEAD   | |  - LEAD   |
|  - MEMBER | |  - MEMBER |     |  - MEMBER | |  - MEMBER |
|  - VIEWER | |  - VIEWER |     |  - VIEWER | |  - VIEWER |
+-----------+ +-----------+     +-----------+ +-----------+
```

1. **Global Tier (`GlobalRole`)**:
   - `SYSTEM_ADMIN`: Unrestricted global authority across all clients, projects, users, and organization settings.
   - `USER`: Regular authenticated account whose capabilities are determined by client and project memberships.
2. **Client Tier (`ClientRole`)**:
   - `CLIENT_ADMIN`: Can manage client settings, update branding, and allocate projects under their client.
   - `CLIENT_MEMBER`: Can access projects belonging to this client.
3. **Project Tier (`ProjectRole`)**:
   - `PROJECT_LEAD`: Can create sprints, configure sprint goals, manage project teams, and assign work.
   - `MEMBER`: Can create and edit work items, change issue statuses, and participate in sprints.
   - `VIEWER`: Read-only stakeholder access to boards and backlogs.

### Strict Assignee Scoping Enforcement

To prevent cross-tenant data leakage:

- When creating or editing an issue within a project, the **Assignee** selector strictly filters and displays only users who:
  1. Hold a global `SYSTEM_ADMIN` or `ORG_ADMIN` role, OR
  2. Hold a direct `ClientMember` record for the parent client, OR
  3. Hold an explicit `ProjectMember` record for that specific project.
- **Backend API Validation**: The `backlog.createItem` and `backlog.updateItem` tRPC mutations validate user-project association on the server side. Any attempt to tamper or assign an unassociated user from a different client is rejected with HTTP 400 `BAD_REQUEST`.

---

## 3. Interactive Kanban Sprint Board

The board (`/[clientSlug]/[projectKey]/board`) is built with `@hello-pangea/dnd` for smooth, accessible drag-and-drop mechanics:

- **Sprint Header**: Displays active sprint name, status badge, dates, progress percentage bar, story point totals (`Done / Total`), and a **Complete Sprint** action button.
- **Four Standard Kanban Columns**:
  - `To Do`: Newly committed items for the sprint.
  - `In Progress`: Actively being worked on by developers.
  - `In Review`: Code review, QA, or pull request verification.
  - `Done`: Accepted and delivered work items.
- **WIP Counters**: Each column header features live item count and cumulative story point badge.
- **Interactive Work Item Cards**:
  - Item Type badge (Story, Task, Bug, Feature, Epic) with distinctive icons.
  - Issue key badge with hover copy trigger (e.g. `CTX-12`).
  - Priority indicator (`LOW`, `MEDIUM`, `HIGH`, `URGENT`).
  - Fibonacci Story Points badge.
  - Subtask completion progress pill (e.g. `1/3 subtasks`).
  - Assignee avatar with fallback initials.
- **Drawer Inspection**: Clicking any card slides out the full-height `WorkItemDrawer` for editing description, criteria, status, priority, and assignees.

---

## 4. Sprint Backlog & Item Hierarchy

The Backlog view (`/[clientSlug]/[projectKey]/backlog`) provides structured sprint planning:

- **Work Item Hierarchy**:
  - **Epic**: Large multi-sprint strategic initiatives.
  - **Feature**: Functional deliverables grouped under Epics.
  - **Story**: User-centric deliverable items estimated in Fibonacci points.
  - **Task**: Technical engineering tasks.
  - **Bug**: Defects or regressions prioritized for triage.
- **Sprint Pools**: Visual containers for Active Sprints, Upcoming Sprints, and the Unscheduled Backlog pool.
- **Drag Reordering**: Reorder issues within a sprint or drag items across sprints to adjust team commitment.
- **Rank Order State**: Persistent `rankOrder` indexing using fractional indices to support instant drag placement without re-indexing the entire table.

---

## 5. AI User Story Agent (INVEST Framework)

Accessible via `Cmd+J` / `Ctrl+J` or the **AI Story Agent** button in the top navigation:

- **Vercel AI SDK Integration**: Connects to OpenAI models (or custom LLMs) with structured prompt templates.
- **INVEST Framework Adherence**:
  - **I**ndependent: Minimal coupling with other stories.
  - **N**egotiable: Leaves room for implementation discussions.
  - **V**aluable: Delivers tangible value to end users or stakeholders.
  - **E**stimable: Concrete enough to estimate in Fibonacci points.
  - **S**mall: Sized appropriately for completion within a single sprint.
  - **T**estable: Formulates verifiable acceptance criteria in Given-When-Then format.
- **Automated Outputs**:
  - Title in standard agile syntax: _"As a [user], I want to [action], so that [outcome]"_.
  - Detailed description and context.
  - Acceptance Criteria checklist.
  - Suggested Fibonacci story points (`1, 2, 3, 5, 8, 13`).
- **Direct Backlog Insertion**: Click **Add to Backlog** to immediately create the generated item in the current project's backlog.

---

## 6. Global Command Menu (Cmd+K)

The spotlight command palette (`Cmd+K` / `Ctrl+K`) allows instant navigation across the entire organization:

- **Fuzzy Search**: Search across work item titles, issue keys, and descriptions.
- **Client & Project Switcher**: Jump instantly to any client workspace or project sprint board.
- **Quick Actions**:
  - Create new Issue (`C`).
  - Launch AI Story Agent (`Cmd+J`).
  - Toggle Dark / Light theme.
  - Navigate to Account Settings, Members, or Admin Hub.

---

## 7. Sprint Analytics & Metrics

The Metrics view (`/[clientSlug]/[projectKey]/metrics`) provides agile velocity insights:

- **Sprint Burndown Chart**: Visualizes committed story points vs. remaining points over the sprint timeline.
- **Team Velocity Tracking**: Rolling average of completed story points across the last 5 sprints.
- **Delivery Distribution**: Breakdown of delivered work by item type (Stories vs. Bugs vs. Tasks) and priority levels.

---

## 8. Squads & Cross-Functional Teams

Centraxis supports matrixed organizations where cross-functional squads work across multiple projects:

- **Squad Types**: Frontend Squad, Backend Squad, Platform & AI Squad.
- **Team Leadership**: Designate Tech Leads and Scrum Masters per squad.
- **Multi-Project Linkage**: Squads are associated with multiple projects via `ProjectTeam` join relationships.

---

## 9. Client Settings & Global System Administration

### Client Settings (`/[clientSlug]/settings`)

- **Client Profile**: Update client display name, primary contact email, and branding.
- **Client Members**: Inspect all users allocated to this client space alongside their client-level roles (`CLIENT_ADMIN`, `CLIENT_MEMBER`).

### Global Admin Hub (`/admin`)

- Accessible exclusively by users holding the `SYSTEM_ADMIN` global role.
- **Tenant Overview**: High-level telemetry showing all active clients, total projects, and member headcounts.
- **Client Creation**: Launch the `CreateClientDialog` to scaffold new client workspaces with slug validation.
- **Direct Workspace Links**: Quick links to open any client dashboard or jump to members management.

---

## 10. Official shadcn/ui Design System & Tokens

Centraxis is built exclusively with official components from [ui.shadcn.com](https://ui.shadcn.com/) (New York style, Radix UI under the hood):

- **Solid Opaque Popovers & Menus**: All dropdowns, dialogs, selects, and tooltips utilize high-contrast HSL tokens (`--popover: 0 0% 100%` light, `--popover: 224 71% 5%` dark) ensuring zero background transparency or see-through text issues.
- **Centvis Brand Theme**: Centered around an Electric Indigo primary accent (`--primary: 245 82% 62%`) paired with deep slate neutrals.
- **Radix UI Primitives**: Full keyboard navigation, ARIA attributes, focus-trapping, and accessible screen-reader support across all modals, drawers, and form controls.
- **Full-Height Aside Drawers**: Issue detail sheets utilize `h-full max-h-screen` viewport containers with fixed headers and scrollable body sections.

---

## 11. Dual Authentication: Entra ID SSO & Local Bypass

### 1. Microsoft Entra ID (Azure AD) SSO

- Enterprise single sign-on leveraging `@auth/microsoft-entra-id`.
- Scopes: `openid profile email User.Read`.
- Maps Azure AD corporate credentials directly to Centraxis user records.

### 2. Local Development Credentials Bypass

- In development mode (`NODE_ENV !== 'production'`), credentials login is enabled.
- All seed accounts are accessible with password `password123` (or `AdminPassword123!`).
- Auto-redirects users from login to their requested `callbackUrl`.

---

## 12. Global Keyboard Shortcuts

| Shortcut               | Action                                   | Scope                         |
| :--------------------- | :--------------------------------------- | :---------------------------- |
| `Cmd + K` / `Ctrl + K` | Open Spotlight Command Palette           | Global                        |
| `Cmd + J` / `Ctrl + J` | Launch AI Story Generation Agent         | Global                        |
| `C`                    | Open Create Work Item modal              | Global (outside input fields) |
| `Escape`               | Dismiss modal, sheet drawer, or dropdown | Global                        |

---

## 13. Deep Sub-Tasks Management & Quality Gates

Centraxis provides comprehensive sub-task lifecycle management directly within the `WorkItemDrawer`:

### Sub-Task Hierarchy & Execution

- **Parent-Child Linkage**: Any Story, Feature, or Epic can nest multiple child sub-tasks linked via the `parentId` relational hierarchy in Prisma.
- **Roll-Up Metrics**: Header progress bar visually displays completion percentage (`X/Y Done (Z%)`) alongside an animated fill bar that transitions smoothly from slate to emerald.
- **Interactive Checkbox Controls**: Click checkbox icons to instantaneously toggle sub-tasks between `TODO` and `DONE`, automatically striking through text and updating roll-up counts.
- **Inline Title Editing**: Click on any sub-task title to enter inline edit mode and modify the title with instant keyboard confirmation (`Enter` to save, `Escape` to cancel).
- **Scoped Assignee Reassignment**: Quick avatar dropdown allows assigning or re-assigning sub-tasks exclusively to users authorized on that project or client.
- **Rapid Keyboard Entry**: Type in the `+ Add a subtask (press Enter)...` input and hit `Enter` to create sub-tasks seamlessly without losing focus.

### Quality Gate Enforcement

To prevent premature closure of user stories:

- **Server-Side Validation**: When transitioning any work item to `DONE` or `RESOLVED`, the `backlog.updateItem` tRPC mutation checks for any child sub-tasks where `status !== 'DONE'`.
- **Precondition Check (HTTP 412)**: If uncompleted child sub-tasks remain, the mutation rejects the request with `PRECONDITION_FAILED`:
  > _"Cannot resolve work item while child sub-tasks are incomplete. Please complete all sub-tasks first."_
- **Visual Alert Banner**: The `WorkItemDrawer` displays a high-visibility warning banner at the top of the drawer when the quality gate is triggered, keeping the user in full control.

---

## 14. Discussion Feeds, @Mentions & Notifications

Centraxis features a real-time, team-centric collaboration engine built directly into issue workflows:

### Discussion Feeds

- **Rich Markdown Formatting**: Supports GitHub Flavored Markdown (GFM), inline code, fenced code blocks, checklists, and bulleted lists.
- **Author Information**: Shows author avatar, name, and relative timestamps (e.g., _"Just now"_, _"2 hours ago"_).
- **Author Permissions**: Comment authors or administrators can delete comments with confirmation.

### Rich @Mention Engine

- **Trigger Autocomplete**: Typing `@` in any comment textarea displays a floating popover of project-scoped members matching the search query.
- **Keyboard Navigation**: Navigate the user suggestions using `ArrowUp` / `ArrowDown` and confirm with `Enter` or `Tab`.
- **Structured Token Syntax**: Embeds mentions using `@` or `@[User Name](userId)` tokens, parsed into database `Mention` records.
- **Rendered Mention Pills**: Formats mentioned users as interactive indigo pills (`@User Name`) with subtle hover states.
- **Strict Scope Validation**: Prevents unauthorized tagging of cross-tenant users. Only users associated with the target client or project can be notified.

### In-App Notification Hub

- **Top Navigation Bell**: Positioned in the global header with a real-time unread counter badge.
- **Notification Types**:
  - `MENTION`: Tagged in a work item discussion.
  - `ASSIGNED`: Assigned to a work item or subtask.
  - `STATUS_CHANGED`: Updates on tracked issues.
- **Interactive Flyout**: Displays recent notifications with message snippets and direct 1-click navigation to the target work item on the board (`?item=CTX-101`).
- **Batch Actions**: Single-click **Mark all read** clears pending unread notifications across the account.

---

## 15. Zero-Touch Bootstrap Administration

To support automated container deployments, CI pipelines, and cold-start installations with an empty database:

- **Environment-Driven Setup**: Reads credentials from `.env`:
  ```env
  BOOTSTRAP_ADMIN_USERNAME="admin@centvis.com"
  BOOTSTRAP_ADMIN_PASSWORD="AdminPassword123!"
  ```
- **Cold-Start Auto-Creation**: During server initialization or database seeding, if no administrative account exists matching the configured username, Centraxis automatically creates a `SYSTEM_ADMIN` user with `isTemporary = true`.
- **Temporary User Banner**: When logged in via the bootstrap administrator, the UI prominently displays a **Temporary User** warning badge in the user profile menu and top header, reminding administrators to configure permanent identity providers (such as Microsoft Entra ID) and secure their deployment.
