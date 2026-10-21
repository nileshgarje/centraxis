import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🧹 Emptying Centraxis database (removing all records)...");

  await prisma.aiStoryLog.deleteMany();
  await prisma.workItem.deleteMany();
  await prisma.sprint.deleteMany();
  await prisma.projectTeam.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.clientMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.client.deleteMany();
  await prisma.teamMembership.deleteMany();
  await prisma.team.deleteMany();
  await prisma.invitation.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  console.log("✅ Database is now 100% empty (0 records across all tables).");
}

main()
  .catch((e) => {
    console.error("❌ Failed to empty database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
