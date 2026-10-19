"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Calendar,
  Layers,
  Inbox,
  Sparkles,
  Loader2,
  Flame,
  Check,
  PlusCircle,
  HelpCircle,
} from "lucide-react";
import { api } from "~/trpc/react";

interface CompleteSprintDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sprintId: string | null;
  projectId: string;
  onSprintCompleted?: (result: {
    sprintName: string;
    rolledOverCount: number;
    targetDestination: string;
    targetSprintId?: string | null;
  }) => void;
}

export function CompleteSprintDialog({
  isOpen,
  onClose,
  sprintId,
  projectId,
  onSprintCompleted,
}: CompleteSprintDialogProps) {
  const utils = api.useUtils();

  const {
    data: summary,
    isLoading,
    error: summaryError,
  } = api.sprint.getSprintSummary.useQuery(
    { sprintId: sprintId! },
    { enabled: !!sprintId && isOpen },
  );

  // Rollover destination action
  const [targetAction, setTargetAction] = useState<
    "MOVE_TO_NEXT_SPRINT" | "NEW_SPRINT" | "MOVE_TO_BACKLOG"
  >("MOVE_TO_NEXT_SPRINT");
  const [targetSprintId, setTargetSprintId] = useState<string>("");
  const [newSprintName, setNewSprintName] = useState<string>("");
  const [retainDoneSubtasks, setRetainDoneSubtasks] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Synchronize defaults when summary loads
  useEffect(() => {
    if (summary) {
      if (summary.nextPlannedSprint) {
        setTargetAction("MOVE_TO_NEXT_SPRINT");
        setTargetSprintId(summary.nextPlannedSprint.id);
      } else {
        setTargetAction("MOVE_TO_BACKLOG");
      }
      setNewSprintName(summary.suggestedNewSprintName || "Sprint (Next)");
    }
  }, [summary]);

  const completeMutation = api.sprint.completeSprint.useMutation({
    onSuccess: (data) => {
      // Refresh board, backlog, sprint list and velocity metrics
      void utils.sprint.getActive.invalidate({ projectId });
      void utils.sprint.list.invalidate({ projectId });
      void utils.board.getBoardData.invalidate({ projectId });
      void utils.backlog.getTree.invalidate({ projectId });
      void utils.metrics.getBurndownData.invalidate();
      void utils.metrics.getTeamVelocity.invalidate({ projectId });

      onSprintCompleted?.({
        sprintName: data.sprint.name,
        rolledOverCount: data.rolloverCount,
        targetDestination: data.targetDestination,
        targetSprintId: data.targetSprintId,
      });

      onClose();
    },
    onError: (err) => {
      setErrorMessage(err.message || "Failed to complete sprint.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sprintId) return;

    completeMutation.mutate({
      sprintId,
      targetAction,
      targetSprintId:
        targetAction === "MOVE_TO_NEXT_SPRINT" ? targetSprintId : undefined,
      newSprintName:
        targetAction === "NEW_SPRINT" ? newSprintName.trim() : undefined,
      retainDoneSubtasks,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-6 py-4">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold shadow-md shadow-emerald-500/20">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Complete Sprint: {summary?.sprint.name ?? "..."}
              </h3>
              <p className="text-xs text-slate-500">
                1-Click Closeout & Automated Work Item Rollover
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        {isLoading || !summary ? (
          <div className="flex h-64 items-center justify-center space-x-2 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
            <span className="text-sm">Calculating sprint completion metrics...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="max-h-[75vh] overflow-y-auto p-6 space-y-5">
              {/* Error Banner */}
              {errorMessage && (
                <div className="flex items-center space-x-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                  <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* 1. Summary Metrics Cards */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5">
                  <div className="flex items-center justify-between text-emerald-800 mb-1">
                    <span className="text-xs font-semibold uppercase tracking-wider">
                      Completed
                    </span>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="text-xl font-bold text-emerald-950">
                    {summary.metrics.completedCount} items
                  </div>
                  <div className="text-xs text-emerald-700 font-medium">
                    {summary.metrics.completedPoints} story points
                  </div>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5">
                  <div className="flex items-center justify-between text-amber-800 mb-1">
                    <span className="text-xs font-semibold uppercase tracking-wider">
                      Incomplete
                    </span>
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                  </div>
                  <div className="text-xl font-bold text-amber-950">
                    {summary.metrics.incompleteCount} items
                  </div>
                  <div className="text-xs text-amber-700 font-medium">
                    {summary.metrics.incompletePoints} story points
                  </div>
                </div>

                <div className="col-span-2 sm:col-span-1 rounded-xl border border-blue-200 bg-blue-50/60 p-3.5">
                  <div className="flex items-center justify-between text-blue-800 mb-1">
                    <span className="text-xs font-semibold uppercase tracking-wider">
                      Burn Efficiency
                    </span>
                    <Flame className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="text-xl font-bold text-blue-950">
                    {summary.metrics.burnedPercentage}%
                  </div>
                  <div className="text-xs text-blue-700 font-medium">
                    {summary.metrics.completedPoints} / {summary.metrics.totalPoints} pts
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-500 font-medium">
                  <span>Sprint Completion Rate</span>
                  <span>{summary.metrics.burnedPercentage}% of total committed points</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                    style={{ width: `${summary.metrics.burnedPercentage}%` }}
                  />
                </div>
              </div>

              {/* Partial Subtask Guardrail Notice */}
              {summary.hasPartialItems && (
                <div className="flex items-start space-x-2.5 rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 text-xs text-blue-900">
                  <HelpCircle className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold">Subtasks Retained with Parent Story</p>
                    <p className="text-blue-800/90 leading-relaxed">
                      Some incomplete user stories have finished subtasks. During rollover, completed subtasks will remain attached to their parent story to preserve audit logs and prevent orphaned items.
                    </p>
                  </div>
                </div>
              )}

              {/* 2. Rollover Destination Selector */}
              {summary.metrics.incompleteCount > 0 ? (
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Where should {summary.metrics.incompleteCount} incomplete item{summary.metrics.incompleteCount > 1 ? "s" : ""} be moved?
                  </label>

                  <div className="space-y-2.5">
                    {/* Option A: Next Planned Sprint */}
                    {summary.nextPlannedSprint ? (
                      <label
                        className={`flex items-start space-x-3 rounded-xl border p-3.5 transition cursor-pointer ${
                          targetAction === "MOVE_TO_NEXT_SPRINT"
                            ? "border-blue-500 bg-blue-50/40 ring-1 ring-blue-500"
                            : "border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="rolloverTarget"
                          value="MOVE_TO_NEXT_SPRINT"
                          checked={targetAction === "MOVE_TO_NEXT_SPRINT"}
                          onChange={() => setTargetAction("MOVE_TO_NEXT_SPRINT")}
                          className="mt-0.5 h-4 w-4 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center space-x-1.5 font-semibold text-xs text-slate-900">
                            <Layers className="h-3.5 w-3.5 text-blue-600" />
                            <span>Next Planned Sprint: {summary.nextPlannedSprint.name}</span>
                          </div>
                          <p className="text-xs text-slate-500">
                            Automatically place rollover items at the top of the next planned iteration
                          </p>

                          {/* Planned Sprint Select (if multiple planned sprints exist) */}
                          {summary.plannedSprints.length > 1 &&
                            targetAction === "MOVE_TO_NEXT_SPRINT" && (
                              <div className="pt-2">
                                <select
                                  value={targetSprintId}
                                  onChange={(e) => setTargetSprintId(e.target.value)}
                                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 shadow-xs focus:border-blue-500 focus:outline-none"
                                >
                                  {summary.plannedSprints.map((sp) => (
                                    <option key={sp.id} value={sp.id}>
                                      {sp.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                        </div>
                      </label>
                    ) : null}

                    {/* Option B: Create New Sprint */}
                    <label
                      className={`flex items-start space-x-3 rounded-xl border p-3.5 transition cursor-pointer ${
                        targetAction === "NEW_SPRINT"
                          ? "border-blue-500 bg-blue-50/40 ring-1 ring-blue-500"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="rolloverTarget"
                        value="NEW_SPRINT"
                        checked={targetAction === "NEW_SPRINT"}
                        onChange={() => setTargetAction("NEW_SPRINT")}
                        className="mt-0.5 h-4 w-4 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center space-x-1.5 font-semibold text-xs text-slate-900">
                          <PlusCircle className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Create new sprint and rollover items</span>
                        </div>
                        <p className="text-xs text-slate-500">
                          Spins up a new planned iteration container immediately
                        </p>

                        {targetAction === "NEW_SPRINT" && (
                          <div className="pt-2">
                            <input
                              type="text"
                              value={newSprintName}
                              onChange={(e) => setNewSprintName(e.target.value)}
                              placeholder="New sprint name..."
                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 shadow-xs focus:border-blue-500 focus:outline-none"
                            />
                          </div>
                        )}
                      </div>
                    </label>

                    {/* Option C: Backlog */}
                    <label
                      className={`flex items-start space-x-3 rounded-xl border p-3.5 transition cursor-pointer ${
                        targetAction === "MOVE_TO_BACKLOG"
                          ? "border-blue-500 bg-blue-50/40 ring-1 ring-blue-500"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="rolloverTarget"
                        value="MOVE_TO_BACKLOG"
                        checked={targetAction === "MOVE_TO_BACKLOG"}
                        onChange={() => setTargetAction("MOVE_TO_BACKLOG")}
                        className="mt-0.5 h-4 w-4 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center space-x-1.5 font-semibold text-xs text-slate-900">
                          <Inbox className="h-3.5 w-3.5 text-slate-600" />
                          <span>Move incomplete items back to unassigned Backlog</span>
                        </div>
                        <p className="text-xs text-slate-500">
                          Removes sprint binding, allowing items to be reprioritized at will
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-center">
                  <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600 mb-2" />
                  <h4 className="text-sm font-bold text-emerald-900">
                    Perfect Sprint Execution!
                  </h4>
                  <p className="text-xs text-emerald-700 mt-1">
                    All {summary.metrics.totalItems} committed work items were marked as DONE. No rollover needed.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end space-x-3 border-t border-slate-200 bg-slate-50/80 px-6 py-4">
              <button
                type="button"
                onClick={onClose}
                disabled={completeMutation.isPending}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={completeMutation.isPending}
                className="flex items-center space-x-2 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-500/20 transition hover:bg-emerald-700 disabled:opacity-50"
              >
                {completeMutation.isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Completing Sprint...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>
                      {summary.metrics.incompleteCount > 0
                        ? "Complete Sprint & Rollover Items"
                        : "Complete Sprint"}
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
