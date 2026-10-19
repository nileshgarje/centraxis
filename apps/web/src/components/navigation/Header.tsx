"use client";

import React from "react";
import { useSession } from "next-auth/react";
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
} from "lucide-react";
import {
  CentraxisLogo,
  ThemeToggle,
  Button,
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

interface HeaderProps {
  projects: Array<{ id: string; key: string; name: string }>;
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
}: HeaderProps) {
  const { data: session } = useSession();
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  // Close project dropdown when clicking outside
  React.useEffect(() => {
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

  return (
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

            {/* Switcher Dropdown Menu */}
            {isProjectDropdownOpen && (
              <div className="absolute left-0 mt-1.5 w-64 rounded-md border border-slate-200 bg-white p-1 text-slate-950 shadow-xl dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Projects ({projects.length})
                </div>

                <div className="max-h-56 overflow-y-auto space-y-0.5">
                  {projects.map((project) => {
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
                          <span className="truncate">{project.name}</span>
                          <span className="rounded bg-muted px-1 py-0.2 font-mono text-[10px] text-muted-foreground">
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

                {/* + New Project Button */}
                {canCreateProject && onCreateProject && (
                  <div className="mt-1 border-t border-border pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsProjectDropdownOpen(false);
                        onCreateProject();
                      }}
                      className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 transition"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>+ New Project</span>
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

          <ThemeToggle />

          {/* User Profile */}
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8 ring-1 ring-border">
              <AvatarImage src={session?.user?.image ?? undefined} />
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                {userInitials}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>
    </header>
  );
}
