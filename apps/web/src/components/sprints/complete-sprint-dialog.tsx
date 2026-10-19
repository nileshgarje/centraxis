"use client";

import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  AlertCircle,
  Layers,
  Inbox,
  Loader2,
  Flame,
  Check,
  PlusCircle,
  HelpCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Alert,
  AlertDescription,
} from "@centraxis/ui";
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl p-0 overflow-hidden sm:max-w-xl bg-background border-border">
        {/* Header */}
        <DialogHeader className="border-b border-border bg-muted/40 px-6 py-4">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold shadow-xs">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div className="text-left">
              <DialogTitle className="text-base font-bold text-foreground">
                Complete Sprint: {summary?.sprint.name ?? "..."}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                1-Click Closeout & Automated Work Item Rollover
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Content Body */}
        {isLoading || !summary ? (
          <div className="flex h-64 items-center justify-center space-x-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm">Calculating sprint completion metrics...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="max-h-[70vh] overflow-y-auto p-6 space-y-5">
              {/* Error Banner */}
              {errorMessage && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}

              {/* 1. Summary Metrics Cards */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/30 p-3.5">
                  <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-300 mb-1">
                    <span className="text-xs font-semibold uppercase tracking-wider">
                      Completed
                    </span>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="text-xl font-bold text-emerald-950 dark:text-emerald-100">
                    {summary.metrics.completedCount} items
                  </div>
                  <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                    {summary.metrics.completedPoints} story points
                  </div>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/30 p-3.5">
                  <div className="flex items-center justify-between text-amber-800 dark:text-amber-300 mb-1">
                    <span className="text-xs font-semibold uppercase tracking-wider">
                      Incomplete
                    </span>
                    <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="text-xl font-bold text-amber-950 dark:text-amber-100">
                    {summary.metrics.incompleteCount} items
                  </div>
                  <div className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                    {summary.metrics.incompletePoints} story points
                  </div>
                </div>

                <div className="col-span-2 sm:col-span-1 rounded-xl border border-blue-200 bg-blue-50/60 dark:border-blue-900 dark:bg-blue-950/30 p-3.5">
                  <div className="flex items-center justify-between text-blue-800 dark:text-blue-300 mb-1">
                    <span className="text-xs font-semibold uppercase tracking-wider">
                      Burn Efficiency
                    </span>
                    <Flame className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="text-xl font-bold text-blue-950 dark:text-blue-100">
                    {summary.metrics.burnedPercentage}%
                  </div>
                  <div className="text-xs text-blue-700 dark:text-blue-400 font-medium">
                    {summary.metrics.completedPoints} / {summary.metrics.totalPoints} pts
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground font-medium">
                  <span>Sprint Completion Rate</span>
                  <span>{summary.metrics.burnedPercentage}% of total committed points</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                    style={{ width: `${summary.metrics.burnedPercentage}%` }}
                  />
                </div>
              </div>

              {/* Partial Subtask Guardrail Notice */}
              {summary.hasPartialItems && (
                <div className="flex items-start space-x-2.5 rounded-xl border border-blue-200 bg-blue-50/70 dark:border-blue-900 dark:bg-blue-950/40 p-3.5 text-xs text-blue-900 dark:text-blue-200">
                  <HelpCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold">Subtasks Retained with Parent Story</p>
                    <p className="text-blue-800/90 dark:text-blue-300/90 leading-relaxed">
                      Some incomplete user stories have finished subtasks. During rollover, completed subtasks will remain attached to their parent story to preserve audit logs and prevent orphaned items.
                    </p>
                  </div>
                </div>
              )}

              {/* 2. Rollover Destination Selector */}
              {summary.metrics.incompleteCount > 0 ? (
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
                    Where should {summary.metrics.incompleteCount} incomplete item{summary.metrics.incompleteCount > 1 ? "s" : ""} be moved?
                  </label>

                  <div className="space-y-2.5">
                    {/* Option A: Next Planned Sprint */}
                    {summary.nextPlannedSprint ? (
                      <label
                        className={`flex items-start space-x-3 rounded-xl border p-3.5 transition cursor-pointer ${
                          targetAction === "MOVE_TO_NEXT_SPRINT"
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "border-border hover:bg-muted/50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="rolloverTarget"
                          value="MOVE_TO_NEXT_SPRINT"
                          checked={targetAction === "MOVE_TO_NEXT_SPRINT"}
                          onChange={() => setTargetAction("MOVE_TO_NEXT_SPRINT")}
                          className="mt-0.5 h-4 w-4 text-primary focus:ring-primary"
                        />
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center space-x-1.5 font-semibold text-xs text-foreground">
                            <Layers className="h-3.5 w-3.5 text-primary" />
                            <span>Next Planned Sprint: {summary.nextPlannedSprint.name}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Automatically place rollover items at the top of the next planned iteration
                          </p>

                          {/* Planned Sprint Select (if multiple planned sprints exist) */}
                          {summary.plannedSprints.length > 1 &&
                            targetAction === "MOVE_TO_NEXT_SPRINT" && (
                              <div className="pt-2">
                                <Select
                                  value={targetSprintId}
                                  onValueChange={setTargetSprintId}
                                >
                                  <SelectTrigger className="w-full h-8 text-xs bg-background">
                                    <SelectValue placeholder="Select planned sprint..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {summary.plannedSprints.map((sp) => (
                                      <SelectItem key={sp.id} value={sp.id}>
                                        {sp.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                        </div>
                      </label>
                    ) : null}

                    {/* Option B: Create New Sprint */}
                    <label
                      className={`flex items-start space-x-3 rounded-xl border p-3.5 transition cursor-pointer ${
                        targetAction === "NEW_SPRINT"
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="rolloverTarget"
                        value="NEW_SPRINT"
                        checked={targetAction === "NEW_SPRINT"}
                        onChange={() => setTargetAction("NEW_SPRINT")}
                        className="mt-0.5 h-4 w-4 text-primary focus:ring-primary"
                      />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center space-x-1.5 font-semibold text-xs text-foreground">
                          <PlusCircle className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Create new sprint and rollover items</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Spins up a new planned iteration container immediately
                        </p>

                        {targetAction === "NEW_SPRINT" && (
                          <div className="pt-2">
                            <Input
                              type="text"
                              value={newSprintName}
                              onChange={(e) => setNewSprintName(e.target.value)}
                              placeholder="New sprint name..."
                              className="h-8 text-xs"
                            />
                          </div>
                        )}
                      </div>
                    </label>

                    {/* Option C: Backlog */}
                    <label
                      className={`flex items-start space-x-3 rounded-xl border p-3.5 transition cursor-pointer ${
                        targetAction === "MOVE_TO_BACKLOG"
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="rolloverTarget"
                        value="MOVE_TO_BACKLOG"
                        checked={targetAction === "MOVE_TO_BACKLOG"}
                        onChange={() => setTargetAction("MOVE_TO_BACKLOG")}
                        className="mt-0.5 h-4 w-4 text-primary focus:ring-primary"
                      />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center space-x-1.5 font-semibold text-xs text-foreground">
                          <Inbox className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>Move incomplete items back to unassigned Backlog</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Removes sprint binding, allowing items to be reprioritized at will
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/30 p-4 text-center">
                  <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600 dark:text-emerald-400 mb-2" />
                  <h4 className="text-sm font-bold text-emerald-950 dark:text-emerald-100">
                    Perfect Sprint Execution!
                  </h4>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                    All {summary.metrics.totalItems} committed work items were marked as DONE. No rollover needed.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <DialogFooter className="flex items-center justify-end space-x-2 border-t border-border bg-muted/30 px-6 py-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={completeMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={completeMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
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
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
