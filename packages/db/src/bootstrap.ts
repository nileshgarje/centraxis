import { db, GlobalRole, TeamRole } from "./index";
import bcrypt from "bcryptjs";

export async function bootstrapAdmin() {
  const rawUsername = (
    process.env.KC_BOOTSTRAP_ADMIN_USERNAME ||
    process.env.BOOTSTRAP_ADMIN_USERNAME ||
    "admin@centvis.com"
  ).trim();
  const password =
    process.env.KC_BOOTSTRAP_ADMIN_PASSWORD ||
    process.env.BOOTSTRAP_ADMIN_PASSWORD ||
    "AdminPassword123!";

  const email = rawUsername.includes("@")
    ? rawUsername.toLowerCase()
    : `${rawUsername.toLowerCase()}@centvis.com`;

  let org = await db.organization.findFirst();
  if (!org) {
    org = await db.organization.create({
      data: {
        name: "Centvis",
        slug: "centvis",
      },
    });
  }

  const existing = await db.user.findUnique({
    where: { email },
  });

  if (existing) {
    console.log(`ℹ️ Bootstrap administrator (${email}) already exists.`);
    return existing;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await db.user.create({
    data: {
      email,
      name: "Bootstrap Administrator (Temporary)",
      password: hashedPassword,
      role: TeamRole.ORG_ADMIN,
      globalRole: GlobalRole.SYSTEM_ADMIN,
      isTemporary: true,
      organizationId: org.id,
    },
  });

  console.log(`✅ [KC_BOOTSTRAP_ADMIN] Provisioned temporary administrator account: ${email}`);
  return user;
}

if (process.argv[1]?.includes("bootstrap.ts") || process.argv[1]?.includes("bootstrap.js")) {
  bootstrapAdmin()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
