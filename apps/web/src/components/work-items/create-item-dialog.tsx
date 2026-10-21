"use client";

import React, { useState, useEffect } from "react";
import {
  Plus,
  Bookmark,
  Layers,
  CheckSquare,
  Bug,
  Zap,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { api } from "~/trpc/react";
import {
  MarkdownEditor,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Alert,
  AlertDescription,
} from "@centraxis/ui";

interface CreateItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  defaultSprintId?: string | null;
  defaultParentId?: string | null;
  defaultType?: "EPIC" | "FEATURE" | "STORY" | "TASK" | "BUG";
}

const ITEM_TYPES = [
  {
    type: "STORY" as const,
    label: "Story",
    icon: Bookmark,
    color: "text-blue-600 bg-blue-50 border-blue-200",
    activeColor: "bg-blue-600 text-white border-blue-600 shadow-sm",
  },
  {
    type: "TASK" as const,
    label: "Task",
    icon: CheckSquare,
    color: "text-slate-600 bg-slate-100 border-slate-200",
    activeColor: "bg-slate-700 text-white border-slate-700 shadow-sm",
  },
  {
    type: "BUG" as const,
    label: "Bug",
    icon: Bug,
    color: "text-red-600 bg-red-50 border-red-200",
    activeColor: "bg-red-600 text-white border-red-600 shadow-sm",
  },
  {
    type: "FEATURE" as const,
    label: "Feature",
    icon: Layers,
    color: "text-indigo-600 bg-indigo-50 border-indigo-200",
    activeColor: "bg-indigo-600 text-white border-indigo-600 shadow-sm",
  },
  {
    type: "EPIC" as const,
    label: "Epic",
    icon: Zap,
    color: "text-purple-600 bg-purple-50 border-purple-200",
    activeColor: "bg-purple-600 text-white border-purple-600 shadow-sm",
  },
];

const PRIORITIES = [
  { level: "LOW" as const, label: "Low", color: "hover:bg-slate-100" },
  { level: "MEDIUM" as const, label: "Medium", color: "hover:bg-blue-50" },
  { level: "HIGH" as const, label: "High", color: "hover:bg-orange-50" },
  { level: "URGENT" as const, label: "Urgent", color: "hover:bg-red-50" },
];

const FIBONACCI_POINTS = [1, 2, 3, 5, 8, 13];

export function CreateItemDialog({
  isOpen,
  onClose,
  projectId,
  defaultSprintId,
  defaultParentId,
  defaultType = "STORY",
}: CreateItemDialogProps) {
  const utils = api.useUtils();

  const [type, setType] = useState<
    "EPIC" | "FEATURE" | "STORY" | "TASK" | "BUG"
  >(defaultType);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [acceptanceCriteria, setAcceptanceCriteria] = useState("");
  const [priority, setPriority] = useState<
    "LOW" | "MEDIUM" | "HIGH" | "URGENT"
  >("MEDIUM");
  const [storyPoints, setStoryPoints] = useState<number | null>(3);
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [sprintId, setSprintId] = useState<string>(defaultSprintId ?? "");
  const [parentId, setParentId] = useState<string>(defaultParentId ?? "");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Synchronize defaults on opening
  useEffect(() => {
    if (isOpen) {
      setType(defaultType);
      setSprintId(defaultSprintId ?? "");
      setParentId(defaultParentId ?? "");
      setErrorMessage(null);
    }
  }, [isOpen, defaultType, defaultSprintId, defaultParentId]);

  // Fetch contextual options
  const { data: assignableUsers } = api.project.getAssignableUsers.useQuery(
    { projectId },
    { enabled: isOpen && !!projectId },
  );

  const { data: sprints } = api.sprint.list.useQuery(
    { projectId },
    { enabled: isOpen },
  );

  const { data: potentialParents } = api.backlog.getItems.useQuery(
    { projectId },
    { enabled: isOpen },
  );

  const parentCandidates = (potentialParents ?? []).filter(
    (p) => p.type === "EPIC" || p.type === "FEATURE" || p.type === "STORY",
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // tRPC mutation with optimistic cache updates
  const createItemMutation = api.backlog.createItem.useMutation({
    onMutate: async (newItem) => {
      await utils.board.getBoardData.cancel();
      await utils.backlog.getTree.cancel();
      await utils.backlog.getItems.cancel();

      // Return context for rollback
      return { newItem };
    },
    onSuccess: () => {
      // Refresh board, backlog, and sprint views
      void utils.board.getBoardData.invalidate();
      void utils.backlog.getTree.invalidate();
      void utils.backlog.getItems.invalidate();
      void utils.sprint.list.invalidate();
      void utils.metrics.getBurndownData.invalidate();

      // Reset form and dismiss
      setTitle("");
      setDescription("");
      setAcceptanceCriteria("");
      setStoryPoints(3);
      onClose();
    },
    onError: (err) => {
      setErrorMessage(err.message || "Failed to create work item");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    createItemMutation.mutate({
      projectId,
      title: title.trim(),
      description: description.trim() || undefined,
      acceptanceCriteria: acceptanceCriteria.trim() || undefined,
      type,
      priority,
      storyPoints,
      assigneeId: assigneeId || undefined,
      sprintId: sprintId || undefined,
      parentId: parentId || undefined,
      status: sprintId ? "TODO" : "BACKLOG",
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
        className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl h-full p-0 flex flex-col overflow-hidden bg-background border-border shadow-2xl"
      >
        {/* Sheet Header */}
        <div className="border-b border-border bg-muted/20 pl-6 pr-14 py-4 shrink-0">
          <SheetHeader className="flex flex-row items-center space-x-2.5 space-y-0 text-left">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold shadow-xs">
              <Plus className="h-4 w-4" />
            </div>
            <div>
              <SheetTitle className="font-bold text-foreground text-base">
                Create Work Item
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                Add an Epic, Feature, Story, Task, or Bug to the project backlog
              </SheetDescription>
            </div>
          </SheetHeader>
        </div>

        {/* Sheet Body & Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* 1. Item Type Selector */}
            <div className="space-y-1.5">
              <Label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
                Work Item Type
              </Label>
              <div className="flex flex-wrap gap-2">
                {ITEM_TYPES.map((t) => {
                  const Icon = t.icon;
                  const isActive = type === t.type;
                  return (
                    <button
                      key={t.type}
                      type="button"
                      onClick={() => setType(t.type)}
                      className={`flex items-center space-x-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                        isActive ? t.activeColor : `${t.color} hover:opacity-90`
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

            {/* 2. Title */}
            <div className="space-y-1.5">
              <Label
                htmlFor="item-title"
                className="block text-xs font-semibold text-foreground"
              >
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="item-title"
                type="text"
                required
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. As a team member, I want to filter board cards by squad..."
                className="h-10 text-sm"
              />
            </div>

            {/* 3. Description & Acceptance Criteria */}
            <div className="space-y-1.5">
              <Label className="block text-xs font-semibold text-foreground">
                Description / Context
              </Label>
              <MarkdownEditor
                value={description}
                onChange={setDescription}
                minHeight="120px"
                placeholder="Provide details, rationale, or technical implementation notes in GFM..."
              />
            </div>

            {type === "STORY" && (
              <div className="space-y-1.5">
                <Label className="block text-xs font-semibold text-foreground">
                  Acceptance Criteria (Gherkin format)
                </Label>
                <MarkdownEditor
                  value={acceptanceCriteria}
                  onChange={setAcceptanceCriteria}
                  minHeight="100px"
                  placeholder="Given [precondition]&#10;When [action]&#10;Then [expected result]"
                />
              </div>
            )}

            {/* 4. Sizing & Fibonacci Story Points */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="block text-xs font-semibold text-foreground">
                  Story Points (Fibonacci Complexity)
                </Label>
                {storyPoints !== null && (
                  <button
                    type="button"
                    onClick={() => setStoryPoints(null)}
                    className="text-[11px] text-muted-foreground hover:text-foreground underline"
                  >
                    Clear Points
                  </button>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {FIBONACCI_POINTS.map((pts) => {
                  const isSelected = storyPoints === pts;
                  return (
                    <button
                      key={pts}
                      type="button"
                      onClick={() => setStoryPoints(pts)}
                      className={`h-9 w-9 rounded-lg font-bold text-xs border transition ${
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary shadow-xs"
                          : "bg-muted text-foreground border-border hover:bg-muted/80"
                      }`}
                    >
                      {pts}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 5. Priority, Sprint, Assignee & Parent Grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-1">
              {/* Priority */}
              <div className="space-y-1.5">
                <Label className="block text-xs font-semibold text-foreground">
                  Priority
                </Label>
                <div className="grid grid-cols-4 gap-1.5">
                  {PRIORITIES.map((p) => (
                    <button
                      key={p.level}
                      type="button"
                      onClick={() => setPriority(p.level)}
                      className={`rounded-lg border py-1.5 text-center text-xs font-semibold transition ${
                        priority === p.level
                          ? p.level === "URGENT"
                            ? "bg-red-600 text-white border-red-600"
                            : p.level === "HIGH"
                              ? "bg-orange-500 text-white border-orange-500"
                              : "bg-primary text-primary-foreground border-primary"
                          : "bg-muted text-foreground border-border hover:bg-muted/80"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Sprint */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="item-sprint"
                  className="block text-xs font-semibold text-foreground"
                >
                  Sprint Allocation
                </Label>
                <Select
                  value={sprintId || "backlog"}
                  onValueChange={(val) =>
                    setSprintId(val === "backlog" ? "" : val)
                  }
                >
                  <SelectTrigger
                    id="item-sprint"
                    className="w-full h-9 text-xs font-medium"
                  >
                    <SelectValue placeholder="Backlog Pool (Unscheduled)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="backlog">
                      Backlog Pool (Unscheduled)
                    </SelectItem>
                    {sprints?.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} ({s.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Assignee */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="item-assignee"
                  className="block text-xs font-semibold text-foreground"
                >
                  Assignee
                </Label>
                <Select
                  value={assigneeId || "unassigned"}
                  onValueChange={(val) =>
                    setAssigneeId(val === "unassigned" ? "" : val)
                  }
                >
                  <SelectTrigger
                    id="item-assignee"
                    className="w-full h-9 text-xs font-medium"
                  >
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

              {/* Parent Work Item */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="item-parent"
                  className="block text-xs font-semibold text-foreground"
                >
                  Parent Hierarchy (Optional)
                </Label>
                <Select
                  value={parentId || "none"}
                  onValueChange={(val) =>
                    setParentId(val === "none" ? "" : val)
                  }
                >
                  <SelectTrigger
                    id="item-parent"
                    className="w-full h-9 text-xs font-medium"
                  >
                    <SelectValue placeholder="No Parent (Root Item)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Parent (Root Item)</SelectItem>
                    {parentCandidates.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        [{p.key}] {p.title.slice(0, 36)}...
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Sheet Footer */}
          <SheetFooter className="flex items-center justify-end space-x-2 border-t border-border bg-muted/20 px-6 py-3 shrink-0">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={createItemMutation.isPending || !title.trim()}
              className="gap-1.5"
            >
              {createItemMutation.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Creating Item...</span>
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create Item</span>
                </>
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
