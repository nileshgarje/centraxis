"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Users,
  Shield,
  Zap,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Search,
  UserCheck,
} from "lucide-react";
import { api } from "~/trpc/react";

interface CreateTeamDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
  onTeamCreated?: (teamId: string) => void;
}

export function CreateTeamDialog({
  isOpen,
  onClose,
  projectId,
  onTeamCreated,
}: CreateTeamDialogProps) {
  const utils = api.useUtils();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [cadenceWeeks, setCadenceWeeks] = useState<number>(2);
  const [targetVelocity, setTargetVelocity] = useState<number>(25);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch all organization members available for allocation
  const { data: orgMembers, isLoading: membersLoading } =
    api.team.listOrgMembers.useQuery(undefined, {
      enabled: isOpen,
    });

  useEffect(() => {
    if (isOpen) {
      setName("");
      setDescription("");
      setCadenceWeeks(2);
      setTargetVelocity(25);
      setSelectedUserIds([]);
      setMemberSearch("");
      setErrorMessage(null);
    }
  }, [isOpen]);

  const toggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const filteredMembers = useMemo(() => {
    if (!orgMembers) return [];
    if (!memberSearch.trim()) return orgMembers;
    const q = memberSearch.toLowerCase();
    return orgMembers.filter(
      (m) =>
        m.name?.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q) ||
        m.role?.toLowerCase().includes(q),
    );
  }, [orgMembers, memberSearch]);

  const createMutation = api.team.createTeam.useMutation({
    onSuccess: async (created) => {
      await Promise.all([
        utils.team.list.invalidate(),
        utils.project.listTeams.invalidate(),
        utils.project.listMembers.invalidate(),
      ]);
      onClose();
      if (onTeamCreated && created?.id) {
        onTeamCreated(created.id);
      }
    },
    onError: (err) => {
      setErrorMessage(err.message || "Failed to create squad.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage("Squad name is required.");
      return;
    }

    setErrorMessage(null);
    createMutation.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      defaultCadenceWeeks: cadenceWeeks,
      targetVelocity: targetVelocity || undefined,
      memberIds: selectedUserIds.length > 0 ? selectedUserIds : undefined,
      projectId: projectId || undefined,
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
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Create New Squad
              </h2>
              <p className="text-xs text-slate-500">
                Form an agile engineering squad with cadence & target velocity
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
          {/* Team Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Squad / Team Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Squad Platform or DevSecOps Squad"
              required
              autoFocus
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Cadence & Velocity Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Default Sprint Cadence */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Default Sprint Cadence
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[1, 2, 4].map((weeks) => (
                  <button
                    key={weeks}
                    type="button"
                    onClick={() => setCadenceWeeks(weeks)}
                    className={`rounded-xl border py-2 text-xs font-semibold transition ${
                      cadenceWeeks === weeks
                        ? "border-blue-600 bg-blue-50 text-blue-700 shadow-xs"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {weeks}w
                  </button>
                ))}
              </div>
            </div>

            {/* Target Velocity */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700">
                  Target Velocity
                </label>
                <span className="text-[10px] text-slate-400">pts / sprint</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={targetVelocity}
                  onChange={(e) => setTargetVelocity(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <Zap className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
          </div>

          {/* Member Multi-Select */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700">
                Squad Members ({selectedUserIds.length} Selected)
              </label>
              <span className="text-[10px] text-slate-400">
                From Centvis Directory
              </span>
            </div>

            {/* Search filter */}
            <div className="relative">
              <input
                type="text"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Filter members by name or role..."
                className="w-full rounded-xl border border-slate-300 py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder:text-slate-400 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            </div>

            {membersLoading ? (
              <div className="flex items-center justify-center p-4 border border-slate-200 rounded-xl bg-slate-50">
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              </div>
            ) : (
              <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-200 p-1.5 space-y-1 bg-slate-50/50">
                {filteredMembers.map((member) => {
                  const isSelected = selectedUserIds.includes(member.id);
                  return (
                    <button
                      type="button"
                      key={member.id}
                      onClick={() => toggleUser(member.id)}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition ${
                        isSelected
                          ? "bg-blue-50 border border-blue-200 text-blue-900 shadow-xs"
                          : "bg-white border border-slate-200/70 text-slate-700 hover:bg-slate-100/70"
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <div
                          className={`flex h-4 w-4 items-center justify-center rounded border ${
                            isSelected
                              ? "bg-blue-600 border-blue-600 text-white"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {isSelected && <CheckCircle2 className="h-3 w-3" />}
                        </div>
                        <div className="h-5 w-5 rounded-full bg-slate-200 text-[10px] font-bold flex items-center justify-center text-slate-700">
                          {member.name?.slice(0, 1) ?? "U"}
                        </div>
                        <span className="font-semibold">{member.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 uppercase font-medium">
                        {member.role}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700">
                Squad Mission & Description
              </label>
              <span className="text-[10px] text-slate-400">Optional</span>
            </div>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Primary functional responsibilities of this squad..."
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
              disabled={createMutation.isPending || !name.trim()}
              className="flex items-center space-x-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-50 transition active:scale-95"
            >
              {createMutation.isPending && (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              )}
              <span>Create Squad</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
