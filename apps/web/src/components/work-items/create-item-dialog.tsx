"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Plus,
  Bookmark,
  Layers,
  CheckSquare,
  Bug,
  Zap,
  User,
  Calendar,
  AlertCircle,
  Loader2,
  ChevronDown,
} from "lucide-react";
import { api } from "~/trpc/react";
import { MarkdownEditor } from "@centraxis/ui";

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

  const [type, setType] = useState<"EPIC" | "FEATURE" | "STORY" | "TASK" | "BUG">(
    defaultType,
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [acceptanceCriteria, setAcceptanceCriteria] = useState("");
  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">(
    "MEDIUM",
  );
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
  const { data: members } = api.project.listMembers.useQuery(
    { projectId },
    { enabled: isOpen },
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
        {/* Dialog Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-6 py-4">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-bold shadow-md shadow-blue-500/20">
              <Plus className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Create Work Item
              </h3>
              <p className="text-xs text-slate-500">
                Add an Epic, Feature, Story, Task, or Bug to the project backlog
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

        {/* Dialog Body */}
        <form onSubmit={handleSubmit}>
          <div className="max-h-[75vh] overflow-y-auto p-6 space-y-5">
            {/* 1. Item Type Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Work Item Type
              </label>
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
              <div className="flex items-center space-x-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* 2. Title */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. As a team member, I want to filter board cards by squad..."
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* 3. Description & Acceptance Criteria */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Description / Context
              </label>
              <MarkdownEditor
                value={description}
                onChange={setDescription}
                minHeight="120px"
                placeholder="Provide details, rationale, or technical implementation notes in GFM..."
              />
            </div>

            {type === "STORY" && (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Acceptance Criteria (Gherkin format)
                </label>
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
                <label className="block text-xs font-semibold text-slate-700">
                  Story Points (Fibonacci Complexity)
                </label>
                {storyPoints !== null && (
                  <button
                    type="button"
                    onClick={() => setStoryPoints(null)}
                    className="text-[11px] text-slate-400 hover:text-slate-600 underline"
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
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
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
                <label className="block text-xs font-semibold text-slate-700">
                  Priority
                </label>
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
                              : "bg-blue-600 text-white border-blue-600"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Sprint */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Sprint Allocation
                </label>
                <div className="relative">
                  <select
                    value={sprintId}
                    onChange={(e) => setSprintId(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-slate-300 bg-white py-2 pl-3 pr-8 text-xs font-medium text-slate-800 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="">Backlog Pool (Unscheduled)</option>
                    {sprints?.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.status})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              {/* Assignee */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Assignee
                </label>
                <div className="relative">
                  <select
                    value={assigneeId}
                    onChange={(e) => setAssigneeId(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-slate-300 bg-white py-2 pl-3 pr-8 text-xs font-medium text-slate-800 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="">Unassigned</option>
                    {members?.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.role})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              {/* Parent Work Item */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Parent Hierarchy (Optional)
                </label>
                <div className="relative">
                  <select
                    value={parentId}
                    onChange={(e) => setParentId(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-slate-300 bg-white py-2 pl-3 pr-8 text-xs font-medium text-slate-800 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="">No Parent (Root Item)</option>
                    {parentCandidates.map((p) => (
                      <option key={p.id} value={p.id}>
                        [{p.key}] {p.title.slice(0, 36)}...
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Dialog Footer */}
          <div className="flex items-center justify-end space-x-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createItemMutation.isPending || !title.trim()}
              className="flex items-center space-x-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-md shadow-blue-500/20 transition hover:bg-blue-700 disabled:opacity-50"
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
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
