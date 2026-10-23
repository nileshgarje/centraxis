"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Search,
  X,
  Filter,
  User,
  Check,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import {
  Input,
  Button,
  Badge,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@centraxis/ui";
import { api } from "~/trpc/react";

export interface BoardFilterState {
  search: string;
  assigneeIds: string[]; // can include "unassigned"
  statuses: string[];
}

export interface StatusOption {
  id: string;
  label: string;
  indicatorColor: string;
}

export const DEFAULT_BOARD_STATUSES: StatusOption[] = [
  { id: "TODO", label: "To Do", indicatorColor: "bg-blue-500" },
  { id: "IN_PROGRESS", label: "In Progress", indicatorColor: "bg-amber-500" },
  { id: "IN_REVIEW", label: "In Review", indicatorColor: "bg-purple-500" },
  { id: "DONE", label: "Done", indicatorColor: "bg-emerald-500" },
];

export const BACKLOG_STATUSES: StatusOption[] = [
  { id: "BACKLOG", label: "Backlog", indicatorColor: "bg-slate-500" },
  ...DEFAULT_BOARD_STATUSES,
];

export function matchesBoardFilter(
  item: {
    key?: string | null;
    title?: string | null;
    description?: string | null;
    status: string;
    assignee?: { id: string } | null;
    assigneeId?: string | null;
  },
  filters: BoardFilterState,
): boolean {
  // 1. Text Search Filter (Title, Key, Description)
  if (filters.search && filters.search.trim()) {
    const q = filters.search.trim().toLowerCase();
    const keyMatch = item.key?.toLowerCase().includes(q) ?? false;
    const titleMatch = item.title?.toLowerCase().includes(q) ?? false;
    const descMatch = item.description?.toLowerCase().includes(q) ?? false;

    if (!keyMatch && !titleMatch && !descMatch) {
      return false;
    }
  }

  // 2. Assignee Filter
  if (filters.assigneeIds.length > 0) {
    const itemAssigneeId = item.assignee?.id ?? item.assigneeId ?? null;
    const isUnassigned = !itemAssigneeId;

    const matchesAssignee = filters.assigneeIds.some((selectedId) => {
      if (selectedId === "unassigned") {
        return isUnassigned;
      }
      return itemAssigneeId === selectedId;
    });

    if (!matchesAssignee) {
      return false;
    }
  }

  // 3. Status Filter
  if (filters.statuses.length > 0) {
    if (!filters.statuses.includes(item.status)) {
      return false;
    }
  }

  return true;
}

interface BoardFilterBarProps {
  projectId: string;
  availableStatuses?: StatusOption[];
  onFilterChange: (filters: BoardFilterState) => void;
  className?: string;
}

export function BoardFilterBar({
  projectId,
  availableStatuses = DEFAULT_BOARD_STATUSES,
  onFilterChange,
  className = "",
}: BoardFilterBarProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const [, startTransition] = useTransition();

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch assignable project members
  const { data: assignableUsers } = api.project.getAssignableUsers.useQuery(
    { projectId },
    { staleTime: 30000 },
  );

  // Parse initial filters from URL searchParams
  const getFiltersFromUrl = (): BoardFilterState => {
    const q = searchParams.get("q") ?? "";
    const assigneesParam = searchParams.get("assignees");
    const statusParam = searchParams.get("status");

    return {
      search: q,
      assigneeIds: assigneesParam
        ? assigneesParam
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
      statuses: statusParam
        ? statusParam
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
    };
  };

  const [filters, setFilters] = useState<BoardFilterState>(getFiltersFromUrl);
  const [searchInput, setSearchInput] = useState<string>(filters.search);

  // Synchronize from URL if searchParams change externally
  useEffect(() => {
    const urlFilters = getFiltersFromUrl();
    setFilters(urlFilters);
    setSearchInput(urlFilters.search);
    onFilterChange(urlFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Sync state to URL with debounce for text search
  const syncToUrl = (newFilters: BoardFilterState) => {
    if (typeof window === "undefined") return;

    const current = new URLSearchParams(window.location.search);

    if (newFilters.search.trim()) {
      current.set("q", newFilters.search.trim());
    } else {
      current.delete("q");
    }

    if (newFilters.assigneeIds.length > 0) {
      current.set("assignees", newFilters.assigneeIds.join(","));
    } else {
      current.delete("assignees");
    }

    if (newFilters.statuses.length > 0) {
      current.set("status", newFilters.statuses.join(","));
    } else {
      current.delete("status");
    }

    const searchStr = current.toString();
    const query = searchStr ? `?${searchStr}` : "";
    window.history.replaceState(null, "", `${pathname}${query}`);
  };

  // Debounce search input (250ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) {
        const nextFilters = { ...filters, search: searchInput };
        setFilters(nextFilters);
        onFilterChange(nextFilters);
        syncToUrl(nextFilters);
      }
    }, 250);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  // Global keyboard shortcut: Press "/" to focus search input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName) &&
        !(e.target as HTMLElement)?.isContentEditable
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const updateFilters = (nextFilters: BoardFilterState) => {
    setFilters(nextFilters);
    onFilterChange(nextFilters);
    syncToUrl(nextFilters);
  };

  // Assignee avatar toggles
  const toggleAssignee = (userId: string) => {
    const exists = filters.assigneeIds.includes(userId);
    const next = exists
      ? filters.assigneeIds.filter((id) => id !== userId)
      : [...filters.assigneeIds, userId];

    updateFilters({ ...filters, assigneeIds: next });
  };

  // "Only My Issues" toggle
  const currentUserId = session?.user?.id;
  const isOnlyMyIssues =
    !!currentUserId &&
    filters.assigneeIds.length === 1 &&
    filters.assigneeIds[0] === currentUserId;

  const toggleOnlyMyIssues = () => {
    if (!currentUserId) return;
    if (isOnlyMyIssues) {
      updateFilters({ ...filters, assigneeIds: [] });
    } else {
      updateFilters({ ...filters, assigneeIds: [currentUserId] });
    }
  };

  // "Unassigned" toggle
  const isUnassignedSelected = filters.assigneeIds.includes("unassigned");
  const toggleUnassigned = () => {
    const next = isUnassignedSelected
      ? filters.assigneeIds.filter((id) => id !== "unassigned")
      : [...filters.assigneeIds, "unassigned"];

    updateFilters({ ...filters, assigneeIds: next });
  };

  // Status toggle
  const toggleStatus = (statusId: string) => {
    const exists = filters.statuses.includes(statusId);
    const next = exists
      ? filters.statuses.filter((s) => s !== statusId)
      : [...filters.statuses, statusId];

    updateFilters({ ...filters, statuses: next });
  };

  // Clear all filters
  const clearAllFilters = () => {
    const emptyFilters: BoardFilterState = {
      search: "",
      assigneeIds: [],
      statuses: [],
    };
    setSearchInput("");
    updateFilters(emptyFilters);
  };

  // Active filter count
  const activeFiltersCount =
    (filters.search.trim() ? 1 : 0) +
    filters.assigneeIds.length +
    filters.statuses.length;

  return (
    <TooltipProvider delayDuration={200}>
      <div
        data-testid="board-filter-bar"
        className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card/60 p-2.5 shadow-2xs backdrop-blur-xs ${className}`}
      >
        {/* Left Section: Quick Text Search + Assignee Avatars */}
        <div className="flex flex-wrap items-center gap-2.5 min-w-0 flex-1">
          {/* Quick Text Search Input */}
          <div className="relative min-w-[200px] sm:min-w-[260px] max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              data-testid="board-search-input"
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Filter by title, key, or desc..."
              className="h-8 pl-8 pr-14 text-xs bg-background/80 focus-visible:ring-1"
            />
            {searchInput ? (
              <button
                type="button"
                onClick={() => setSearchInput("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition p-0.5 rounded"
                title="Clear search"
              >
                <X className="h-3 w-3" />
              </button>
            ) : (
              <kbd
                className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-border/70 bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground shadow-2xs hidden sm:inline-block"
                title="Press / to focus"
              >
                /
              </kbd>
            )}
          </div>

          <div className="h-4 w-px bg-border/60 hidden sm:block" />

          {/* "Only My Issues" Shortcut Button */}
          {session?.user && (
            <Button
              type="button"
              data-testid="filter-only-my-issues"
              variant={isOnlyMyIssues ? "default" : "outline"}
              size="sm"
              onClick={toggleOnlyMyIssues}
              className={`h-8 text-xs gap-1.5 transition ${
                isOnlyMyIssues
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <User className="h-3.5 w-3.5" />
              <span>Only My Issues</span>
            </Button>
          )}

          {/* Assignee Avatar Group Stack */}
          {assignableUsers && assignableUsers.length > 0 && (
            <div className="flex items-center -space-x-1.5 overflow-hidden p-0.5">
              {assignableUsers.slice(0, 7).map((u) => {
                const isSelected = filters.assigneeIds.includes(u.id);
                const initials = (
                  u.name?.[0] ||
                  u.email?.[0] ||
                  "?"
                ).toUpperCase();

                return (
                  <Tooltip key={u.id}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        data-testid={`filter-avatar-${u.id}`}
                        onClick={() => toggleAssignee(u.id)}
                        className={`relative rounded-full transition-transform hover:z-20 hover:scale-110 focus:outline-none ${
                          isSelected
                            ? "ring-2 ring-primary ring-offset-2 ring-offset-background z-10"
                            : "opacity-80 hover:opacity-100"
                        }`}
                        aria-label={u.name || u.email || "Member"}
                      >
                        <Avatar className="h-7 w-7 border-2 border-background cursor-pointer">
                          <AvatarImage src={u.image ?? undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary font-bold text-[10px]">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        {isSelected && (
                          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary" />
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="bottom"
                      className="text-xs border border-border bg-popover text-popover-foreground shadow-md px-3 py-2 space-y-0.5"
                    >
                      <p className="font-semibold text-foreground text-xs leading-tight">
                        {u.name || "Member"}
                      </p>
                      {u.email && (
                        <p className="text-[11px] text-muted-foreground leading-tight">
                          {u.email}
                        </p>
                      )}
                      <p className="text-[10px] text-primary font-semibold pt-0.5 leading-tight">
                        {isSelected ? "Click to unselect" : "Click to filter"}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          )}

          {/* "Unassigned" Filter Pill */}
          <Button
            type="button"
            data-testid="filter-unassigned"
            variant={isUnassignedSelected ? "secondary" : "ghost"}
            size="sm"
            onClick={toggleUnassigned}
            className={`h-8 text-xs gap-1 border border-dashed transition ${
              isUnassignedSelected
                ? "border-primary/50 bg-primary/10 text-primary font-semibold"
                : "border-border text-muted-foreground hover:text-foreground hover:border-border/80"
            }`}
          >
            <span>Unassigned</span>
          </Button>
        </div>

        {/* Right Section: Status Dropdown + Active Filters Reset */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Status Multi-Select Filter Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                data-testid="filter-status-dropdown"
                variant={filters.statuses.length > 0 ? "secondary" : "outline"}
                size="sm"
                className={`h-8 gap-1.5 text-xs transition ${
                  filters.statuses.length > 0
                    ? "border-primary/40 bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Filter className="h-3.5 w-3.5" />
                <span>Status</span>
                {filters.statuses.length > 0 && (
                  <Badge
                    variant="default"
                    className="ml-0.5 h-4 px-1.5 text-[10px] font-bold"
                  >
                    {filters.statuses.length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="text-xs font-semibold">
                Filter by Status
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {availableStatuses.map((st) => {
                const isChecked = filters.statuses.includes(st.id);
                return (
                  <DropdownMenuCheckboxItem
                    key={st.id}
                    data-testid={`filter-status-checkbox-${st.id}`}
                    checked={isChecked}
                    onCheckedChange={() => toggleStatus(st.id)}
                    className="text-xs cursor-pointer"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <span
                        className={`h-2 w-2 rounded-full ${st.indicatorColor}`}
                      />
                      <span>{st.label}</span>
                    </div>
                  </DropdownMenuCheckboxItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Active Filters Count & Reset Button */}
          {activeFiltersCount > 0 && (
            <div className="flex items-center gap-1.5 animate-in fade-in-0 duration-150">
              <Badge
                variant="outline"
                className="h-7 px-2 text-[11px] font-medium border-border/80 bg-muted/50 text-muted-foreground"
              >
                {activeFiltersCount}{" "}
                {activeFiltersCount === 1 ? "filter" : "filters"}
              </Badge>

              <Button
                type="button"
                data-testid="filter-clear-all"
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition gap-1"
                title="Clear all active filters"
              >
                <RotateCcw className="h-3 w-3" />
                <span className="hidden sm:inline">Clear all</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
