"use client";

import React, { use } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ShieldAlert, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@centraxis/ui";
import { api } from "~/trpc/react";

interface PageProps {
  params: Promise<{
    clientSlug: string;
    projectKey: string;
  }>;
}

export default function ProjectSettingsRootPage({ params }: PageProps) {
  const { clientSlug, projectKey } = use(params);
  const router = useRouter();
  const { data: session, status } = useSession();

  const { data: projects, isLoading: projectsLoading } =
    api.project.list.useQuery();
  const currentProject = projects?.find((p) => p.key === projectKey);

  if (projectsLoading || status === "loading") {
    return (
      <div className="flex h-96 items-center justify-center space-x-2 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="text-sm">Verifying project permissions...</span>
      </div>
    );
  }

  const isSystemAdmin =
    session?.user?.globalRole === "SYSTEM_ADMIN" ||
    session?.user?.role === "ORG_ADMIN";

  const userProjectMember = currentProject?.members?.find(
    (m) => m.userId === session?.user?.id,
  );
  const isProjectLead =
    isSystemAdmin || userProjectMember?.role === "PROJECT_LEAD";

  if (!isProjectLead) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4" data-testid="access-denied-screen">
        <div className="w-full max-w-md rounded-2xl border border-destructive/20 bg-card p-8 text-center shadow-lg">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mb-4">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h1 className="text-lg font-bold text-foreground">
            Access Denied
          </h1>
          <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
            You do not have administrative privileges to configure settings for{" "}
            <span className="font-semibold text-foreground font-mono">[{projectKey.toUpperCase()}]</span>.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Button
              onClick={() => router.push(`/${clientSlug}/${projectKey}/board`)}
              className="w-full gap-2 text-xs"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Active Board</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  router.replace(`/${clientSlug}/${projectKey}/settings/workflow`);
  return null;
}
