"use client";

import React, { useState, useEffect } from "react";
import { Header } from "~/components/navigation/Header";
import { KanbanBoard } from "~/components/board/KanbanBoard";
import { BacklogView } from "~/components/backlog/BacklogView";
import { TeamsView } from "~/components/teams/TeamsView";
import { SprintMetrics } from "~/components/metrics/SprintMetrics";
import { AiStoryModal } from "~/components/ai-modal/AiStoryModal";
import { CreateItemDialog } from "~/components/work-items/create-item-dialog";
import { api } from "~/trpc/react";

export default function CentraxisApp() {
  const { data: projects, isLoading: projectsLoading } =
    api.project.list.useQuery();

  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<
    "board" | "backlog" | "teams" | "metrics"
  >("board");
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isCreateItemOpen, setIsCreateItemOpen] = useState(false);
  const [createItemDefaults, setCreateItemDefaults] = useState<{
    sprintId?: string | null;
    parentId?: string | null;
    type?: "EPIC" | "FEATURE" | "STORY" | "TASK" | "BUG";
  }>({});

  // Automatically select the first project once loaded
  useEffect(() => {
    if (projects && projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0]?.id ?? "");
    }
  }, [projects, selectedProjectId]);

  const { data: activeSprint } = api.sprint.getActive.useQuery(
    { projectId: selectedProjectId },
    { enabled: !!selectedProjectId },
  );

  const handleOpenCreateItem = (defaults?: typeof createItemDefaults) => {
    setCreateItemDefaults(defaults ?? { sprintId: activeSprint?.id });
    setIsCreateItemOpen(true);
  };

  if (projectsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white font-bold text-xl shadow-lg shadow-blue-500/30">
            C
          </div>
          <div className="flex items-center space-x-2 text-sm font-semibold text-slate-700">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            <span>Initializing Centraxis Workspace...</span>
          </div>
        </div>
      </div>
    );
  }

  const projectList =
    projects?.map((p) => ({
      id: p.id,
      key: p.key,
      name: p.name,
    })) ?? [];

  return (
    <div className="min-h-screen bg-slate-50/60 flex flex-col">
      {/* Shell Header */}
      <Header
        projects={projectList}
        selectedProjectId={selectedProjectId}
        onSelectProject={setSelectedProjectId}
        activeSprintName={activeSprint?.name}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenAiModal={() => setIsAiModalOpen(true)}
        onCreateItem={() => handleOpenCreateItem()}
      />

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8">
        {activeTab === "board" && (
          <KanbanBoard
            projectId={selectedProjectId}
            onCreateItem={handleOpenCreateItem}
          />
        )}

        {activeTab === "backlog" && (
          <BacklogView
            projectId={selectedProjectId}
            onOpenAiModal={() => setIsAiModalOpen(true)}
            onCreateItem={handleOpenCreateItem}
          />
        )}

        {activeTab === "teams" && (
          <TeamsView projectId={selectedProjectId} />
        )}

        {activeTab === "metrics" && (
          <SprintMetrics projectId={selectedProjectId} />
        )}
      </main>

      {/* Create Work Item Modal Dialog */}
      <CreateItemDialog
        isOpen={isCreateItemOpen}
        onClose={() => setIsCreateItemOpen(false)}
        projectId={selectedProjectId}
        defaultSprintId={createItemDefaults.sprintId ?? activeSprint?.id}
        defaultParentId={createItemDefaults.parentId}
        defaultType={createItemDefaults.type}
      />

      {/* Global AI Story Agent Modal Dialog (Cmd+K) */}
      <AiStoryModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        projectId={selectedProjectId}
      />
    </div>
  );
}
