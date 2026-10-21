# Centraxis (by Centvis) — E2E Implementation Plan

**Platform:** Multi-Project, Multi-Team Agile Project Management System with AI Story Agent  
**Stack:** Turborepo T3 (`Next.js 15+ App Router`, `tRPC v11`, `Prisma ORM`, `Tailwind CSS / shadcn/ui`, `Auth.js v5 / Microsoft Entra ID`)  
**Target Environment:** Google Antigravity / Cloud Workspace  
**Team Scale:** 25 Users (2–4 Cross-functional squads)

---

## 1. System Architecture & Monorepo Structure

```text
centraxis/
├── apps/
│   └── web/                         # Next.js 15 App Router, React 19, shadcn/ui, boards
├── packages/
│   ├── api/                         # tRPC router definitions, root context, procedures
│   ├── auth/                        # Auth.js (v5) core, Microsoft Entra ID OAuth provider
│   ├── db/                          # Prisma schema, migrations, connection singleton
│   ├── ai/                          # Vercel AI SDK, prompt pipelines, Zod schema extraction
│   ├── ui/                          # Shared UI primitive library (Radix + Tailwind CSS)
│   ├── eslint-config/               # Shared ESLint configuration
│   └── typescript-config/           # Strict tsconfig bases
├── turbo.json                       # Turborepo task pipelines and caching
├── docker-compose.yml               # Local PostgreSQL 16 + Redis 7
├── pnpm-workspace.yaml              # Workspace package definitions
└── package.json                     # Monorepo root scripts
```

---

## Phase 0: Workspace Scaffolding & Turborepo Setup

### Objectives

Initialize the monorepo pipeline, configure package workspaces, and establish containerized local backing services.

### Step-by-Step Implementation

1. **Initialize Workspace:**
   - Initialize a pnpm workspace with Turborepo:
     ```bash
     pnpm dlx create-turbo@latest agile-pm --example t3
     ```
   - Set up directory structure: `apps/web`, `packages/api`, `packages/auth`, `packages/db`, `packages/ai`, `packages/ui`.

2. **Configure `turbo.json` Pipeline:**
   - Define pipeline tasks for `build`, `lint`, `type-check`, `db:generate`, and `db:push`.
   - Configure environment variables pass-through (`DATABASE_URL`, `NEXTAUTH_SECRET`, `AZURE_AD_CLIENT_ID`, `OPENAI_API_KEY`).

3. **Set Up Local Services (`docker-compose.yml`):**
   - Configure **PostgreSQL 16** on port `5432`.
   - Configure **Redis 7** on port `6379` for rate limiting, pub/sub board cache, and session caching.

4. **Environment Variables Configuration:**
   - Create centralized environment validation using `@t3-oss/env-core` in `packages/auth`, `packages/db`, and `apps/web`.

---

## Phase 1: Database Layer & Data Modeling (`packages/db`)

### Objectives

Define a normalized relational schema supporting multi-tenancy, cross-project teams, hierarchical backlogs, sprints, and AI audit records.

### Step-by-Step Implementation

1. **Define Prisma Schema (`packages/db/prisma/schema.prisma`):**
   - **IAM & Tenancy:**
     - `User`, `Account`, `Session`.
     - `Organization` (top-level account container).
     - `Team` and `TeamMembership` with roles: `ORG_ADMIN`, `SCRUM_MASTER`, `DEVELOPER`, `VIEWER`.
   - **Project & Team Matrix:**
     - `Project`: Contains project keys, metadata, and default sprint duration.
     - `ProjectTeam`: Many-to-many join table allowing shared teams across multiple projects.
   - **Sprint Planning:**
     - `Sprint`: `id`, `name`, `goal`, `startDate`, `endDate`, `status` (`PLANNED`, `ACTIVE`, `COMPLETED`), `teamId`.
   - **Backlog Items (Hierarchical):**
     - `WorkItem`: `id`, `type` (`EPIC`, `FEATURE`, `STORY`, `TASK`, `BUG`), `status` (`BACKLOG`, `TODO`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`), `priority` (`LOW`, `MEDIUM`, `HIGH`, `URGENT`), `storyPoints` (Int/Float), `rankOrder` (Float/Lexorank), `parentId` (self-referencing), `projectId`, `sprintId`, `assigneeId`, `reporterId`.
   - **AI Auditing:**
     - `AiStoryLog`: `id`, `rawPrompt`, `generatedPayload` (JSON), `acceptedByUserId`, `modelUsed`, `createdAt`.

2. **Run Migrations & Client Generation:**

   ```bash
   pnpm --filter @agile/db prisma migrate dev --name init_agile_schema
   pnpm --filter @agile/db prisma generate
   ```

3. **Database Seeding (`seed.ts`):**
   - Script seed data: 1 Organization, 3 Teams (Frontend, Backend, Platform), 2 Projects, and 25 test user profiles.

---

## Phase 2: Authentication & RBAC via Microsoft Entra ID (`packages/auth`)

### Objectives

Integrate enterprise Single Sign-On (SSO) with Microsoft Entra ID (Azure AD) using Auth.js v5 and role mapping.

### Step-by-Step Implementation

1. **Microsoft Entra ID App Registration:**
   - Register application in the Azure Portal / Entra ID Admin Center.
   - Configure redirect URI: `https://<domain>/api/auth/callback/microsoft-entra-id`.
   - Add delegated permissions: `OpenID`, `profile`, `email`, `User.Read`.

2. **Auth Package Configuration (`packages/auth/src/config.ts`):**
   - Configure `MicrosoftEntraID` provider with `AZURE_AD_CLIENT_ID`, `AZURE_AD_CLIENT_SECRET`, and `AZURE_AD_TENANT_ID`.
   - Wire the Prisma Adapter (`@auth/prisma-adapter`) to ensure automatic user and account provisioning on first sign-in.

3. **Session & Token Enrichment:**
   - Enrich JWT and session callbacks to append `userId`, active `organizationId`, and workspace role to `session.user`.

4. **tRPC Security Middleware (`packages/api/src/trpc.ts`):**
   - `protectedProcedure`: Verifies authenticated session.
   - `projectRoleProcedure(requiredRole)`: Verifies user has appropriate read/write privileges within the active project.

---

## Phase 3: Type-Safe API Layer (`packages/api`)

### Objectives

Build end-to-end type-safe tRPC routers for projects, backlog queries, sprint execution, and drag-and-drop state changes.

### Step-by-Step Implementation

1. **`team` & `project` Routers:**
   - Procedures: `listByOrg`, `createProject`, `assignTeamToProject`, `listMembers`.

2. **`backlog` Router:**
   - `getBacklogItems`: Query items filtered by `projectId`, `teamId`, `sprintId`, `assigneeId`, and item `type`.
   - `reorderWorkItem`: Implements drag-and-drop reordering with Lexorank or midpoint float calculations.
   - `createWorkItem`: Zod schema validation for creating Epics, Stories, Bugs, and Tasks.

3. **`sprint` Router:**
   - `createSprint`, `startSprint`, `completeSprint`.
   - `moveItemsToSprint`: Batch assign backlog items to target sprints.
   - `getSprintBoard`: Fetch items categorized into standard board lanes (`TODO`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`).
   - `updateItemStatus`: Mutates card status; enforces state rules (e.g., blocks moving parent stories to `DONE` if incomplete child subtasks exist).

---

## Phase 4: AI Story Creation Agent (`packages/ai`)

### Objectives

Implement an LLM agent that converts brief feature prompts into INVEST-compliant user stories with Gherkin acceptance criteria and initial story-point estimates.

### Step-by-Step Implementation

1. **Schema & Contract Definition (`packages/ai/src/schema.ts`):**
   - Define structured output validation using Zod:
     ```typescript
     export const UserStoryOutputSchema = z.object({
       title: z.string().max(80),
       story: z.string().describe("As a... I want to... So that..."),
       acceptanceCriteria: z
         .array(z.string())
         .describe("Given-When-Then criteria"),
       estimatedPoints: z.enum(["1", "2", "3", "5", "8", "13"]),
       estimationRationale: z.string(),
       subTasks: z.array(z.string()),
     });
     ```

2. **Agent Service (`packages/ai/src/generator.ts`):**
   - Integrate Vercel AI SDK (`generateObject` or `streamObject`) using OpenAI / Anthropic models.
   - Formulate system prompt enforcing INVEST principles (Independent, Negotiable, Valuable, Estimable, Small, Testable) and enterprise domain constraints.

3. **tRPC AI Router (`packages/api/src/routers/ai.ts`):**
   - `generateStoryFromPrompt`: Accepts feature concept string and project context; returns typed JSON output.
   - `acceptAndCommitStory`: Transactionally writes the generated story to the `WorkItem` table and logs metadata to `AiStoryLog`.

---

## Phase 5: Frontend UI & Board Experiences (`apps/web`)

### Objectives

Build the complete interactive user interface with shadcn/ui and `@hello-pangea/dnd` for backlog grooming, sprint tracking, and AI generation flows.

### Step-by-Step Implementation

1. **Workspace Shell & Navigation:**
   - Global navigation with Team/Project dropdown switchers.
   - Breadcrumbs: `[Organization] / [Project] / Backlog | Active Sprint | Team Capacity`.

2. **Backlog Planning View:**
   - Collapsible multi-level tree (Epics $\rightarrow$ Stories $\rightarrow$ Tasks).
   - Drag-and-drop capability to move items from the Backlog pool directly into upcoming sprints.

3. **Active Sprint Board (`apps/web/src/components/board`):**
   - 4-lane Kanban board (`To Do`, `In Progress`, `Code Review / QA`, `Done`).
   - Drag-and-drop card movements via `@hello-pangea/dnd` or `@dnd-kit`.
   - Optimistic UI updates with automatic tRPC cache synchronization.

4. **AI Story Generator Dialog (`apps/web/src/components/ai-modal`):**
   - Modal input accessible directly from the backlog toolbar.
   - Preview screen displaying generated Title, User Story, Gherkin Scenarios, and Suggested Story Points.
   - Interactive "Insert into Backlog" button triggering direct database creation.

---

## Phase 6: Metrics, E2E Testing & Deployment

### Objectives

Incorporate sprint metrics, perform integration testing, and prepare Docker production release containers.

### Step-by-Step Implementation

1. **Sprint Metrics Engine:**
   - Burndown line chart displaying ideal points vs. remaining points per day.
   - Team velocity tracker calculating rolling 3-sprint completed story points.

2. **Automated Testing Suite:**
   - **Unit/Integration:** Vitest for tRPC procedures and AI schema validation.
   - **E2E Tests (Playwright):**
     - Microsoft SSO authentication flow.
     - Backlog item creation via AI prompt generator.
     - Drag-and-drop card movement across board columns.
     - Sprint completion wizard and rollover of incomplete work items.

3. **Deployment in Google Antigravity / Production:**
   - Generate standalone Docker build:
     ```bash
     pnpm turbo prune --scope=web --docker
     ```
   - Deploy PostgreSQL on managed database service with connection pooling.
   - Configure environment variables for Azure AD credentials, database connection strings, and AI provider API keys.

---

## Execution & Deliverables Matrix

| Phase       | Milestone             | Deliverable / Verification Check                                                 |
| ----------- | --------------------- | -------------------------------------------------------------------------------- |
| **Phase 0** | Workspace Baseline    | `pnpm turbo build` executes successfully across all workspaces.                  |
| **Phase 1** | Schema & Database     | Prisma migrations executed; seed script populates 25 users and teams.            |
| **Phase 2** | Enterprise SSO & RBAC | Microsoft Entra ID login succeeds and provisions user session with roles.        |
| **Phase 3** | tRPC API Layer        | Backlog and Sprint CRUD procedures pass all unit and integration tests.          |
| **Phase 4** | AI Story Agent        | Calling `ai.generateStoryFromPrompt` returns structured INVEST-compliant story.  |
| **Phase 5** | Frontend & Boards     | Interactive backlog grooming and drag-and-drop sprint boards operating smoothly. |
| **Phase 6** | Deployment & QA       | Full Playwright E2E suite passes green; Docker production container boots.       |
