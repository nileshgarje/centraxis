"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  FolderGit2,
  Plus,
  Kanban,
  Layers,
  Users,
  Settings,
  Mail,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@centraxis/ui";
import { useClient } from "~/context/client-context";
import { CreateProjectDialog } from "~/components/projects/create-project-dialog";
import { CreateItemDialog } from "~/components/work-items/create-item-dialog";
import { CreateSprintDialog } from "~/components/sprints/create-sprint-dialog";
import { InviteUserDialog } from "~/components/settings/invite-user-dialog";
import { AiStoryModal } from "~/components/ai-modal/AiStoryModal";
import { CommandMenu } from "~/components/command-menu";

export default function ClientHomePage() {
  const router = useRouter();
  const { client, clientSlug } = useClient();
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isCreateItemOpen, setIsCreateItemOpen] = useState(false);
  const [isCreateSprintOpen, setIsCreateSprintOpen] = useState(false);
  const [isInviteUserOpen, setIsInviteUserOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isCommandMenuOpen, setIsCommandMenuOpen] = useState(false);

  const projectList =
    client.projects?.map((p) => ({
      id: p.id,
      key: p.key,
      name: p.name,
      clientId: client.id,
      client: { id: client.id, name: client.name, slug: client.slug },
    })) ?? [];

  const firstProject = projectList[0];

  return (
    <div className="w-full max-w-[1400px] mx-auto px-6 py-8">
      {/* Client Hero Banner */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-sm shrink-0">
                <Building2 className="h-7 w-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight text-foreground">
                    {client.name}
                  </h1>
                  <span className="rounded bg-muted px-2 py-0.5 text-xs font-mono font-semibold text-muted-foreground">
                    {client.slug}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-4 mt-1 text-xs text-muted-foreground">
                  {client.contactEmail && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5" />
                      {client.contactEmail}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <FolderGit2 className="h-3.5 w-3.5" />
                    {client.projects?.length ?? 0} Projects
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {client.members?.length ?? 0} Members
                  </span>
                </div>
              </div>
            </div>

            <Button
              onClick={() => setIsCreateProjectOpen(true)}
              size="sm"
              className="gap-2 shrink-0 self-start sm:self-auto"
            >
              <Plus className="h-4 w-4" />
              <span>New Project</span>
            </Button>
          </div>
        </div>

        {/* Projects Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-foreground">
                Assigned Projects
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Select a project below to open its Kanban board or sprint
                backlog
              </p>
            </div>
          </div>

          {!client.projects || client.projects.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-12 text-center bg-card">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground mb-3">
                <FolderGit2 className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">
                No projects assigned to this client yet
              </h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Create a new project workspace under {client.name} to start
                tracking sprints and issues.
              </p>
              <Button
                onClick={() => setIsCreateProjectOpen(true)}
                size="sm"
                className="mt-4 gap-2"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create First Project</span>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {client.projects.map((project) => (
                <Card
                  key={project.id}
                  className="hover:border-primary/50 transition duration-150 flex flex-col justify-between"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                        {project.key}
                      </span>
                      {project.sprints && project.sprints.length > 0 && (
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                        >
                          Active Sprint
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-base font-bold text-foreground mt-2">
                      {project.name}
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {project.description || "No description provided."}
                    </CardDescription>
                  </CardHeader>

                  <CardFooter className="pt-2 border-t border-border/60 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-muted-foreground">
                      {project._count?.workItems ?? 0} Work Items
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="h-7 text-xs font-semibold gap-1"
                      >
                        <Link href={`/${clientSlug}/${project.key}/backlog`}>
                          <Layers className="h-3 w-3" />
                          <span>Backlog</span>
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        asChild
                        className="h-7 text-xs font-semibold gap-1"
                      >
                        <Link href={`/${clientSlug}/${project.key}/board`}>
                          <Kanban className="h-3 w-3" />
                          <span>Board</span>
                        </Link>
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>

      <CreateProjectDialog
        isOpen={isCreateProjectOpen}
        onClose={() => setIsCreateProjectOpen(false)}
        defaultClientId={client.id}
      />

      <CreateItemDialog
        isOpen={isCreateItemOpen}
        onClose={() => setIsCreateItemOpen(false)}
        projectId={firstProject?.id ?? ""}
      />

      <CreateSprintDialog
        isOpen={isCreateSprintOpen}
        onClose={() => setIsCreateSprintOpen(false)}
        projectId={firstProject?.id ?? ""}
      />

      <InviteUserDialog
        isOpen={isInviteUserOpen}
        onClose={() => setIsInviteUserOpen(false)}
      />

      <AiStoryModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        projectId={firstProject?.id ?? ""}
      />

      <CommandMenu
        isOpen={isCommandMenuOpen}
        onClose={() => setIsCommandMenuOpen(false)}
        projectId={firstProject?.id ?? ""}
        projects={projectList}
        onSelectProject={(id) => {
          const target = projectList.find((p) => p.id === id);
          if (target) {
            router.push(`/${clientSlug}/${target.key}/board`);
          }
        }}
        onOpenCreateItem={() => setIsCreateItemOpen(true)}
        onOpenCreateSprint={() => setIsCreateSprintOpen(true)}
        onOpenCreateProject={() => setIsCreateProjectOpen(true)}
        onOpenAiStory={() => setIsAiModalOpen(true)}
        onOpenInviteMember={() => setIsInviteUserOpen(true)}
        onNavigateTab={(tab) => {
          if (firstProject) {
            router.push(
              `/${clientSlug}/${firstProject.key}/${tab === "board" ? "board" : tab}`,
            );
          }
        }}
      />
    </div>
  );
}
