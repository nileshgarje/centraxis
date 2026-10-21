"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  Sparkles,
  Calendar,
  Briefcase,
  Layers,
  Kanban,
  Users,
  Settings,
  ArrowRight,
  UserPlus,
  Zap,
  CheckCircle2,
  Clock,
  Command,
} from "lucide-react";
import { api } from "~/trpc/react";

interface CommandMenuProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onOpenCreateItem: () => void;
  onOpenCreateSprint: () => void;
  onOpenCreateProject: () => void;
  onOpenAiStory: () => void;
  onOpenInviteMember?: () => void;
  onNavigateTab: (tab: "board" | "backlog" | "teams" | "metrics") => void;
  projects?: Array<{ id: string; key: string; name: string }>;
  onSelectProject?: (projectId: string) => void;
}

interface CommandItem {
  id: string;
  group: "Create" | "Navigation" | "Projects" | "Work Items";
  title: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  shortcut?: string;
  action: () => void;
}

export function CommandMenu({
  isOpen,
  onClose,
  projectId,
  onOpenCreateItem,
  onOpenCreateSprint,
  onOpenCreateProject,
  onOpenAiStory,
  onOpenInviteMember,
  onNavigateTab,
  projects = [],
  onSelectProject,
}: CommandMenuProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Search existing work items in project
  const cleanSearch = search.trim();
  const { data: searchResults, isLoading: isSearchingItems } =
    api.backlog.getItems.useQuery(
      { projectId, search: cleanSearch },
      { enabled: isOpen && !!projectId && cleanSearch.length >= 1 },
    );

  // Focus input whenever menu opens
  useEffect(() => {
    if (isOpen) {
      setSearch("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Base Create & Navigation Actions
  const baseActions = useMemo<CommandItem[]>(() => {
    const list: CommandItem[] = [
      // Create Actions
      {
        id: "create-item",
        group: "Create",
        title: "New Story / Task",
        subtitle: "Create a work item in active sprint or backlog",
        icon: Plus,
        shortcut: "C",
        action: () => {
          onClose();
          onOpenCreateItem();
        },
      },
      {
        id: "create-ai",
        group: "Create",
        title: "Generate Story with AI",
        subtitle: "INVEST-compliant story with Gherkin acceptance criteria",
        icon: Sparkles,
        shortcut: "⌘J",
        action: () => {
          onClose();
          onOpenAiStory();
        },
      },
      {
        id: "create-sprint",
        group: "Create",
        title: "New Sprint",
        subtitle: "Schedule a new 1-4 week iteration",
        icon: Calendar,
        action: () => {
          onClose();
          onOpenCreateSprint();
        },
      },
      {
        id: "create-project",
        group: "Create",
        title: "New Project",
        subtitle: "Spin up a new agile project space",
        icon: Briefcase,
        action: () => {
          onClose();
          onOpenCreateProject();
        },
      },
      ...(onOpenInviteMember
        ? [
            {
              id: "invite-member",
              group: "Create" as const,
              title: "Invite Team Member",
              subtitle: "Add colleagues to Centvis workspace",
              icon: UserPlus,
              action: () => {
                onClose();
                onOpenInviteMember();
              },
            },
          ]
        : []),

      // Navigation Actions
      {
        id: "nav-board",
        group: "Navigation",
        title: "Jump to Sprint Board",
        subtitle: "Kanban board: To Do, In Progress, In Review, Done",
        icon: Kanban,
        action: () => {
          onClose();
          onNavigateTab("board");
        },
      },
      {
        id: "nav-backlog",
        group: "Navigation",
        title: "Go to Backlog Planning",
        subtitle: "Hierarchical view of epics, stories, and sprint containers",
        icon: Layers,
        action: () => {
          onClose();
          onNavigateTab("backlog");
        },
      },
      {
        id: "nav-teams",
        group: "Navigation",
        title: "Go to Squads & Roles",
        subtitle: "View assigned teams and 25-person roster",
        icon: Users,
        action: () => {
          onClose();
          onNavigateTab("teams");
        },
      },
      {
        id: "nav-metrics",
        group: "Navigation",
        title: "Go to Sprint Metrics & Burndown",
        subtitle: "Ideal vs actual burn-down curves & team velocity",
        icon: Zap,
        action: () => {
          onClose();
          onNavigateTab("metrics");
        },
      },
      {
        id: "nav-settings-members",
        group: "Navigation",
        title: "Workspace Settings & Members",
        subtitle: "Manage RBAC roles and pending invitations",
        icon: Settings,
        action: () => {
          onClose();
          router.push("/settings/members");
        },
      },
    ];

    // Jump to Projects
    if (projects.length > 0 && onSelectProject) {
      projects.forEach((p) => {
        list.push({
          id: `project-${p.id}`,
          group: "Projects",
          title: `Switch to ${p.name}`,
          subtitle: `Project Key: ${p.key}`,
          icon: Briefcase,
          badge: p.key,
          action: () => {
            onClose();
            onSelectProject(p.id);
          },
        });
      });
    }

    return list;
  }, [
    onClose,
    onOpenCreateItem,
    onOpenCreateSprint,
    onOpenCreateProject,
    onOpenAiStory,
    onOpenInviteMember,
    onNavigateTab,
    projects,
    onSelectProject,
    router,
  ]);

  // Combine actions with work item search results
  const allItems = useMemo<CommandItem[]>(() => {
    let items = baseActions;

    if (cleanSearch) {
      const q = cleanSearch.toLowerCase();
      items = baseActions.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.subtitle?.toLowerCase().includes(q) ||
          item.badge?.toLowerCase().includes(q),
      );
    }

    // Add search result work items
    if (searchResults && searchResults.length > 0) {
      const workItemCommands: CommandItem[] = searchResults.map((wi) => ({
        id: `work-item-${wi.id}`,
        group: "Work Items",
        title: `${wi.key}: ${wi.title}`,
        subtitle: `${wi.type} • Status: ${wi.status}${
          wi.storyPoints ? ` • ${wi.storyPoints} pts` : ""
        }`,
        icon: Layers,
        badge: wi.key,
        action: () => {
          onClose();
          onNavigateTab("backlog");
        },
      }));

      return [...items, ...workItemCommands];
    }

    return items;
  }, [baseActions, cleanSearch, searchResults, onClose, onNavigateTab]);

  // Reset selected index if item list length changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [allItems.length]);

  // Keyboard navigation inside Command Bar
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, allItems.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev <= 0 ? Math.max(0, allItems.length - 1) : prev - 1,
      );
    } else if (e.key === "Enter" && allItems[selectedIndex]) {
      e.preventDefault();
      allItems[selectedIndex]?.action();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  // Group items by category
  const groups: Record<string, CommandItem[]> = {};
  allItems.forEach((item) => {
    if (!groups[item.group]) {
      groups[item.group] = [];
    }
    groups[item.group]!.push(item);
  });

  let runningIndex = 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Command Menu Card */}
      <div className="relative w-full max-w-xl rounded-2xl border border-border bg-card text-card-foreground shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Search Bar Input */}
        <div className="flex items-center border-b border-border px-4 py-3 bg-muted/30">
          <Search className="h-4 w-4 text-muted-foreground shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command, jump to a view, or search issues (e.g. CTX-1)..."
            className="w-full bg-transparent text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {cleanSearch && (
            <button
              onClick={() => setSearch("")}
              className="text-muted-foreground hover:text-foreground p-1 rounded-md"
            >
              <Command className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 divide-y divide-border">
          {allItems.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              No actions or issues found matching "{search}".
            </div>
          ) : (
            Object.entries(groups).map(([groupName, items]) => (
              <div key={groupName} className="py-1.5">
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {groupName}
                </div>
                <div className="space-y-0.5 mt-0.5">
                  {items.map((item) => {
                    const currentIndex = runningIndex++;
                    const isSelected = currentIndex === selectedIndex;
                    const Icon = item.icon;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => item.action()}
                        onMouseEnter={() => setSelectedIndex(currentIndex)}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition ${
                          isSelected
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "text-foreground hover:bg-muted"
                        }`}
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <div
                            className={`flex h-7 w-7 items-center justify-center rounded-lg shrink-0 ${
                              isSelected
                                ? "bg-primary-foreground/20 text-primary-foreground"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <div className="truncate">
                            <p
                              className={`font-semibold truncate ${
                                isSelected
                                  ? "text-primary-foreground"
                                  : "text-foreground"
                              }`}
                            >
                              {item.title}
                            </p>
                            {item.subtitle && (
                              <p
                                className={`text-[11px] truncate ${
                                  isSelected
                                    ? "text-primary-foreground/80"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {item.subtitle}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Shortcuts or Badges */}
                        <div className="flex items-center space-x-1.5 shrink-0 ml-3">
                          {item.badge && (
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-mono font-bold ${
                                isSelected
                                  ? "bg-primary-foreground/20 text-primary-foreground"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                          {item.shortcut && (
                            <kbd
                              className={`rounded px-1.5 py-0.5 text-[10px] font-mono font-semibold ${
                                isSelected
                                  ? "bg-primary-foreground/20 text-primary-foreground"
                                  : "bg-muted text-muted-foreground border border-border"
                              }`}
                            >
                              {item.shortcut}
                            </kbd>
                          )}
                          {isSelected && (
                            <ArrowRight className="h-3.5 w-3.5 text-primary-foreground/80" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Shortcut Hints */}
        <div className="flex items-center justify-between border-t border-border px-4 py-2.5 bg-muted/30 text-[11px] text-muted-foreground font-medium">
          <div className="flex items-center space-x-3">
            <span className="flex items-center space-x-1">
              <kbd className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-mono">
                ↑↓
              </kbd>
              <span>to navigate</span>
            </span>
            <span className="flex items-center space-x-1">
              <kbd className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-mono">
                ↵
              </kbd>
              <span>to select</span>
            </span>
            <span className="flex items-center space-x-1">
              <kbd className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-mono">
                esc
              </kbd>
              <span>to close</span>
            </span>
          </div>

          <div className="flex items-center space-x-1.5 text-primary font-semibold">
            <span>Centraxis Quick Command</span>
          </div>
        </div>
      </div>
    </div>
  );
}
