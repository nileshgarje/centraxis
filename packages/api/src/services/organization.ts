import type { PrismaClient } from "@centraxis/db";

/**
 * Resolves a guaranteed valid, non-dangling Organization ID.
 * Handles cases where the session's organizationId is stale (e.g. after database wipes/re-seeds)
 * or where the user has no valid organization associated.
 */
export async function resolveValidOrgId(
  db: PrismaClient,
  userId: string,
  preferredOrgId?: string | null,
): Promise<string> {
  // 1. Check preferredOrgId (e.g. from session)
  if (preferredOrgId) {
    const org = await db.organization.findUnique({
      where: { id: preferredOrgId },
      select: { id: true },
    });
    if (org) return org.id;
  }

  // 2. Check user DB record's organizationId
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { organizationId: true },
  });
  if (user?.organizationId) {
    const org = await db.organization.findUnique({
      where: { id: user.organizationId },
      select: { id: true },
    });
    if (org) return org.id;
  }

  // 3. Fallback to first existing organization in DB
  const firstOrg = await db.organization.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (firstOrg) {
    await db.user.update({
      where: { id: userId },
      data: { organizationId: firstOrg.id },
    });
    return firstOrg.id;
  }

  // 4. Create default organization if database is completely empty
  const newOrg = await db.organization.create({
    data: {
      name: "Centvis",
      slug: "centvis",
    },
    select: { id: true },
  });

  await db.user.update({
    where: { id: userId },
    data: { organizationId: newOrg.id },
  });

  return newOrg.id;
}
