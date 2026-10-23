"use client";

import React, { useState, useEffect } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
  User,
  Zap,
  ExternalLink,
} from "lucide-react";
import { api } from "~/trpc/react";
import { WorkItemDrawer } from "../work-items/work-item-drawer";
import { CompleteSprintDialog } from "../sprints/complete-sprint-dialog";
import { DueDateBadge } from "../work-items/due-date-badge";
import { Button, Badge, toast } from "@centraxis/ui";
import { useProject } from "~/context/project-context";
import {
  BoardFilterBar,
  type BoardFilterState,
  matchesBoardFilter,
  DEFAULT_BOARD_STATUSES,
} from "./board-filter-bar";

interface WorkItemCard {
  id: string;
  key: string;
  title: string;
  description?: string | null;
  type: string;
  status: string;
  priority: string;
  storyPoints?: number | null;
  dueDate?: Date | string | null;
  rankOrder: number;
  assignee?: {
    id: string;
    name?: string | null;
    image?: string | null;
  } | null;
  children?: Array<{
    id: string;
    status: string;
    title: string;
  }>;
}

interface ColumnDef {
  id: string;
  title: string;
  color: string;
  bgBadge: string;
  textBadge: string;
}

const COLUMNS: ColumnDef[] = [
  {
    id: "TODO",
    title: "To Do",
    color: "border-blue-500",
    bgBadge: "bg-blue-500/10",
    textBadge: "text-blue-600 dark:text-blue-400",
  },
  {
    id: "IN_PROGRESS",
    title: "In Progress",
    color: "border-amber-500",
    bgBadge: "bg-amber-500/10",
    textBadge: "text-amber-600 dark:text-amber-400",
  },
  {
    id: "IN_REVIEW",
    title: "In Review",
    color: "border-purple-500",
    bgBadge: "bg-purple-500/10",
    textBadge: "text-purple-600 dark:text-purple-400",
  },
  {
    id: "DONE",
    title: "Done",
    color: "border-emerald-500",
    bgBadge: "bg-emerald-500/10",
    textBadge: "text-emerald-600 dark:text-emerald-400",
  },
];

const PRIORITY_STYLES: Record<string, string> = {
  URGENT: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  HIGH: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  MEDIUM: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  LOW: "bg-muted text-muted-foreground border-border",
};

export function KanbanBoard({
  projectId,
  onCreateItem,
}: {
  projectId: string;
  onCreateItem?: (defaults?: { sprintId?: string | null }) => void;
}) {
  const utils = api.useUtils();

  let clientSlug: string | undefined;
  try {
    const proj = useProject();
    clientSlug = proj.clientSlug;
  } catch {
    // If used outside ProjectProvider
  }

  const {
    data: boardData,
    isLoading,
    error: queryError,
  } = api.board.getBoardData.useQuery({ projectId });

  const [columns, setColumns] = useState<Record<string, WorkItemCard[]>>({
    TODO: [],
    IN_PROGRESS: [],
    IN_REVIEW: [],
    DONE: [],
  });

  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filterState, setFilterState] = useState<BoardFilterState>({
    search: "",
    assigneeIds: [],
    statuses: [],
  });

  // Synchronize query data into local state for optimistic drag & drop
  useEffect(() => {
    if (boardData?.columns) {
      setColumns({
        TODO: (boardData.columns.TODO as WorkItemCard[]) ?? [],
        IN_PROGRESS: (boardData.columns.IN_PROGRESS as WorkItemCard[]) ?? [],
        IN_REVIEW: (boardData.columns.IN_REVIEW as WorkItemCard[]) ?? [],
        DONE: (boardData.columns.DONE as WorkItemCard[]) ?? [],
      });
    }
  }, [boardData]);

  const updateStatusMutation = api.board.updateItemStatus.useMutation({
    onSuccess: () => {
      setErrorMessage(null);
      void utils.board.getBoardData.invalidate();
    },
    onError: (err) => {
      setErrorMessage(err.message);
      toast.error(err.message);
      // Revert optimistic update by refetching actual backend state
      void utils.board.getBoardData.invalidate();
    },
  });

  const onDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    const sourceColId = source.droppableId;
    const destColId = destination.droppableId;

    const sourceCards = [...(columns[sourceColId] ?? [])];
    const destCards =
      sourceColId === destColId ? sourceCards : [...(columns[destColId] ?? [])];

    const [movedCard] = sourceCards.splice(source.index, 1);
    if (!movedCard) return;

    movedCard.status = destColId;
    destCards.splice(destination.index, 0, movedCard);

    // Optimistically update local view immediately
    setColumns({
      ...columns,
      [sourceColId]: sourceCards,
      [destColId]: destCards,
    });

    // Compute midpoint fractional rank
    const prevCard = destCards[destination.index - 1];
    const nextCard = destCards[destination.index + 1];

    updateStatusMutation.mutate({
      itemId: draggableId,
      status: destColId as any,
      prevRank: prevCard ? prevCard.rankOrder : null,
      nextRank: nextCard ? nextCard.rankOrder : null,
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-sm font-medium text-slate-500">
            Loading active sprint board...
          </p>
        </div>
      </div>
    );
  }

  if (queryError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800">
        <p className="font-semibold">Unable to load sprint board</p>
        <p className="text-sm">{queryError.message}</p>
      </div>
    );
  }

  const sprint = boardData?.sprint;
  const metrics = boardData?.metrics;

  return (
    <div className="space-y-6">
      {/* Sprint Header & Metrics Bar */}
      <div className="flex flex-col justify-between gap-4 rounded-lg border border-border bg-card p-4 shadow-xs sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-semibold text-foreground tracking-tight">
              {sprint?.name ?? "No Active Sprint"}
            </h2>
            {sprint?.status && (
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                {sprint.status}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground max-w-2xl">
            {sprint?.goal ??
              "Create or start a sprint in the backlog view to begin active tracking."}
          </p>
        </div>

        {metrics && (
          <div className="flex items-center space-x-5 border-t border-border pt-3 sm:border-t-0 sm:pt-0">
            <div className="text-center">
              <p className="text-[11px] text-muted-foreground font-medium">
                Stories
              </p>
              <p className="text-sm font-semibold text-foreground">
                {metrics.completedItems} / {metrics.totalItems}
              </p>
            </div>
            <div className="h-6 w-px bg-border" />
            <div className="text-center">
              <p className="text-[11px] text-muted-foreground font-medium">
                Points
              </p>
              <p className="text-sm font-semibold text-primary">
                {metrics.completedPoints} / {metrics.totalPoints}
              </p>
            </div>
            <div className="h-6 w-px bg-border" />
            <div className="w-24">
              <div className="flex justify-between text-[11px] font-medium text-muted-foreground mb-1">
                <span>Progress</span>
                <span>{metrics.progressPercentage}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all duration-500 rounded-full"
                  style={{ width: `${metrics.progressPercentage}%` }}
                />
              </div>
            </div>

            {sprint && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCompleteDialogOpen(true)}
                className="gap-1.5 text-xs h-8"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Complete Sprint</span>
              </Button>
            )}

            {onCreateItem && (
              <Button
                size="sm"
                onClick={() => onCreateItem({ sprintId: sprint?.id })}
                className="gap-1 text-xs h-8"
              >
                <span className="text-sm font-bold leading-none">+</span>
                <span>Add Card</span>
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Error Banner (e.g. Subtask Guardrail Violation) */}
      {errorMessage && (
        <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 shadow-sm animate-shake">
          <div className="flex items-center space-x-3">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-xs font-semibold underline hover:text-red-900"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Interactive Board Filter Bar */}
      <BoardFilterBar
        projectId={projectId}
        availableStatuses={DEFAULT_BOARD_STATUSES}
        onFilterChange={setFilterState}
      />

      {/* Kanban Board Columns */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {COLUMNS.map((col) => {
            const rawCards = columns[col.id] ?? [];
            const cards = rawCards.filter((card) =>
              matchesBoardFilter(card, filterState),
            );
            const colPoints = cards.reduce(
              (acc, c) => acc + (c.storyPoints ?? 0),
              0,
            );

            return (
              <div
                key={col.id}
                data-testid="kanban-column"
                data-column-id={col.id}
                className="flex flex-col rounded-lg border border-border/80 bg-muted/40 p-3 min-h-[580px] shadow-2xs"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-2.5 border-b border-border mb-2.5">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${col.bgBadge} border ${col.color}`}
                    />
                    <h3 className="font-semibold text-foreground text-sm tracking-tight">
                      {col.title}
                    </h3>
                    <span
                      className={`rounded-full ${col.bgBadge} ${col.textBadge} px-2 py-0.5 text-xs font-medium`}
                    >
                      {cards.length}
                    </span>
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">
                    {colPoints} pts
                  </span>
                </div>

                {/* Droppable Card Lane */}
                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 space-y-2.5 transition rounded-lg p-0.5 ${
                        snapshot.isDraggingOver
                          ? "bg-primary/5 ring-1.5 ring-primary/40 ring-dashed"
                          : ""
                      }`}
                    >
                      {cards.map((card, index) => {
                        const incompleteChildren =
                          card.children?.filter((c) => c.status !== "DONE")
                            .length ?? 0;
                        const totalChildren = card.children?.length ?? 0;

                        return (
                          <Draggable
                            key={card.id}
                            draggableId={card.id}
                            index={index}
                          >
                            {(dragProvided, dragSnapshot) => (
                              <div
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                {...dragProvided.dragHandleProps}
                                data-testid="work-item-card"
                                data-item-id={card.id}
                                data-item-key={card.key}
                                onClick={() => setSelectedCardId(card.id)}
                                className={`group rounded-lg border border-border bg-card p-3 shadow-2xs transition hover:border-primary/40 hover:shadow-xs cursor-pointer ${
                                  dragSnapshot.isDragging
                                    ? "rotate-1 shadow-lg ring-2 ring-primary ring-offset-2 ring-offset-background"
                                    : ""
                                }`}
                              >
                                {/* Card Metadata Row */}
                                <div className="flex items-center justify-between text-xs mb-2">
                                  <div className="flex items-center space-x-1.5">
                                    {clientSlug ? (
                                      <a
                                        href={`/${clientSlug}/${card.key}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        title={`Open ${card.key} in new tab`}
                                        className="font-mono font-medium text-primary bg-primary/10 hover:bg-primary/20 px-1.5 py-0.5 rounded text-[11px] inline-flex items-center gap-1 group/link transition"
                                      >
                                        <span>{card.key}</span>
                                        <ExternalLink className="h-2.5 w-2.5 opacity-60 group-hover/link:opacity-100" />
                                      </a>
                                    ) : (
                                      <span className="font-mono font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded text-[11px]">
                                        {card.key}
                                      </span>
                                    )}
                                    <span
                                      className={`rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
                                        PRIORITY_STYLES[card.priority] ??
                                        PRIORITY_STYLES.LOW
                                      }`}
                                    >
                                      {card.priority}
                                    </span>

                                    {card.dueDate && (
                                      <DueDateBadge
                                        dueDate={card.dueDate}
                                        status={card.status}
                                        size="sm"
                                      />
                                    )}
                                  </div>

                                  {card.storyPoints !== null && (
                                    <span className="rounded bg-muted px-1.5 py-0.5 font-medium text-muted-foreground text-[11px]">
                                      {card.storyPoints} pts
                                    </span>
                                  )}
                                </div>

                                {/* Title */}
                                <h4 className="text-sm font-medium text-foreground group-hover:text-primary transition leading-snug">
                                  {card.title}
                                </h4>

                                {/* Card Footer Row */}
                                <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2 text-xs text-muted-foreground">
                                  {totalChildren > 0 ? (
                                    <div className="flex items-center space-x-1">
                                      <CheckCircle2
                                        className={`h-3.5 w-3.5 ${
                                          incompleteChildren === 0
                                            ? "text-emerald-500"
                                            : "text-amber-500"
                                        }`}
                                      />
                                      <span className="text-[11px]">
                                        {totalChildren - incompleteChildren}/
                                        {totalChildren} subtasks
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-[11px] text-muted-foreground/70">
                                      Story
                                    </span>
                                  )}

                                  {card.assignee ? (
                                    <div
                                      className="flex items-center space-x-1.5"
                                      title={card.assignee.name ?? "Assignee"}
                                    >
                                      <div className="h-5 w-5 overflow-hidden rounded-full bg-secondary border border-border flex items-center justify-center font-bold text-[9px] text-secondary-foreground">
                                        {card.assignee.name
                                          ?.slice(0, 2)
                                          .toUpperCase() ?? "U"}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex items-center space-x-1 text-muted-foreground/70">
                                      <User className="h-3 w-3" />
                                      <span className="text-[11px]">
                                        Unassigned
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      <WorkItemDrawer
        itemId={selectedCardId}
        isOpen={!!selectedCardId}
        onClose={() => setSelectedCardId(null)}
        projectId={projectId}
      />

      <CompleteSprintDialog
        sprintId={sprint?.id ?? null}
        isOpen={isCompleteDialogOpen}
        onClose={() => setIsCompleteDialogOpen(false)}
        projectId={projectId}
        onSprintCompleted={(res) => {
          setToastMessage(
            `Sprint "${res.sprintName}" completed. ${res.rolledOverCount} item(s) moved to ${res.targetDestination}.`,
          );
          setTimeout(() => setToastMessage(null), 6000);
        }}
      />

      {/* Rollover Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-900 shadow-xl animate-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
