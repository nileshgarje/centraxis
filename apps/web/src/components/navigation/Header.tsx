"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Sparkles,
  Layers,
  Kanban,
  Users,
  ChevronDown,
  CheckCircle2,
  Briefcase,
  Plus,
  Search,
  Calendar,
  UserPlus,
  BarChart3,
  Building2,
  ShieldCheck,
  Shield,
  Settings,
  LogOut,
  User,
  FolderGit2,
  AlertTriangle,
} from "lucide-react";
import {
  CentraxisLogo,
  ThemeToggle,
  Button,
  Badge,
  Avatar,
  AvatarFallback,
  AvatarImage,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@centraxis/ui";
import { api } from "~/trpc/react";
import { CreateClientDialog } from "../clients/create-client-dialog";
import { NotificationPopover } from "../layout/notification-popover";

interface HeaderProjectItem {
  id: string;
  key: string;
  name: string;
  clientId?: string | null;
  client?: { id: string; name: string; slug: string } | null;
}

interface HeaderProps {
  projects: HeaderProjectItem[];
  selectedProjectId: string;
  onSelectProject: (id: string) => void;
  activeSprintName?: string;
  activeTab: "board" | "backlog" | "teams" | "metrics";
  onTabChange: (tab: "board" | "backlog" | "teams" | "metrics") => void;
  onOpenAiModal: () => void;
  onCreateItem: () => void;
  onCreateProject?: () => void;
  onCreateSprint?: () => void;
  onOpenInvite?: () => void;
  onOpenCommandMenu?: () => void;
  clientSlug?: string;
  projectKey?: string;
}

export function Header({
  projects,
  selectedProjectId,
  onSelectProject,
  activeSprintName,
  activeTab,
  onTabChange,
  onOpenAiModal,
  onCreateItem,
  onCreateProject,
  onCreateSprint,
  onOpenInvite,
  onOpenCommandMenu,
  clientSlug,
  projectKey,
}: HeaderProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [isCreateClientOpen, setIsCreateClientOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: clientList } = api.clients.list.useQuery();

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  // Close project dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsProjectDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const canCreateProject =
    !session ||
    session.user?.role === "ORG_ADMIN" ||
    session.user?.role === "SCRUM_MASTER";

  const canInviteMember =
    !session ||
    session.user?.role === "ORG_ADMIN" ||
    session.user?.role === "SCRUM_MASTER";

  const userInitials =
    session?.user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "AM";

  const isEntraIdUser =
    session?.user?.email?.toLowerCase().endsWith("@centvis.com") || false;

  // Group projects by Client
  const clientMap = new Map<string, { client: { id: string; name: string; slug: string }; items: HeaderProjectItem[] }>();
  const internalProjects: HeaderProjectItem[] = [];

  // Initialize clients from API
  if (clientList) {
    for (const c of clientList) {
      clientMap.set(c.id, { client: { id: c.id, name: c.name, slug: c.slug }, items: [] });
    }
  }

  // Populate projects into buckets
  for (const p of projects) {
    if (p.clientId && clientMap.has(p.clientId)) {
      clientMap.get(p.clientId)!.items.push(p);
    } else if (p.client && clientMap.has(p.client.id)) {
      clientMap.get(p.client.id)!.items.push(p);
    } else if (p.clientId && !clientMap.has(p.clientId)) {
      const clientName = p.client?.name || "Client";
      const clientSlug = p.client?.slug || p.clientId;
      clientMap.set(p.clientId, {
        client: { id: p.clientId, name: clientName, slug: clientSlug },
        items: [p],
      });
    } else {
      internalProjects.push(p);
    }
  }

  const clientGroups = Array.from(clientMap.values());

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur px-6">
        <div className="flex h-14 items-center justify-between gap-4">
          {/* Left Section: Logo + Project Dropdown */}
          <div className="flex items-center gap-4 shrink-0">
            <CentraxisLogo size="md" />

            <div className="h-4 w-px bg-border" />

            {/* Interactive Project Switcher Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsProjectDropdownOpen((prev) => !prev)}
                className="flex items-center gap-2 rounded-md border border-border bg-muted/30 hover:bg-muted/70 px-2.5 py-1 text-xs font-medium text-foreground transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="truncate max-w-[130px] sm:max-w-[180px]">
                  {selectedProject?.name ?? "Select Project"}
                </span>
                {selectedProject?.key && (
                  <span className="rounded bg-muted px-1.5 py-0.2 font-mono text-[10px] text-muted-foreground font-semibold">
                    {selectedProject.key}
                  </span>
                )}
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>

              {/* 2-Level Multi-Client Switcher Dropdown Menu */}
              {isProjectDropdownOpen && (
                <div className="absolute left-0 mt-1.5 w-72 rounded-md border border-slate-200 bg-white p-1 text-slate-950 shadow-xl dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="flex items-center justify-between px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/60">
                    <span>Clients & Projects</span>
                    <span>{projects.length} Total</span>
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-border/40 py-1">
                    {/* Render Client Groups */}
                    {clientGroups.map(({ client, items }) => (
                      <div key={client.id} className="py-1">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                          <Building2 className="h-3 w-3 text-indigo-500" />
                          <Link
                            href={`/${client.slug}`}
                            onClick={() => setIsProjectDropdownOpen(false)}
                            className="truncate hover:text-foreground hover:underline transition"
                          >
                            {client.name}
                          </Link>
                          <span className="ml-auto text-[10px] text-muted-foreground font-mono">
                            {items.length}
                          </span>
                        </div>

                        {items.length === 0 ? (
                          <div className="px-5 py-1 text-[11px] text-muted-foreground/70 italic">
                            No projects in client space
                          </div>
                        ) : (
                          <div className="space-y-0.5 pl-2 pr-1">
                            {items.map((project) => {
                              const isSelected = project.id === selectedProjectId;
                              return (
                                <button
                                  key={project.id}
                                  type="button"
                                  onClick={() => {
                                    onSelectProject(project.id);
                                    setIsProjectDropdownOpen(false);
                                    if (client.slug && project.key) {
                                      router.push(`/${client.slug}/${project.key}/${activeTab || "board"}`);
                                    }
                                  }}
                                  className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs transition ${
                                    isSelected
                                      ? "bg-accent font-semibold text-accent-foreground"
                                      : "text-foreground hover:bg-muted"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 truncate">
                                    <FolderGit2 className="h-3 w-3 text-muted-foreground shrink-0" />
                                    <span className="truncate">{project.name}</span>
                                    <span className="rounded bg-muted px-1 py-0.2 font-mono text-[10px] text-muted-foreground font-semibold">
                                      {project.key}
                                    </span>
                                  </div>
                                  {isSelected && (
                                    <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 ml-1" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Render Internal / Unassigned Projects */}
                    {internalProjects.length > 0 && (
                      <div className="py-1">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                          <Briefcase className="h-3 w-3 text-slate-500" />
                          <span>Internal Projects</span>
                          <span className="ml-auto text-[10px] text-muted-foreground font-mono">
                            {internalProjects.length}
                          </span>
                        </div>

                        <div className="space-y-0.5 pl-2 pr-1">
                          {internalProjects.map((project) => {
                            const isSelected = project.id === selectedProjectId;
                            return (
                              <button
                                key={project.id}
                                type="button"
                                onClick={() => {
                                  onSelectProject(project.id);
                                  setIsProjectDropdownOpen(false);
                                }}
                                className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs transition ${
                                  isSelected
                                    ? "bg-accent font-semibold text-accent-foreground"
                                    : "text-foreground hover:bg-muted"
                                }`}
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <FolderGit2 className="h-3 w-3 text-muted-foreground shrink-0" />
                                  <span className="truncate">{project.name}</span>
                                  <span className="rounded bg-muted px-1 py-0.2 font-mono text-[10px] text-muted-foreground font-semibold">
                                    {project.key}
                                  </span>
                                </div>
                                {isSelected && (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 ml-1" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions Footer: + Add Project & + Add Client */}
                  {canCreateProject && (
                    <div className="mt-1 border-t border-border pt-1 flex items-center justify-between gap-1 px-1">
                      {onCreateProject && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsProjectDropdownOpen(false);
                            onCreateProject();
                          }}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-medium text-primary hover:bg-primary/10 transition"
                        >
                          <Plus className="h-3 w-3" />
                          <span>+ Project</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setIsProjectDropdownOpen(false);
                          setIsCreateClientOpen(true);
                        }}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-medium text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition"
                      >
                        <Building2 className="h-3 w-3" />
                        <span>+ Client</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Center: Clean Text Tab Links */}
          <nav className="hidden md:flex items-center gap-1 h-full">
            <button
              onClick={() => onTabChange("board")}
              data-testid="tab-active-board"
              className={`flex items-center gap-1.5 h-full px-3 text-xs sm:text-sm font-medium transition-colors border-b-2 ${
                activeTab === "board"
                  ? "border-primary text-foreground font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Kanban className="h-3.5 w-3.5" />
              <span>Active Board</span>
            </button>

            <button
              onClick={() => onTabChange("backlog")}
              data-testid="tab-backlog"
              className={`flex items-center gap-1.5 h-full px-3 text-xs sm:text-sm font-medium transition-colors border-b-2 ${
                activeTab === "backlog"
                  ? "border-primary text-foreground font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Backlog</span>
            </button>

            <button
              onClick={() => onTabChange("teams")}
              className={`flex items-center gap-1.5 h-full px-3 text-xs sm:text-sm font-medium transition-colors border-b-2 ${
                activeTab === "teams"
                  ? "border-primary text-foreground font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>Squads</span>
            </button>

            <button
              onClick={() => onTabChange("metrics")}
              className={`flex items-center gap-1.5 h-full px-3 text-xs sm:text-sm font-medium transition-colors border-b-2 ${
                activeTab === "metrics"
                  ? "border-primary text-foreground font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              <span>Analytics</span>
            </button>
          </nav>

          {/* Right Section: Search, Unified + Create Dropdown, User Profile, ThemeToggle */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Search Trigger (Cmd+K) */}
            {onOpenCommandMenu && (
              <button
                type="button"
                onClick={onOpenCommandMenu}
                className="flex items-center gap-2 rounded-md border border-border bg-muted/30 hover:bg-muted/70 px-2.5 py-1.5 text-xs text-muted-foreground transition"
                title="Search or command... (Cmd+K)"
              >
                <Search className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Search...</span>
                <kbd className="hidden sm:inline-block rounded border border-border bg-background px-1.5 py-0.2 font-mono text-[10px] text-muted-foreground">
                  ⌘K
                </kbd>
              </button>
            )}

            {/* ONE Unified Primary + Create Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="gap-1.5 shadow-sm">
                  <Plus className="h-4 w-4" />
                  <span>Create</span>
                  <ChevronDown className="h-3 w-3 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Quick Create
                </DropdownMenuLabel>
                <DropdownMenuItem onClick={onCreateItem} className="gap-2">
                  <Plus className="h-4 w-4 text-primary" />
                  <div className="flex flex-1 items-center justify-between">
                    <span>Issue / Work Item</span>
                    <kbd className="text-[10px] font-mono text-muted-foreground">C</kbd>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuItem onClick={onOpenAiModal} className="gap-2" data-testid="action-ai-story">
                  <Sparkles className="h-4 w-4 text-indigo-400" />
                  <div className="flex flex-1 items-center justify-between">
                    <span>AI Story Agent</span>
                    <kbd className="text-[10px] font-mono text-muted-foreground">⌘J</kbd>
                  </div>
                </DropdownMenuItem>

                {onCreateSprint && (
                  <DropdownMenuItem onClick={onCreateSprint} className="gap-2">
                    <Calendar className="h-4 w-4 text-emerald-400" />
                    <span>Sprint</span>
                  </DropdownMenuItem>
                )}

                {canInviteMember && onOpenInvite && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onOpenInvite} className="gap-2">
                      <UserPlus className="h-4 w-4 text-purple-400" />
                      <span>Invite Member...</span>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {session?.user?.isTemporary && (
              <Badge
                variant="outline"
                className="hidden sm:inline-flex items-center gap-1.5 border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2.5 py-1 text-xs font-semibold shadow-xs"
                title="Logged in as Temporary Bootstrap Administrator (KC_BOOTSTRAP_ADMIN)"
              >
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                <span>Temporary Admin</span>
              </Badge>
            )}

            <NotificationPopover />

            <ThemeToggle />

            {/* User Profile Avatar Dropdown Menu with Entra ID SSO info and Settings Navigation */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring relative"
                >
                  <Avatar className="h-8 w-8 ring-1 ring-border cursor-pointer transition hover:opacity-90">
                    <AvatarImage src={session?.user?.image ?? undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  {session?.user?.isTemporary && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <div className="flex items-center gap-3 p-2">
                  <Avatar className="h-9 w-9 ring-1 ring-border shrink-0">
                    <AvatarImage src={session?.user?.image ?? undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-foreground truncate">
                        {session?.user?.name ?? "Admin User"}
                      </span>
                      {session?.user?.isTemporary && (
                        <Badge
                          variant="outline"
                          className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[9px] px-1 py-0 font-bold uppercase tracking-wider shrink-0"
                        >
                          Temporary
                        </Badge>
                      )}
                    </div>
                    <span className="text-[11px] text-muted-foreground truncate">
                      {session?.user?.email ?? "admin@centvis.com"}
                    </span>
                    <div className="mt-1 flex items-center gap-1">
                      <span className="inline-flex items-center gap-1 rounded bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 px-1.5 py-0.5 font-sans text-[10px] font-semibold text-indigo-700 dark:text-indigo-300">
                        <ShieldCheck className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                        {isEntraIdUser ? "Entra ID SSO" : "Local Workspace"}
                      </span>
                    </div>
                    {session?.user?.isTemporary && (
                      <div className="mt-2 rounded-lg bg-amber-500/10 border border-amber-500/30 p-2 text-[11px] text-amber-900 dark:text-amber-200 space-y-0.5">
                        <div className="flex items-center gap-1 font-bold text-amber-700 dark:text-amber-400">
                          <AlertTriangle className="h-3 w-3 shrink-0" />
                          <span>Temporary Account</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-tight">
                          Provisioned via KC_BOOTSTRAP_ADMIN. Create a permanent admin in Workspace Members and remove this user.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <DropdownMenuSeparator />

                <DropdownMenuItem asChild>
                  <Link href="/settings/profile" className="flex items-center gap-2 cursor-pointer">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>Account & Profile</span>
                  </Link>
                </DropdownMenuItem>

                {clientSlug && (
                  <DropdownMenuItem asChild>
                    <Link href={`/${clientSlug}/settings`} className="flex items-center gap-2 cursor-pointer">
                      <Settings className="h-4 w-4 text-muted-foreground" />
                      <span>Client Settings</span>
                    </Link>
                  </DropdownMenuItem>
                )}

                <DropdownMenuItem asChild>
                  <Link href="/settings/clients" className="flex items-center gap-2 cursor-pointer">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>Clients & Tenancy</span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link href="/settings/members" className="flex items-center gap-2 cursor-pointer">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>Workspace Members</span>
                  </Link>
                </DropdownMenuItem>

                {(session?.user?.globalRole === "SYSTEM_ADMIN" || session?.user?.role === "ORG_ADMIN") && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin" className="flex items-center gap-2 cursor-pointer font-medium text-indigo-600 dark:text-indigo-400">
                      <Shield className="h-4 w-4" />
                      <span>Admin Hub</span>
                    </Link>
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="flex items-center gap-2 text-red-600 dark:text-red-400 cursor-pointer focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/40"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Modal Dialog for creating a new Client */}
      <CreateClientDialog
        isOpen={isCreateClientOpen}
        onClose={() => setIsCreateClientOpen(false)}
      />
    </>
  );
}
