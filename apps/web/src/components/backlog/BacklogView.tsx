"use client";

import React, { useState } from "react";
import {
  Layers,
  ChevronDown,
  ChevronRight,
  Plus,
  User,
  Clock,
  Sparkles,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import { api } from "~/trpc/react";

interface BacklogViewProps {
  projectId: string;
  onOpenAiModal: () => void;
}

const TYPE_BADGES: Record<string, string> = {
  EPIC: "bg-purple-100 text-purple-800 border-purple-200",
  FEATURE: "bg-indigo-100 text-indigo-800 border-indigo-200",
  STORY: "bg-blue-100 text-blue-800 border-blue-200",
  TASK: "bg-slate-100 text-slate-800 border-slate-200",
  BUG: "bg-red-100 text-red-800 border-red-200",
};

export function BacklogView({ projectId, onOpenAiModal }: BacklogViewProps) {
  const { data: tree, isLoading } = api.backlog.getTree.useQuery({
    projectId,
  });

  const { data: sprints } = api.sprint.list.useQuery({
    projectId,
  });

  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({
    "CTX-1": true,
    "CTX-2": true,
  });

  const toggleExpand = (id: string) => {
    setExpandedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-sm font-medium text-slate-500">Loading backlog tree...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Backlog Toolbar */}
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900 text-lg">Backlog Planning</h2>
            <p className="text-xs text-slate-500">
              Hierarchical view: Epics → Features → Stories → Technical Subtasks
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onOpenAiModal}
            className="flex items-center space-x-1.5 rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition"
          >
            <Sparkles className="h-4 w-4" />
            <span>Generate with AI</span>
          </button>
        </div>
      </div>

      {/* Sprints Summary Strip */}
      {sprints && sprints.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sprints.map((sprint) => (
            <div
              key={sprint.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-900">
                  {sprint.name}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    sprint.status === "ACTIVE"
                      ? "bg-emerald-100 text-emerald-800"
                      : sprint.status === "PLANNED"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {sprint.status}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                {sprint.goal ?? "No sprint goal defined."}
              </p>
              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-xs text-slate-500 font-medium">
                <span>{sprint.metrics.totalItems} cards</span>
                <span className="text-blue-600 font-semibold">
                  {sprint.metrics.totalPoints} pts
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Hierarchical Tree Container */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider grid grid-cols-12 gap-4">
          <div className="col-span-7">Work Item Hierarchy</div>
          <div className="col-span-2">Type & Priority</div>
          <div className="col-span-1 text-center">Points</div>
          <div className="col-span-2 text-right">Assignee</div>
        </div>

        <div className="divide-y divide-slate-100">
          {(!tree || tree.length === 0) ? (
            <div className="p-12 text-center text-sm text-slate-500">
              No items in the backlog yet. Use the AI Story Agent to generate initial stories!
            </div>
          ) : (
            tree.map((item) => (
              <div key={item.id} className="transition hover:bg-slate-50/60">
                {/* Level 1: Root Item */}
                <div className="flex items-center px-5 py-3.5 grid grid-cols-12 gap-4">
                  <div className="col-span-7 flex items-center space-x-2.5">
                    {item.children.length > 0 ? (
                      <button
                        onClick={() => toggleExpand(item.id)}
                        className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                      >
                        {expandedItems[item.id] ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                    ) : (
                      <div className="w-6" />
                    )}
                    <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                      {item.key}
                    </span>
                    <span className="font-semibold text-slate-900 text-sm">
                      {item.title}
                    </span>
                  </div>

                  <div className="col-span-2 flex items-center space-x-1.5">
                    <span
                      className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${
                        TYPE_BADGES[item.type] ?? TYPE_BADGES.STORY
                      }`}
                    >
                      {item.type}
                    </span>
                  </div>

                  <div className="col-span-1 flex items-center justify-center">
                    {item.storyPoints !== null && (
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
                        {item.storyPoints}
                      </span>
                    )}
                  </div>

                  <div className="col-span-2 flex items-center justify-end space-x-2">
                    {item.assignee ? (
                      <span className="text-xs text-slate-700 font-medium truncate">
                        {item.assignee.name}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">Unassigned</span>
                    )}
                  </div>
                </div>

                {/* Level 2: Children */}
                {expandedItems[item.id] && item.children.length > 0 && (
                  <div className="bg-slate-50/40 divide-y divide-slate-100/80 border-t border-slate-100">
                    {item.children.map((child) => (
                      <div
                        key={child.id}
                        className="flex items-center px-5 py-2.5 pl-12 grid grid-cols-12 gap-4"
                      >
                        <div className="col-span-7 flex items-center space-x-2">
                          <span className="font-mono text-xs font-medium text-slate-700 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                            {child.key}
                          </span>
                          <span className="text-xs font-medium text-slate-800">
                            {child.title}
                          </span>
                        </div>

                        <div className="col-span-2 flex items-center space-x-1.5">
                          <span
                            className={`rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                              TYPE_BADGES[child.type] ?? TYPE_BADGES.TASK
                            }`}
                          >
                            {child.type}
                          </span>
                        </div>

                        <div className="col-span-1 flex items-center justify-center">
                          {child.storyPoints !== null && (
                            <span className="rounded bg-white border border-slate-200 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600">
                              {child.storyPoints}
                            </span>
                          )}
                        </div>

                        <div className="col-span-2 flex items-center justify-end space-x-2">
                          {child.assignee ? (
                            <span className="text-[11px] text-slate-600 truncate">
                              {child.assignee.name}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400">
                              Unassigned
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
