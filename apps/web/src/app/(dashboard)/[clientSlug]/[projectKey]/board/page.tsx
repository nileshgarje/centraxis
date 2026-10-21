"use client";

import React from "react";
import { KanbanBoard } from "~/components/board/KanbanBoard";
import { useProject } from "~/context/project-context";

export default function ProjectBoardPage() {
  const { project, openCreateItem } = useProject();

  return <KanbanBoard projectId={project.id} onCreateItem={openCreateItem} />;
}
