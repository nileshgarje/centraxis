"use client";

import React from "react";
import { SprintMetrics } from "~/components/metrics/SprintMetrics";
import { useProject } from "~/context/project-context";

export default function ProjectMetricsPage() {
  const { project } = useProject();

  return <SprintMetrics projectId={project.id} />;
}
