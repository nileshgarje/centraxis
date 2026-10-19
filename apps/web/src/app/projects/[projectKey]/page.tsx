import React from "react";
import CentraxisApp from "~/app/page";

interface ProjectPageProps {
  params: Promise<{
    projectKey: string;
  }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectKey } = await params;

  return (
    <CentraxisApp
      initialProjectKey={projectKey}
      initialTab="board"
    />
  );
}
