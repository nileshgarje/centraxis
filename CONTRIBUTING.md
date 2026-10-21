# Contributing to Centraxis

Thank you for your interest in contributing to **Centraxis** by Centvis! This guide outlines the development standards, workflow, and testing practices for our Turborepo monorepo.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Prerequisites](#prerequisites)
- [Development Setup](#development-setup)
- [Branching & Commit Conventions](#branching--commit-conventions)
- [Monorepo Package Structure](#monorepo-package-structure)
- [Database Schema Changes & Migrations](#database-schema-changes--migrations)
- [Adding New shadcn/ui Primitives](#adding-new-shadcnui-primitives)
- [Writing and Running Tests](#writing-and-running-tests)
  - [Type Checking](#type-checking)
  - [E2E Testing (Playwright)](#e2e-testing-playwright)
  - [Unit Testing (Vitest)](#unit-testing-vitest)
- [Linting and Formatting](#linting-and-formatting)

---

## Prerequisites

- **Node.js**: `>= 20.0.0`
- **pnpm**: `>= 10.6.0`
- **Docker & Docker Compose**: For containerized PostgreSQL 16 and Redis 7
- **Git**

---

## Development Setup

1. **Clone the repository**:

   ```bash
   git clone https://github.com/centvis/centraxis.git
   cd centraxis
   ```

2. **Install dependencies**:

   ```bash
   pnpm install
   ```

3. **Configure environment variables**:

   ```bash
   cp .env.example .env
   ```

4. **Start Docker services**:

   ```bash
   pnpm docker:up
   ```

5. **Sync Database Schema & Seed**:

   ```bash
   pnpm db:push
   pnpm db:seed
   ```

6. **Start Dev Server**:
   ```bash
   pnpm dev
   ```
   The web application runs at `http://localhost:3001`.

---

## Branching & Commit Conventions

### Branch Naming

- `feature/<client-or-scope>-<short-description>` (e.g. `feature/multi-client-routing`)
- `fix/<scope>-<bug-description>` (e.g. `fix/assignee-select-isolation`)
- `docs/<description>` (e.g. `docs/add-features-guide`)

### Conventional Commits

All commits should follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat(web): add path-based multi-client routing`
- `feat(workflow): add visual state-machine editor and publishable lifecycle`
- `feat(auth): add multi-tenant Entra ID sso and 8-digit verification gate`
- `feat(subtasks): add checklist progress roll-up and quality gate enforcement`
- `feat(mentions): add scoped user mention autocomplete and notification hub`
- `fix(api): strictly scope assignee query to client and project members`
- `refactor(ui): standardize form inputs with official shadcn primitives`
- `docs: add comprehensive architecture and features specifications`
- `test(e2e): add playwright integration tests for subtasks and mentions`

---

## Monorepo Package Structure

When adding or modifying code, ensure changes are scoped to the correct package:

| Package           | Path            | Responsibility                                                   |
| :---------------- | :-------------- | :--------------------------------------------------------------- |
| `@centraxis/web`  | `apps/web`      | Next.js 15 App Router pages, layouts, and feature components     |
| `@centraxis/api`  | `packages/api`  | tRPC v11 routers, context, procedure auth, and business logic    |
| `@centraxis/ui`   | `packages/ui`   | shadcn/ui components, Tailwind theme tokens, icons, and dialogs  |
| `@centraxis/auth` | `packages/auth` | NextAuth.js v5 handlers, credentials provider, Entra ID SSO      |
| `@centraxis/db`   | `packages/db`   | Prisma schema, database client, and seed scripts                 |
| `@centraxis/ai`   | `packages/ai`   | Vercel AI SDK integration, INVEST prompt definitions             |
| `@centraxis/env`  | `packages/env`  | Type-safe environment variable parsing with `@t3-oss/env-nextjs` |

---

## Database Schema Changes & Migrations

When modifying `packages/db/prisma/schema.prisma`:

1. **Update the Schema**: Edit `packages/db/prisma/schema.prisma`.
2. **Push to Local Database**:
   ```bash
   pnpm db:push
   ```
3. **Regenerate Prisma Client**:
   ```bash
   pnpm db:generate
   ```
4. **Update Seed Script** (if new models or required fields were introduced):
   Edit `packages/db/src/seed.ts` and re-seed:
   ```bash
   pnpm db:seed
   ```
5. **Type Check**:
   ```bash
   pnpm type-check
   ```

---

## Adding New shadcn/ui Primitives

We standardize on **shadcn/ui** (New York style) located in `packages/ui`:

```bash
# Example: Adding a command component
pnpm dlx shadcn@latest add command
```

When importing or creating components in `packages/ui`:

- Export the component from `packages/ui/src/index.ts`.
- Ensure high-contrast HSL tokens are used for backgrounds, borders, and popovers.
- Never use inline raw hex colors; always use Tailwind semantic classes (`bg-card`, `text-foreground`, `border-border`, `bg-popover`).

---

## Writing and Running Tests

### Type Checking

Run type checks across all 9 packages concurrently:

```bash
pnpm type-check
```

### E2E Testing (Playwright)

Ensure the development server and database are running, then run:

```bash
# Run all end-to-end test suites sequentially
pnpm test:e2e --workers=1

# Or target a specific test suite
npx playwright test apps/web/e2e/subtasks-and-mentions.spec.ts --workers=1
npx playwright test apps/web/e2e/multi-client-routing.spec.ts --workers=1
npx playwright test apps/web/e2e/rbac-assignee-isolation.spec.ts --workers=1
```

### Unit Testing (Vitest)

```bash
pnpm test
```

---

## Linting and Formatting

Run formatting before committing:

```bash
# Check formatting
pnpm format:check

# Auto-format all code
pnpm format

# Run linter
pnpm lint
```
