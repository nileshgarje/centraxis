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
import { MarkdownEditor, MarkdownRenderer } from "@centraxis/ui";

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-3xl transform border-l border-slate-200 bg-white shadow-2xl transition ease-in-out sm:duration-300 flex flex-col">
          {/* Header Bar */}
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50/70">
            <div className="flex items-center space-x-3">
              {item && (
                <span className="font-mono text-xs font-bold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded border border-blue-200">
                  {item.key}
                </span>
              )}

              {/* Status Selector Dropdown */}
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  handleSaveField({ status: e.target.value as any });
                }}
                className={`rounded-lg border px-2.5 py-1 text-xs font-semibold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer ${
                  STATUS_OPTIONS.find((s) => s.value === status)?.color ?? "bg-slate-100 text-slate-700"
                }`}
              >
                {STATUS_OPTIONS.map((st) => (
                  <option key={st.value} value={st.value}>
                    {st.label}
                  </option>
                ))}
              </select>

              {/* Auto-save status indicator */}
              <div className="flex items-center space-x-1 text-xs text-slate-400">
                {isSaving && (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                    <span>Saving...</span>
                  </>
                )}
                {saveSuccess && (
                  <>
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    <span className="text-emerald-600 font-medium">Saved</span>
                  </>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition"
              aria-label="Close drawer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Drawer Body */}
          {isLoading || !item ? (
            <div className="flex flex-1 items-center justify-center space-x-2 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
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
                  className="w-full text-xl font-bold tracking-tight text-slate-900 border-none px-0 py-1 focus:outline-none focus:ring-0 placeholder:text-slate-300"
                />
              </div>

              {/* Metadata Pill Grid */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 rounded-xl border border-slate-200 bg-slate-50/50 p-3.5">
                {/* Assignee */}
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Assignee
                  </span>
                  <select
                    value={assigneeId}
                    onChange={(e) => {
                      const val = e.target.value || null;
                      setAssigneeId(e.target.value);
                      handleSaveField({ assigneeId: val });
                    }}
                    className="w-full text-xs font-medium rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-slate-700 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Unassigned</option>
                    {members?.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name || m.email}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sprint */}
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Sprint
                  </span>
                  <select
                    value={sprintId}
                    onChange={(e) => {
                      const val = e.target.value || null;
                      setSprintId(e.target.value);
                      handleSaveField({ sprintId: val });
                    }}
                    className="w-full text-xs font-medium rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-slate-700 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Backlog (Unassigned)</option>
                    {projectSprints?.map((sp) => (
                      <option key={sp.id} value={sp.id}>
                        {sp.name} ({sp.status})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Priority */}
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Priority
                  </span>
                  <select
                    value={priority}
                    onChange={(e) => {
                      setPriority(e.target.value);
                      handleSaveField({ priority: e.target.value as any });
                    }}
                    className="w-full text-xs font-medium rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-slate-700 focus:outline-none focus:border-blue-500"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Story Points */}
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Story Points
                  </span>
                  <select
                    value={storyPoints ?? ""}
                    onChange={(e) => {
                      const val = e.target.value === "" ? null : Number(e.target.value);
                      setStoryPoints(val);
                      handleSaveField({ storyPoints: val });
                    }}
                    className="w-full text-xs font-medium rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-slate-700 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">None (Unestimated)</option>
                    {FIBONACCI_POINTS.map((pts) => (
                      <option key={pts} value={pts}>
                        {pts} pts
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 1. Description (Developer Markdown Editor) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Description
                  </label>
                  <span className="text-[11px] text-slate-400">
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
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Acceptance Criteria (Gherkin / Scenarios)
                  </label>
                  <span className="text-[11px] text-slate-400">
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
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Subtasks ({item.children.filter((c) => c.status === "DONE").length}/
                    {item.children.length})
                  </label>
                  <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
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
                                : "text-slate-300"
                            }`}
                          />
                          <span className="font-mono text-blue-600 font-semibold">
                            {child.key}
                          </span>
                          <span
                            className={
                              child.status === "DONE"
                                ? "line-through text-slate-400"
                                : "text-slate-800"
                            }
                          >
                            {child.title}
                          </span>
                        </div>
                        <span className="text-[10px] uppercase font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          {child.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Developer Comments & Activity Section */}
              <div className="space-y-4 pt-2 border-t border-slate-200">
                <div className="flex items-center space-x-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                  <MessageSquare className="h-4 w-4 text-slate-500" />
                  <span>Developer Comments & Activity ({comments.length})</span>
                </div>

                {/* New Comment Box using MarkdownEditor */}
                <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                  <span className="text-xs font-semibold text-slate-700">Leave a comment</span>
                  <MarkdownEditor
                    value={newComment}
                    onChange={setNewComment}
                    minHeight="90px"
                    placeholder="Write a comment with code snippets (```ts ...) or checklist items..."
                  />
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      disabled={!newComment.trim()}
                      onClick={handleAddComment}
                      className="flex items-center space-x-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-40"
                    >
                      <Send className="h-3 w-3" />
                      <span>Post Comment</span>
                    </button>
                  </div>
                </div>

                {/* Rendered Comments List */}
                <div className="space-y-3">
                  {comments.map((comm) => (
                    <div
                      key={comm.id}
                      className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <div className="flex items-center space-x-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 font-bold text-[10px] text-blue-800">
                            {comm.authorInitials}
                          </div>
                          <span className="font-semibold text-slate-800">
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
        </div>
      </div>
    </div>
  );
}
