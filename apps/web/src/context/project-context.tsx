"use client";

import React, { createContext, useContext } from "react";
import type { RouterOutputs } from "~/trpc/react";

export type ProjectData = RouterOutputs["project"]["getByClientAndKey"];

export interface CreateItemDefaults {
  sprintId?: string | null;
  parentId?: string | null;
  type?: "EPIC" | "FEATURE" | "STORY" | "TASK" | "BUG";
}

interface ProjectContextValue {
  project: ProjectData;
  clientSlug: string;
  projectKey: string;
  openCreateItem: (defaults?: CreateItemDefaults) => void;
  openCreateSprint: () => void;
  openAiModal: () => void;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({
  project,
  clientSlug,
  projectKey,
  openCreateItem,
  openCreateSprint,
  openAiModal,
  children,
}: ProjectContextValue & { children: React.ReactNode }) {
  return (
    <ProjectContext.Provider
      value={{
        project,
        clientSlug,
        projectKey,
        openCreateItem,
        openCreateSprint,
        openAiModal,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useProject must be used within a ProjectProvider");
  }
  return context;
}
