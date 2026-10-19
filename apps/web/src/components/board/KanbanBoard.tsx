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
} from "lucide-react";
import { api } from "~/trpc/react";
import { WorkItemDrawer } from "../work-items/work-item-drawer";

interface WorkItemCard {
  id: string;
  key: string;
  title: string;
  description?: string | null;
  type: string;
  status: string;
  priority: string;
  storyPoints?: number | null;
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
    bgBadge: "bg-blue-100",
    textBadge: "text-blue-800",
  },
  {
    id: "IN_PROGRESS",
    title: "In Progress",
    color: "border-amber-500",
    bgBadge: "bg-amber-100",
    textBadge: "text-amber-800",
  },
  {
    id: "IN_REVIEW",
    title: "In Review",
    color: "border-purple-500",
    bgBadge: "bg-purple-100",
    textBadge: "text-purple-800",
  },
  {
    id: "DONE",
    title: "Done",
    color: "border-emerald-500",
    bgBadge: "bg-emerald-100",
    textBadge: "text-emerald-800",
  },
];

const PRIORITY_STYLES: Record<string, string> = {
  URGENT: "bg-red-50 text-red-700 border-red-200",
  HIGH: "bg-orange-50 text-orange-700 border-orange-200",
  MEDIUM: "bg-blue-50 text-blue-700 border-blue-200",
  LOW: "bg-slate-50 text-slate-700 border-slate-200",
};

export function KanbanBoard({
  projectId,
  onCreateItem,
}: {
  projectId: string;
  onCreateItem?: (defaults?: { sprintId?: string | null }) => void;
}) {
  const utils = api.useUtils();
  const { data: boardData, isLoading, error: queryError } =
    api.board.getBoardData.useQuery({ projectId });

  const [columns, setColumns] = useState<Record<string, WorkItemCard[]>>({
    TODO: [],
    IN_PROGRESS: [],
    IN_REVIEW: [],
    DONE: [],
  });

  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
          <p className="text-sm font-medium text-slate-500">Loading active sprint board...</p>
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
      <div className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              {sprint?.name ?? "No Active Sprint"}
            </h2>
            {sprint?.status && (
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                {sprint.status}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500 max-w-2xl">
            {sprint?.goal ?? "Create or start a sprint in the backlog view to begin active tracking."}
          </p>
        </div>

        {metrics && (
          <div className="flex items-center space-x-6 border-t border-slate-100 pt-3 sm:border-t-0 sm:pt-0">
            <div className="text-center">
              <p className="text-xs text-slate-500 font-medium">Stories</p>
              <p className="text-lg font-bold text-slate-800">
                {metrics.completedItems} / {metrics.totalItems}
              </p>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div className="text-center">
              <p className="text-xs text-slate-500 font-medium">Points</p>
              <p className="text-lg font-bold text-blue-600">
                {metrics.completedPoints} / {metrics.totalPoints}
              </p>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div className="w-28">
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>Progress</span>
                <span>{metrics.progressPercentage}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full bg-blue-600 transition-all duration-500 rounded-full"
                  style={{ width: `${metrics.progressPercentage}%` }}
                />
              </div>
            </div>

            {onCreateItem && (
              <button
                onClick={() => onCreateItem({ sprintId: sprint?.id })}
                className="flex items-center space-x-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-95"
              >
                <span className="text-sm font-bold leading-none">+</span>
                <span>Add Card</span>
              </button>
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

      {/* Kanban Board Columns */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {COLUMNS.map((col) => {
            const cards = columns[col.id] ?? [];
            const colPoints = cards.reduce(
              (acc, c) => acc + (c.storyPoints ?? 0),
              0,
            );

            return (
              <div
                key={col.id}
                className="flex flex-col rounded-xl border border-slate-200/90 bg-slate-100/60 p-4 min-h-[580px] shadow-sm"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${col.bgBadge} border ${col.color}`}
                    />
                    <h3 className="font-bold text-slate-800 text-sm tracking-tight">
                      {col.title}
                    </h3>
                    <span
                      className={`rounded-full ${col.bgBadge} ${col.textBadge} px-2 py-0.5 text-xs font-semibold`}
                    >
                      {cards.length}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-slate-500">
                    {colPoints} pts
                  </span>
                </div>

                {/* Droppable Card Lane */}
                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 space-y-3 transition rounded-lg p-1 ${
                        snapshot.isDraggingOver
                          ? "bg-blue-50/70 ring-2 ring-blue-400 ring-dashed"
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
                                onClick={() => setSelectedCardId(card.id)}
                                className={`group rounded-lg border border-slate-200/90 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md cursor-pointer ${
                                  dragSnapshot.isDragging
                                    ? "rotate-1 shadow-xl ring-2 ring-blue-500 ring-offset-2"
                                    : ""
                                }`}
                              >
                                {/* Card Metadata Row */}
                                <div className="flex items-center justify-between text-xs mb-2">
                                  <div className="flex items-center space-x-1.5">
                                    <span className="font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded text-[11px]">
                                      {card.key}
                                    </span>
                                    <span
                                      className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                                        PRIORITY_STYLES[card.priority] ??
                                        PRIORITY_STYLES.LOW
                                      }`}
                                    >
                                      {card.priority}
                                    </span>
                                  </div>

                                  {card.storyPoints !== null && (
                                    <span className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-600 text-[11px]">
                                      {card.storyPoints} pts
                                    </span>
                                  )}
                                </div>

                                {/* Title */}
                                <h4 className="text-sm font-medium text-slate-900 group-hover:text-blue-600 transition leading-snug">
                                  {card.title}
                                </h4>

                                {/* Card Footer Row */}
                                <div className="mt-3.5 flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs text-slate-500">
                                  {totalChildren > 0 ? (
                                    <div className="flex items-center space-x-1">
                                      <CheckCircle2
                                        className={`h-3.5 w-3.5 ${
                                          incompleteChildren === 0
                                            ? "text-emerald-600"
                                            : "text-amber-500"
                                        }`}
                                      />
                                      <span className="text-[11px]">
                                        {totalChildren - incompleteChildren}/
                                        {totalChildren} subtasks
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-[11px] text-slate-400">
                                      Story
                                    </span>
                                  )}

                                  {card.assignee ? (
                                    <div
                                      className="flex items-center space-x-1.5"
                                      title={card.assignee.name ?? "Assignee"}
                                    >
                                      <div className="h-6 w-6 overflow-hidden rounded-full bg-slate-200 border border-white shadow-sm flex items-center justify-center font-bold text-[10px] text-slate-700">
                                        {card.assignee.name?.slice(0, 2).toUpperCase() ?? "U"}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex items-center space-x-1 text-slate-400">
                                      <User className="h-3.5 w-3.5" />
                                      <span className="text-[11px]">Unassigned</span>
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
    </div>
  );
}
