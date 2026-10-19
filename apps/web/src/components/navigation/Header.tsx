"use client";

import React from "react";
import { Sparkles, Layers, Kanban, Users, ChevronDown, CheckCircle2 } from "lucide-react";

interface HeaderProps {
  projects: Array<{ id: string; key: string; name: string }>;
  selectedProjectId: string;
  onSelectProject: (id: string) => void;
  activeSprintName?: string;
  activeTab: "board" | "backlog" | "teams" | "metrics";
  onTabChange: (tab: "board" | "backlog" | "teams" | "metrics") => void;
  onOpenAiModal: () => void;
}

export function Header({
  projects,
  selectedProjectId,
  onSelectProject,
  activeSprintName,
  activeTab,
  onTabChange,
  onOpenAiModal,
}: HeaderProps) {
  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur shadow-sm">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Brand & Project Switcher */}
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white font-bold shadow-md shadow-blue-500/20">
              C
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-slate-900 tracking-tight text-lg">
                  Centraxis
                </span>
                <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 uppercase tracking-wider">
                  Centvis
                </span>
              </div>
              <p className="text-[11px] text-slate-500 -mt-0.5">
                Enterprise Agile OS
              </p>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-200" />

          {/* Project Switcher */}
          <div className="relative">
            <select
              value={selectedProjectId}
              onChange={(e) => onSelectProject(e.target.value)}
              className="appearance-none rounded-lg border border-slate-200 bg-slate-50/80 py-1.5 pl-3 pr-8 text-sm font-medium text-slate-800 transition hover:bg-slate-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name} ({project.key})
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          </div>

          {/* Active Sprint Indicator */}
          {activeSprintName && (
            <div className="hidden lg:flex items-center space-x-1.5 rounded-full border border-emerald-200 bg-emerald-50/80 px-3 py-1 text-xs font-medium text-emerald-800">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{activeSprintName}</span>
            </div>
          )}
        </div>

        {/* View Tabs */}
        <nav className="flex items-center space-x-1 rounded-lg bg-slate-100/90 p-1">
          <button
            onClick={() => onTabChange("board")}
            className={`flex items-center space-x-2 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === "board"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Kanban className="h-3.5 w-3.5" />
            <span>Active Board</span>
          </button>
          <button
            onClick={() => onTabChange("backlog")}
            className={`flex items-center space-x-2 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === "backlog"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Backlog</span>
          </button>
          <button
            onClick={() => onTabChange("teams")}
            className={`flex items-center space-x-2 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === "teams"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Squads & Roles</span>
          </button>
          <button
            onClick={() => onTabChange("metrics")}
            className={`flex items-center space-x-2 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === "metrics"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Sprint Burndown</span>
          </button>
        </nav>

        {/* AI Action & User Profile */}
        <div className="flex items-center space-x-4">
          <button
            onClick={onOpenAiModal}
            className="group flex items-center space-x-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-blue-500/20 transition hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg hover:shadow-blue-500/30 active:scale-95"
          >
            <Sparkles className="h-3.5 w-3.5 transition group-hover:rotate-12" />
            <span>AI Story Agent</span>
            <kbd className="ml-1.5 hidden rounded bg-blue-500/40 px-1.5 py-0.5 text-[10px] font-mono text-white sm:inline-block">
              ⌘K
            </kbd>
          </button>

          {/* User Profile Pill */}
          <div className="flex items-center space-x-2.5 rounded-full border border-slate-200 bg-slate-50 py-1 pl-1 pr-3">
            <div className="h-7 w-7 overflow-hidden rounded-full bg-blue-100 flex items-center justify-center font-bold text-xs text-blue-700">
              AM
            </div>
            <div className="text-left text-xs">
              <p className="font-semibold text-slate-800 leading-tight">Alex Morgan</p>
              <p className="text-[10px] text-slate-500 leading-tight">ORG_ADMIN</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
