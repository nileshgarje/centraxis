"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Layers,
  ChevronDown,
  ChevronRight,
  Calendar,
  Zap,
  Play,
  CheckCircle2,
  GripVertical,
  Users,
  AlertTriangle,
} from "lucide-react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { api } from "~/trpc/react";
import { InlineCreateRow } from "./inline-create-row";
import {
  CreateSprintDialog,
  type SprintData,
} from "../sprints/create-sprint-dialog";
import { WorkItemDrawer } from "../work-items/work-item-drawer";
import { CompleteSprintDialog } from "../sprints/complete-sprint-dialog";
import {
  Button,
  Badge,
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@centraxis/ui";

interface BacklogViewProps {
  projectId: string;
  onOpenAiModal: () => void;
  onCreateItem?: (defaults?: {
    sprintId?: string | null;
    parentId?: string | null;
    type?: "EPIC" | "FEATURE" | "STORY" | "TASK" | "BUG";
  }) => void;
  onCreateSprint?: () => void;
}

function getTypeBadgeVariant(type: string): "default" | "secondary" | "outline" | "status-backlog" | "status-todo" | "status-in-progress" | "status-in-review" | "status-done" {
  switch (type) {
    case "EPIC":
      return "status-in-review";
    case "FEATURE":
      return "status-todo";
    case "STORY":
      return "status-todo";
    case "BUG":
      return "destructive" as any;
    default:
      return "secondary";
  }
}

function getPriorityBadgeVariant(priority: string): "default" | "secondary" | "outline" | "priority-low" | "priority-medium" | "priority-high" | "priority-urgent" {
  switch (priority) {
    case "URGENT":
      return "priority-urgent";
    case "HIGH":
      return "priority-high";
    case "MEDIUM":
      return "priority-medium";
    default:
      return "priority-low";
  }
}

export function BacklogView({
  projectId,
  onOpenAiModal,
  onCreateItem,
  onCreateSprint,
}: BacklogViewProps) {
  const utils = api.useUtils();

  const [isMounted, setIsMounted] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isSprintDialogOpen, setIsSprintDialogOpen] = useState(false);
  const [sprintToEdit, setSprintToEdit] = useState<SprintData | null>(null);
  const [sprintToComplete, setSprintToComplete] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch hierarchical tree
  const { data: tree, isLoading: treeLoading } = api.backlog.getTree.useQuery({
    projectId,
  });

  // Fetch sprints
  const { data: sprints, isLoading: sprintsLoading } = api.sprint.list.useQuery({
    projectId,
  });

  // Recommended velocity
  const recommendedVelocity = 28;

  const toggleExpandItem = (id: string) => {
    setExpandedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleCollapseSection = (key: string) => {
    setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleOpenCreateSprint = () => {
    if (onCreateSprint) {
      onCreateSprint();
    } else {
      setSprintToEdit(null);
      setIsSprintDialogOpen(true);
    }
  };

  // Mutations
  const updateItemMutation = api.backlog.updateItem.useMutation({
    onSuccess: async () => {
      setErrorMessage(null);
      await Promise.all([
        utils.backlog.getTree.invalidate({ projectId }),
        utils.sprint.list.invalidate({ projectId }),
        utils.board.getBoardData.invalidate(),
      ]);
    },
    onError: (err) => {
      setErrorMessage(err.message || "Failed to move work item.");
      void utils.backlog.getTree.invalidate({ projectId });
    },
  });

  const startSprintMutation = api.sprint.start.useMutation({
    onSuccess: async () => {
      setErrorMessage(null);
      await Promise.all([
        utils.sprint.list.invalidate({ projectId }),
        utils.sprint.getActive.invalidate({ projectId }),
        utils.board.getBoardData.invalidate(),
      ]);
    },
    onError: (err) => {
      setErrorMessage(err.message || "Failed to start sprint.");
    },
  });

  const handleDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    const targetSprintId =
      destination.droppableId === "BACKLOG" ? null : destination.droppableId;

    updateItemMutation.mutate({
      id: draggableId,
      sprintId: targetSprintId,
    });
  };

  // Group work items into Sprints and Unassigned Backlog
  const { sprintItemsMap, backlogItems, backlogTotalPoints } = useMemo(() => {
    const map: Record<string, NonNullable<typeof tree>> = {};
    const unassigned: NonNullable<typeof tree> = [];
    let unassignedPoints = 0;

    if (sprints) {
      sprints.forEach((s) => {
        map[s.id] = [];
      });
    }

    if (tree) {
      tree.forEach((item) => {
        if (item.sprintId && map[item.sprintId]) {
          map[item.sprintId]!.push(item);
        } else {
          unassigned.push(item);
          const childPoints =
            item.children?.reduce((acc, c) => acc + (c.storyPoints ?? 0), 0) ?? 0;
          unassignedPoints += (item.storyPoints ?? 0) + childPoints;
        }
      });
    }

    return {
      sprintItemsMap: map,
      backlogItems: unassigned,
      backlogTotalPoints: unassignedPoints,
    };
  }, [tree, sprints]);

  // Sort sprints: ACTIVE first, then PLANNED, then COMPLETED
  const sortedSprints = useMemo(() => {
    if (!sprints) return [];
    return [...sprints].sort((a, b) => {
      const order: Record<string, number> = {
        ACTIVE: 1,
        PLANNED: 2,
        COMPLETED: 3,
      };
      const diff = (order[a.status] ?? 99) - (order[b.status] ?? 99);
      if (diff !== 0) return diff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [sprints]);

  if (treeLoading || sprintsLoading) {
    return (
      <div className="flex h-72 items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-xs text-muted-foreground">Loading backlog & sprints...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Minimal Page Header directly on canvas background */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Backlog
            </h1>
            <span className="rounded-full bg-muted border border-border px-2.5 py-0.5 text-xs font-mono font-medium text-muted-foreground">
              {sprints?.length ?? 0} sprints
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Backlog Planning & Sprint Backlog
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleOpenCreateSprint}
          className="gap-1.5 h-8 text-xs shadow-xs"
        >
          <Calendar className="h-3.5 w-3.5" />
          <span>Create Sprint</span>
        </Button>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-xs text-destructive font-medium">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-destructive hover:underline font-semibold ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Drag & Drop Context Wrapping Sprints & Backlog */}
      {isMounted && (
        <DragDropContext onDragEnd={handleDragEnd}>
          {/* ======================================================== */}
          {/* SPRINT CONTAINERS                                        */}
          {/* ======================================================== */}
          <div className="space-y-4">
            {sortedSprints.map((sprint) => {
              const sprintItems = sprintItemsMap[sprint.id] ?? [];
              const committedPoints = sprintItems.reduce(
                (sum, item) =>
                  sum +
                  (item.storyPoints ?? 0) +
                  (item.children?.reduce((c, ch) => c + (ch.storyPoints ?? 0), 0) ?? 0),
                0,
              );
              const isOverCapacity = committedPoints > recommendedVelocity;
              const isCollapsed = collapsedSections[sprint.id] ?? false;

              // Format date span
              const startStr = sprint.startDate
                ? new Date(sprint.startDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                : null;
              const endStr = sprint.endDate
                ? new Date(sprint.endDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                : null;

              return (
                <div
                  key={sprint.id}
                  data-testid={
                    sprint.status === "ACTIVE"
                      ? "active-sprint-container"
                      : `sprint-container-${sprint.id}`
                  }
                  className="rounded-lg border border-border bg-card overflow-hidden shadow-xs"
                >
                  {/* Sprint Container Header */}
                  <div className="border-b border-border bg-muted/30 px-3.5 py-2.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    {/* Left: Chevron + Sprint Name + Date Range */}
                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={() => toggleCollapseSection(sprint.id)}
                        className="rounded p-0.5 text-muted-foreground hover:text-foreground transition"
                      >
                        {isCollapsed ? (
                          <ChevronRight className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>

                      <h3 className="font-semibold text-sm text-foreground">
                        {sprint.name}
                      </h3>

                      <Badge
                        variant={
                          sprint.status === "ACTIVE"
                            ? "status-done"
                            : sprint.status === "PLANNED"
                              ? "status-todo"
                              : "status-backlog"
                        }
                        className="text-[10px] font-medium uppercase tracking-wider py-0 px-1.5"
                      >
                        {sprint.status}
                      </Badge>

                      {sprint.team && (
                        <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Users className="h-3 w-3" />
                          <span>{sprint.team.name}</span>
                        </span>
                      )}

                      {(startStr || endStr) && (
                        <span className="hidden md:inline-flex items-center gap-1 text-xs text-muted-foreground font-mono">
                          <Calendar className="h-3 w-3 opacity-60" />
                          <span>
                            {startStr ?? "TBD"} – {endStr ?? "TBD"}
                          </span>
                        </span>
                      )}
                    </div>

                    {/* Right: Capacity Indicator + Single Complete / Start Action */}
                    <div className="flex items-center gap-2.5 shrink-0">
                      <div
                        className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-mono font-medium border ${
                          isOverCapacity
                            ? "bg-amber-500/10 text-amber-500 border-amber-500/30"
                            : committedPoints > 0
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                              : "bg-muted text-muted-foreground border-border"
                        }`}
                        title={`Total Committed Story Points: ${committedPoints} pts | Recommended Velocity: ${recommendedVelocity} pts`}
                      >
                        <Zap className="h-3 w-3 text-amber-500" />
                        <span>
                          {committedPoints} / {recommendedVelocity} pts
                        </span>
                        {isOverCapacity && (
                          <span className="text-[9px] uppercase font-bold text-amber-600 dark:text-amber-400">
                            Over
                          </span>
                        )}
                      </div>

                      {sprint.status === "PLANNED" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1 text-emerald-600 border-emerald-500/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                          onClick={() => startSprintMutation.mutate({ sprintId: sprint.id })}
                          disabled={startSprintMutation.isPending}
                        >
                          <Play className="h-3 w-3 fill-current" />
                          <span>Start Sprint</span>
                        </Button>
                      )}

                      {sprint.status === "ACTIVE" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1 text-primary border-primary/30 hover:bg-primary/10"
                          onClick={() => setSprintToComplete(sprint.id)}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Complete Sprint</span>
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Sprint Droppable Items Lane */}
                  {!isCollapsed && (
                    <Droppable droppableId={sprint.id}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`min-h-[44px] divide-y divide-border/60 transition-colors ${
                            snapshot.isDraggingOver ? "bg-primary/5" : "bg-card"
                          }`}
                        >
                          {sprintItems.length === 0 ? (
                            <div className="p-6 text-center text-xs text-muted-foreground">
                              No work items planned for this sprint yet. Drag items from the backlog or add one below.
                            </div>
                          ) : (
                            sprintItems.map((item, index) => (
                              <Draggable
                                key={item.id}
                                draggableId={item.id}
                                index={index}
                              >
                                {(dragProvided, dragSnapshot) => (
                                  <div
                                    ref={dragProvided.innerRef}
                                    {...dragProvided.draggableProps}
                                    data-testid="work-item-card"
                                    data-item-id={item.id}
                                    data-item-key={item.key}
                                    className={`transition-colors ${
                                      dragSnapshot.isDragging
                                        ? "bg-card shadow-lg ring-1 ring-primary z-30"
                                        : "hover:bg-muted/40"
                                    }`}
                                  >
                                    {/* Compact Linear-Style Item Row */}
                                    <div className="flex items-center gap-2.5 px-3 py-2 text-xs h-10">
                                      {/* Drag Handle */}
                                      <div
                                        {...dragProvided.dragHandleProps}
                                        className="cursor-grab text-muted-foreground/40 hover:text-foreground shrink-0"
                                      >
                                        <GripVertical className="h-3.5 w-3.5" />
                                      </div>

                                      {/* Expand Chevron for subtasks */}
                                      {item.children.length > 0 ? (
                                        <button
                                          onClick={() => toggleExpandItem(item.id)}
                                          className="rounded p-0.5 text-muted-foreground hover:bg-muted shrink-0"
                                        >
                                          {expandedItems[item.id] ? (
                                            <ChevronDown className="h-3.5 w-3.5" />
                                          ) : (
                                            <ChevronRight className="h-3.5 w-3.5" />
                                          )}
                                        </button>
                                      ) : (
                                        <div className="w-4 shrink-0" />
                                      )}

                                      {/* Key Badge */}
                                      <span className="font-mono text-[11px] font-semibold text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded shrink-0">
                                        {item.key}
                                      </span>

                                      {/* Title (Takes Maximum Horizontal Room) */}
                                      <button
                                        type="button"
                                        onClick={() => setSelectedItemId(item.id)}
                                        className="flex-1 text-left truncate font-medium text-foreground hover:text-primary transition-colors cursor-pointer"
                                      >
                                        <span className="truncate">{item.title}</span>
                                      </button>

                                      {/* Type Badge */}
                                      <Badge
                                        variant={getTypeBadgeVariant(item.type)}
                                        className="text-[10px] shrink-0 font-medium py-0 px-1.5"
                                      >
                                        {item.type}
                                      </Badge>

                                      {/* Priority Badge */}
                                      <Badge
                                        variant={getPriorityBadgeVariant(item.priority)}
                                        className="text-[10px] shrink-0 font-medium py-0 px-1.5"
                                      >
                                        {item.priority}
                                      </Badge>

                                      {/* Points subtle pill */}
                                      <div className="w-12 text-center shrink-0">
                                        {item.storyPoints !== null ? (
                                          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono font-medium text-muted-foreground">
                                            {item.storyPoints} pts
                                          </span>
                                        ) : null}
                                      </div>

                                      {/* Assignee Avatar + Full Name */}
                                      <div className="flex items-center gap-1.5 shrink-0 min-w-[130px] justify-end">
                                        {item.assignee ? (
                                          <>
                                            <Avatar className="h-5 w-5 ring-1 ring-border">
                                              <AvatarImage src={item.assignee.image ?? undefined} />
                                              <AvatarFallback className="text-[9px] font-bold">
                                                {item.assignee.name?.slice(0, 2).toUpperCase() ?? "U"}
                                              </AvatarFallback>
                                            </Avatar>
                                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                                              {item.assignee.name}
                                            </span>
                                          </>
                                        ) : (
                                          <span className="text-xs text-muted-foreground/60 whitespace-nowrap">
                                            Unassigned
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Subtasks (Children) */}
                                    {expandedItems[item.id] && item.children.length > 0 && (
                                      <div className="bg-muted/15 divide-y divide-border/40 border-t border-border/40 pl-8">
                                        {item.children.map((child) => (
                                          <div
                                            key={child.id}
                                            className="flex items-center gap-2.5 px-3 py-1.5 text-xs h-8"
                                          >
                                            <span className="font-mono text-[10px] text-muted-foreground">
                                              {child.key}
                                            </span>
                                            <span className="flex-1 text-foreground truncate">
                                              {child.title}
                                            </span>
                                            <Badge
                                              variant={getTypeBadgeVariant(child.type)}
                                              className="text-[9px] py-0 px-1"
                                            >
                                              {child.type}
                                            </Badge>
                                            <div className="w-12 text-center">
                                              {child.storyPoints !== null && (
                                                <span className="text-[10px] font-mono text-muted-foreground">
                                                  {child.storyPoints} pts
                                                </span>
                                              )}
                                            </div>
                                            <span className="text-xs text-muted-foreground min-w-[130px] text-right">
                                              {child.assignee?.name ?? "Unassigned"}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </Draggable>
                            ))
                          )}
                          {provided.placeholder}

                          {/* Quick-Add Row at the bottom of the Sprint */}
                          <div className="border-t border-border bg-muted/20 p-2">
                            <InlineCreateRow
                              projectId={projectId}
                              sprintId={sprint.id}
                              placeholder={`+ Add item to ${sprint.name}...`}
                            />
                          </div>
                        </div>
                      )}
                    </Droppable>
                  )}
                </div>
              );
            })}
          </div>

          {/* ======================================================== */}
          {/* UNASSIGNED BACKLOG CONTAINER                             */}
          {/* ======================================================== */}
          <div
            data-testid="unassigned-backlog-container"
            className="mt-6 rounded-lg border border-border bg-card overflow-hidden shadow-xs"
          >
            {/* Backlog Section Header */}
            <div className="border-b border-border bg-muted/30 px-3.5 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => toggleCollapseSection("BACKLOG")}
                  className="rounded p-0.5 text-muted-foreground hover:text-foreground transition"
                >
                  {collapsedSections["BACKLOG"] ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>

                <h3 className="font-semibold text-sm text-foreground">
                  Backlog (Unassigned)
                </h3>

                <span className="rounded-full bg-muted border border-border px-2 py-0.2 text-[10px] font-mono font-medium text-muted-foreground">
                  {backlogItems.length} issues
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <span className="rounded-full bg-muted border border-border px-2.5 py-0.5 text-xs font-mono font-medium text-muted-foreground">
                  {backlogTotalPoints} pts
                </span>
              </div>
            </div>

            {/* Backlog Droppable Zone */}
            {!collapsedSections["BACKLOG"] && (
              <Droppable droppableId="BACKLOG">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-h-[44px] divide-y divide-border/60 transition-colors ${
                      snapshot.isDraggingOver ? "bg-primary/5" : "bg-card"
                    }`}
                  >
                    {backlogItems.length === 0 ? (
                      <div className="p-6 text-center text-xs text-muted-foreground">
                        Backlog is currently empty. Use the quick-add bar below to create initial user stories.
                      </div>
                    ) : (
                      backlogItems.map((item, index) => (
                        <Draggable
                          key={item.id}
                          draggableId={item.id}
                          index={index}
                        >
                          {(dragProvided, dragSnapshot) => (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              data-testid="work-item-card"
                              data-item-id={item.id}
                              data-item-key={item.key}
                              className={`transition-colors ${
                                dragSnapshot.isDragging
                                  ? "bg-card shadow-lg ring-1 ring-primary z-30"
                                  : "hover:bg-muted/40"
                              }`}
                            >
                              {/* Compact Linear-Style Row */}
                              <div className="flex items-center gap-2.5 px-3 py-2 text-xs h-10">
                                <div
                                  {...dragProvided.dragHandleProps}
                                  className="cursor-grab text-muted-foreground/40 hover:text-foreground shrink-0"
                                >
                                  <GripVertical className="h-3.5 w-3.5" />
                                </div>

                                {item.children.length > 0 ? (
                                  <button
                                    onClick={() => toggleExpandItem(item.id)}
                                    className="rounded p-0.5 text-muted-foreground hover:bg-muted shrink-0"
                                  >
                                    {expandedItems[item.id] ? (
                                      <ChevronDown className="h-3.5 w-3.5" />
                                    ) : (
                                      <ChevronRight className="h-3.5 w-3.5" />
                                    )}
                                  </button>
                                ) : (
                                  <div className="w-4 shrink-0" />
                                )}

                                <span className="font-mono text-[11px] font-semibold text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded shrink-0">
                                  {item.key}
                                </span>

                                <button
                                  type="button"
                                  onClick={() => setSelectedItemId(item.id)}
                                  className="flex-1 text-left truncate font-medium text-foreground hover:text-primary transition-colors cursor-pointer"
                                >
                                  <span className="truncate">{item.title}</span>
                                </button>

                                <Badge
                                  variant={getTypeBadgeVariant(item.type)}
                                  className="text-[10px] shrink-0 font-medium py-0 px-1.5"
                                >
                                  {item.type}
                                </Badge>

                                <Badge
                                  variant={getPriorityBadgeVariant(item.priority)}
                                  className="text-[10px] shrink-0 font-medium py-0 px-1.5"
                                >
                                  {item.priority}
                                </Badge>

                                <div className="w-12 text-center shrink-0">
                                  {item.storyPoints !== null ? (
                                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono font-medium text-muted-foreground">
                                      {item.storyPoints} pts
                                    </span>
                                  ) : null}
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0 min-w-[130px] justify-end">
                                  {item.assignee ? (
                                    <>
                                      <Avatar className="h-5 w-5 ring-1 ring-border">
                                        <AvatarImage src={item.assignee.image ?? undefined} />
                                        <AvatarFallback className="text-[9px] font-bold">
                                          {item.assignee.name?.slice(0, 2).toUpperCase() ?? "U"}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                                        {item.assignee.name}
                                      </span>
                                    </>
                                  ) : (
                                    <span className="text-xs text-muted-foreground/60 whitespace-nowrap">
                                      Unassigned
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Subtasks (Children) */}
                              {expandedItems[item.id] && item.children.length > 0 && (
                                <div className="bg-muted/15 divide-y divide-border/40 border-t border-border/40 pl-8">
                                  {item.children.map((child) => (
                                    <div
                                      key={child.id}
                                      className="flex items-center gap-2.5 px-3 py-1.5 text-xs h-8"
                                    >
                                      <span className="font-mono text-[10px] text-muted-foreground">
                                        {child.key}
                                      </span>
                                      <span className="flex-1 text-foreground truncate">
                                        {child.title}
                                      </span>
                                      <Badge
                                        variant={getTypeBadgeVariant(child.type)}
                                        className="text-[9px] py-0 px-1"
                                      >
                                        {child.type}
                                      </Badge>
                                      <div className="w-12 text-center">
                                        {child.storyPoints !== null && (
                                          <span className="text-[10px] font-mono text-muted-foreground">
                                            {child.storyPoints} pts
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-xs text-muted-foreground min-w-[130px] text-right">
                                        {child.assignee?.name ?? "Unassigned"}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </Draggable>
                      ))
                    )}
                    {provided.placeholder}

                    {/* Quick-Add Row for Backlog */}
                    <div className="border-t border-border bg-muted/20 p-2">
                      <InlineCreateRow
                        projectId={projectId}
                        sprintId={null}
                        placeholder="+ Add issue to Backlog..."
                      />
                    </div>
                  </div>
                )}
              </Droppable>
            )}
          </div>
        </DragDropContext>
      )}

      {/* Sprint Creation and Edit Dialog Modal */}
      <CreateSprintDialog
        isOpen={isSprintDialogOpen}
        onClose={() => {
          setIsSprintDialogOpen(false);
          setSprintToEdit(null);
        }}
        projectId={projectId}
        sprintToEdit={sprintToEdit}
      />

      {/* Work Item Detail Drawer */}
      <WorkItemDrawer
        itemId={selectedItemId}
        isOpen={!!selectedItemId}
        onClose={() => setSelectedItemId(null)}
        projectId={projectId}
      />

      {/* Complete Sprint & Rollover Modal */}
      <CompleteSprintDialog
        sprintId={sprintToComplete}
        isOpen={!!sprintToComplete}
        onClose={() => setSprintToComplete(null)}
        projectId={projectId}
        onSprintCompleted={(res) => {
          setToastMessage(
            `Sprint "${res.sprintName}" completed. ${res.rolledOverCount} item(s) moved to ${res.targetDestination}.`
          );
          setTimeout(() => setToastMessage(null), 6000);
        }}
      />

      {/* Toast Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-2.5 rounded-lg border border-emerald-500/30 bg-card px-4 py-3 text-xs font-semibold text-emerald-600 shadow-lg animate-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
