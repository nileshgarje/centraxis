"use client";

import React, { use, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { ShieldAlert, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@centraxis/ui";
import { api } from "~/trpc/react";
import { Header } from "~/components/navigation/Header";
import { ProjectProvider, CreateItemDefaults } from "~/context/project-context";
import { CreateItemDialog } from "~/components/work-items/create-item-dialog";
import { CreateProjectDialog } from "~/components/projects/create-project-dialog";
import { CreateSprintDialog } from "~/components/sprints/create-sprint-dialog";
import { InviteUserDialog } from "~/components/settings/invite-user-dialog";
import { AiStoryModal } from "~/components/ai-modal/AiStoryModal";
import { CommandMenu } from "~/components/command-menu";

interface ProjectLayoutProps {
  children: React.ReactNode;
  params: Promise<{ clientSlug: string; projectKey: string }>;
}

export default function ProjectLayout({
  children,
  params,
}: ProjectLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();

  const { clientSlug, projectKey } = use(params);

  const {
    data: project,
    isLoading,
    error,
  } = api.project.getByClientAndKey.useQuery(
    { clientSlug, projectKey },
    { retry: false },
  );

  const { data: allProjects } = api.project.list.useQuery();

  const { data: activeSprint } = api.sprint.getActive.useQuery(
    { projectId: project?.id ?? "" },
    { enabled: !!project?.id },
  );

  // Modals state
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isCreateItemOpen, setIsCreateItemOpen] = useState(false);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isCreateSprintOpen, setIsCreateSprintOpen] = useState(false);
  const [isInviteUserOpen, setIsInviteUserOpen] = useState(false);
  const [isCommandMenuOpen, setIsCommandMenuOpen] = useState(false);

  const [createItemDefaults, setCreateItemDefaults] =
    useState<CreateItemDefaults>({});

  const handleOpenCreateItem = (defaults?: CreateItemDefaults) => {
    setCreateItemDefaults(defaults ?? { sprintId: activeSprint?.id });
    setIsCreateItemOpen(true);
  };

  // Determine active tab from pathname
  let activeTab: "board" | "backlog" | "teams" | "metrics" = "board";
  if (pathname.includes("/backlog")) {
    activeTab = "backlog";
  } else if (pathname.includes("/teams")) {
    activeTab = "teams";
  } else if (pathname.includes("/metrics")) {
    activeTab = "metrics";
  }

  const handleTabChange = (tab: "board" | "backlog" | "teams" | "metrics") => {
    const routeSuffix = tab === "board" ? "board" : tab;
    router.push(`/${clientSlug}/${projectKey}/${routeSuffix}`);
  };

  // Global Keyboard Shortcuts (Cmd+K / Ctrl+K, Cmd+J / Ctrl+J, and C)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput =
        ["INPUT", "TEXTAREA", "SELECT"].includes(
          (e.target as HTMLElement)?.tagName,
        ) || (e.target as HTMLElement)?.isContentEditable;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandMenuOpen((prev) => !prev);
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setIsAiModalOpen((prev) => !prev);
        return;
      }

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

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-xs font-semibold text-muted-foreground">
            Loading project workspace [{projectKey.toUpperCase()}]...
          </p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-2xl border border-destructive/20 bg-card p-8 text-center shadow-lg">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mb-4">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h1 className="text-lg font-bold text-foreground">
            Project Not Found or Access Denied
          </h1>
          <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
            Project{" "}
            <span className="font-mono font-bold text-primary">
              [{projectKey.toUpperCase()}]
            </span>{" "}
            under client{" "}
            <span className="font-semibold text-foreground font-mono">
              "{clientSlug}"
            </span>{" "}
            was not found or you do not have permission to access it.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Button
              onClick={() => router.push(`/${clientSlug}`)}
              className="w-full gap-2 text-xs"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Client Workspace</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const projectList =
    allProjects?.map((p) => ({
      id: p.id,
      key: p.key,
      name: p.name,
      clientId: p.clientId ?? null,
      client: p.client ?? null,
    })) ?? [];

  return (
    <ProjectProvider
      project={project}
      clientSlug={clientSlug}
      projectKey={projectKey}
      openCreateItem={handleOpenCreateItem}
      openCreateSprint={() => setIsCreateSprintOpen(true)}
      openAiModal={() => setIsAiModalOpen(true)}
    >
      <div className="min-h-screen bg-background text-foreground flex flex-col relative">
        <Header
          projects={projectList}
          selectedProjectId={project.id}
          onSelectProject={(targetProjectId) => {
            const target = allProjects?.find((p) => p.id === targetProjectId);
            if (target) {
              const targetClientSlug = target.client?.slug || clientSlug;
              router.push(`/${targetClientSlug}/${target.key}/board`);
            }
          }}
          activeSprintName={activeSprint?.name}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onOpenAiModal={() => setIsAiModalOpen(true)}
          onCreateItem={() => handleOpenCreateItem()}
          onCreateProject={() => setIsCreateProjectOpen(true)}
          onCreateSprint={() => setIsCreateSprintOpen(true)}
          onOpenInvite={() => setIsInviteUserOpen(true)}
          onOpenCommandMenu={() => setIsCommandMenuOpen(true)}
        />

        <main className="flex-1 max-w-[1500px] w-full mx-auto px-6 py-6 md:px-8">
          {children}
        </main>

        {/* Global Command Bar Dialog (Cmd+K / Ctrl+K) */}
        <CommandMenu
          isOpen={isCommandMenuOpen}
          onClose={() => setIsCommandMenuOpen(false)}
          projectId={project.id}
          projects={projectList}
          onSelectProject={(id) => {
            const target = allProjects?.find((p) => p.id === id);
            if (target) {
              const targetClientSlug = target.client?.slug || clientSlug;
              router.push(`/${targetClientSlug}/${target.key}/board`);
            }
          }}
          onOpenCreateItem={() => handleOpenCreateItem()}
          onOpenCreateSprint={() => setIsCreateSprintOpen(true)}
          onOpenCreateProject={() => setIsCreateProjectOpen(true)}
          onOpenAiStory={() => setIsAiModalOpen(true)}
          onOpenInviteMember={() => setIsInviteUserOpen(true)}
          onNavigateTab={handleTabChange}
        />

        {/* Create Work Item Modal Dialog */}
        <CreateItemDialog
          isOpen={isCreateItemOpen}
          onClose={() => setIsCreateItemOpen(false)}
          projectId={project.id}
          defaultSprintId={createItemDefaults.sprintId ?? activeSprint?.id}
          defaultParentId={createItemDefaults.parentId}
          defaultType={createItemDefaults.type}
        />

        {/* Create Project Modal Dialog */}
        <CreateProjectDialog
          isOpen={isCreateProjectOpen}
          onClose={() => setIsCreateProjectOpen(false)}
          defaultClientId={project.clientId ?? undefined}
          onProjectCreated={(id) => {
            setIsCreateProjectOpen(false);
          }}
        />

        {/* Create Sprint Modal Dialog */}
        <CreateSprintDialog
          isOpen={isCreateSprintOpen}
          onClose={() => setIsCreateSprintOpen(false)}
          projectId={project.id}
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
          projectId={project.id}
        />
      </div>
    </ProjectProvider>
  );
}
