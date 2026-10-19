"use client";

import React from "react";
import { BacklogView } from "~/components/backlog/BacklogView";
import { useProject } from "~/context/project-context";

export default function ProjectBacklogPage() {
  const { project, openCreateItem, openCreateSprint, openAiModal } = useProject();

  return (
    <BacklogView
      projectId={project.id}
      onCreateItem={openCreateItem}
      onCreateSprint={openCreateSprint}
      onOpenAiModal={openAiModal}
    />
  );
}
