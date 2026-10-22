"use client";

import React, { useState } from "react";
import {
  CheckSquare,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  User,
  Loader2,
  Edit2,
  ExternalLink,
  Bookmark,
  Bug,
  Layers,
  Zap,
} from "lucide-react";
import {
  Button,
  Input,
  Badge,
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
import { api } from "~/trpc/react";
import { useProject } from "~/context/project-context";

interface SubTasksSectionProps {
  parentId: string;
  projectId: string;
  onOpenSubTask?: (subTaskId: string) => void;
}

const PRIORITY_STYLES: Record<string, string> = {
  URGENT: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  HIGH: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  MEDIUM: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  LOW: "bg-muted text-muted-foreground border-border",
};

export const SUBTASK_TYPE_CONFIG: Record<
  string,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    bgColor: string;
  }
> = {
  TASK: {
    label: "Sub-task",
    icon: CheckSquare,
    color: "text-sky-600 dark:text-sky-400",
    bgColor: "bg-sky-50 dark:bg-sky-950/60 border-sky-200 dark:border-sky-800",
  },
  BUG: {
    label: "Bug",
    icon: Bug,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-950/60 border-red-200 dark:border-red-800",
  },
  STORY: {
    label: "Story",
    icon: Bookmark,
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor:
      "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800",
  },
  FEATURE: {
    label: "Feature",
    icon: Layers,
    color: "text-indigo-600 dark:text-indigo-400",
    bgColor:
      "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800",
  },
  EPIC: {
    label: "Epic",
    icon: Zap,
    color: "text-purple-600 dark:text-purple-400",
    bgColor:
      "bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800",
  },
};

export function SubTaskTypeIcon({
  type = "TASK",
  className = "h-3 w-3",
}: {
  type?: string;
  className?: string;
}) {
  const config = SUBTASK_TYPE_CONFIG[type] ?? SUBTASK_TYPE_CONFIG.TASK;
  const Icon = config.icon;
  return (
    <span
      className={`inline-flex items-center justify-center p-0.5 rounded border shrink-0 ${config.bgColor} ${config.color}`}
      title={config.label}
      data-testid="subtask-type-icon"
      aria-label={config.label}
    >
      <Icon className={className} />
    </span>
  );
}

export function SubTasksSection({
  parentId,
  projectId,
  onOpenSubTask,
}: SubTasksSectionProps) {
  const utils = api.useUtils();

  let clientSlug: string | undefined;
  try {
    const proj = useProject();
    clientSlug = proj.clientSlug;
  } catch {
    // If used outside ProjectProvider
  }

  const [newTitle, setNewTitle] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: subTaskData, isLoading } = api.workItem.getSubTasks.useQuery(
    { parentId },
    { enabled: !!parentId },
  );

  const { data: assignableUsers = [] } =
    api.project.getAssignableUsers.useQuery(
      { projectId },
      { enabled: !!projectId },
    );

  const invalidateAll = async () => {
    await Promise.all([
      utils.workItem.getSubTasks.invalidate({ parentId }),
      utils.backlog.getItem.invalidate({ id: parentId }),
      utils.board.getBoardData.invalidate(),
      utils.backlog.getItems.invalidate(),
      utils.backlog.getTree.invalidate(),
    ]);
  };

  const createMutation = api.workItem.createSubTask.useMutation({
    onSuccess: async () => {
      setNewTitle("");
      setErrorMessage(null);
      await invalidateAll();
    },
    onError: (err) => {
      setErrorMessage(err.message || "Failed to create sub-task.");
    },
  });

  const toggleStatusMutation = api.workItem.updateSubTaskStatus.useMutation({
    onSuccess: async () => {
      await invalidateAll();
    },
  });

  const updateMutation = api.workItem.updateSubTask.useMutation({
    onSuccess: async () => {
      setEditingId(null);
      await invalidateAll();
    },
  });

  const deleteMutation = api.workItem.deleteSubTask.useMutation({
    onSuccess: async () => {
      await invalidateAll();
    },
  });

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || createMutation.isPending) return;

    createMutation.mutate({
      parentId,
      title: newTitle.trim(),
    });
  };

  const handleSaveInlineTitle = (id: string) => {
    if (!editTitle.trim() || updateMutation.isPending) {
      setEditingId(null);
      return;
    }
    updateMutation.mutate({
      id,
      title: editTitle.trim(),
    });
  };

  const total = subTaskData?.total ?? 0;
  const completedCount = subTaskData?.completedCount ?? 0;
  const progressPercentage = subTaskData?.progressPercentage ?? 0;
  const items = subTaskData?.items ?? [];

  return (
    <div className="space-y-3 pt-3 border-t border-border">
      {/* Header and Progress Roll-up */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-xs font-semibold text-foreground uppercase tracking-wider">
          <CheckSquare className="h-4 w-4 text-primary" />
          <span>Sub-Tasks & Checklist</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            {completedCount}/{total} Done ({progressPercentage}%)
          </span>
        </div>
      </div>

      {/* Linear Progress Bar */}
      {total > 0 && (
        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 rounded-full ${
              progressPercentage === 100 ? "bg-emerald-500" : "bg-primary"
            }`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      )}

      {/* Sub-Task Items List */}
      {isLoading ? (
        <div className="py-4 flex items-center justify-center text-xs text-muted-foreground gap-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
          <span>Loading sub-tasks...</span>
        </div>
      ) : (
        <div className="space-y-1.5">
          {items.map((task) => {
            const isDone = task.status === "DONE";
            const assigneeInitials =
              task.assignee?.name
                ?.split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2) || "U";

            return (
              <div
                key={task.id}
                onClick={() => {
                  if (editingId !== task.id && onOpenSubTask) {
                    onOpenSubTask(task.id);
                  }
                }}
                className={`group flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-border bg-card hover:bg-muted/30 hover:border-primary/40 transition text-xs ${
                  onOpenSubTask ? "cursor-pointer" : ""
                }`}
              >
                {/* Left: Checkbox & Key & Title */}
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  {/* Status Toggle Checkbox */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStatusMutation.mutate({
                        id: task.id,
                        status: isDone ? "TODO" : "DONE",
                      });
                    }}
                    disabled={toggleStatusMutation.isPending}
                    className="focus:outline-none shrink-0"
                    title={isDone ? "Mark as To Do" : "Mark as Done"}
                  >
                    {isDone ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 hover:text-emerald-600 transition" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground/60 hover:text-primary transition" />
                    )}
                  </button>

                  {/* Sub-Task Icon */}
                  <SubTaskTypeIcon type={task.type} />

                  {/* Subtask Key Badge with New Tab Link */}
                  {clientSlug ? (
                    <a
                      href={`/${clientSlug}/${task.key}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      title={`Open ${task.key} in new tab`}
                      className="font-mono text-[11px] font-bold text-primary bg-primary/10 hover:bg-primary/20 px-1.5 py-0.5 rounded border border-primary/20 shrink-0 inline-flex items-center gap-1 group/link transition"
                    >
                      <span>{task.key}</span>
                      <ExternalLink className="h-2.5 w-2.5 opacity-60 group-hover/link:opacity-100" />
                    </a>
                  ) : (
                    <span className="font-mono text-[11px] font-bold text-primary shrink-0">
                      {task.key}
                    </span>
                  )}

                  {/* Title or Inline Edit */}
                  {editingId === task.id ? (
                    <input
                      type="text"
                      value={editTitle}
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onBlur={() => handleSaveInlineTitle(task.id)}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === "Enter") handleSaveInlineTitle(task.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      className="flex-1 rounded border border-primary px-2 py-0.5 text-xs bg-background text-foreground focus:outline-none"
                    />
                  ) : (
                    <span
                      className={`truncate flex-1 ${
                        isDone
                          ? "line-through text-muted-foreground opacity-75"
                          : "text-foreground font-medium"
                      } ${onOpenSubTask ? "group-hover:text-primary transition" : ""}`}
                      title={
                        onOpenSubTask ? "Click to open in edit mode" : undefined
                      }
                    >
                      {task.title}
                    </span>
                  )}

                  {/* Quick Inline Rename Icon */}
                  {editingId !== task.id && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingId(task.id);
                        setEditTitle(task.title);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition p-1 text-muted-foreground hover:text-foreground rounded"
                      title="Quick inline rename"
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* Right: Quick Assignee Selector, Priority Badge, Status Badge, Open in New Tab, Delete */}
                <div
                  className="flex items-center gap-2 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Priority Badge */}
                  <span
                    className={`rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${
                      PRIORITY_STYLES[task.priority] ?? PRIORITY_STYLES.MEDIUM
                    }`}
                  >
                    {task.priority}
                  </span>

                  {/* Assignee Quick Reassign Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="flex items-center gap-1 rounded-full p-0.5 hover:ring-1 hover:ring-border focus:outline-none"
                        title={
                          task.assignee?.name
                            ? `Assigned to ${task.assignee.name}`
                            : "Unassigned"
                        }
                      >
                        {task.assignee ? (
                          <Avatar className="h-5 w-5 ring-1 ring-border">
                            <AvatarImage
                              src={task.assignee.image ?? undefined}
                            />
                            <AvatarFallback className="text-[9px] font-bold bg-primary/10 text-primary">
                              {assigneeInitials}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="h-5 w-5 rounded-full border border-dashed border-muted-foreground/50 flex items-center justify-center text-muted-foreground hover:border-primary">
                            <User className="h-3 w-3" />
                          </div>
                        )}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Reassign Sub-Task
                      </DropdownMenuLabel>
                      <DropdownMenuItem
                        onClick={() =>
                          updateMutation.mutate({
                            id: task.id,
                            assigneeId: null,
                          })
                        }
                        className="text-xs text-muted-foreground cursor-pointer"
                      >
                        -- Unassigned --
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {assignableUsers.map((u) => (
                        <DropdownMenuItem
                          key={u.id}
                          onClick={() =>
                            updateMutation.mutate({
                              id: task.id,
                              assigneeId: u.id,
                            })
                          }
                          className="flex items-center gap-2 text-xs cursor-pointer"
                        >
                          <Avatar className="h-5 w-5 ring-1 ring-border">
                            <AvatarImage src={u.image ?? undefined} />
                            <AvatarFallback className="text-[9px] font-bold">
                              {u.name?.charAt(0) || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate">{u.name || u.email}</span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Status Badge */}
                  <Badge
                    variant="outline"
                    className={`text-[9px] uppercase px-1.5 py-0 font-bold ${
                      isDone
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : "bg-muted text-muted-foreground border-border"
                    }`}
                  >
                    {task.status}
                  </Badge>

                  {/* Open in New Tab Button */}
                  {clientSlug && (
                    <a
                      href={`/${clientSlug}/${task.key}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="opacity-0 group-hover:opacity-100 transition p-1 text-muted-foreground hover:text-primary rounded hover:bg-muted"
                      title="Open sub-task in new tab"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={() => deleteMutation.mutate({ id: task.id })}
                    disabled={deleteMutation.isPending}
                    className="opacity-0 group-hover:opacity-100 transition p-1 text-muted-foreground hover:text-destructive rounded"
                    title="Delete sub-task"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Inline Quick-Add Subtask Form */}
      <form onSubmit={handleQuickAdd} className="space-y-1.5">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="+ Add a subtask (press Enter)..."
              disabled={createMutation.isPending}
              className="h-8 text-xs bg-muted/20 border-border focus:bg-background"
            />
          </div>
          <Button
            type="submit"
            size="sm"
            disabled={!newTitle.trim() || createMutation.isPending}
            className="h-8 text-xs font-semibold gap-1 px-3 shrink-0"
          >
            {createMutation.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            <span>Add</span>
          </Button>
        </div>

        {errorMessage && (
          <p className="text-[11px] text-destructive font-medium">
            {errorMessage}
          </p>
        )}
      </form>
    </div>
  );
}
