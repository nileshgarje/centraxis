"use client";

import React from "react";
import { useSession } from "next-auth/react";
import {
  Sparkles,
  Layers,
  Kanban,
  Users,
  ChevronDown,
  CheckCircle2,
  Briefcase,
  Plus,
  Search,
  Calendar,
  UserPlus,
} from "lucide-react";

interface HeaderProps {
  projects: Array<{ id: string; key: string; name: string }>;
  selectedProjectId: string;
  onSelectProject: (id: string) => void;
  activeSprintName?: string;
  activeTab: "board" | "backlog" | "teams" | "metrics";
  onTabChange: (tab: "board" | "backlog" | "teams" | "metrics") => void;
  onOpenAiModal: () => void;
  onCreateItem: () => void;
  onCreateProject?: () => void;
  onCreateSprint?: () => void;
  onOpenInvite?: () => void;
  onOpenCommandMenu?: () => void;
}

export function Header({
  projects,
  selectedProjectId,
  onSelectProject,
  activeSprintName,
  activeTab,
  onTabChange,
  onOpenAiModal,
  onCreateItem,
  onCreateProject,
  onCreateSprint,
  onOpenInvite,
  onOpenCommandMenu,
}: HeaderProps) {
  const { data: session } = useSession();
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = React.useState(false);
  const [isCreateDropdownOpen, setIsCreateDropdownOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const createDropdownRef = React.useRef<HTMLDivElement>(null);

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  // Close dropdowns when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsProjectDropdownOpen(false);
      }
      if (
        createDropdownRef.current &&
        !createDropdownRef.current.contains(event.target as Node)
      ) {
        setIsCreateDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const canCreateProject =
    !session ||
    session.user?.role === "ORG_ADMIN" ||
    session.user?.role === "SCRUM_MASTER";

  const canInviteMember =
    !session ||
    session.user?.role === "ORG_ADMIN" ||
    session.user?.role === "SCRUM_MASTER";

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

          {/* Interactive Project Switcher Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsProjectDropdownOpen((prev) => !prev)}
              className="flex items-center space-x-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-1.5 text-xs font-semibold text-slate-800 transition hover:bg-slate-100 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <Briefcase className="h-3.5 w-3.5 text-blue-600" />
              <span className="truncate max-w-[140px] md:max-w-[200px]">
                {selectedProject?.name ?? "Select Project"}
              </span>
              {selectedProject?.key && (
                <span className="rounded bg-slate-200/80 px-1.5 py-0.2 font-mono text-[10px] text-slate-600 font-bold">
                  {selectedProject.key}
                </span>
              )}
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>

            {/* Switcher Dropdown Menu */}
            {isProjectDropdownOpen && (
              <div className="absolute left-0 mt-1.5 w-64 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Projects ({projects.length})
                </div>

                <div className="max-h-56 overflow-y-auto space-y-0.5">
                  {projects.map((project) => {
                    const isSelected = project.id === selectedProjectId;
                    return (
                      <button
                        key={project.id}
                        type="button"
                        onClick={() => {
                          onSelectProject(project.id);
                          setIsProjectDropdownOpen(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition ${
                          isSelected
                            ? "bg-blue-50 font-semibold text-blue-700"
                            : "text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center space-x-2 truncate">
                          <span className="truncate">{project.name}</span>
                          <span className="rounded bg-slate-100 px-1 py-0.2 font-mono text-[10px] text-slate-500">
                            {project.key}
                          </span>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 shrink-0 ml-1" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* + New Project Button (for ORG_ADMIN or SCRUM_MASTER) */}
                {canCreateProject && onCreateProject && (
                  <div className="mt-1 border-t border-slate-100 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsProjectDropdownOpen(false);
                        onCreateProject();
                      }}
                      className="flex w-full items-center space-x-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>+ New Project</span>
                    </button>
                  </div>
                )}
              </div>
            )}
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

        {/* Right Section: Command Bar, Persistent + Dropdown, AI & Profile */}
        <div className="flex items-center space-x-2.5">
          {/* Global Command Bar Trigger */}
          {onOpenCommandMenu && (
            <button
              type="button"
              onClick={onOpenCommandMenu}
              className="hidden xl:flex items-center space-x-2 rounded-xl border border-slate-200 bg-slate-50/80 px-2.5 py-1.5 text-xs text-slate-500 hover:bg-slate-100 hover:border-slate-300 transition"
              title="Open Global Command Bar (Cmd+K)"
            >
              <Search className="h-3.5 w-3.5 text-slate-400" />
              <span>Search or command...</span>
              <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.2 text-[10px] font-mono font-semibold text-slate-500 shadow-xs">
                ⌘K
              </kbd>
            </button>
          )}

          {/* Persistent '+' Creation Dropdown */}
          <div className="relative" ref={createDropdownRef}>
            <button
              type="button"
              onClick={() => setIsCreateDropdownOpen((prev) => !prev)}
              className="flex items-center space-x-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 transition active:scale-95"
            >
              <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
              <span>Create</span>
              <ChevronDown className="h-3 w-3 opacity-80" />
            </button>

            {/* Quick Actions Dropdown Menu */}
            {isCreateDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-60 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateDropdownOpen(false);
                    onCreateItem();
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-700 transition"
                >
                  <div className="flex items-center space-x-2">
                    <Plus className="h-3.5 w-3.5 text-blue-600" />
                    <span className="font-semibold">Create Work Item</span>
                  </div>
                  <kbd className="rounded bg-slate-100 border border-slate-200 px-1.5 py-0.2 text-[10px] font-mono text-slate-500">
                    C
                  </kbd>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsCreateDropdownOpen(false);
                    onOpenAiModal();
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-700 transition"
                >
                  <div className="flex items-center space-x-2">
                    <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                    <span className="font-semibold">Generate with Centraxis AI</span>
                  </div>
                  <kbd className="rounded bg-slate-100 border border-slate-200 px-1.5 py-0.2 text-[10px] font-mono text-slate-500">
                    ⌘J
                  </kbd>
                </button>

                {onCreateSprint && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreateDropdownOpen(false);
                      onCreateSprint();
                    }}
                    className="flex w-full items-center space-x-2 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-emerald-700 transition"
                  >
                    <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="font-semibold">Create Sprint</span>
                  </button>
                )}

                {canInviteMember && onOpenInvite && (
                  <div className="mt-1 border-t border-slate-100 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreateDropdownOpen(false);
                        onOpenInvite();
                      }}
                      className="flex w-full items-center space-x-2 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-purple-700 transition"
                    >
                      <UserPlus className="h-3.5 w-3.5 text-purple-600" />
                      <span className="font-semibold">Invite Member</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* AI Story Agent Button */}
          <button
            onClick={onOpenAiModal}
            className="group hidden sm:flex items-center space-x-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-md shadow-blue-500/20 transition hover:from-blue-700 hover:to-indigo-700 active:scale-95"
          >
            <Sparkles className="h-3.5 w-3.5 transition group-hover:rotate-12" />
            <span>AI Story Agent</span>
            <kbd className="ml-1 hidden rounded bg-blue-500/40 px-1.5 py-0.2 text-[10px] font-mono text-white md:inline-block">
              ⌘J
            </kbd>
          </button>

          {/* User Profile Pill */}
          <div className="flex items-center space-x-2 rounded-full border border-slate-200 bg-slate-50 py-1 pl-1 pr-2.5">
            <div className="h-7 w-7 overflow-hidden rounded-full bg-blue-100 flex items-center justify-center font-bold text-xs text-blue-700">
              AM
            </div>
            <div className="text-left text-xs hidden md:block">
              <p className="font-semibold text-slate-800 leading-tight">Alex Morgan</p>
              <p className="text-[10px] text-slate-500 leading-tight">ORG_ADMIN</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
