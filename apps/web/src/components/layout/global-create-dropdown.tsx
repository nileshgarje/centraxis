"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import {
  Plus,
  Sparkles,
  Calendar,
  Briefcase,
  CheckSquare,
  UserPlus,
  ChevronDown,
} from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
} from "@centraxis/ui";
import { useProject } from "~/context/project-context";
import { CreateItemDialog } from "~/components/work-items/create-item-dialog";
import { CreateProjectDialog } from "~/components/projects/create-project-dialog";
import { CreateSprintDialog } from "~/components/sprints/create-sprint-dialog";
import { InviteUserDialog } from "~/components/settings/invite-user-dialog";
import { AiStoryModal } from "~/components/ai-modal/AiStoryModal";
import { api } from "~/trpc/react";

interface GlobalCreateDropdownProps {
  clientSlug?: string;
}

export function GlobalCreateDropdown({
  clientSlug,
}: GlobalCreateDropdownProps) {
  const { data: session } = useSession();

  // Try to read active project from context if mounted inside ProjectLayout
  let projectContext: ReturnType<typeof useProject> | null = null;
  try {
    projectContext = useProject();
  } catch {
    // Rendered outside of project context
  }

  const { data: allProjects = [] } = api.project.list.useQuery();

  // If outside ProjectLayout, resolve the primary project for this client
  const fallbackProject = allProjects.find(
    (p) =>
      clientSlug &&
      p.client?.slug.toLowerCase() === clientSlug.toLowerCase(),
  ) || allProjects[0];

  const targetProjectId = projectContext?.project?.id || fallbackProject?.id;

  const isSystemAdmin =
    session?.user?.globalRole === "SYSTEM_ADMIN" ||
    session?.user?.role === "ORG_ADMIN";

  const activeProject = projectContext?.project || fallbackProject;
  const userMember = activeProject?.members?.find(
    (m: any) => (m.user?.id ?? m.userId) === session?.user?.id,
  );
  const isViewer = !isSystemAdmin && userMember?.role === "VIEWER";

  // Modals state for standalone trigger
  const [isCreateItemOpen, setIsCreateItemOpen] = useState(false);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isCreateSprintOpen, setIsCreateSprintOpen] = useState(false);
  const [isInviteUserOpen, setIsInviteUserOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  if (isViewer) {
    return null;
  }

  const handleOpenCreateItem = () => {
    if (projectContext?.openCreateItem) {
      projectContext.openCreateItem();
    } else {
      setIsCreateItemOpen(true);
    }
  };

  const handleOpenAiModal = () => {
    if (projectContext?.openAiModal) {
      projectContext.openAiModal();
    } else {
      setIsAiModalOpen(true);
    }
  };

  const handleOpenCreateSprint = () => {
    if (projectContext?.openCreateSprint) {
      projectContext.openCreateSprint();
    } else {
      setIsCreateSprintOpen(true);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            data-testid="global-create-dropdown-trigger"
            className="h-8 gap-1.5 px-3 bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs font-medium text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create</span>
            <ChevronDown className="h-3 w-3 opacity-70 ml-0.5" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          data-testid="global-create-dropdown-content"
          className="w-56 bg-popover border border-border shadow-lg"
        >
          <DropdownMenuLabel className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Quick Actions
          </DropdownMenuLabel>

          <DropdownMenuItem
            onClick={handleOpenCreateItem}
            className="gap-2 cursor-pointer"
          >
            <CheckSquare className="h-4 w-4 text-primary" />
            <div className="flex flex-col">
              <span className="text-xs font-medium">Work Item</span>
              <span className="text-[10px] text-muted-foreground">
                Story, Task, Bug, or Epic
              </span>
            </div>
            <DropdownMenuShortcut>C</DropdownMenuShortcut>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={handleOpenAiModal}
            className="gap-2 cursor-pointer"
          >
            <Sparkles className="h-4 w-4 text-indigo-400" />
            <div className="flex flex-col">
              <span className="text-xs font-medium">AI Story Agent</span>
              <span className="text-[10px] text-muted-foreground">
                INVEST-compliant generation
              </span>
            </div>
            <DropdownMenuShortcut>⌘J</DropdownMenuShortcut>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={handleOpenCreateSprint}
            className="gap-2 cursor-pointer"
          >
            <Calendar className="h-4 w-4 text-emerald-500" />
            <div className="flex flex-col">
              <span className="text-xs font-medium">Sprint Iteration</span>
              <span className="text-[10px] text-muted-foreground">
                Plan next 2-week cycle
              </span>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => setIsCreateProjectOpen(true)}
            className="gap-2 cursor-pointer"
          >
            <Briefcase className="h-4 w-4 text-blue-500" />
            <div className="flex flex-col">
              <span className="text-xs font-medium">New Project</span>
              <span className="text-[10px] text-muted-foreground">
                Create agile workspace
              </span>
            </div>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => setIsInviteUserOpen(true)}
            className="gap-2 cursor-pointer"
          >
            <UserPlus className="h-4 w-4 text-amber-500" />
            <div className="flex flex-col">
              <span className="text-xs font-medium">Invite Member</span>
              <span className="text-[10px] text-muted-foreground">
                Add teammate via email
              </span>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Fallback Dialog Mounts if outside project context */}
      {!projectContext && targetProjectId && (
        <>
          <CreateItemDialog
            isOpen={isCreateItemOpen}
            onClose={() => setIsCreateItemOpen(false)}
            projectId={targetProjectId}
          />

          <AiStoryModal
            isOpen={isAiModalOpen}
            onClose={() => setIsAiModalOpen(false)}
            projectId={targetProjectId}
          />

          <CreateSprintDialog
            isOpen={isCreateSprintOpen}
            onClose={() => setIsCreateSprintOpen(false)}
            projectId={targetProjectId}
          />
        </>
      )}

      <CreateProjectDialog
        isOpen={isCreateProjectOpen}
        onClose={() => setIsCreateProjectOpen(false)}
        defaultClientId={fallbackProject?.clientId ?? undefined}
      />

      <InviteUserDialog
        isOpen={isInviteUserOpen}
        onClose={() => setIsInviteUserOpen(false)}
      />
    </>
  );
}
