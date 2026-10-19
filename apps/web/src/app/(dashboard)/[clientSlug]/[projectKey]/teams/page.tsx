"use client";

import React from "react";
import { TeamsView } from "~/components/teams/TeamsView";
import { useProject } from "~/context/project-context";

export default function ProjectTeamsPage() {
  const { project } = useProject();

  return <TeamsView projectId={project.id} />;
}
