"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  Bookmark,
  CheckSquare,
  Bug,
  Layers,
  Zap,
  User,
  Calendar,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Clock,
  Sparkles,
  Send,
  MessageSquare,
  ChevronRight,
  ExternalLink,
  GitFork,
  ArrowLeft,
} from "lucide-react";
import { api } from "~/trpc/react";
import { WorkflowViewerDialog } from "../workflow/workflow-viewer-dialog";
import { DueDateBadge } from "./due-date-badge";
import { InlineTitleEditor } from "./inline-title-editor";
import { AttachmentsSection } from "./attachments-section";
import {
  MarkdownEditor,
  MarkdownRenderer,
  Button,
  Input,
  Label,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@centraxis/ui";
import { SubTasksSection } from "./sub-tasks-section";
import { CommentSection } from "../comments/comment-section";
import { useProject } from "~/context/project-context";

interface WorkItemDrawerProps {
  itemId: string | null;
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
}

const ITEM_TYPES = [
  {
    type: "STORY" as const,
    label: "Story",
    icon: Bookmark,
    color: "text-blue-600 bg-blue-50 border-blue-200",
  },
  {
    type: "TASK" as const,
    label: "Task",
    icon: CheckSquare,
    color: "text-slate-600 bg-slate-100 border-slate-200",
  },
  {
    type: "BUG" as const,
    label: "Bug",
    icon: Bug,
    color: "text-red-600 bg-red-50 border-red-200",
  },
  {
    type: "FEATURE" as const,
    label: "Feature",
    icon: Layers,
    color: "text-indigo-600 bg-indigo-50 border-indigo-200",
  },
  {
    type: "EPIC" as const,
    label: "Epic",
    icon: Zap,
    color: "text-purple-600 bg-purple-50 border-purple-200",
  },
];

const STATUS_OPTIONS = [
  {
    value: "BACKLOG",
    label: "Backlog",
    color: "bg-slate-100 text-slate-700 border-slate-300",
  },
  {
    value: "TODO",
    label: "To Do",
    color: "bg-blue-50 text-blue-700 border-blue-200",
  },
  {
    value: "IN_PROGRESS",
    label: "In Progress",
    color: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    value: "IN_REVIEW",
    label: "In Review",
    color: "bg-purple-50 text-purple-700 border-purple-200",
  },
  {
    value: "DONE",
    label: "Done",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
];

const PRIORITIES = [
  {
    value: "LOW",
    label: "Low",
    color: "bg-slate-100 text-slate-700 border-slate-200",
  },
  {
    value: "MEDIUM",
    label: "Medium",
    color: "bg-blue-50 text-blue-700 border-blue-200",
  },
  {
    value: "HIGH",
    label: "High",
    color: "bg-orange-50 text-orange-700 border-orange-200",
  },
  {
    value: "URGENT",
    label: "Urgent",
    color: "bg-red-50 text-red-700 border-red-200",
  },
];

const FIBONACCI_POINTS = [1, 2, 3, 5, 8, 13];

export function WorkItemDrawer({
  itemId,
  isOpen,
  onClose,
  projectId,
}: WorkItemDrawerProps) {
  const utils = api.useUtils();

  const [activeItemId, setActiveItemId] = useState<string | null>(itemId);
  const [parentHistory, setParentHistory] = useState<string[]>([]);

  useEffect(() => {
    setActiveItemId(itemId);
    setParentHistory([]);
  }, [itemId, isOpen]);

  const handleOpenSubTask = (subTaskId: string) => {
    if (activeItemId) {
      setParentHistory((prev) => [...prev, activeItemId]);
    }
    setActiveItemId(subTaskId);
  };

  const handleBackToParent = (targetId?: string) => {
    const destinationId =
      targetId ||
      (parentHistory.length > 0
        ? parentHistory[parentHistory.length - 1]
        : item?.parent?.id);
    if (destinationId) {
      setActiveItemId(destinationId);
      setParentHistory((prev) => prev.filter((id) => id !== destinationId));
    } else {
      onClose();
    }
  };

  const currentId = activeItemId || itemId;

  const { data: item, isLoading } = api.backlog.getItem.useQuery(
    { id: currentId! },
    { enabled: !!currentId && isOpen },
  );

  const targetProjectId = projectId || item?.projectId;

  const { data: projectSprints } = api.sprint.list.useQuery(
    { projectId: targetProjectId! },
    { enabled: isOpen && !!targetProjectId },
  );

  const { data: assignableUsers } = api.project.getAssignableUsers.useQuery(
    { projectId: targetProjectId! },
    { enabled: isOpen && !!targetProjectId },
  );

  // Local editable states
  const [title, setTitle] = useState("");
  const [type, setType] = useState<
    "STORY" | "TASK" | "BUG" | "FEATURE" | "EPIC"
  >("STORY");
  const [description, setDescription] = useState("");
  const [acceptanceCriteria, setAcceptanceCriteria] = useState("");
  const [status, setStatus] = useState<string>("TODO");
  const [priority, setPriority] = useState<string>("MEDIUM");
  const [storyPoints, setStoryPoints] = useState<number | null>(null);
  const { data: session } = useSession();
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");
  const [sprintId, setSprintId] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isWorkflowModalOpen, setIsWorkflowModalOpen] = useState(false);

  let contextClientSlug: string | undefined;
  try {
    const proj = useProject();
    contextClientSlug = proj.clientSlug;
  } catch {
    // If rendered outside of ProjectProvider
  }

  const clientSlug = item?.project?.client?.slug || contextClientSlug;
  const fullViewUrl =
    clientSlug && item?.key ? `/${clientSlug}/${item.key}` : null;

  // Workflow transitions query
  const { data: workflowData } = api.workflow.getAvailableTransitions.useQuery(
    { workItemId: currentId! },
    { enabled: !!currentId && isOpen },
  );

  // Filter status options to only valid target statuses according to workflow
  const allowedStatusOptions = React.useMemo(() => {
    if (!workflowData?.availableTransitions) {
      return STATUS_OPTIONS;
    }
    const targetStatusSet = new Set<string>();
    if (status) targetStatusSet.add(status);

    for (const tr of workflowData.availableTransitions) {
      const cat = tr.toState.category;
      if (cat === "TODO") targetStatusSet.add("TODO");
      else if (cat === "IN_PROGRESS") targetStatusSet.add("IN_PROGRESS");
      else if (cat === "IN_REVIEW") targetStatusSet.add("IN_REVIEW");
      else if (cat === "DONE") targetStatusSet.add("DONE");
      else if (cat === "START") targetStatusSet.add("BACKLOG");
    }

    return STATUS_OPTIONS.filter((s) => targetStatusSet.has(s.value));
  }, [workflowData, status]);

  const prevItemIdRef = useRef<string | null>(null);

  // Sync state when item data loads
  useEffect(() => {
    if (item) {
      const isNewItem = prevItemIdRef.current !== item.id;
      prevItemIdRef.current = item.id;

      setType(item.type as any);
      setStatus(item.status);
      setPriority(item.priority);
      setStoryPoints(item.storyPoints ?? null);
      setAssigneeId(item.assigneeId || "");
      setDueDate(
        item.dueDate ? new Date(item.dueDate).toISOString().split("T")[0]! : "",
      );
      setSprintId(item.sprintId || "");
      setErrorMessage(null);

      // Only re-initialize title, description, and acceptanceCriteria if switching to a new work item!
      // This prevents background refetches from overwriting active typing.
      if (isNewItem) {
        setTitle(item.title);
        setDescription(item.description || "");
        setAcceptanceCriteria(item.acceptanceCriteria || "");
      } else {
        // Sync fresh title from server when updated
        setTitle(item.title);
      }
    }
  }, [item]);

  // Reset tracked item ID when drawer closes
  useEffect(() => {
    if (!isOpen) {
      prevItemIdRef.current = null;
    }
  }, [isOpen]);

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        // If an input, textarea, or contenteditable editor is currently focused, allow it to handle Escape first
        const activeEl = document.activeElement;
        if (
          activeEl &&
          (activeEl.tagName === "INPUT" ||
            activeEl.tagName === "TEXTAREA" ||
            activeEl.getAttribute("contenteditable") === "true")
        ) {
          return;
        }
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const updateMutation = api.backlog.updateItem.useMutation({
    onMutate: () => {
      setIsSaving(true);
      setErrorMessage(null);
    },
    onSuccess: (updatedItem, variables) => {
      setIsSaving(false);
      setSaveSuccess(true);
      setErrorMessage(null);
      setTimeout(() => setSaveSuccess(false), 2000);

      // Optimistically update tRPC item cache with the mutation result
      if (currentId && updatedItem) {
        utils.backlog.getItem.setData({ id: currentId }, (old) => {
          if (!old) return old;
          return {
            ...old,
            ...updatedItem,
          };
        });
      }

      const isContentOnlyUpdate =
        (variables.description !== undefined ||
          variables.acceptanceCriteria !== undefined) &&
        variables.status === undefined &&
        variables.type === undefined &&
        variables.assigneeId === undefined &&
        variables.sprintId === undefined &&
        variables.parentId === undefined &&
        variables.storyPoints === undefined &&
        variables.dueDate === undefined &&
        variables.title === undefined;

      if (!isContentOnlyUpdate) {
        void utils.backlog.getItem.invalidate({ id: currentId! });
      }
      void utils.workItem.getSubTasks.invalidate();
      void utils.backlog.getItems.invalidate();
      void utils.backlog.getTree.invalidate();
      void utils.board.getBoardData.invalidate();
    },
    onError: (err) => {
      setIsSaving(false);
      setErrorMessage(err.message || "Failed to update work item.");
      if (item) setStatus(item.status);
    },
  });

  const handleSaveField = (fields: {
    title?: string;
    description?: string | null;
    acceptanceCriteria?: string | null;
    status?: any;
    priority?: any;
    storyPoints?: number | null;
    assigneeId?: string | null;
    dueDate?: Date | null;
    sprintId?: string | null;
    type?: any;
  }) => {
    if (!currentId) return;
    updateMutation.mutate({
      id: currentId,
      ...fields,
    });
  };

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent
        side="right"
        onEscapeKeyDown={(e) => {
          // Prevent Radix Sheet from closing if active focus is inside an input, textarea, or contenteditable editor
          const activeEl = document.activeElement;
          if (
            activeEl &&
            (activeEl.tagName === "INPUT" ||
              activeEl.tagName === "TEXTAREA" ||
              activeEl.getAttribute("contenteditable") === "true")
          ) {
            e.preventDefault();
          }
        }}
        className="w-full sm:max-w-2xl md:max-w-3xl h-full p-0 flex flex-col overflow-hidden bg-background border-border shadow-2xl"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>{item?.title ?? "Work Item Details"}</SheetTitle>
          <SheetDescription>
            View and manage issue fields, subtasks, and discussion
          </SheetDescription>
        </SheetHeader>

        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-border pl-4 sm:pl-6 pr-12 sm:pr-14 py-2.5 bg-background shrink-0 min-h-[56px]">
          {/* Left Group: Navigation & Status & Due Date */}
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            {(parentHistory.length > 0 || !!item?.parent) && (
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => handleBackToParent()}
                className="h-7 text-xs font-semibold gap-1 px-2 text-muted-foreground hover:text-foreground shrink-0"
                title="Back to parent work item"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back</span>
              </Button>
            )}

            {item &&
              (fullViewUrl ? (
                <a
                  href={fullViewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 px-2 py-0.5 rounded border border-primary/20 transition flex items-center gap-1 group shrink-0"
                  title="Open full view in new tab"
                >
                  <span>{item.key}</span>
                  <ExternalLink className="h-2.5 w-2.5 opacity-60 group-hover:opacity-100" />
                </a>
              ) : (
                <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20 shrink-0">
                  {item.key}
                </span>
              ))}

            {/* Status Selector Dropdown (Enforced by Workflow Engine) */}
            <Select
              value={status}
              onValueChange={(val) => {
                setStatus(val);
                handleSaveField({ status: val as any });
              }}
            >
              <SelectTrigger className="h-7 w-auto min-w-[95px] text-xs font-semibold uppercase tracking-wider shrink-0">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {allowedStatusOptions.map((st) => (
                  <SelectItem key={st.value} value={st.value}>
                    {st.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Due Date Badge in Header */}
            {dueDate && (
              <DueDateBadge dueDate={dueDate} status={status} size="sm" />
            )}
          </div>

          {/* Right Group: Action buttons & Save status */}
          <div className="flex items-center gap-2 shrink-0 ml-auto">
            {/* Auto-save status indicator */}
            <div className="flex items-center space-x-1 text-xs text-muted-foreground min-w-[60px] justify-end">
              {isSaving && (
                <>
                  <Loader2 className="h-3 w-3 animate-spin text-primary shrink-0" />
                  <span className="text-[11px]">Saving...</span>
                </>
              )}
              {saveSuccess && (
                <>
                  <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                    Saved
                  </span>
                </>
              )}
            </div>

            {/* View Workflow Action Button */}
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => setIsWorkflowModalOpen(true)}
              className="h-7 text-xs font-medium gap-1.5 border-dashed hover:border-primary hover:text-primary transition shrink-0"
              title="Open task state-machine workflow viewer"
            >
              <GitFork className="h-3.5 w-3.5 text-primary" />
              <span className="hidden sm:inline">Workflow</span>
            </Button>

            {/* Open in new tab button */}
            {fullViewUrl && (
              <Button
                variant="outline"
                size="sm"
                asChild
                className="h-7 text-xs font-medium gap-1.5 hover:border-primary hover:text-primary transition shrink-0"
                title="Open full view of work item in new tab"
              >
                <a href={fullViewUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5 text-primary" />
                  <span className="hidden sm:inline">Open in new tab</span>
                </a>
              </Button>
            )}
          </div>
        </div>

        {/* Quality Gate / Validation Error Banner */}
        {errorMessage && (
          <div className="mx-6 mt-3 flex items-center justify-between rounded-lg bg-destructive/10 border border-destructive/20 px-3.5 py-2.5 text-xs text-destructive font-medium shrink-0 animate-in fade-in-0">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-xs hover:underline font-semibold ml-2 cursor-pointer shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Drawer Body */}
        {isLoading || !item ? (
          <div className="flex flex-1 items-center justify-center space-x-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm">Loading work item details...</span>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {/* Parent breadcrumb & Issue Type Row */}
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {item.parent && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-primary/5 px-2.5 py-1 rounded border border-primary/20">
                  <Layers className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>
                    {item.type === "TASK" || item.type === "BUG"
                      ? "Subtask of"
                      : "Child of"}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleBackToParent(item.parent?.id)}
                    className="font-mono font-bold text-primary hover:underline"
                    title={`View parent ${item.parent.key}`}
                  >
                    {item.parent.key}: {item.parent.title}
                  </button>
                </div>
              )}

              {/* Issue Type Selector */}
              <Select
                value={type}
                onValueChange={(val) => {
                  const newType = val as any;
                  setType(newType);
                  handleSaveField({ type: newType });
                }}
              >
                <SelectTrigger className="h-7 w-auto gap-1.5 text-xs font-semibold">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  {ITEM_TYPES.map((t) => {
                    const Icon = t.icon;
                    return (
                      <SelectItem key={t.type} value={t.type}>
                        <div className="flex items-center space-x-2">
                          <Icon className="h-3.5 w-3.5" />
                          <span>{t.label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Title Inline Editor */}
            <div>
              <InlineTitleEditor
                value={title}
                onSave={(newTitle) => {
                  setTitle(newTitle);
                  handleSaveField({ title: newTitle });
                }}
                placeholder="Issue title..."
              />
            </div>

            {/* Metadata Form Grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 rounded-lg border border-border bg-muted/30 p-3.5">
              {/* Assignee */}
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                    Assignee
                  </span>
                  {session?.user?.id && assigneeId !== session.user.id && (
                    <button
                      type="button"
                      onClick={() => {
                        setAssigneeId(session.user.id);
                        handleSaveField({ assigneeId: session.user.id });
                      }}
                      className="text-[10px] text-primary hover:underline font-semibold"
                      title="Assign to me"
                    >
                      Assign to me
                    </button>
                  )}
                </div>
                <Select
                  value={assigneeId || "unassigned"}
                  onValueChange={(val) => {
                    const newVal = val === "unassigned" ? null : val;
                    setAssigneeId(newVal ?? "");
                    handleSaveField({ assigneeId: newVal });
                  }}
                >
                  <SelectTrigger className="w-full h-8 text-xs font-medium">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {assignableUsers?.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        <div className="flex items-center gap-2">
                          {u.image ? (
                            <img
                              src={u.image}
                              alt={u.name || u.email || "User"}
                              className="h-4 w-4 rounded-full"
                            />
                          ) : (
                            <div className="h-4 w-4 rounded-full bg-primary/10 text-primary text-[10px] flex items-center justify-center font-bold">
                              {(
                                u.name?.[0] ||
                                u.email?.[0] ||
                                "?"
                              ).toUpperCase()}
                            </div>
                          )}
                          <span>{u.name || u.email}</span>
                          {u.globalRole === "SYSTEM_ADMIN" && (
                            <span className="text-[10px] text-muted-foreground font-semibold">
                              (Admin)
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sprint */}
              <div className="space-y-1.5 min-w-0">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Sprint
                </span>
                <Select
                  value={sprintId || "backlog"}
                  onValueChange={(val) => {
                    const newVal = val === "backlog" ? null : val;
                    setSprintId(newVal ?? "");
                    handleSaveField({ sprintId: newVal });
                  }}
                >
                  <SelectTrigger className="w-full h-8 text-xs font-medium">
                    <SelectValue placeholder="Backlog (Unassigned)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="backlog">
                      Backlog (Unassigned)
                    </SelectItem>
                    {projectSprints?.map((sp) => (
                      <SelectItem key={sp.id} value={sp.id}>
                        {sp.name} ({sp.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Priority */}
              <div className="space-y-1.5 min-w-0">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Priority
                </span>
                <Select
                  value={priority}
                  onValueChange={(val) => {
                    setPriority(val);
                    handleSaveField({ priority: val as any });
                  }}
                >
                  <SelectTrigger className="w-full h-8 text-xs font-medium">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Story Points */}
              <div className="space-y-1.5 min-w-0">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Story Points
                </span>
                <Select
                  value={storyPoints !== null ? String(storyPoints) : "none"}
                  onValueChange={(val) => {
                    const newVal = val === "none" ? null : Number(val);
                    setStoryPoints(newVal);
                    handleSaveField({ storyPoints: newVal });
                  }}
                >
                  <SelectTrigger className="w-full h-8 text-xs font-medium">
                    <SelectValue placeholder="None (Unestimated)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Unestimated)</SelectItem>
                    {FIBONACCI_POINTS.map((pts) => (
                      <SelectItem key={pts} value={String(pts)}>
                        {pts} pts
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Due Date */}
              <div className="space-y-1.5 col-span-2 sm:col-span-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                    Due Date
                  </span>
                  {dueDate && (
                    <button
                      type="button"
                      onClick={() => {
                        setDueDate("");
                        handleSaveField({ dueDate: null });
                      }}
                      className="text-[10px] text-muted-foreground hover:text-destructive font-medium"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <input
                  type="date"
                  value={dueDate ? dueDate.split("T")[0] : ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDueDate(val);
                    handleSaveField({ dueDate: val ? new Date(val) : null });
                  }}
                  className="w-full h-8 text-xs font-medium rounded-md border border-input bg-background px-2 py-1 shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
                />
              </div>
            </div>

            {/* 1. Description (Developer Markdown Editor) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Description
                </Label>
                <span className="text-[11px] text-muted-foreground">
                  Supports GFM, syntax code blocks & checklists
                </span>
              </div>
              <MarkdownEditor
                key={`desc-${currentId}`}
                value={description}
                onChange={setDescription}
                onSave={(val) => handleSaveField({ description: val })}
                uploadExtraData={currentId ? { workItemId: currentId } : undefined}
                onAttachmentUploaded={() => {
                  if (currentId) {
                    void utils.workItem.getAttachments.invalidate({
                      workItemId: currentId,
                    });
                  }
                }}
                minHeight="140px"
                placeholder="Add a detailed description, architecture diagram references, or code snippets..."
              />
            </div>

            {/* 2. Acceptance Criteria (Gherkin & Checklists) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Acceptance Criteria (Gherkin / Scenarios)
                </Label>
                <span className="text-[11px] text-muted-foreground">
                  Auto-highlights Given/When/Then scenarios
                </span>
              </div>
              <MarkdownEditor
                key={`ac-${currentId}`}
                value={acceptanceCriteria}
                onChange={setAcceptanceCriteria}
                onSave={(val) => handleSaveField({ acceptanceCriteria: val })}
                uploadExtraData={currentId ? { workItemId: currentId } : undefined}
                onAttachmentUploaded={() => {
                  if (currentId) {
                    void utils.workItem.getAttachments.invalidate({
                      workItemId: currentId,
                    });
                  }
                }}
                minHeight="110px"
                placeholder="Scenario: Successful user login&#10;Given user is on /login&#10;When credentials are valid&#10;Then redirect to dashboard"
              />
            </div>

            {/* 3. Attachments Gallery (Jira-style File & Screenshot Assets) */}
            <div className="rounded-xl border border-border bg-card p-4 shadow-2xs">
              <AttachmentsSection
                workItemId={item.id}
                projectId={targetProjectId!}
              />
            </div>

            {/* Sub-Tasks Management with Progress Bar, Checkboxes & Inline Quick-Add */}
            {!(
              item.parent &&
              (item.type === "TASK" || item.type === "BUG")
            ) && (
              <SubTasksSection
                parentId={item.id}
                projectId={targetProjectId!}
                onOpenSubTask={handleOpenSubTask}
              />
            )}

            {/* Real Comments Stream with @Mentions & In-App Notifications */}
            <CommentSection workItemId={item.id} projectId={targetProjectId!} />
          </div>
        )}

        {/* Task Workflow Interactive Graph Viewer Dialog */}
        {currentId && (
          <WorkflowViewerDialog
            open={isWorkflowModalOpen}
            onOpenChange={setIsWorkflowModalOpen}
            workItemId={currentId}
            itemKey={item?.key}
            onTransitionSuccess={() => {
              void utils.backlog.getItem.invalidate({ id: currentId });
              void utils.backlog.getItems.invalidate();
              void utils.board.getBoardData.invalidate();
            }}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
