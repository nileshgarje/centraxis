"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  FolderGit2,
  ChevronDown,
  CheckCircle2,
  Plus,
  Layers,
  Shield,
} from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@centraxis/ui";
import { api } from "~/trpc/react";
import { CreateClientDialog } from "../clients/create-client-dialog";
import { CreateProjectDialog } from "../projects/create-project-dialog";

interface ClientProjectSwitcherProps {
  currentClientSlug?: string;
  currentProjectKey?: string;
  onProjectSelect?: (projectId: string) => void;
  className?: string;
}

export function ClientProjectSwitcher({
  currentClientSlug,
  currentProjectKey,
  onProjectSelect,
  className = "",
}: ClientProjectSwitcherProps) {
  const router = useRouter();
  const [isCreateClientOpen, setIsCreateClientOpen] = useState(false);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);

  const { data: clients, isLoading } = api.clients.list.useQuery();

  // Find active client and active project
  const activeClient = clients?.find((c) => c.slug === currentClientSlug);
  const activeProject = activeClient?.projects.find(
    (p) => p.key.toLowerCase() === currentProjectKey?.toLowerCase(),
  );

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={`flex items-center space-x-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-foreground shadow-sm hover:bg-muted/60 transition focus:outline-none focus:ring-1 focus:ring-primary ${className}`}
          >
            <Building2 className="h-4 w-4 text-primary shrink-0" />
            <div className="flex items-center space-x-1.5 text-left truncate">
              <span className="font-semibold truncate max-w-[120px]">
                {activeClient ? activeClient.name : "Select Client"}
              </span>
              {activeProject && (
                <>
                  <span className="text-muted-foreground/60">/</span>
                  <span className="font-mono text-primary font-bold">
                    {activeProject.key}
                  </span>
                </>
              )}
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-auto shrink-0" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="start"
          className="w-72 max-h-[85vh] overflow-y-auto"
        >
          <DropdownMenuLabel className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <span>Client Workspaces</span>
            <button
              onClick={() => setIsCreateClientOpen(true)}
              className="flex items-center space-x-1 text-primary hover:underline lowercase font-semibold"
            >
              <Plus className="h-3 w-3" />
              <span>add client</span>
            </button>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {isLoading ? (
            <div className="py-4 text-center text-xs text-muted-foreground">
              Loading workspaces...
            </div>
          ) : !clients || clients.length === 0 ? (
            <div className="py-4 text-center text-xs text-muted-foreground italic">
              No accessible client workspaces found.
            </div>
          ) : (
            clients.map((client) => {
              const isClientActive = client.slug === currentClientSlug;

              return (
                <div key={client.id} className="py-1">
                  {/* Client Workspace Row */}
                  <button
                    type="button"
                    onClick={() => {
                      router.push(`/${client.slug}`);
                    }}
                    className={`flex w-full items-center justify-between px-2.5 py-1.5 text-xs rounded-md transition ${
                      isClientActive && !currentProjectKey
                        ? "bg-accent text-accent-foreground font-bold"
                        : "hover:bg-muted font-semibold text-foreground"
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="truncate">{client.name}</span>
                      <span className="text-[10px] text-muted-foreground font-normal">
                        ({client.slug})
                      </span>
                    </div>
                    {isClientActive && !currentProjectKey && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                    )}
                  </button>

                  {/* Projects under this Client */}
                  {client.projects && client.projects.length > 0 && (
                    <div className="ml-4 pl-2 border-l border-border/60 my-0.5 space-y-0.5">
                      {client.projects.map((proj) => {
                        const isProjActive =
                          isClientActive &&
                          proj.key.toLowerCase() ===
                            currentProjectKey?.toLowerCase();

                        return (
                          <button
                            key={proj.id}
                            type="button"
                            onClick={() => {
                              if (onProjectSelect) {
                                onProjectSelect(proj.id);
                              }
                              router.push(`/${client.slug}/${proj.key}/board`);
                            }}
                            className={`flex w-full items-center justify-between px-2 py-1 text-xs rounded transition ${
                              isProjActive
                                ? "bg-primary/10 text-primary font-semibold"
                                : "hover:bg-muted text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            <div className="flex items-center space-x-2 truncate">
                              <span className="font-mono text-[10px] text-primary font-bold">
                                [{proj.key}]
                              </span>
                              <span className="truncate">{proj.name}</span>
                            </div>
                            {isProjActive && (
                              <CheckCircle2 className="h-3 w-3 text-primary shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}

          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setIsCreateProjectOpen(true)}
            className="text-xs gap-2 text-foreground font-medium cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 text-primary" />
            <span>+ Create New Project</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateClientDialog
        isOpen={isCreateClientOpen}
        onClose={() => setIsCreateClientOpen(false)}
        onClientCreated={(clientId) => {
          setIsCreateClientOpen(false);
        }}
      />

      <CreateProjectDialog
        isOpen={isCreateProjectOpen}
        onClose={() => setIsCreateProjectOpen(false)}
      />
    </>
  );
}
