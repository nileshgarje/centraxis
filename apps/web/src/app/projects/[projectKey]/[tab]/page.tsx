import React from "react";
import { CentraxisApp } from "~/components/centraxis-app";

interface ProjectTabPageProps {
  params: Promise<{
    projectKey: string;
    tab: string;
  }>;
}

export default async function ProjectTabPage({ params }: ProjectTabPageProps) {
  const { projectKey, tab } = await params;
  const normalizedTab = (["board", "backlog", "teams", "metrics"].includes(
    tab.toLowerCase(),
  )
    ? tab.toLowerCase()
    : "board") as "board" | "backlog" | "teams" | "metrics";

  return (
    <CentraxisApp
      initialProjectKey={projectKey}
      initialTab={normalizedTab}
    />
  );
}
