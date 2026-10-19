"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Layers,
  ChevronDown,
  ChevronRight,
  Plus,
  Sparkles,
  Calendar,
  Zap,
  Play,
  CheckCircle2,
  Edit3,
  GripVertical,
  Users,
  AlertTriangle,
  MoveRight,
  Loader2,
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

const TYPE_BADGES: Record<string, string> = {
  EPIC: "bg-purple-100 text-purple-800 border-purple-200",
  FEATURE: "bg-indigo-100 text-indigo-800 border-indigo-200",
  STORY: "bg-blue-100 text-blue-800 border-blue-200",
  TASK: "bg-slate-100 text-slate-800 border-slate-200",
  BUG: "bg-red-100 text-red-800 border-red-200",
};

const PRIORITY_BADGES: Record<string, string> = {
  URGENT: "text-red-700 bg-red-50 border-red-200",
  HIGH: "text-orange-700 bg-orange-50 border-orange-200",
  MEDIUM: "text-blue-700 bg-blue-50 border-blue-200",
  LOW: "text-slate-600 bg-slate-50 border-slate-200",
};

export function BacklogView({
  projectId,
  onOpenAiModal,
  onCreateItem,
  onCreateSprint,
}: BacklogViewProps) {
  const utils = api.useUtils();

  // Queries
  const { data: tree, isLoading: treeLoading } = api.backlog.getTree.useQuery({
    projectId,
  });

  const { data: sprints, isLoading: sprintsLoading } =
    api.sprint.list.useQuery({
      projectId,
    });

  const { data: velocityData } = api.metrics.getTeamVelocity.useQuery(
    { projectId },
    { enabled: !!projectId },
  );

  const recommendedVelocity = velocityData?.averageVelocity ?? 25;

  // Local state for interactive UI
  const [isMounted, setIsMounted] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [collapsedSections, setCollapsedSections] = useState<
    Record<string, boolean>
  >({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sprint Dialog state
  const [isSprintDialogOpen, setIsSprintDialogOpen] = useState(false);
  const [sprintToEdit, setSprintToEdit] = useState<SprintData | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const toggleExpandItem = (id: string) => {
    setExpandedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleCollapseSection = (sectionKey: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  const handleOpenCreateSprint = () => {
    if (onCreateSprint) {
      onCreateSprint();
    } else {
      setSprintToEdit(null);
      setIsSprintDialogOpen(true);
    }
  };

  const handleOpenEditSprint = (sprint: NonNullable<typeof sprints>[number]) => {
    setSprintToEdit({
      id: sprint.id,
      name: sprint.name,
      goal: sprint.goal,
      startDate: sprint.startDate,
      endDate: sprint.endDate,
      teamId: sprint.teamId,
      status: sprint.status,
    });
    setIsSprintDialogOpen(true);
  };

  // Mutations
  const updateItemMutation = api.backlog.updateItem.useMutation({
    onSuccess: async () => {
      setErrorMessage(null);
      await Promise.all([
        utils.backlog.getTree.invalidate({ projectId }),
        utils.sprint.list.invalidate({ projectId }),
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
      ]);
    },
    onError: (err) => {
      setErrorMessage(err.message || "Failed to start sprint.");
    },
  });

  const completeSprintMutation = api.sprint.complete.useMutation({
    onSuccess: async () => {
      setErrorMessage(null);
      await Promise.all([
        utils.sprint.list.invalidate({ projectId }),
        utils.sprint.getActive.invalidate({ projectId }),
        utils.backlog.getTree.invalidate({ projectId }),
      ]);
    },
    onError: (err) => {
      setErrorMessage(err.message || "Failed to complete sprint.");
    },
  });

  // Drag and Drop Handler between Sprints and Backlog
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

    // Mutate work item target sprint
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
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-sm font-medium text-slate-500">
            Loading backlog planning & sprints...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Backlog Planning Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="font-bold text-slate-900 text-lg">Backlog Planning</h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                {sprints?.length ?? 0} Sprints
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Drag and drop items between sprints and backlog with real-time capacity indicators
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Create Sprint Button */}
          <button
            onClick={handleOpenCreateSprint}
            className="flex items-center space-x-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-95"
          >
            <Calendar className="h-4 w-4 text-blue-600" />
            <span>+ Create Sprint</span>
          </button>

          {/* Create Item Button */}
          {onCreateItem && (
            <button
              onClick={() => onCreateItem()}
              className="flex items-center space-x-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>Create Item</span>
            </button>
          )}

          {/* AI Story Agent Button */}
          <button
            onClick={onOpenAiModal}
            className="flex items-center space-x-1.5 rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition"
          >
            <Sparkles className="h-4 w-4" />
            <span>Generate with AI</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="flex items-center justify-between rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-700 font-medium">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-red-500 hover:text-red-700 font-bold ml-4"
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
                  (item.children?.reduce((c, ch) => c + (ch.storyPoints ?? 0), 0) ??
                    0),
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
                  className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden transition-all"
                >
                  {/* Sprint Container Header */}
                  <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    {/* Left: Title, Status, Dates, Team */}
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => toggleCollapseSection(sprint.id)}
                        className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
                      >
                        {isCollapsed ? (
                          <ChevronRight className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-sm text-slate-900">
                            {sprint.name}
                          </h3>

                          {/* Status Badge */}
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              sprint.status === "ACTIVE"
                                ? "bg-emerald-100 text-emerald-800"
                                : sprint.status === "PLANNED"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {sprint.status}
                          </span>

                          {/* Team Badge */}
                          {sprint.team && (
                            <span className="flex items-center space-x-1 rounded bg-slate-100 border border-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-700">
                              <Users className="h-3 w-3 text-slate-500" />
                              <span>{sprint.team.name}</span>
                            </span>
                          )}

                          {/* Date span */}
                          {(startStr || endStr) && (
                            <span className="flex items-center space-x-1 text-xs text-slate-500 font-medium">
                              <Calendar className="h-3.5 w-3.5 text-slate-400" />
                              <span>
                                {startStr ?? "TBD"} – {endStr ?? "TBD"}
                              </span>
                            </span>
                          )}
                        </div>

                        {/* Sprint Goal */}
                        {sprint.goal && (
                          <p className="text-xs text-slate-500 mt-0.5 italic line-clamp-1">
                            Goal: {sprint.goal}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right: Capacity & Estimates Indicator + Sprint Controls */}
                    <div className="flex items-center space-x-3 shrink-0">
                      {/* Capacity & Estimates Indicator (Committed vs Rolling Velocity) */}
                      <div
                        className={`flex items-center space-x-1.5 rounded-full px-3 py-1 text-xs font-semibold border ${
                          isOverCapacity
                            ? "bg-amber-50 text-amber-800 border-amber-300 shadow-sm"
                            : committedPoints > 0
                              ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                        }`}
                        title={`Total Committed Story Points: ${committedPoints} pts | Recommended Velocity: ${recommendedVelocity} pts (rolling average of previous sprints)`}
                      >
                        <Zap
                          className={`h-3.5 w-3.5 shrink-0 ${
                            isOverCapacity ? "text-amber-600" : "text-emerald-600"
                          }`}
                        />
                        <span>
                          {committedPoints} / {recommendedVelocity} pts
                        </span>
                        {isOverCapacity && (
                          <span className="rounded bg-amber-200/80 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-900 tracking-wider">
                            Over Capacity
                          </span>
                        )}
                      </div>

                      {/* Edit Sprint Button */}
                      <button
                        onClick={() => handleOpenEditSprint(sprint)}
                        title="Edit Sprint Settings"
                        className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition shadow-sm"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>

                      {/* Sprint Lifecycle Action (Start / Complete) */}
                      {sprint.status === "PLANNED" && (
                        <button
                          onClick={() =>
                            startSprintMutation.mutate({ sprintId: sprint.id })
                          }
                          disabled={startSprintMutation.isPending}
                          className="flex items-center space-x-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition active:scale-95"
                        >
                          <Play className="h-3 w-3 fill-current" />
                          <span>Start Sprint</span>
                        </button>
                      )}

                      {sprint.status === "ACTIVE" && (
                        <button
                          onClick={() =>
                            completeSprintMutation.mutate({ sprintId: sprint.id })
                          }
                          disabled={completeSprintMutation.isPending}
                          className="flex items-center space-x-1 rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition active:scale-95"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Complete Sprint</span>
                        </button>
                      )}

                      {/* Add Item Quick Button */}
                      {onCreateItem && (
                        <button
                          onClick={() => onCreateItem({ sprintId: sprint.id })}
                          title="Add item to this sprint"
                          className="flex items-center space-x-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Add</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Sprint Droppable Items Container */}
                  {!isCollapsed && (
                    <Droppable droppableId={sprint.id}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`min-h-[60px] divide-y divide-slate-100 transition-colors ${
                            snapshot.isDraggingOver
                              ? "bg-blue-50/40 ring-2 ring-blue-500/20 ring-inset"
                              : "bg-white"
                          }`}
                        >
                          {sprintItems.length === 0 ? (
                            <div className="p-8 text-center text-xs text-slate-400">
                              No work items planned for this sprint yet. Drag items
                              from the backlog or add one below.
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
                                    className={`transition ${
                                      dragSnapshot.isDragging
                                        ? "bg-white shadow-xl ring-2 ring-blue-500 rounded-lg z-30"
                                        : "hover:bg-slate-50/70"
                                    }`}
                                  >
                                    {/* Level 1: Item Row */}
                                    <div className="flex items-center px-4 py-3 grid grid-cols-12 gap-3 text-xs">
                                      {/* Left / Drag Handle / Title */}
                                      <div className="col-span-6 flex items-center space-x-2">
                                        <div
                                          {...dragProvided.dragHandleProps}
                                          className="cursor-grab text-slate-300 hover:text-slate-600"
                                        >
                                          <GripVertical className="h-4 w-4" />
                                        </div>

                                        {item.children.length > 0 ? (
                                          <button
                                            onClick={() =>
                                              toggleExpandItem(item.id)
                                            }
                                            className="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                                          >
                                            {expandedItems[item.id] ? (
                                              <ChevronDown className="h-3.5 w-3.5" />
                                            ) : (
                                              <ChevronRight className="h-3.5 w-3.5" />
                                            )}
                                          </button>
                                        ) : (
                                          <div className="w-4" />
                                        )}

                                        <button
                                          type="button"
                                          onClick={() => setSelectedItemId(item.id)}
                                          className="flex items-center space-x-2 text-left truncate group/title hover:opacity-80 transition cursor-pointer"
                                        >
                                          <span className="font-mono font-bold text-blue-700 bg-blue-50 group-hover/title:bg-blue-100 px-1.5 py-0.5 rounded text-[11px]">
                                            {item.key}
                                          </span>

                                          <span className="font-medium text-slate-900 group-hover/title:text-blue-600 truncate">
                                            {item.title}
                                          </span>
                                        </button>
                                      </div>

                                      {/* Type & Priority */}
                                      <div className="col-span-2 flex items-center space-x-1.5">
                                        <span
                                          className={`rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                                            TYPE_BADGES[item.type] ??
                                            TYPE_BADGES.STORY
                                          }`}
                                        >
                                          {item.type}
                                        </span>
                                        <span
                                          className={`rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase ${
                                            PRIORITY_BADGES[item.priority] ??
                                            PRIORITY_BADGES.MEDIUM
                                          }`}
                                        >
                                          {item.priority}
                                        </span>
                                      </div>

                                      {/* Points */}
                                      <div className="col-span-1 flex items-center justify-center">
                                        {item.storyPoints !== null && (
                                          <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                                            {item.storyPoints}
                                          </span>
                                        )}
                                      </div>

                                      {/* Assignee & Move / Add Subtask Actions */}
                                      <div className="col-span-3 flex items-center justify-end space-x-2">
                                        {item.assignee ? (
                                          <span className="text-[11px] text-slate-700 font-medium truncate max-w-[100px]">
                                            {item.assignee.name}
                                          </span>
                                        ) : (
                                          <span className="text-[11px] text-slate-400">
                                            Unassigned
                                          </span>
                                        )}

                                        {/* Quick Move to Backlog or other Sprint */}
                                        <select
                                          value={item.sprintId ?? "BACKLOG"}
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            updateItemMutation.mutate({
                                              id: item.id,
                                              sprintId:
                                                val === "BACKLOG" ? null : val,
                                            });
                                          }}
                                          title="Move to Sprint..."
                                          className="text-[10px] font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 focus:outline-none"
                                        >
                                          <option value="BACKLOG">Backlog</option>
                                          {sprints?.map((s) => (
                                            <option key={s.id} value={s.id}>
                                              {s.name}
                                            </option>
                                          ))}
                                        </select>

                                        {onCreateItem && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              onCreateItem({
                                                parentId: item.id,
                                                sprintId: sprint.id,
                                                type: "TASK",
                                              });
                                            }}
                                            title="Add child subtask"
                                            className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-blue-600 transition"
                                          >
                                            <Plus className="h-3.5 w-3.5" />
                                          </button>
                                        )}
                                      </div>
                                    </div>

                                    {/* Subtasks (Children) */}
                                    {expandedItems[item.id] &&
                                      item.children.length > 0 && (
                                        <div className="bg-slate-50/50 divide-y divide-slate-100 border-t border-slate-100 pl-8">
                                          {item.children.map((child) => (
                                            <div
                                              key={child.id}
                                              className="flex items-center px-4 py-2 grid grid-cols-12 gap-3 text-xs"
                                            >
                                              <div className="col-span-6 flex items-center space-x-2">
                                                <span className="font-mono text-[10px] font-medium text-slate-700 bg-white border border-slate-200 px-1 py-0.5 rounded">
                                                  {child.key}
                                                </span>
                                                <span className="text-slate-800 truncate">
                                                  {child.title}
                                                </span>
                                              </div>
                                              <div className="col-span-2 flex items-center space-x-1.5">
                                                <span
                                                  className={`rounded border px-1 py-0.2 text-[8px] font-bold uppercase ${
                                                    TYPE_BADGES[child.type] ??
                                                    TYPE_BADGES.TASK
                                                  }`}
                                                >
                                                  {child.type}
                                                </span>
                                              </div>
                                              <div className="col-span-1 text-center">
                                                {child.storyPoints !== null && (
                                                  <span className="text-[10px] font-semibold text-slate-600">
                                                    {child.storyPoints}
                                                  </span>
                                                )}
                                              </div>
                                              <div className="col-span-3 text-right">
                                                <span className="text-[10px] text-slate-500">
                                                  {child.assignee?.name ?? "Unassigned"}
                                                </span>
                                              </div>
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
                          <div className="border-t border-slate-100 bg-slate-50/60 p-2.5">
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
          <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            {/* Backlog Section Header */}
            <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => toggleCollapseSection("BACKLOG")}
                  className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
                >
                  {collapsedSections["BACKLOG"] ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>

                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-bold text-sm text-slate-900">
                      Backlog (Unassigned)
                    </h3>
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                      {backlogItems.length} issues
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Items not yet committed to an active iteration
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <span className="rounded-full bg-slate-100 border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700">
                  {backlogTotalPoints} pts
                </span>

                {onCreateItem && (
                  <button
                    onClick={() => onCreateItem({ sprintId: null })}
                    className="flex items-center space-x-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Create Issue</span>
                  </button>
                )}
              </div>
            </div>

            {/* Backlog Droppable Zone */}
            {!collapsedSections["BACKLOG"] && (
              <Droppable droppableId="BACKLOG">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-h-[80px] divide-y divide-slate-100 transition-colors ${
                      snapshot.isDraggingOver
                        ? "bg-blue-50/40 ring-2 ring-blue-500/20 ring-inset"
                        : "bg-white"
                    }`}
                  >
                    {backlogItems.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-400">
                        Backlog is currently empty. Use the quick-add bar below or
                        AI Story Agent to create initial user stories!
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
                              className={`transition ${
                                dragSnapshot.isDragging
                                  ? "bg-white shadow-xl ring-2 ring-blue-500 rounded-lg z-30"
                                  : "hover:bg-slate-50/70"
                              }`}
                            >
                              {/* Level 1: Item Row */}
                              <div className="flex items-center px-4 py-3 grid grid-cols-12 gap-3 text-xs">
                                <div className="col-span-6 flex items-center space-x-2">
                                  <div
                                    {...dragProvided.dragHandleProps}
                                    className="cursor-grab text-slate-300 hover:text-slate-600"
                                  >
                                    <GripVertical className="h-4 w-4" />
                                  </div>

                                  {item.children.length > 0 ? (
                                    <button
                                      onClick={() => toggleExpandItem(item.id)}
                                      className="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                                    >
                                      {expandedItems[item.id] ? (
                                        <ChevronDown className="h-3.5 w-3.5" />
                                      ) : (
                                        <ChevronRight className="h-3.5 w-3.5" />
                                      )}
                                    </button>
                                  ) : (
                                    <div className="w-4" />
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => setSelectedItemId(item.id)}
                                    className="flex items-center space-x-2 text-left truncate group/title hover:opacity-80 transition cursor-pointer"
                                  >
                                    <span className="font-mono font-bold text-blue-700 bg-blue-50 group-hover/title:bg-blue-100 px-1.5 py-0.5 rounded text-[11px]">
                                      {item.key}
                                    </span>

                                    <span className="font-medium text-slate-900 group-hover/title:text-blue-600 truncate">
                                      {item.title}
                                    </span>
                                  </button>
                                </div>

                                <div className="col-span-2 flex items-center space-x-1.5">
                                  <span
                                    className={`rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                                      TYPE_BADGES[item.type] ?? TYPE_BADGES.STORY
                                    }`}
                                  >
                                    {item.type}
                                  </span>
                                  <span
                                    className={`rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase ${
                                      PRIORITY_BADGES[item.priority] ??
                                      PRIORITY_BADGES.MEDIUM
                                    }`}
                                  >
                                    {item.priority}
                                  </span>
                                </div>

                                <div className="col-span-1 flex items-center justify-center">
                                  {item.storyPoints !== null && (
                                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                                      {item.storyPoints}
                                    </span>
                                  )}
                                </div>

                                <div className="col-span-3 flex items-center justify-end space-x-2">
                                  {item.assignee ? (
                                    <span className="text-[11px] text-slate-700 font-medium truncate max-w-[100px]">
                                      {item.assignee.name}
                                    </span>
                                  ) : (
                                    <span className="text-[11px] text-slate-400">
                                      Unassigned
                                    </span>
                                  )}

                                  {/* Quick Move to Sprint Dropdown */}
                                  <select
                                    value="BACKLOG"
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      if (val !== "BACKLOG") {
                                        updateItemMutation.mutate({
                                          id: item.id,
                                          sprintId: val,
                                        });
                                      }
                                    }}
                                    title="Assign to Sprint..."
                                    className="text-[10px] font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 focus:outline-none"
                                  >
                                    <option value="BACKLOG">Move to Sprint...</option>
                                    {sprints?.map((s) => (
                                      <option key={s.id} value={s.id}>
                                        {s.name}
                                      </option>
                                    ))}
                                  </select>

                                  {onCreateItem && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onCreateItem({
                                          parentId: item.id,
                                          sprintId: null,
                                          type: "TASK",
                                        });
                                      }}
                                      title="Add child subtask"
                                      className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-blue-600 transition"
                                    >
                                      <Plus className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Subtasks (Children) */}
                              {expandedItems[item.id] &&
                                item.children.length > 0 && (
                                  <div className="bg-slate-50/50 divide-y divide-slate-100 border-t border-slate-100 pl-8">
                                    {item.children.map((child) => (
                                      <div
                                        key={child.id}
                                        className="flex items-center px-4 py-2 grid grid-cols-12 gap-3 text-xs"
                                      >
                                        <div className="col-span-6 flex items-center space-x-2">
                                          <span className="font-mono text-[10px] font-medium text-slate-700 bg-white border border-slate-200 px-1 py-0.5 rounded">
                                            {child.key}
                                          </span>
                                          <span className="text-slate-800 truncate">
                                            {child.title}
                                          </span>
                                        </div>
                                        <div className="col-span-2 flex items-center space-x-1.5">
                                          <span
                                            className={`rounded border px-1 py-0.2 text-[8px] font-bold uppercase ${
                                              TYPE_BADGES[child.type] ??
                                              TYPE_BADGES.TASK
                                            }`}
                                          >
                                            {child.type}
                                          </span>
                                        </div>
                                        <div className="col-span-1 text-center">
                                          {child.storyPoints !== null && (
                                            <span className="text-[10px] font-semibold text-slate-600">
                                              {child.storyPoints}
                                            </span>
                                          )}
                                        </div>
                                        <div className="col-span-3 text-right">
                                          <span className="text-[10px] text-slate-500">
                                            {child.assignee?.name ?? "Unassigned"}
                                          </span>
                                        </div>
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
                    <div className="border-t border-slate-100 bg-slate-50/60 p-2.5">
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
    </div>
  );
}
