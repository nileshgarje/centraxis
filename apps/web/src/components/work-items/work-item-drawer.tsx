"use client";

import React, { useState, useEffect } from "react";
import {
  X,
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
} from "lucide-react";
import { api } from "~/trpc/react";
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

interface WorkItemDrawerProps {
  itemId: string | null;
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

const ITEM_TYPES = [
  { type: "STORY" as const, label: "Story", icon: Bookmark, color: "text-blue-600 bg-blue-50 border-blue-200" },
  { type: "TASK" as const, label: "Task", icon: CheckSquare, color: "text-slate-600 bg-slate-100 border-slate-200" },
  { type: "BUG" as const, label: "Bug", icon: Bug, color: "text-red-600 bg-red-50 border-red-200" },
  { type: "FEATURE" as const, label: "Feature", icon: Layers, color: "text-indigo-600 bg-indigo-50 border-indigo-200" },
  { type: "EPIC" as const, label: "Epic", icon: Zap, color: "text-purple-600 bg-purple-50 border-purple-200" },
];

const STATUS_OPTIONS = [
  { value: "BACKLOG", label: "Backlog", color: "bg-slate-100 text-slate-700 border-slate-300" },
  { value: "TODO", label: "To Do", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "IN_PROGRESS", label: "In Progress", color: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "IN_REVIEW", label: "In Review", color: "bg-purple-50 text-purple-700 border-purple-200" },
  { value: "DONE", label: "Done", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
];

const PRIORITIES = [
  { value: "LOW", label: "Low", color: "bg-slate-100 text-slate-700 border-slate-200" },
  { value: "MEDIUM", label: "Medium", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "HIGH", label: "High", color: "bg-orange-50 text-orange-700 border-orange-200" },
  { value: "URGENT", label: "Urgent", color: "bg-red-50 text-red-700 border-red-200" },
];

const FIBONACCI_POINTS = [1, 2, 3, 5, 8, 13];

interface LocalComment {
  id: string;
  authorName: string;
  authorInitials: string;
  createdAt: string;
  content: string;
}

export function WorkItemDrawer({
  itemId,
  isOpen,
  onClose,
  projectId,
}: WorkItemDrawerProps) {
  const utils = api.useUtils();

  const { data: item, isLoading } = api.backlog.getItem.useQuery(
    { id: itemId! },
    { enabled: !!itemId && isOpen }
  );

  const { data: projectSprints } = api.sprint.list.useQuery(
    { projectId },
    { enabled: isOpen }
  );

  const { data: members } = api.org.listMembers.useQuery(undefined, {
    enabled: isOpen,
  });

  // Local editable states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [acceptanceCriteria, setAcceptanceCriteria] = useState("");
  const [status, setStatus] = useState<string>("TODO");
  const [priority, setPriority] = useState<string>("MEDIUM");
  const [storyPoints, setStoryPoints] = useState<number | null>(null);
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [sprintId, setSprintId] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Developer comments
  const [newComment, setNewComment] = useState("");
  const [comments, setComments] = useState<LocalComment[]>([
    {
      id: "c-1",
      authorName: "Alex Morgan",
      authorInitials: "AM",
      createdAt: "1 hour ago",
      content:
        "Investigated the implementation. Let's make sure code blocks use lowlight syntax highlighting and include an instant copy button:\n\n```typescript\nimport { common, createLowlight } from 'lowlight';\nconst lowlight = createLowlight(common);\n```",
    },
  ]);

  // Sync state when item data loads
  useEffect(() => {
    if (item) {
      setTitle(item.title);
      setDescription(item.description || "");
      setAcceptanceCriteria(item.acceptanceCriteria || "");
      setStatus(item.status);
      setPriority(item.priority);
      setStoryPoints(item.storyPoints ?? null);
      setAssigneeId(item.assigneeId || "");
      setSprintId(item.sprintId || "");
    }
  }, [item]);

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const updateMutation = api.backlog.updateItem.useMutation({
    onMutate: () => {
      setIsSaving(true);
    },
    onSuccess: () => {
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      void utils.backlog.getItem.invalidate({ id: itemId! });
      void utils.backlog.getItems.invalidate();
      void utils.backlog.getTree.invalidate();
      void utils.board.getBoardData.invalidate();
    },
    onError: (err) => {
      setIsSaving(false);
      console.error("Failed to update work item:", err);
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
    sprintId?: string | null;
  }) => {
    if (!itemId) return;
    updateMutation.mutate({
      id: itemId,
      ...fields,
    });
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    const newEntry: LocalComment = {
      id: "c-" + Date.now(),
      authorName: "Alex Morgan",
      authorInitials: "AM",
      createdAt: "Just now",
      content: newComment.trim(),
    };
    setComments([newEntry, ...comments]);
    setNewComment("");
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl md:max-w-3xl h-full p-0 flex flex-col overflow-hidden bg-background border-border shadow-2xl"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>{item?.title ?? "Work Item Details"}</SheetTitle>
          <SheetDescription>View and manage issue fields, subtasks, and discussion</SheetDescription>
        </SheetHeader>

        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-background bg-white dark:bg-slate-950 shrink-0">
          <div className="flex items-center space-x-3">
              {item && (
                <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                  {item.key}
                </span>
              )}

              {/* Status Selector Dropdown */}
              <Select
                value={status}
                onValueChange={(val) => {
                  setStatus(val);
                  handleSaveField({ status: val as any });
                }}
              >
                <SelectTrigger className="h-7 w-auto min-w-[110px] text-xs font-semibold uppercase tracking-wider">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((st) => (
                    <SelectItem key={st.value} value={st.value}>
                      {st.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Auto-save status indicator */}
              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                {isSaving && (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin text-primary" />
                    <span>Saving...</span>
                  </>
                )}
                {saveSuccess && (
                  <>
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">Saved</span>
                  </>
                )}
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              aria-label="Close drawer"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Drawer Body */}
          {isLoading || !item ? (
            <div className="flex flex-1 items-center justify-center space-x-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm">Loading work item details...</span>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              {/* Title Input */}
              <div>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={() => {
                    if (title.trim() && title !== item.title) {
                      handleSaveField({ title: title.trim() });
                    }
                  }}
                  placeholder="Issue title..."
                  className="w-full text-xl font-bold tracking-tight text-foreground bg-transparent border-none px-0 py-1 focus:outline-none focus:ring-0 placeholder:text-muted-foreground"
                />
              </div>

              {/* Metadata Form Grid */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 rounded-lg border border-border bg-muted/30 p-3.5">
                {/* Assignee */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                    Assignee
                  </span>
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
                      {members?.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name || m.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Sprint */}
                <div className="space-y-1.5">
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
                      <SelectItem value="backlog">Backlog (Unassigned)</SelectItem>
                      {projectSprints?.map((sp) => (
                        <SelectItem key={sp.id} value={sp.id}>
                          {sp.name} ({sp.status})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Priority */}
                <div className="space-y-1.5">
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
                <div className="space-y-1.5">
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
                  value={description}
                  onChange={(val) => {
                    setDescription(val);
                    handleSaveField({ description: val });
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
                  value={acceptanceCriteria}
                  onChange={(val) => {
                    setAcceptanceCriteria(val);
                    handleSaveField({ acceptanceCriteria: val });
                  }}
                  minHeight="110px"
                  placeholder="Scenario: Successful user login&#10;Given user is on /login&#10;When credentials are valid&#10;Then redirect to dashboard"
                />
              </div>

              {/* Subtasks (if any) */}
              {item.children && item.children.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    Subtasks ({item.children.filter((c) => c.status === "DONE").length}/
                    {item.children.length})
                  </Label>
                  <div className="divide-y divide-border rounded-lg border border-border bg-card">
                    {item.children.map((child) => (
                      <div
                        key={child.id}
                        className="flex items-center justify-between px-3 py-2 text-xs"
                      >
                        <div className="flex items-center space-x-2">
                          <CheckCircle2
                            className={`h-4 w-4 ${
                              child.status === "DONE"
                                ? "text-emerald-500"
                                : "text-muted-foreground/40"
                            }`}
                          />
                          <span className="font-mono text-primary font-semibold">
                            {child.key}
                          </span>
                          <span
                            className={
                              child.status === "DONE"
                                ? "line-through text-muted-foreground"
                                : "text-foreground"
                            }
                          >
                            {child.title}
                          </span>
                        </div>
                        <span className="text-[10px] uppercase font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border">
                          {child.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Developer Comments & Activity Section */}
              <div className="space-y-4 pt-3 border-t border-border">
                <div className="flex items-center space-x-2 text-xs font-semibold text-foreground uppercase tracking-wider">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <span>Developer Comments & Activity ({comments.length})</span>
                </div>

                {/* New Comment Box using MarkdownEditor */}
                <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
                  <span className="text-xs font-medium text-foreground">Leave a comment</span>
                  <MarkdownEditor
                    value={newComment}
                    onChange={setNewComment}
                    minHeight="90px"
                    placeholder="Write a comment with code snippets (```ts ...) or checklist items..."
                  />
                  <div className="flex justify-end pt-1">
                    <Button
                      type="button"
                      size="sm"
                      disabled={!newComment.trim()}
                      onClick={handleAddComment}
                      className="gap-1.5 text-xs"
                    >
                      <Send className="h-3 w-3" />
                      <span>Post Comment</span>
                    </Button>
                  </div>
                </div>

                {/* Rendered Comments List */}
                <div className="space-y-3">
                  {comments.map((comm) => (
                    <div
                      key={comm.id}
                      className="rounded-lg border border-border bg-card p-4 shadow-2xs space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center space-x-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 font-bold text-[10px] text-primary">
                            {comm.authorInitials}
                          </div>
                          <span className="font-semibold text-foreground">
                            {comm.authorName}
                          </span>
                        </div>
                        <span>{comm.createdAt}</span>
                      </div>

                      <MarkdownRenderer
                        content={comm.content}
                        className="text-xs"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
      </SheetContent>
    </Sheet>
  );
}
