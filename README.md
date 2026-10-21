# Centraxis by Centvis

[![Turborepo](https://img.shields.io/badge/Turborepo-v2.11-EF4444.svg?logo=turborepo&logoColor=white)](https://turbo.build/)
[![Next.js](https://img.shields.io/badge/Next.js-15.5_App_Router-black.svg?logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v3.4-38B2AC.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-New_York-black.svg?logo=shadcnui&logoColor=white)](https://ui.shadcn.com/)
[![tRPC](https://img.shields.io/badge/tRPC-v11-2596BE.svg?logo=trpc&logoColor=white)](https://trpc.io/)
[![Prisma](https://img.shields.io/badge/Prisma-v6-2D3748.svg?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791.svg?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Playwright](https://img.shields.io/badge/Playwright-E2E_Tested-2EAD33.svg?logo=playwright&logoColor=white)](https://playwright.dev/)

> **Centraxis** is a next-generation, high-performance Agile Project Management & Issue Tracking Platform built for modern enterprise engineering organizations. Developed under **Centvis**, it features URL path-based multi-client tenancy, multi-project workspace isolation, strict multi-tier RBAC scoping, interactive drag-and-drop Kanban sprint boards, AI-powered INVEST story drafting, and canonical shadcn/ui components.

---

## Table of Contents

- [Key Highlights](#key-highlights)
- [Monorepo Architecture](#monorepo-architecture)
- [URL Path-Based Multi-Client Routing](#url-path-based-multi-client-routing)
- [Prerequisites](#prerequisites)
- [Quick Start Guide](#quick-start-guide)
  - [1. Clone and Install Dependencies](#1-clone-and-install-dependencies)
  - [2. Configure Environment Variables](#2-configure-environment-variables)
  - [3. Start Infrastructure with Docker](#3-start-infrastructure-with-docker)
  - [4. Push Schema & Seed Database](#4-push-schema--seed-database)
  - [5. Run Development Server](#5-run-development-server)
- [Default Seed Accounts & RBAC Roles](#default-seed-accounts--rbac-roles)
- [Available npm / pnpm Scripts](#available-npm--pnpm-scripts)
- [Testing](#testing)
- [Documentation Index](#documentation-index)

---

## Key Highlights

- **Path-Based Multi-Client Tenancy (`/[clientSlug]/[projectKey]/...`)**: Complete URL-driven workspace isolation supporting multiple enterprise clients, each housing dedicated projects and sprint boards.
- **Strict Assignee & Role Scoping**: Multi-tier RBAC (`SYSTEM_ADMIN`, `CLIENT_ADMIN`, `PROJECT_LEAD`, `MEMBER`, `VIEWER`). Issue assignees are strictly scoped to users associated with the target client or project.
- **Deep Sub-Tasks Management & Progress Roll-Up**: Link child sub-tasks to parent stories with live visual progress bars (`X/Y Done (Z%)`), inline title editing, toggleable completion checkboxes, and quick keyboard entry.
- **Quality Gate Completion Enforcement**: Enforces that parent stories cannot transition to `DONE` / `RESOLVED` while child sub-tasks remain incomplete, raising HTTP 412 Precondition Failed with clear user alerts.
- **Discussion Feed, @Mentions & Notifications**: Rich comment feeds supporting Markdown and `@` autocomplete mentions for project members. In-app notification hub with live unread badge counters and 1-click item links.
- **Cold-Start Bootstrap Admin**: Zero-touch initial administration via `BOOTSTRAP_ADMIN_USERNAME` and `BOOTSTRAP_ADMIN_PASSWORD` from `.env`, with clear `Temporary User` UI badges.
- **Interactive Drag-and-Drop Kanban Board**: Real-time card reordering, swimlanes, column WIP counters, and active sprint management powered by `@hello-pangea/dnd`.
- **Sprint Backlog & Hierarchy**: Full-fidelity backlog planning with Epics, Features, Stories, Tasks, and Bugs. Rank reordering and drag-into-sprint capabilities.
- **AI Story Generation Agent (`Cmd+J` / `Ctrl+J`)**: Vercel AI SDK integration drafting structured user stories following the INVEST framework, complete with acceptance criteria and Fibonacci story points.
- **Global Command Menu (`Cmd+K` / `Ctrl+K`)**: Rapid spotlight search across work items, projects, client workspaces, and quick navigation actions.
- **Official shadcn/ui Primitives**: Built exclusively with canonical, accessible Radix UI primitives styled with Centvis enterprise HSL tokens (solid opaque dropdowns, cards, sheets, dialogs, and dark/light mode toggle).
- **Dual Authentication Engine**: Microsoft Entra ID (Azure AD) SSO for enterprise identity alongside a local development credential bypass.

---

## Monorepo Architecture

Centraxis is structured as a modular [Turborepo](https://turbo.build/) monorepo:

```text
jira/
├── apps/
│   └── web/                   # Next.js 15 App Router frontend application
│       ├── src/
│       │   ├── app/           # App Router pages and path-based layouts
│       │   │   ├── (auth)/    # Authentication routes (login, signin)
│       │   │   └── (dashboard)/
│       │   │       ├── [clientSlug]/          # Client-scoped workspace routes
│       │   │       │   ├── [projectKey]/      # Project-scoped sprint board, backlog, teams, metrics
│       │   │       │   └── settings/          # Client settings & members
│       │   │       └── admin/                 # Global SYSTEM_ADMIN overview
│       │   ├── components/    # Feature components (board, backlog, work items, navigation)
│       │   ├── context/       # ClientContext, ProjectContext providers
│       │   └── trpc/          # tRPC client & React Query bindings
│       └── e2e/               # Playwright end-to-end integration test suites
│
├── packages/
│   ├── api/                   # tRPC v11 router & procedure declarations
│   ├── auth/                  # NextAuth.js v5 / Auth.js configuration & Entra ID provider
│   ├── db/                    # Prisma ORM schema, migrations, seed script & client
│   ├── ui/                    # Standardized shadcn/ui component library & design tokens
│   ├── ai/                    # Vercel AI SDK story generation engine & prompt templates
│   ├── env/                   # Type-safe environment variable schema validation via @t3-oss/env
│   ├── eslint-config/         # Shared ESLint configurations across packages
│   └── typescript-config/     # Shared tsconfig.json bases
│
├── docker-compose.yml         # Containerized PostgreSQL 16 & Redis 7 services
├── playwright.config.ts       # Playwright browser testing configuration
└── package.json               # Root scripts & dev dependencies
```

---

## URL Path-Based Multi-Client Routing

Centraxis provides an intuitive, bookmarkable URL routing hierarchy:

| Route Path                                                | Description                                                                       | Access Level                             |
| :-------------------------------------------------------- | :-------------------------------------------------------------------------------- | :--------------------------------------- |
| `http://localhost:3001/`                                  | Root auto-resolver: redirects authenticated users to their first client workspace | Authenticated                            |
| `http://localhost:3001/[clientSlug]`                      | Client workspace home: client overview, active projects list, quick links         | Assigned Client Member or `SYSTEM_ADMIN` |
| `http://localhost:3001/[clientSlug]/[projectKey]/board`   | Interactive Kanban Sprint Board for the target project                            | Project/Client Member or `SYSTEM_ADMIN`  |
| `http://localhost:3001/[clientSlug]/[projectKey]/backlog` | Sprint backlog planning, epic tracking, and rank ordering                         | Project/Client Member or `SYSTEM_ADMIN`  |
| `http://localhost:3001/[clientSlug]/[projectKey]/teams`   | Squad allocations and cross-functional team breakdown                             | Project/Client Member or `SYSTEM_ADMIN`  |
| `http://localhost:3001/[clientSlug]/[projectKey]/metrics` | Sprint burndown charts, velocity analytics, and delivery distribution             | Project/Client Member or `SYSTEM_ADMIN`  |
| `http://localhost:3001/[clientSlug]/settings`             | Client profile, branding, contact email, and allocated client members             | `CLIENT_ADMIN` or `SYSTEM_ADMIN`         |
| `http://localhost:3001/admin`                             | Global System Administration: tenant allocations, organizations, and global RBAC  | `SYSTEM_ADMIN` only                      |
| `http://localhost:3001/login`                             | Authentication gateway (Microsoft Entra ID SSO & local development login)         | Public                                   |

---

## Prerequisites

Before running the project locally, ensure you have the following installed:

- **Node.js**: `v20.0.0` or higher (`v22.x` recommended)
- **pnpm**: `v10.6.0` or higher (`corepack enable pnpm` or `npm install -g pnpm`)
- **Docker & Docker Compose**: Required for running the local PostgreSQL and Redis containers
- **Modern Web Browser**: Chrome / Chromium (version 120+)

---

## Quick Start Guide

### 1. Clone and Install Dependencies

```bash
git clone https://github.com/centvis/centraxis.git
cd centraxis

# Install all workspace dependencies via pnpm
pnpm install
```

### 2. Configure Environment Variables

Create a `.env` file in the repository root by copying `.env.example`:

```bash
cp .env.example .env
```

Ensure `.env` matches your local ports and Docker configuration:

```env
# Node Environment
NODE_ENV="development"

# PostgreSQL Database (port 5433 mapped in docker-compose.yml)
DATABASE_URL="postgresql://centraxis:centraxis_password@localhost:5433/centraxis_db?schema=public"

# Redis Cache & PubSub (port 6380 mapped in docker-compose.yml)
REDIS_URL="redis://localhost:6380"

# NextAuth Authentication
AUTH_SECRET="centraxis-super-secret-auth-key-32-chars-minimum"
NEXTAUTH_URL="http://localhost:3001"

# Bootstrap Admin (Optional cold-start initial user)
BOOTSTRAP_ADMIN_USERNAME="admin@centvis.com"
BOOTSTRAP_ADMIN_PASSWORD="AdminPassword123!"

# Microsoft Entra ID (Azure AD) SSO (Optional in local dev mode)
AZURE_AD_CLIENT_ID="placeholder-entra-client-id"
AZURE_AD_CLIENT_SECRET="placeholder-entra-client-secret"
AZURE_AD_TENANT_ID="placeholder-entra-tenant-id"

# AI Story Agent (Optional for local mock / OpenAI API)
OPENAI_API_KEY="sk-placeholder-api-key"
```

### 3. Start Infrastructure with Docker

Launch PostgreSQL 16 and Redis 7 in the background:

```bash
pnpm docker:up
```

Verify that the containers are healthy:

```bash
docker ps
```

### 4. Push Schema & Seed Database

Generate Prisma client artifacts, synchronize the PostgreSQL schema, and seed test clients, projects, users, and sprint data:

```bash
# Push schema to PostgreSQL database
pnpm db:push

# Populate database with rich enterprise mock data
pnpm db:seed
```

### 5. Run Development Server

Start all workspace applications concurrently via Turborepo:

```bash
pnpm dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser.

---

## Default Seed Accounts & RBAC Roles

The database seed provisions realistic enterprise accounts. You can sign in using any of the following accounts with the password **`password123`** (or **`AdminPassword123!`**):

| Name                     | Email                      | Global Role    | Assigned Client               | Project Access           | Permissions                                                            |
| :----------------------- | :------------------------- | :------------- | :---------------------------- | :----------------------- | :--------------------------------------------------------------------- |
| **System Administrator** | `admin@centvis.com`        | `SYSTEM_ADMIN` | All Clients                   | All Projects             | Global root admin; unrestricted access to all tenants and `/admin` hub |
| **Alex Morgan**          | `alex.morgan@centvis.com`  | `SYSTEM_ADMIN` | All Clients                   | All Projects             | Org Administrator & platform lead                                      |
| **Rachel Green**         | `rachel.green@centvis.com` | `USER`         | `client-apex`                 | `CTX` (`Centraxis Core`) | `CLIENT_ADMIN` on Apex; `PROJECT_LEAD` on Core                         |
| **Marcus Vance**         | `marcus.vance@centvis.com` | `USER`         | `client-nexus`                | `MOB` (`Mobile App`)     | `CLIENT_ADMIN` on Nexus; `PROJECT_LEAD` on Mobile                      |
| **Liam Chen**            | `liam.chen@centvis.com`    | `USER`         | `client-apex`                 | `CTX` (`Centraxis Core`) | `MEMBER` on Core project (cannot access Nexus/MOB)                     |
| **Lucas Silva**          | `lucas.silva@centvis.com`  | `USER`         | `client-nexus`                | `MOB` (`Mobile App`)     | `MEMBER` on Mobile project (cannot access Apex/CTX)                    |
| **Olivia Patel**         | `olivia.patel@centvis.com` | `USER`         | `client-apex`, `client-nexus` | `CTX`, `MOB`             | Cross-client & cross-project shared member                             |
| **Emily Watson**         | `emily.watson@centvis.com` | `USER`         | `client-apex`                 | `CTX` (`Centraxis Core`) | `VIEWER` (Read-only contributor on Core)                               |

---

## Available npm / pnpm Scripts

Run these scripts from the repository root:

| Command            | Action                                                                              |
| :----------------- | :---------------------------------------------------------------------------------- |
| `pnpm dev`         | Starts Next.js development server on port 3001 with Turborepo watching all packages |
| `pnpm build`       | Compiles all monorepo packages and builds the production Next.js output             |
| `pnpm type-check`  | Runs `tsc --noEmit` across all 9 monorepo packages concurrently                     |
| `pnpm lint`        | Runs ESLint across all apps and packages                                            |
| `pnpm format`      | Formats all TypeScript, TSX, Markdown, and JSON files via Prettier                  |
| `pnpm test`        | Runs unit and integration test suites with Vitest                                   |
| `pnpm test:e2e`    | Executes Playwright end-to-end browser test suites                                  |
| `pnpm db:generate` | Regenerates Prisma Client types                                                     |
| `pnpm db:push`     | Synchronizes Prisma schema directly with the connected PostgreSQL database          |
| `pnpm db:seed`     | Seeds the database with clients, projects, users, work items, and sprint data       |
| `pnpm docker:up`   | Starts Docker PostgreSQL and Redis background containers                            |
| `pnpm docker:down` | Stops Docker containers                                                             |
| `pnpm clean`       | Cleans Turbo caches and deletes `node_modules`                                      |

---

## Testing

Centraxis has rigorous automated test suites covering unit logic, RBAC matrix security, and browser E2E workflows.

### Run Type Checking

```bash
pnpm type-check
```

### Run Playwright E2E Tests

```bash
# Run subtasks management, quality gates, and @mentions notification test suite
npx playwright test apps/web/e2e/subtasks-and-mentions.spec.ts --workers=1

# Run multi-client path routing test suite
npx playwright test apps/web/e2e/multi-client-routing.spec.ts --workers=1

# Run RBAC matrix and assignee isolation test suite
npx playwright test apps/web/e2e/rbac-assignee-isolation.spec.ts --workers=1

# Run full screen audit test suite
npx playwright test apps/web/e2e/all-screens-verification.spec.ts --workers=1
```

---

## Documentation Index

- **[FEATURES.md](./FEATURES.md)**: Comprehensive deep dive into all platform capabilities, keyboard shortcuts, AI agent prompts, and workflows.
- **[ARCHITECTURE.md](./ARCHITECTURE.md)**: System design, relational entity-relationship diagrams, tRPC API endpoint contracts, and security middleware specs.
