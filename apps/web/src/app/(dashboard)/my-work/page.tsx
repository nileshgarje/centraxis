"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  CheckSquare,
  Bookmark,
  Bug,
  Layers,
  Zap,
  Search,
  X,
  ExternalLink,
  Clock,
  CheckCircle2,
  AlertCircle,
  Inbox,
  ArrowLeft,
  Briefcase,
  Building2,
  Calendar,
  User as UserIcon,
} from "lucide-react";
import {
  CentvisLogo,
  ThemeToggle,
  Button,
  Badge,
  Input,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@centraxis/ui";
import { api } from "~/trpc/react";
import { WorkItemDrawer } from "~/components/work-items/work-item-drawer";
import { DueDateBadge } from "~/components/work-items/due-date-badge";
import { NotificationPopover } from "~/components/layout/notification-popover";

type DashboardTab =
  "ASSIGNED_UNRESOLVED" | "RESOLVED" | "RECENTLY_MODIFIED" | "REPORTED_BY_ME";

const PRIORITY_STYLES: Record<string, string> = {
  URGENT: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  HIGH: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  MEDIUM: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  LOW: "bg-muted text-muted-foreground border-border",
};

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; border: string }
> = {
  BACKLOG: {
    label: "Backlog",
    bg: "bg-slate-500/10",
    text: "text-slate-600 dark:text-slate-400",
    border: "border-slate-500/20",
  },
  TODO: {
    label: "To Do",
    bg: "bg-blue-500/10",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-500/20",
  },
  IN_PROGRESS: {
    label: "In Progress",
    bg: "bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-500/20",
  },
  IN_REVIEW: {
    label: "In Review",
    bg: "bg-purple-500/10",
    text: "text-purple-600 dark:text-purple-400",
    border: "border-purple-500/20",
  },
  DONE: {
    label: "Done",
    bg: "bg-emerald-500/10",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/20",
  },
};

function getTypeIcon(type: string) {
  switch (type) {
    case "BUG":
      return <Bug className="h-3.5 w-3.5 text-red-500 shrink-0" />;
    case "TASK":
      return <CheckSquare className="h-3.5 w-3.5 text-blue-500 shrink-0" />;
    case "FEATURE":
      return <Layers className="h-3.5 w-3.5 text-indigo-500 shrink-0" />;
    case "EPIC":
      return <Zap className="h-3.5 w-3.5 text-purple-500 shrink-0" />;
    case "STORY":
    default:
      return <Bookmark className="h-3.5 w-3.5 text-emerald-500 shrink-0" />;
  }
}

function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const d = new Date(date);
  const diffInSec = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diffInSec < 60) return "just now";
  const diffInMin = Math.floor(diffInSec / 60);
  if (diffInMin < 60) return `${diffInMin}m ago`;
  const diffInHours = Math.floor(diffInMin / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function MyWorkDashboardPage() {
  const { data: session } = useSession();
  const utils = api.useUtils();

  const [activeTab, setActiveTab] = useState<DashboardTab>(
    "ASSIGNED_UNRESOLVED",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Fetch counts across all 4 tabs for summary badges
  const { data: counts } = api.dashboard.getMyWorkCounts.useQuery(undefined, {
    staleTime: 10000,
  });

  // Fetch items for the active tab & search query
  const {
    data: items,
    isLoading,
    error,
  } = api.dashboard.getMyWorkItems.useQuery(
    {
      tab: activeTab,
      search: searchQuery.trim() || undefined,
    },
    {
      staleTime: 10000,
    },
  );

  const selectedItem = items?.find((it) => it.id === selectedItemId);

  // Fetch client list to provide quick workspace navigation
  const { data: clients } = api.clients.list.useQuery();
  const firstClient = clients?.[0];
  const firstProject = firstClient?.projects?.[0];
  const workspaceHref =
    firstClient && firstProject
      ? `/${firstClient.slug}/${firstProject.key}/board`
      : "/";

  const totalOpenCount = counts?.assignedUnresolved ?? 0;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        {/* Global Navigation Header */}
        <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur px-6">
          <div className="flex h-14 items-center justify-between gap-4 max-w-7xl mx-auto w-full">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="flex items-center hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                title="Centvis"
              >
                <CentvisLogo height={26} />
              </Link>
              <div className="h-4 w-px bg-border" />
              <Link
                href={workspaceHref}
                className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to Workspace</span>
              </Link>
            </div>

            <div className="flex items-center gap-3">
              <NotificationPopover />
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Main Dashboard Container */}
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 space-y-6">
          {/* Dashboard Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
            <div>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                  <CheckSquare className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                      My Work
                    </h1>
                    {session?.user?.name && (
                      <span className="text-sm font-medium text-muted-foreground hidden sm:inline">
                        — {session.user.name}
                      </span>
                    )}
                    <Badge
                      data-testid="my-work-open-count"
                      variant="secondary"
                      className="text-xs px-2 py-0.5 font-semibold bg-primary/10 text-primary border border-primary/20"
                    >
                      {totalOpenCount} open{" "}
                      {totalOpenCount === 1 ? "issue" : "issues"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Aggregated personal activity across all accessible projects
                    and clients
                  </p>
                </div>
              </div>
            </div>

            {/* Global Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                data-testid="my-work-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tickets by title or key..."
                className="h-9 pl-9 pr-8 text-xs bg-card"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition p-0.5 rounded"
                  title="Clear search"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* Tabbed Navigation */}
          <Tabs
            value={activeTab}
            onValueChange={(val) => setActiveTab(val as DashboardTab)}
            className="space-y-4"
          >
            <TabsList className="bg-muted/60 p-1 rounded-lg border border-border h-auto flex-wrap">
              <TabsTrigger
                value="ASSIGNED_UNRESOLVED"
                data-testid="tab-assigned-unresolved"
                className="gap-2 text-xs py-2 px-3 font-medium data-[state=active]:font-semibold data-[state=active]:shadow-2xs"
              >
                <span>Assigned to Me (Unresolved)</span>
                {counts !== undefined && (
                  <Badge
                    variant="outline"
                    className="ml-0.5 px-1.5 py-0 text-[10px] font-bold border-border bg-background/50"
                  >
                    {counts.assignedUnresolved}
                  </Badge>
                )}
              </TabsTrigger>

              <TabsTrigger
                value="RESOLVED"
                data-testid="tab-resolved"
                className="gap-2 text-xs py-2 px-3 font-medium data-[state=active]:font-semibold data-[state=active]:shadow-2xs"
              >
                <span>Resolved</span>
                {counts !== undefined && (
                  <Badge
                    variant="outline"
                    className="ml-0.5 px-1.5 py-0 text-[10px] font-bold border-border bg-background/50"
                  >
                    {counts.resolved}
                  </Badge>
                )}
              </TabsTrigger>

              <TabsTrigger
                value="RECENTLY_MODIFIED"
                data-testid="tab-recently-modified"
                className="gap-2 text-xs py-2 px-3 font-medium data-[state=active]:font-semibold data-[state=active]:shadow-2xs"
              >
                <span>Recently Modified (30 Days)</span>
                {counts !== undefined && (
                  <Badge
                    variant="outline"
                    className="ml-0.5 px-1.5 py-0 text-[10px] font-bold border-border bg-background/50"
                  >
                    {counts.recentlyModified}
                  </Badge>
                )}
              </TabsTrigger>

              <TabsTrigger
                value="REPORTED_BY_ME"
                data-testid="tab-reported-by-me"
                className="gap-2 text-xs py-2 px-3 font-medium data-[state=active]:font-semibold data-[state=active]:shadow-2xs"
              >
                <span>Reported by Me</span>
                {counts !== undefined && (
                  <Badge
                    variant="outline"
                    className="ml-0.5 px-1.5 py-0 text-[10px] font-bold border-border bg-background/50"
                  >
                    {counts.reportedByMe}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Tab Contents: Render Table */}
            <div className="rounded-lg border border-border bg-card shadow-2xs overflow-hidden">
              {isLoading ? (
                <div className="flex h-64 items-center justify-center space-x-2 text-muted-foreground">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <span className="text-xs font-medium">
                    Loading personal work items...
                  </span>
                </div>
              ) : error ? (
                <div className="p-8 text-center text-xs text-destructive space-y-1">
                  <AlertCircle className="h-6 w-6 mx-auto mb-2 text-destructive" />
                  <p className="font-semibold">
                    Unable to load personal work items
                  </p>
                  <p className="text-muted-foreground">{error.message}</p>
                </div>
              ) : items && items.length > 0 ? (
                <div className="overflow-x-auto">
                  <table
                    data-testid="my-work-table"
                    className="w-full text-left text-xs border-collapse"
                  >
                    <thead>
                      <tr className="border-b border-border bg-muted/40 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        <th className="py-2.5 px-3.5 w-12 text-center">Type</th>
                        <th className="py-2.5 px-3.5 w-24">Key</th>
                        <th className="py-2.5 px-3.5 min-w-[200px] flex-1">
                          Title
                        </th>
                        <th className="py-2.5 px-3.5 min-w-[140px]">
                          Client / Project
                        </th>
                        <th className="py-2.5 px-3.5 min-w-[120px]">Sprint</th>
                        <th className="py-2.5 px-3.5 w-28">Status</th>
                        <th className="py-2.5 px-3.5 w-24">Priority</th>
                        <th className="py-2.5 px-3.5 w-32">
                          {activeTab === "REPORTED_BY_ME"
                            ? "Assignee"
                            : "Due Date"}
                        </th>
                        <th className="py-2.5 px-3.5 w-28 text-right">
                          Updated
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {items.map((item) => {
                        const statusCfg =
                          STATUS_CONFIG[item.status] ?? STATUS_CONFIG.TODO;
                        const clientSlug = item.project.client?.slug;
                        const fullViewHref = clientSlug
                          ? `/${clientSlug}/${item.key}`
                          : null;

                        return (
                          <tr
                            key={item.id}
                            data-testid="my-work-row"
                            data-item-key={item.key}
                            onClick={() => setSelectedItemId(item.id)}
                            className="group hover:bg-muted/50 cursor-pointer transition-colors"
                          >
                            {/* Type Icon */}
                            <td className="py-3 px-3.5 text-center">
                              <div
                                className="inline-flex items-center justify-center"
                                title={`Type: ${item.type}`}
                              >
                                {getTypeIcon(item.type)}
                              </div>
                            </td>

                            {/* Key Identifier */}
                            <td className="py-3 px-3.5">
                              {fullViewHref ? (
                                <a
                                  href={fullViewHref}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="font-mono text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 px-1.5 py-0.5 rounded border border-primary/20 inline-flex items-center gap-1 transition"
                                  title={`Open ${item.key} in new tab`}
                                >
                                  <span>{item.key}</span>
                                  <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                                </a>
                              ) : (
                                <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
                                  {item.key}
                                </span>
                              )}
                            </td>

                            {/* Title (Hover Tooltip, click opens drawer) */}
                            <td className="py-3 px-3.5">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="font-medium text-foreground hover:text-primary transition line-clamp-1 max-w-md block">
                                    {item.title}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="top"
                                  className="max-w-sm text-xs p-3 space-y-1"
                                >
                                  <p className="font-semibold text-foreground">
                                    {item.key}: {item.title}
                                  </p>
                                  {item.description && (
                                    <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                                      {item.description}
                                    </p>
                                  )}
                                </TooltipContent>
                              </Tooltip>
                            </td>

                            {/* Client / Project Badge */}
                            <td className="py-3 px-3.5">
                              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                <span className="font-semibold text-foreground/90 truncate max-w-[90px]">
                                  {item.project.client?.name ?? "Client"}
                                </span>
                                <span>/</span>
                                <span className="truncate max-w-[90px] font-mono">
                                  {item.project.key}
                                </span>
                              </div>
                            </td>

                            {/* Sprint Badge */}
                            <td className="py-3 px-3.5">
                              {item.sprint ? (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] font-medium border-border/80 bg-muted/40"
                                >
                                  {item.sprint.name}
                                </Badge>
                              ) : (
                                <span className="text-[11px] text-muted-foreground/60 italic">
                                  Backlog Pool
                                </span>
                              )}
                            </td>

                            {/* Status Pill */}
                            <td className="py-3 px-3.5">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                              >
                                <span
                                  className={`h-1.5 w-1.5 rounded-full bg-current`}
                                />
                                <span>{statusCfg.label}</span>
                              </span>
                            </td>

                            {/* Priority Badge */}
                            <td className="py-3 px-3.5">
                              <span
                                className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${
                                  PRIORITY_STYLES[item.priority] ??
                                  PRIORITY_STYLES.LOW
                                }`}
                              >
                                {item.priority}
                              </span>
                            </td>

                            {/* Assignee / Due Date */}
                            <td className="py-3 px-3.5">
                              {activeTab === "REPORTED_BY_ME" ? (
                                item.assignee ? (
                                  <div className="flex items-center gap-1.5">
                                    <Avatar className="h-5 w-5">
                                      <AvatarImage
                                        src={item.assignee.image ?? undefined}
                                      />
                                      <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-bold">
                                        {(
                                          item.assignee.name?.[0] || "?"
                                        ).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="truncate max-w-[90px] text-foreground font-medium">
                                      {item.assignee.name ||
                                        item.assignee.email}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground/60 italic">
                                    Unassigned
                                  </span>
                                )
                              ) : item.dueDate ? (
                                <DueDateBadge
                                  dueDate={item.dueDate}
                                  status={item.status}
                                  size="sm"
                                />
                              ) : (
                                <span className="text-muted-foreground/50 text-[11px]">
                                  —
                                </span>
                              )}
                            </td>

                            {/* Updated At */}
                            <td className="py-3 px-3.5 text-right text-muted-foreground text-[11px] font-mono">
                              {formatRelativeTime(item.updatedAt)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* Empty States */
                <div
                  data-testid="my-work-empty-state"
                  className="p-12 text-center space-y-3"
                >
                  <div className="h-12 w-12 rounded-full bg-muted/60 text-muted-foreground mx-auto flex items-center justify-center">
                    <Inbox className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-foreground">
                      {searchQuery
                        ? "No matching work items found"
                        : activeTab === "ASSIGNED_UNRESOLVED"
                          ? "Zero unresolved issues assigned to you"
                          : activeTab === "RESOLVED"
                            ? "No resolved work items yet"
                            : activeTab === "RECENTLY_MODIFIED"
                              ? "No tickets modified in the last 30 days"
                              : "You haven't reported any work items yet"}
                    </h3>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      {searchQuery
                        ? `Try adjusting your search query "${searchQuery}" or clear the search input.`
                        : activeTab === "ASSIGNED_UNRESOLVED"
                          ? "You're all caught up! When tickets are assigned to you across any project, they will appear right here."
                          : activeTab === "RESOLVED"
                            ? "Work items marked as Done will be archived and displayed here."
                            : activeTab === "RECENTLY_MODIFIED"
                              ? "Issues you touch or create will automatically track here for 30 days."
                              : "Issues you create using the AI Story Agent or manual creator will appear here."}
                    </p>
                  </div>
                  {searchQuery && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSearchQuery("")}
                      className="text-xs h-7"
                    >
                      Clear search
                    </Button>
                  )}
                </div>
              )}
            </div>
          </Tabs>
        </main>

        {/* Work Item Drawer Sheet for Inline Editing */}
        <WorkItemDrawer
          itemId={selectedItemId}
          isOpen={!!selectedItemId}
          projectId={selectedItem?.projectId}
          onClose={() => {
            setSelectedItemId(null);
            void utils.dashboard.getMyWorkItems.invalidate();
            void utils.dashboard.getMyWorkCounts.invalidate();
          }}
        />
      </div>
    </TooltipProvider>
  );
}
