"use client";

import React, { useState, useEffect } from "react";
import { Header } from "~/components/navigation/Header";
import { KanbanBoard } from "~/components/board/KanbanBoard";
import { BacklogView } from "~/components/backlog/BacklogView";
import { TeamsView } from "~/components/teams/TeamsView";
import { SprintMetrics } from "~/components/metrics/SprintMetrics";
import { AiStoryModal } from "~/components/ai-modal/AiStoryModal";
import { CreateItemDialog } from "~/components/work-items/create-item-dialog";
import { CreateProjectDialog } from "~/components/projects/create-project-dialog";
import { CreateSprintDialog } from "~/components/sprints/create-sprint-dialog";
import { InviteUserDialog } from "~/components/settings/invite-user-dialog";
import { CommandMenu } from "~/components/command-menu";
import { Plus, Command } from "lucide-react";
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
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isCreateSprintOpen, setIsCreateSprintOpen] = useState(false);
  const [isInviteUserOpen, setIsInviteUserOpen] = useState(false);
  const [isCommandMenuOpen, setIsCommandMenuOpen] = useState(false);

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

  // Global Keyboard Shortcuts (Cmd+K / Ctrl+K, Cmd+J / Ctrl+J, and C)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput =
        ["INPUT", "TEXTAREA", "SELECT"].includes(
          (e.target as HTMLElement)?.tagName,
        ) || (e.target as HTMLElement)?.isContentEditable;

      // Cmd+K / Ctrl+K: Global Command Bar
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandMenuOpen((prev) => !prev);
        return;
      }

      // Cmd+J / Ctrl+J: AI Story Agent
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setIsAiModalOpen((prev) => !prev);
        return;
      }

      // C: Quick Create Item (when not typing in an input)
      if (
        !isInput &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        e.key.toLowerCase() === "c"
      ) {
        e.preventDefault();
        handleOpenCreateItem();
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeSprint?.id]);

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
    <div className="min-h-screen bg-slate-50/60 flex flex-col relative">
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
        onCreateProject={() => setIsCreateProjectOpen(true)}
        onCreateSprint={() => setIsCreateSprintOpen(true)}
        onOpenInvite={() => setIsInviteUserOpen(true)}
        onOpenCommandMenu={() => setIsCommandMenuOpen(true)}
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
            onCreateSprint={() => setIsCreateSprintOpen(true)}
          />
        )}

        {activeTab === "teams" && (
          <TeamsView projectId={selectedProjectId} />
        )}

        {activeTab === "metrics" && (
          <SprintMetrics projectId={selectedProjectId} />
        )}
      </main>

      {/* Floating Action Button (FAB) for Instant Quick Access */}
      <div className="fixed bottom-6 right-6 z-40 flex items-center space-x-2">
        <button
          onClick={() => setIsCommandMenuOpen(true)}
          title="Open Quick Command Bar (Cmd+K)"
          className="group flex items-center space-x-2 rounded-full bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-xl hover:bg-slate-800 transition active:scale-95"
        >
          <Command className="h-3.5 w-3.5 text-blue-400" />
          <span>Quick Actions</span>
          <kbd className="rounded bg-slate-800 px-1.5 py-0.2 font-mono text-[10px] text-slate-300">
            ⌘K
          </kbd>
        </button>

        <button
          onClick={() => handleOpenCreateItem()}
          title="Create New Item (Press C)"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl shadow-blue-500/30 hover:bg-blue-700 transition active:scale-95"
        >
          <Plus className="h-6 w-6 stroke-[2.5]" />
        </button>
      </div>

      {/* Global Command Bar Dialog (Cmd+K / Ctrl+K) */}
      <CommandMenu
        isOpen={isCommandMenuOpen}
        onClose={() => setIsCommandMenuOpen(false)}
        projectId={selectedProjectId}
        projects={projectList}
        onSelectProject={setSelectedProjectId}
        onOpenCreateItem={() => handleOpenCreateItem()}
        onOpenCreateSprint={() => setIsCreateSprintOpen(true)}
        onOpenCreateProject={() => setIsCreateProjectOpen(true)}
        onOpenAiStory={() => setIsAiModalOpen(true)}
        onOpenInviteMember={() => setIsInviteUserOpen(true)}
        onNavigateTab={setActiveTab}
      />

      {/* Create Work Item Modal Dialog */}
      <CreateItemDialog
        isOpen={isCreateItemOpen}
        onClose={() => setIsCreateItemOpen(false)}
        projectId={selectedProjectId}
        defaultSprintId={createItemDefaults.sprintId ?? activeSprint?.id}
        defaultParentId={createItemDefaults.parentId}
        defaultType={createItemDefaults.type}
      />

      {/* Create Project Modal Dialog */}
      <CreateProjectDialog
        isOpen={isCreateProjectOpen}
        onClose={() => setIsCreateProjectOpen(false)}
        onProjectCreated={(id) => {
          setSelectedProjectId(id);
          setIsCreateProjectOpen(false);
        }}
      />

      {/* Create Sprint Modal Dialog */}
      <CreateSprintDialog
        isOpen={isCreateSprintOpen}
        onClose={() => setIsCreateSprintOpen(false)}
        projectId={selectedProjectId}
      />

      {/* Invite User Modal Dialog */}
      <InviteUserDialog
        isOpen={isInviteUserOpen}
        onClose={() => setIsInviteUserOpen(false)}
      />

      {/* Centraxis AI Story Agent Modal Dialog (Cmd+J) */}
      <AiStoryModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        projectId={selectedProjectId}
      />
    </div>
  );
}
