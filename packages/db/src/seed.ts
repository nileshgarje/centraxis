import { PrismaClient, TeamRole, SprintStatus, WorkItemType, WorkItemStatus, WorkItemPriority } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting Centraxis database seed...");
  const defaultHashedPassword = await bcrypt.hash("password123", 10);

  // Clean existing records in reverse dependency order
  await prisma.aiStoryLog.deleteMany();
  await prisma.workItem.deleteMany();
  await prisma.sprint.deleteMany();
  await prisma.projectTeam.deleteMany();
  await prisma.project.deleteMany();
  await prisma.teamMembership.deleteMany();
  await prisma.team.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  // 1. Seed Organization
  console.log("Creating Organization: Centvis...");
  const org = await prisma.organization.create({
    data: {
      name: "Centvis",
      slug: "centvis",
    },
  });

  // 2. Seed 3 Squads / Teams
  console.log("Creating 3 Cross-functional Squads...");
  const frontendTeam = await prisma.team.create({
    data: {
      name: "Frontend Squad",
      description: "UI primitives, interactive boards, and client UX",
      organizationId: org.id,
    },
  });

  const backendTeam = await prisma.team.create({
    data: {
      name: "Backend Squad",
      description: "tRPC API, IAM, enterprise SSO, and real-time state engine",
      organizationId: org.id,
    },
  });

  const platformAiTeam = await prisma.team.create({
    data: {
      name: "Platform & AI Squad",
      description: "Vercel AI SDK story generation, LLM prompts, and cloud infrastructure",
      organizationId: org.id,
    },
  });

  // 3. Seed 2 Projects
  console.log("Creating 2 Projects...");
  const coreProject = await prisma.project.create({
    data: {
      name: "Centraxis Core",
      key: "CTX",
      description: "Next-gen multi-project agile management platform",
      defaultSprintDurationDays: 14,
      organizationId: org.id,
    },
  });

  const mobileProject = await prisma.project.create({
    data: {
      name: "Centraxis Mobile App",
      key: "MOB",
      description: "Companion iOS/Android application for sprint planning and review",
      defaultSprintDurationDays: 14,
      organizationId: org.id,
    },
  });

  // 4. Link Squads to Projects (Matrix Organization)
  await prisma.projectTeam.createMany({
    data: [
      { projectId: coreProject.id, teamId: frontendTeam.id },
      { projectId: coreProject.id, teamId: backendTeam.id },
      { projectId: coreProject.id, teamId: platformAiTeam.id },
      { projectId: mobileProject.id, teamId: frontendTeam.id },
      { projectId: mobileProject.id, teamId: backendTeam.id },
    ],
  });

  // 5. Seed 25 Test Users
  console.log("Creating 25 Test Users with RBAC roles...");
  
  interface UserSeedSpec {
    name: string;
    email: string;
    orgRole: TeamRole;
    teamId: string;
    teamRole: TeamRole;
  }

  const userSpecs: UserSeedSpec[] = [
    // Org Admins
    {
      name: "System Administrator",
      email: "admin@centvis.com",
      orgRole: TeamRole.ORG_ADMIN,
      teamId: platformAiTeam.id,
      teamRole: TeamRole.ORG_ADMIN,
    },
    {
      name: "Alex Morgan",
      email: "alex.morgan@centvis.com",
      orgRole: TeamRole.ORG_ADMIN,
      teamId: platformAiTeam.id,
      teamRole: TeamRole.ORG_ADMIN,
    },
    // Scrum Masters (3)
    {
      name: "Rachel Green",
      email: "rachel.green@centvis.com",
      orgRole: TeamRole.SCRUM_MASTER,
      teamId: frontendTeam.id,
      teamRole: TeamRole.SCRUM_MASTER,
    },
    {
      name: "Marcus Vance",
      email: "marcus.vance@centvis.com",
      orgRole: TeamRole.SCRUM_MASTER,
      teamId: backendTeam.id,
      teamRole: TeamRole.SCRUM_MASTER,
    },
    {
      name: "Sarah Connor",
      email: "sarah.connor@centvis.com",
      orgRole: TeamRole.SCRUM_MASTER,
      teamId: platformAiTeam.id,
      teamRole: TeamRole.SCRUM_MASTER,
    },
    // Frontend Developers (6)
    {
      name: "Liam Chen",
      email: "liam.chen@centvis.com",
      orgRole: TeamRole.DEVELOPER,
      teamId: frontendTeam.id,
      teamRole: TeamRole.DEVELOPER,
    },
    {
      name: "Sophia Rodriguez",
      email: "sophia.rodriguez@centvis.com",
      orgRole: TeamRole.DEVELOPER,
      teamId: frontendTeam.id,
      teamRole: TeamRole.DEVELOPER,
    },
    {
      name: "Ethan Wright",
      email: "ethan.wright@centvis.com",
      orgRole: TeamRole.DEVELOPER,
      teamId: frontendTeam.id,
      teamRole: TeamRole.DEVELOPER,
    },
    {
      name: "Olivia Patel",
      email: "olivia.patel@centvis.com",
      orgRole: TeamRole.DEVELOPER,
      teamId: frontendTeam.id,
      teamRole: TeamRole.DEVELOPER,
    },
    {
      name: "Noah Kim",
      email: "noah.kim@centvis.com",
      orgRole: TeamRole.DEVELOPER,
      teamId: frontendTeam.id,
      teamRole: TeamRole.DEVELOPER,
    },
    {
      name: "Emma Davis",
      email: "emma.davis@centvis.com",
      orgRole: TeamRole.DEVELOPER,
      teamId: frontendTeam.id,
      teamRole: TeamRole.DEVELOPER,
    },
    // Backend Developers (6)
    {
      name: "Lucas Silva",
      email: "lucas.silva@centvis.com",
      orgRole: TeamRole.DEVELOPER,
      teamId: backendTeam.id,
      teamRole: TeamRole.DEVELOPER,
    },
    {
      name: "Aria Takahashi",
      email: "aria.takahashi@centvis.com",
      orgRole: TeamRole.DEVELOPER,
      teamId: backendTeam.id,
      teamRole: TeamRole.DEVELOPER,
    },
    {
      name: "Mason Hall",
      email: "mason.hall@centvis.com",
      orgRole: TeamRole.DEVELOPER,
      teamId: backendTeam.id,
      teamRole: TeamRole.DEVELOPER,
    },
    {
      name: "Isabella Martinez",
      email: "isabella.martinez@centvis.com",
      orgRole: TeamRole.DEVELOPER,
      teamId: backendTeam.id,
      teamRole: TeamRole.DEVELOPER,
    },
    {
      name: "James Wilson",
      email: "james.wilson@centvis.com",
      orgRole: TeamRole.DEVELOPER,
      teamId: backendTeam.id,
      teamRole: TeamRole.DEVELOPER,
    },
    {
      name: "Mia Anderson",
      email: "mia.anderson@centvis.com",
      orgRole: TeamRole.DEVELOPER,
      teamId: backendTeam.id,
      teamRole: TeamRole.DEVELOPER,
    },
    // Platform & AI Developers (6)
    {
      name: "Benjamin Taylor",
      email: "benjamin.taylor@centvis.com",
      orgRole: TeamRole.DEVELOPER,
      teamId: platformAiTeam.id,
      teamRole: TeamRole.DEVELOPER,
    },
    {
      name: "Charlotte Thomas",
      email: "charlotte.thomas@centvis.com",
      orgRole: TeamRole.DEVELOPER,
      teamId: platformAiTeam.id,
      teamRole: TeamRole.DEVELOPER,
    },
    {
      name: "Henry Jackson",
      email: "henry.jackson@centvis.com",
      orgRole: TeamRole.DEVELOPER,
      teamId: platformAiTeam.id,
      teamRole: TeamRole.DEVELOPER,
    },
    {
      name: "Amelia White",
      email: "amelia.white@centvis.com",
      orgRole: TeamRole.DEVELOPER,
      teamId: platformAiTeam.id,
      teamRole: TeamRole.DEVELOPER,
    },
    {
      name: "Daniel Harris",
      email: "daniel.harris@centvis.com",
      orgRole: TeamRole.DEVELOPER,
      teamId: platformAiTeam.id,
      teamRole: TeamRole.DEVELOPER,
    },
    {
      name: "Harper Martin",
      email: "harper.martin@centvis.com",
      orgRole: TeamRole.DEVELOPER,
      teamId: platformAiTeam.id,
      teamRole: TeamRole.DEVELOPER,
    },
    // Viewers / Stakeholders (3)
    {
      name: "Emily Watson",
      email: "emily.watson@centvis.com",
      orgRole: TeamRole.VIEWER,
      teamId: frontendTeam.id,
      teamRole: TeamRole.VIEWER,
    },
    {
      name: "David Beckham",
      email: "david.beckham@centvis.com",
      orgRole: TeamRole.VIEWER,
      teamId: backendTeam.id,
      teamRole: TeamRole.VIEWER,
    },
    {
      name: "Clara Oswald",
      email: "clara.oswald@centvis.com",
      orgRole: TeamRole.VIEWER,
      teamId: platformAiTeam.id,
      teamRole: TeamRole.VIEWER,
    },
  ];

  const createdUsers = [];
  for (const spec of userSpecs) {
    const user = await prisma.user.create({
      data: {
        name: spec.name,
        email: spec.email,
        password: defaultHashedPassword,
        emailVerified: new Date(),
        image: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(spec.name)}`,
        role: spec.orgRole,
        organizationId: org.id,
        memberships: {
          create: {
            teamId: spec.teamId,
            role: spec.teamRole,
          },
        },
      },
    });
    createdUsers.push(user);
  }

  // 6. Seed Sprints for CTX Project
  console.log("Creating Sprints...");
  const now = new Date();
  const sprintStart = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
  const sprintEnd = new Date(now.getTime() + 11 * 24 * 60 * 60 * 1000); // in 11 days

  const activeSprint = await prisma.sprint.create({
    data: {
      name: "Sprint 1 — Workspace & Core Services",
      goal: "Deliver production Turborepo T3 setup, Entra ID SSO, and initial backlog CRUD",
      status: SprintStatus.ACTIVE,
      startDate: sprintStart,
      endDate: sprintEnd,
      projectId: coreProject.id,
      teamId: backendTeam.id,
    },
  });

  const nextSprint = await prisma.sprint.create({
    data: {
      name: "Sprint 2 — Interactive Boards & AI Agent",
      goal: "Implement Kanban drag-and-drop board and Vercel AI SDK INVEST story generation",
      status: SprintStatus.PLANNED,
      startDate: new Date(sprintEnd.getTime() + 24 * 60 * 60 * 1000),
      endDate: new Date(sprintEnd.getTime() + 15 * 24 * 60 * 60 * 1000),
      projectId: coreProject.id,
      teamId: frontendTeam.id,
    },
  });

  // 7. Seed Hierarchical Work Items (Epic -> Feature -> Story -> Task/Bug)
  console.log("Creating Hierarchical Work Items...");

  // Epic
  const epic = await prisma.workItem.create({
    data: {
      key: "CTX-1",
      title: "Core Platform Authentication & Authorization",
      description: "Enterprise SSO with Microsoft Entra ID and RBAC matrix",
      type: WorkItemType.EPIC,
      status: WorkItemStatus.IN_PROGRESS,
      priority: WorkItemPriority.URGENT,
      storyPoints: 21,
      rankOrder: 1000,
      projectId: coreProject.id,
      sprintId: activeSprint.id,
      assigneeId: createdUsers[0]?.id, // Alex Morgan
      reporterId: createdUsers[1]?.id, // Rachel Green
    },
  });

  // Feature under Epic
  const feature = await prisma.workItem.create({
    data: {
      key: "CTX-2",
      title: "Microsoft Entra ID OAuth 2.0 Provider",
      description: "Integrate @auth/prisma-adapter and Azure AD provider with tenant validation",
      type: WorkItemType.FEATURE,
      status: WorkItemStatus.IN_PROGRESS,
      priority: WorkItemPriority.HIGH,
      storyPoints: 8,
      rankOrder: 2000,
      parentId: epic.id,
      projectId: coreProject.id,
      sprintId: activeSprint.id,
      assigneeId: createdUsers[2]?.id, // Marcus Vance
      reporterId: createdUsers[0]?.id,
    },
  });

  // Stories under Feature
  const story1 = await prisma.workItem.create({
    data: {
      key: "CTX-3",
      title: "As an engineer, I want SSO sign-in via Microsoft Entra ID",
      description: "Given corporate Azure credentials, When I click 'Sign in with Microsoft', Then my session is provisioned with organization and team roles.",
      acceptanceCriteria: "Scenario: Successful login\nGiven valid Entra ID tenant token\nWhen redirected to /api/auth/callback/microsoft-entra-id\nThen create user if not exists and populate session.user.role",
      type: WorkItemType.STORY,
      status: WorkItemStatus.IN_PROGRESS,
      priority: WorkItemPriority.HIGH,
      storyPoints: 5,
      rankOrder: 3000,
      parentId: feature.id,
      projectId: coreProject.id,
      sprintId: activeSprint.id,
      assigneeId: createdUsers[10]?.id, // Lucas Silva
      reporterId: createdUsers[2]?.id,
    },
  });

  const story2 = await prisma.workItem.create({
    data: {
      key: "CTX-4",
      title: "As a Scrum Master, I want an AI agent to draft INVEST user stories",
      description: "Given a feature description prompt, the AI agent returns structured stories with Gherkin acceptance criteria.",
      acceptanceCriteria: "Scenario: INVEST generation\nGiven raw prompt 'Export burndown chart to PDF'\nWhen AI agent executes\nThen output matches UserStoryOutputSchema and suggested story points",
      type: WorkItemType.STORY,
      status: WorkItemStatus.TODO,
      priority: WorkItemPriority.MEDIUM,
      storyPoints: 5,
      rankOrder: 4000,
      projectId: coreProject.id,
      sprintId: activeSprint.id,
      assigneeId: createdUsers[16]?.id, // Benjamin Taylor
      reporterId: createdUsers[3]?.id, // Sarah Connor
    },
  });

  // Tasks under Story 1
  await prisma.workItem.create({
    data: {
      key: "CTX-5",
      title: "Configure NextAuth Prisma adapter mapping",
      description: "Verify Account, Session, and User tables handle Azure tokens cleanly",
      type: WorkItemType.TASK,
      status: WorkItemStatus.DONE,
      priority: WorkItemPriority.HIGH,
      storyPoints: 2,
      rankOrder: 5000,
      parentId: story1.id,
      projectId: coreProject.id,
      sprintId: activeSprint.id,
      assigneeId: createdUsers[11]?.id, // Aria Takahashi
      reporterId: createdUsers[10]?.id,
    },
  });

  // Bug
  await prisma.workItem.create({
    data: {
      key: "CTX-6",
      title: "Fix session callback missing active organizationId",
      description: "Ensure JWT token persists active organization slug for multitenant queries",
      type: WorkItemType.BUG,
      status: WorkItemStatus.TODO,
      priority: WorkItemPriority.URGENT,
      storyPoints: 1,
      rankOrder: 6000,
      parentId: story1.id,
      projectId: coreProject.id,
      sprintId: activeSprint.id,
      assigneeId: createdUsers[10]?.id,
      reporterId: createdUsers[1]?.id,
    },
  });

  // Backlog pool items (for Sprint 2 planning)
  await prisma.workItem.create({
    data: {
      key: "CTX-7",
      title: "Interactive drag-and-drop sprint board lanes",
      description: "Build 4-lane Kanban with optimistic state sync using @hello-pangea/dnd",
      type: WorkItemType.STORY,
      status: WorkItemStatus.BACKLOG,
      priority: WorkItemPriority.HIGH,
      storyPoints: 8,
      rankOrder: 7000,
      projectId: coreProject.id,
      sprintId: nextSprint.id,
      assigneeId: createdUsers[4]?.id, // Liam Chen
      reporterId: createdUsers[1]?.id,
    },
  });

  // 8. AI Story Audit Log
  console.log("Creating AI Story Audit Log...");
  await prisma.aiStoryLog.create({
    data: {
      rawPrompt: "As a Scrum Master, I want an AI agent to draft INVEST user stories",
      generatedPayload: {
        title: "As a Scrum Master, I want an AI agent to draft INVEST user stories",
        story: "As a Scrum Master, I want an automated AI Story Agent so that backlog grooming velocity is doubled.",
        acceptanceCriteria: [
          "Given a product manager enters a feature brief",
          "When the prompt is submitted to the AI agent",
          "Then return an INVEST-compliant user story with Gherkin criteria and Fibonacci estimate",
        ],
        estimatedPoints: "5",
        estimationRationale: "Requires Vercel AI SDK integration, Zod schema validation, and tRPC mutation endpoint.",
        subTasks: [
          "Define UserStoryOutputSchema in packages/ai",
          "Create tRPC ai.generateStoryFromPrompt procedure",
          "Build preview dialog in web app",
        ],
      },
      modelUsed: "gpt-4o",
      acceptedByUserId: createdUsers[0]?.id,
      workItemId: story2.id,
    },
  });

  console.log("✅ Centraxis seed completed successfully!");
  console.log(`- 1 Organization: ${org.name}`);
  console.log(`- 3 Squads: ${frontendTeam.name}, ${backendTeam.name}, ${platformAiTeam.name}`);
  console.log(`- 2 Projects: ${coreProject.name} (${coreProject.key}), ${mobileProject.name} (${mobileProject.key})`);
  console.log(`- 25 Users seeded with roles`);
  console.log(`- 2 Sprints (1 Active, 1 Planned)`);
  console.log(`- 7 Work Items (Epics, Features, Stories, Tasks, Bugs)`);
  console.log(`- 1 AI Story Audit Log`);
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
