import React from "react";
import { WorkflowEditor } from "~/components/workflow/workflow-editor";

interface PageProps {
  params: Promise<{
    workflowId: string;
  }>;
}

export default async function AdminWorkflowEditPage({ params }: PageProps) {
  const { workflowId } = await params;

  return <WorkflowEditor workflowId={workflowId} backHref="/admin" />;
}
