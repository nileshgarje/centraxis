"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Briefcase,
  Layers,
  Key,
  Users,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
} from "lucide-react";
import { api } from "~/trpc/react";

interface CreateProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated?: (projectId: string) => void;
}

function generateProjectKey(name: string): string {
  const clean = name.trim();
  if (!clean) return "";

  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    const acronym = words
      .map((w) => w[0]?.toUpperCase())
      .join("")
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 5);
    if (acronym.length >= 2) return acronym;
  }

  // Single word fallback: take first 3-4 letters
  const stripped = clean.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return stripped.slice(0, Math.min(Math.max(stripped.length, 3), 4));
}

export function CreateProjectDialog({
  isOpen,
  onClose,
  onProjectCreated,
}: CreateProjectDialogProps) {
  const utils = api.useUtils();

  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [isKeyManuallyEdited, setIsKeyManuallyEdited] = useState(false);
  const [description, setDescription] = useState("");
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Query clients for client assignment
  const { data: clients } = api.clients.list.useQuery(undefined, {
    enabled: isOpen,
  });

  // Query existing teams for multi-select binding
  const { data: teams, isLoading: teamsLoading } = api.team.list.useQuery(
    undefined,
    { enabled: isOpen },
  );

  // Key availability verification query
  const cleanKey = key.trim().toUpperCase();
  const {
    data: keyCheckData,
    isLoading: isCheckingKey,
  } = api.project.checkKey.useQuery(
    { key: cleanKey },
    { enabled: isOpen && cleanKey.length >= 2 },
  );

  const isKeyAvailable = keyCheckData?.available;

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setName("");
      setKey("");
      setIsKeyManuallyEdited(false);
      setDescription("");
      setSelectedTeamIds([]);
      setSelectedClientId("");
      setErrorMessage(null);
    }
  }, [isOpen]);

  // Handle Project Name Change & Auto-generate Key
  const handleNameChange = (val: string) => {
    setName(val);
    if (!isKeyManuallyEdited) {
      const generated = generateProjectKey(val);
      setKey(generated);
    }
  };

  // Toggle Team selection
  const toggleTeam = (teamId: string) => {
    setSelectedTeamIds((prev) =>
      prev.includes(teamId)
        ? prev.filter((id) => id !== teamId)
        : [...prev, teamId],
    );
  };

  const createMutation = api.project.createProject.useMutation({
    onSuccess: async (created) => {
      await Promise.all([
        utils.project.list.invalidate(),
        utils.project.listTeams.invalidate(),
        utils.team.list.invalidate(),
        utils.clients.list.invalidate(),
      ]);
      onClose();
      if (onProjectCreated && created?.id) {
        onProjectCreated(created.id);
      }
    },
    onError: (err) => {
      setErrorMessage(err.message || "Failed to create project.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage("Project name is required.");
      return;
    }

    if (cleanKey.length < 2 || cleanKey.length > 10) {
      setErrorMessage("Project key must be between 2 and 10 characters.");
      return;
    }

    if (keyCheckData && !keyCheckData.available) {
      setErrorMessage(`Project key "${cleanKey}" is already in use.`);
      return;
    }

    setErrorMessage(null);
    createMutation.mutate({
      name: name.trim(),
      key: cleanKey,
      clientId: selectedClientId || undefined,
      description: description.trim() || undefined,
      teamIds: selectedTeamIds.length > 0 ? selectedTeamIds : undefined,
    });
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
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Create New Project
              </h2>
              <p className="text-xs text-slate-500">
                Set up an agile workspace with multi-team matrix allocation
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
          {/* Project Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Project Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Centraxis Core Mobile"
              required
              autoFocus
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Client Tenant Selection */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700">
                Client Tenant
              </label>
              <span className="text-[11px] text-slate-400">Optional</span>
            </div>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">-- No Client (Internal Project) --</option>
              {clients?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.slug})
                </option>
              ))}
            </select>
          </div>

          {/* Project Key */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700">
                Project Key <span className="text-red-500">*</span>
              </label>
              {cleanKey.length >= 2 && (
                <div className="flex items-center space-x-1 text-[11px]">
                  {isCheckingKey ? (
                    <span className="flex items-center space-x-1 text-slate-500">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Checking...</span>
                    </span>
                  ) : isKeyAvailable ? (
                    <span className="flex items-center space-x-1 text-emerald-600 font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Available</span>
                    </span>
                  ) : (
                    <span className="flex items-center space-x-1 text-red-600 font-medium">
                      <AlertCircle className="h-3.5 w-3.5" />
                      <span>Already in use</span>
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="relative">
              <input
                type="text"
                value={key}
                maxLength={5}
                onChange={(e) => {
                  setIsKeyManuallyEdited(true);
                  setKey(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""));
                }}
                placeholder="e.g. CCM"
                required
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 font-mono text-xs font-bold text-slate-900 uppercase placeholder:text-slate-400 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <Key className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            </div>
            <p className="text-[11px] text-slate-400">
              Prefix used on all work items (e.g. {cleanKey || "KEY"}-1,{" "}
              {cleanKey || "KEY"}-2). 2–5 uppercase characters.
            </p>
          </div>

          {/* Associated Squads / Teams Multi-Select */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700">
                Associated Squads / Engineering Teams
              </label>
              <span className="text-[11px] text-slate-400">
                {selectedTeamIds.length} selected
              </span>
            </div>

            {teamsLoading ? (
              <div className="flex items-center justify-center p-4 border border-slate-200 rounded-xl bg-slate-50">
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              </div>
            ) : teams && teams.length > 0 ? (
              <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-200 p-2 space-y-1.5 bg-slate-50/50">
                {teams.map((team) => {
                  const isSelected = selectedTeamIds.includes(team.id);
                  return (
                    <button
                      type="button"
                      key={team.id}
                      onClick={() => toggleTeam(team.id)}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition ${
                        isSelected
                          ? "bg-blue-50 border border-blue-200 text-blue-900 shadow-xs"
                          : "bg-white border border-slate-200/80 text-slate-700 hover:bg-slate-100/70"
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <div
                          className={`flex h-4 w-4 items-center justify-center rounded border ${
                            isSelected
                              ? "bg-blue-600 border-blue-600 text-white"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {isSelected && <CheckCircle2 className="h-3.5 w-3.5" />}
                        </div>
                        <span className="font-semibold">{team.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {team._count?.memberships ?? 0} members
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">
                No teams found in organization.
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700">
                Description
              </label>
              <span className="text-[10px] text-slate-400">Optional</span>
            </div>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="High-level mission and context for this agile project..."
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-800 placeholder:text-slate-400 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={createMutation.isPending}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                createMutation.isPending ||
                !name.trim() ||
                cleanKey.length < 2 ||
                keyCheckData?.available === false
              }
              className="flex items-center space-x-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-50 transition active:scale-95"
            >
              {createMutation.isPending && (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              )}
              <span>Create Project</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
