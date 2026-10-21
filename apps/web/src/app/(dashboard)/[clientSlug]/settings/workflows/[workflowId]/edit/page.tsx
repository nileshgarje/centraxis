import React from "react";
import { WorkflowEditor } from "~/components/workflow/workflow-editor";

interface PageProps {
  params: Promise<{
    clientSlug: string;
    workflowId: string;
  }>;
}

export default async function ClientWorkflowEditPage({ params }: PageProps) {
  const { clientSlug, workflowId } = await params;

  return (
    <WorkflowEditor
      workflowId={workflowId}
      backHref={`/${clientSlug}/settings`}
    />
  );
}
