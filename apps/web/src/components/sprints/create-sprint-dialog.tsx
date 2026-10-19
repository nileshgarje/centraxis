"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Calendar,
  Clock,
  Target,
  Users,
  Loader2,
  Sparkles,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { api } from "~/trpc/react";

export interface SprintData {
  id: string;
  name: string;
  goal?: string | null;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  teamId?: string | null;
  status: "PLANNED" | "ACTIVE" | "COMPLETED";
}

interface CreateSprintDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  sprintToEdit?: SprintData | null;
  defaultTeamId?: string | null;
}

type DurationOption = "1_WEEK" | "2_WEEKS" | "3_WEEKS" | "4_WEEKS" | "CUSTOM";

const DURATION_DAYS: Record<Exclude<DurationOption, "CUSTOM">, number> = {
  "1_WEEK": 7,
  "2_WEEKS": 14,
  "3_WEEKS": 21,
  "4_WEEKS": 28,
};

function formatDateToInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function CreateSprintDialog({
  isOpen,
  onClose,
  projectId,
  sprintToEdit,
  defaultTeamId,
}: CreateSprintDialogProps) {
  const utils = api.useUtils();

  // Queries for teams and existing sprints
  const { data: teams } = api.project.listTeams.useQuery(
    { projectId },
    { enabled: isOpen && !!projectId },
  );

  const { data: sprints } = api.sprint.list.useQuery(
    { projectId },
    { enabled: isOpen && !!projectId },
  );

  // Form states
  const [name, setName] = useState("");
  const [teamId, setTeamId] = useState("");
  const [duration, setDuration] = useState<DurationOption>("2_WEEKS");
  const [startDateStr, setStartDateStr] = useState("");
  const [endDateStr, setEndDateStr] = useState("");
  const [goal, setGoal] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isEditing = !!sprintToEdit;

  // Initialize or reset form when dialog opens or editing target changes
  useEffect(() => {
    if (!isOpen) {
      setErrorMessage(null);
      return;
    }

    if (sprintToEdit) {
      setName(sprintToEdit.name);
      setTeamId(sprintToEdit.teamId ?? "");
      setGoal(sprintToEdit.goal ?? "");

      const start = sprintToEdit.startDate
        ? new Date(sprintToEdit.startDate)
        : new Date();
      setStartDateStr(formatDateToInput(start));

      if (sprintToEdit.endDate) {
        setEndDateStr(formatDateToInput(new Date(sprintToEdit.endDate)));
        setDuration("CUSTOM");
      } else {
        const end = addDays(start, 14);
        setEndDateStr(formatDateToInput(end));
        setDuration("2_WEEKS");
      }
    } else {
      // New sprint defaults
      const today = new Date();
      setStartDateStr(formatDateToInput(today));
      const twoWeeksLater = addDays(today, 14);
      setEndDateStr(formatDateToInput(twoWeeksLater));
      setDuration("2_WEEKS");
      setGoal("");

      const initialTeamId = defaultTeamId ?? (teams && teams.length > 0 ? teams[0]?.id : "");
      if (initialTeamId) {
        setTeamId(initialTeamId);
      }
    }
  }, [isOpen, sprintToEdit, defaultTeamId, teams]);

  // Compute naming convention: "[Team Name] Sprint " + (lastSprintNumber + 1)
  const suggestedName = useMemo(() => {
    if (isEditing) return sprintToEdit?.name ?? "";

    const selectedTeam = teams?.find((t) => t.id === teamId);
    const teamPrefix = selectedTeam ? selectedTeam.name : "Sprint";

    if (!sprints || sprints.length === 0) {
      return `${teamPrefix} Sprint 1`;
    }

    // Filter sprints by team if team selected
    const teamSprints = teamId
      ? sprints.filter((s) => s.teamId === teamId)
      : sprints;

    // Extract numbers from existing sprint names
    let maxNumber = 0;
    const regex = /(\d+)(?!.*\d)/; // matches the last number sequence in string
    teamSprints.forEach((s) => {
      const match = s.name.match(regex);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNumber) {
          maxNumber = num;
        }
      }
    });

    const nextNumber = maxNumber > 0 ? maxNumber + 1 : (teamSprints.length + 1);
    return `${teamPrefix} Sprint ${nextNumber}`;
  }, [isEditing, sprintToEdit, teams, teamId, sprints]);

  // Set suggested name if creating new sprint and name is currently empty or matches previous suggestion
  useEffect(() => {
    if (!isEditing && isOpen && (!name || name.includes("Sprint"))) {
      setName(suggestedName);
    }
  }, [suggestedName, isEditing, isOpen]);

  // Handle Duration change
  const handleDurationChange = (newDuration: DurationOption) => {
    setDuration(newDuration);
    if (newDuration !== "CUSTOM") {
      const days = DURATION_DAYS[newDuration];
      const start = startDateStr ? new Date(startDateStr) : new Date();
      const end = addDays(start, days);
      setEndDateStr(formatDateToInput(end));
    }
  };

  // Handle Start Date change
  const handleStartDateChange = (newStartDateStr: string) => {
    setStartDateStr(newStartDateStr);
    if (duration !== "CUSTOM" && newStartDateStr) {
      const days = DURATION_DAYS[duration];
      const start = new Date(newStartDateStr);
      if (!isNaN(start.getTime())) {
        const end = addDays(start, days);
        setEndDateStr(formatDateToInput(end));
      }
    }
  };

  // Mutations
  const createMutation = api.sprint.createSprint.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.sprint.list.invalidate({ projectId }),
        utils.sprint.getActive.invalidate({ projectId }),
        utils.backlog.getTree.invalidate({ projectId }),
        utils.metrics.getTeamVelocity.invalidate({ projectId }),
      ]);
      onClose();
    },
    onError: (err) => {
      setErrorMessage(err.message || "Failed to create sprint.");
    },
  });

  const updateMutation = api.sprint.updateSprint.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.sprint.list.invalidate({ projectId }),
        utils.sprint.getActive.invalidate({ projectId }),
        utils.backlog.getTree.invalidate({ projectId }),
      ]);
      onClose();
    },
    onError: (err) => {
      setErrorMessage(err.message || "Failed to update sprint.");
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage("Sprint name is required.");
      return;
    }

    setErrorMessage(null);

    const startDate = startDateStr ? new Date(startDateStr) : undefined;
    const endDate = endDateStr ? new Date(endDateStr) : undefined;

    if (startDate && endDate && endDate < startDate) {
      setErrorMessage("End date cannot be earlier than start date.");
      return;
    }

    if (isEditing && sprintToEdit) {
      updateMutation.mutate({
        sprintId: sprintToEdit.id,
        name: name.trim(),
        goal: goal.trim() || null,
        startDate: startDate ?? null,
        endDate: endDate ?? null,
        teamId: teamId || null,
      });
    } else {
      createMutation.mutate({
        projectId,
        name: name.trim(),
        goal: goal.trim() || undefined,
        startDate,
        endDate,
        teamId: teamId || undefined,
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/50">
          <div className="flex items-center space-x-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {isEditing ? "Edit Sprint" : "Create Planned Sprint"}
              </h2>
              <p className="text-xs text-slate-500">
                {isEditing
                  ? "Update sprint iteration goals, dates, and squad alignment"
                  : "Plan and schedule a new agile sprint iteration"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mx-6 mt-4 flex items-center space-x-2 rounded-xl bg-red-50 border border-red-200 px-3.5 py-2.5 text-xs text-red-700 font-medium">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Sprint Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Sprint Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Frontend Squad Sprint 2"
              required
              autoFocus
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <p className="text-[11px] text-slate-400">
              Convention auto-populated from squad and past iteration numbers.
            </p>
          </div>

          {/* Team / Squad Selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Assigned Squad / Team
            </label>
            <div className="relative">
              <select
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-800 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">Project Wide (All Squads)</option>
                {teams?.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
              <Users className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          {/* Duration Selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Sprint Duration
            </label>
            <div className="grid grid-cols-5 gap-2">
              {(
                [
                  { id: "1_WEEK", label: "1 week" },
                  { id: "2_WEEKS", label: "2 weeks" },
                  { id: "3_WEEKS", label: "3 weeks" },
                  { id: "4_WEEKS", label: "4 weeks" },
                  { id: "CUSTOM", label: "Custom" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleDurationChange(opt.id)}
                  className={`rounded-xl border py-2 text-xs font-semibold transition ${
                    duration === opt.id
                      ? "border-blue-600 bg-blue-50 text-blue-700 shadow-sm"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Date Pickers */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Start Date
              </label>
              <input
                type="date"
                value={startDateStr}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-800 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                End Date
              </label>
              <input
                type="date"
                value={endDateStr}
                onChange={(e) => {
                  setEndDateStr(e.target.value);
                  setDuration("CUSTOM");
                }}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-800 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          {/* Sprint Goal */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700">
                Sprint Goal
              </label>
              <span className="text-[10px] text-slate-400">Optional</span>
            </div>
            <textarea
              rows={3}
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="What is the primary deliverable or outcome of this iteration?"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Dialog Action Buttons */}
          <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !name.trim()}
              className="flex items-center space-x-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-50 transition active:scale-95"
            >
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>{isEditing ? "Save Changes" : "Create Sprint"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
