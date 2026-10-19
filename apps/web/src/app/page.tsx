"use client";

import React, { useState, useEffect } from "react";
import { Header } from "~/components/navigation/Header";
import { KanbanBoard } from "~/components/board/KanbanBoard";
import { BacklogView } from "~/components/backlog/BacklogView";
import { TeamsView } from "~/components/teams/TeamsView";
import { AiStoryModal } from "~/components/ai-modal/AiStoryModal";
import { api } from "~/trpc/react";

export default function CentraxisApp() {
  const { data: projects, isLoading: projectsLoading } =
    api.project.list.useQuery();

  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"board" | "backlog" | "teams">(
    "board",
  );
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

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
      />

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8">
        {activeTab === "board" && (
          <KanbanBoard projectId={selectedProjectId} />
        )}

        {activeTab === "backlog" && (
          <BacklogView
            projectId={selectedProjectId}
            onOpenAiModal={() => setIsAiModalOpen(true)}
          />
        )}

        {activeTab === "teams" && (
          <TeamsView projectId={selectedProjectId} />
        )}
      </main>

      {/* Global AI Story Agent Modal Dialog (Cmd+K) */}
      <AiStoryModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        projectId={selectedProjectId}
      />
    </div>
  );
}
