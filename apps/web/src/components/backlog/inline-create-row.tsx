"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Plus,
  Check,
  X,
  Loader2,
  Bookmark,
  CheckSquare,
  Bug,
} from "lucide-react";
import { api } from "~/trpc/react";

interface InlineCreateRowProps {
  projectId: string;
  sprintId?: string | null;
  parentId?: string | null;
  defaultType?: "STORY" | "TASK" | "BUG";
  placeholder?: string;
}

export function InlineCreateRow({
  projectId,
  sprintId,
  parentId,
  defaultType = "STORY",
  placeholder = "What needs to be done? Press Enter to add...",
}: InlineCreateRowProps) {
  const utils = api.useUtils();
  const inputRef = useRef<HTMLInputElement>(null);

  const [isExpanded, setIsExpanded] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"STORY" | "TASK" | "BUG">(defaultType);

  useEffect(() => {
    if (isExpanded) {
      inputRef.current?.focus();
    }
  }, [isExpanded]);

  const createMutation = api.backlog.createItem.useMutation({
    onMutate: async () => {
      await utils.board.getBoardData.cancel();
      await utils.backlog.getTree.cancel();
      await utils.backlog.getItems.cancel();
    },
    onSuccess: () => {
      // Invalidate relevant queries for instant UI refresh
      void utils.board.getBoardData.invalidate();
      void utils.backlog.getTree.invalidate();
      void utils.backlog.getItems.invalidate();
      void utils.sprint.list.invalidate();

      // Clear input so user can quickly type the next item
      setTitle("");
      inputRef.current?.focus();
    },
  });

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && title.trim()) {
      e.preventDefault();
      createMutation.mutate({
        projectId,
        title: title.trim(),
        type,
        sprintId: sprintId ?? undefined,
        parentId: parentId ?? undefined,
        status: sprintId ? "TODO" : "BACKLOG",
      });
    } else if (e.key === "Escape") {
      setIsExpanded(false);
      setTitle("");
    }
  };

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        data-testid="inline-create-trigger"
        className="flex w-full items-center space-x-2 rounded-lg border border-dashed border-slate-300 bg-white/70 px-4 py-2 text-xs font-semibold text-slate-500 transition hover:border-blue-400 hover:bg-blue-50/50 hover:text-blue-600"
      >
        <Plus className="h-3.5 w-3.5" />
        <span>+ Quick Add Item...</span>
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-blue-200 bg-white p-2.5 shadow-sm space-y-2 animate-in fade-in duration-150">
      <div className="flex items-center space-x-2">
        {/* Type Selector Pill */}
        <div className="flex items-center rounded-lg bg-slate-100 p-0.5">
          <button
            type="button"
            onClick={() => setType("STORY")}
            className={`flex items-center space-x-1 rounded-md px-2 py-1 text-[11px] font-semibold transition ${
              type === "STORY"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Bookmark className="h-3 w-3" />
            <span>Story</span>
          </button>
          <button
            type="button"
            onClick={() => setType("TASK")}
            className={`flex items-center space-x-1 rounded-md px-2 py-1 text-[11px] font-semibold transition ${
              type === "TASK"
                ? "bg-slate-700 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <CheckSquare className="h-3 w-3" />
            <span>Task</span>
          </button>
          <button
            type="button"
            onClick={() => setType("BUG")}
            className={`flex items-center space-x-1 rounded-md px-2 py-1 text-[11px] font-semibold transition ${
              type === "BUG"
                ? "bg-red-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Bug className="h-3 w-3" />
            <span>Bug</span>
          </button>
        </div>

        {/* Text Input */}
        <input
          ref={inputRef}
          type="text"
          data-testid="inline-create-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={createMutation.isPending}
          className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />

        {/* Action Controls */}
        <button
          data-testid="inline-create-submit"
          onClick={() => {
            if (title.trim()) {
              createMutation.mutate({
                projectId,
                title: title.trim(),
                type,
                sprintId: sprintId ?? undefined,
                parentId: parentId ?? undefined,
                status: sprintId ? "TODO" : "BACKLOG",
              });
            }
          }}
          disabled={createMutation.isPending || !title.trim()}
          className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {createMutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="h-3.5 w-3.5" />
          )}
        </button>

        <button
          onClick={() => {
            setIsExpanded(false);
            setTitle("");
          }}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex items-center justify-between px-1 text-[10px] text-slate-400">
        <span>
          Press <strong>Enter</strong> to create, <strong>Esc</strong> to cancel
        </span>
        {createMutation.isError && (
          <span className="text-red-600 font-medium">
            {createMutation.error.message}
          </span>
        )}
      </div>
    </div>
  );
}
