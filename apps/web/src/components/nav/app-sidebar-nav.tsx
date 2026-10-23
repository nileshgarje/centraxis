"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Inbox,
  UserCheck,
  Activity,
  FolderKanban,
  Kanban,
  Layers,
  Settings,
  Plus,
  ChevronRight,
  Users,
  Workflow,
  Sparkles,
} from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarMenuBadge,
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@centraxis/ui";
import { api } from "~/trpc/react";
import { CreateProjectDialog } from "../projects/create-project-dialog";

interface AppSidebarNavProps {
  clientSlug: string;
}

export function AppSidebarNav({ clientSlug }: AppSidebarNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);

  // Fetch client projects
  const { data: allProjects = [] } = api.project.list.useQuery();
  const clientProjects = allProjects.filter(
    (p) => p.client?.slug.toLowerCase() === clientSlug.toLowerCase(),
  );

  // Fetch count of assigned unresolved work items for the badge
  const { data: assignedItems = [] } =
    api.dashboard.getMyWorkItems.useQuery({
      tab: "ASSIGNED_UNRESOLVED",
    });

  const isSystemAdmin =
    session?.user?.globalRole === "SYSTEM_ADMIN" ||
    session?.user?.role === "ORG_ADMIN";

  // Identify active project key from pathname: /[clientSlug]/[projectKey]/...
  const pathParts = pathname.split("/").filter(Boolean);
  const currentProjectKey =
    pathParts.length >= 2 && pathParts[0]?.toLowerCase() === clientSlug.toLowerCase()
      ? pathParts[1]?.toUpperCase()
      : null;

  return (
    <>
      {/* 1. Section: Personal Hub */}
      <SidebarGroup>
        <SidebarGroupLabel>Personal Hub</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === "/my-work"}
                tooltip="My Work"
                data-testid="nav-my-work"
              >
                <Link href="/my-work" className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <Inbox className="size-4" />
                    <span>My Work</span>
                  </div>
                  {assignedItems.length > 0 && (
                    <SidebarMenuBadge>{assignedItems.length}</SidebarMenuBadge>
                  )}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === "/my-work" && pathname.includes("tab=ASSIGNED")}
                tooltip="Assigned to Me"
              >
                <Link href="/my-work?tab=ASSIGNED_UNRESOLVED">
                  <UserCheck className="size-4" />
                  <span>Assigned to Me</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === "/my-work" && pathname.includes("tab=RECENTLY_MODIFIED")}
                tooltip="Recent Activity"
              >
                <Link href="/my-work?tab=RECENTLY_MODIFIED">
                  <Activity className="size-4" />
                  <span>Recent Activity</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      {/* 2. Section: Projects */}
      <SidebarGroup>
        <SidebarGroupLabel className="flex items-center justify-between">
          <span>Projects</span>
        </SidebarGroupLabel>
        {isSystemAdmin && (
          <SidebarGroupAction
            title="Create New Project"
            onClick={() => setIsCreateProjectOpen(true)}
          >
            <Plus className="size-4" />
            <span className="sr-only">Add Project</span>
          </SidebarGroupAction>
        )}

        <SidebarGroupContent>
          <SidebarMenu>
            {clientProjects.length === 0 ? (
              <div className="px-2 py-3 text-xs text-muted-foreground italic">
                No projects found in this workspace.
              </div>
            ) : (
              clientProjects.map((project) => {
                const isProjectActive =
                  currentProjectKey?.toUpperCase() === project.key.toUpperCase();

                const boardPath = `/${clientSlug}/${project.key}/board`;
                const backlogPath = `/${clientSlug}/${project.key}/backlog`;
                const settingsPath = `/${clientSlug}/${project.key}/settings`;

                const isBoardActive = pathname.startsWith(boardPath);
                const isBacklogActive = pathname.startsWith(backlogPath);
                const isSettingsActive = pathname.startsWith(settingsPath);

                return (
                  <Collapsible
                    key={project.id}
                    asChild
                    defaultOpen={isProjectActive}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem data-testid={`project-item-${project.key}`}>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          tooltip={`${project.name} (${project.key})`}
                          isActive={isProjectActive && !isBoardActive && !isBacklogActive && !isSettingsActive}
                          data-testid={`project-trigger-${project.key}`}
                        >
                          <FolderKanban className="size-4 text-primary" />
                          <span className="truncate flex-1 font-medium text-xs">
                            <span className="font-mono text-muted-foreground mr-1.5 font-bold">
                              {project.key}
                            </span>
                            {project.name}
                          </span>
                          <ChevronRight className="ml-auto size-3.5 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 text-muted-foreground" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <SidebarMenuSub>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isBoardActive}
                              data-testid={`project-board-link-${project.key}`}
                            >
                              <Link href={boardPath} className="flex items-center gap-2">
                                <Kanban className="size-3.5 text-muted-foreground" />
                                <span>Board</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>

                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isBacklogActive}
                              data-testid={`project-backlog-link-${project.key}`}
                            >
                              <Link href={backlogPath} className="flex items-center gap-2">
                                <Layers className="size-3.5 text-muted-foreground" />
                                <span>Backlog</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>

                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isSettingsActive}
                              data-testid={`project-settings-link-${project.key}`}
                            >
                              <Link href={settingsPath} className="flex items-center gap-2">
                                <Settings className="size-3.5 text-muted-foreground" />
                                <span>Settings</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                );
              })
            )}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      {/* 3. Section: Workspace Management */}
      <SidebarGroup className="mt-auto">
        <SidebarGroupLabel>Workspace Operations</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname.includes("/settings/members") || pathname.includes("/squads")}
                tooltip="Squads & Teams"
                data-testid="nav-squads-roles"
              >
                <Link href={`/${clientSlug}/settings/members`}>
                  <Users className="size-4" />
                  <span>Squads & Roles</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname.includes("/settings/workflows")}
                tooltip="Workflow Schemes"
                data-testid="nav-workflow-schemes"
              >
                <Link href={`/${clientSlug}/settings/workflows`}>
                  <Workflow className="size-4" />
                  <span>Workflow Schemes</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === `/${clientSlug}/settings`}
                tooltip="Client Workspace Settings"
                data-testid="nav-client-settings"
              >
                <Link href={`/${clientSlug}/settings`}>
                  <Settings className="size-4" />
                  <span>Client Settings</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <CreateProjectDialog
        isOpen={isCreateProjectOpen}
        onClose={() => setIsCreateProjectOpen(false)}
        onProjectCreated={(newProjectId) => {
          setIsCreateProjectOpen(false);
        }}
      />
    </>
  );
}
