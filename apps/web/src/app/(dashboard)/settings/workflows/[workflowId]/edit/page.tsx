import React from "react";
import { WorkflowEditor } from "~/components/workflow/workflow-editor";

interface PageProps {
  params: Promise<{
    workflowId: string;
  }>;
}

export default async function SettingsWorkflowEditPage({ params }: PageProps) {
  const { workflowId } = await params;

  return (
    <WorkflowEditor
      workflowId={workflowId}
      backHref="/settings/workflows"
    />
  );
}
