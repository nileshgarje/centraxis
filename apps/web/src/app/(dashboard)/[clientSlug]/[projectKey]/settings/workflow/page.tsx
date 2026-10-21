"use client";

import React, { use } from "react";
import { api } from "~/trpc/react";
import { WorkflowEditor } from "~/components/workflow/workflow-editor";
import { Button } from "@centraxis/ui";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface PageProps {
  params: Promise<{
    clientSlug: string;
    projectKey: string;
  }>;
}

export default function ProjectWorkflowSettingsPage({ params }: PageProps) {
  const { clientSlug, projectKey } = use(params);
  const router = useRouter();

  // Find project by key
  const { data: projects, isLoading: projectsLoading } =
    api.project.list.useQuery();
  const currentProject = projects?.find((p) => p.key === projectKey);

  // Load active resolved workflow for project
  const { data: workflowInfo, isLoading: workflowLoading } =
    api.workflow.getForProject.useQuery(
      { projectId: currentProject?.id ?? "" },
      { enabled: !!currentProject?.id },
    );

  if (projectsLoading || workflowLoading) {
    return (
      <div className="flex h-96 items-center justify-center space-x-2 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="text-sm">Loading project workflow scheme...</span>
      </div>
    );
  }

  if (!workflowInfo?.workflow) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <p className="font-semibold text-sm">No workflow scheme configured</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/${clientSlug}/${projectKey}/board`)}
          className="mt-4"
        >
          Return to Board
        </Button>
      </div>
    );
  }

  return (
    <WorkflowEditor
      workflowId={workflowInfo.workflow.id}
      backHref={`/${clientSlug}/${projectKey}/board`}
    />
  );
}
