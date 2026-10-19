"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Mail,
  Shield,
  Users,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Info,
  ChevronDown,
} from "lucide-react";
import { api } from "~/trpc/react";

interface InviteUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type RoleType = "ORG_ADMIN" | "SCRUM_MASTER" | "DEVELOPER" | "VIEWER";

const ROLES: Array<{
  id: RoleType;
  label: string;
  badgeColor: string;
  description: string;
}> = [
  {
    id: "DEVELOPER",
    label: "Developer",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
    description:
      "Create, estimate, and transition backlog cards; contribute to active sprint boards.",
  },
  {
    id: "SCRUM_MASTER",
    label: "Scrum Master",
    badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
    description:
      "Manage sprint lifecycle (create, start, complete), squad planning, and velocity tracking.",
  },
  {
    id: "ORG_ADMIN",
    label: "Organization Administrator",
    badgeColor: "bg-purple-100 text-purple-800 border-purple-200",
    description:
      "Full organization control: provision projects, configure squads, and manage member RBAC.",
  },
  {
    id: "VIEWER",
    label: "Viewer",
    badgeColor: "bg-slate-100 text-slate-700 border-slate-200",
    description:
      "Read-only visibility into Kanban boards, sprint burn-down charts, and backlog items.",
  },
];

export function InviteUserDialog({
  isOpen,
  onClose,
  onSuccess,
}: InviteUserDialogProps) {
  const utils = api.useUtils();

  const [rawEmails, setRawEmails] = useState("");
  const [role, setRole] = useState<RoleType>("DEVELOPER");
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch available squads for initial assignment
  const { data: teams, isLoading: teamsLoading } = api.team.list.useQuery(
    undefined,
    { enabled: isOpen },
  );

  useEffect(() => {
    if (isOpen) {
      setRawEmails("");
      setRole("DEVELOPER");
      setSelectedTeamIds([]);
      setErrorMessage(null);
    }
  }, [isOpen]);

  const toggleTeam = (teamId: string) => {
    setSelectedTeamIds((prev) =>
      prev.includes(teamId)
        ? prev.filter((id) => id !== teamId)
        : [...prev, teamId],
    );
  };

  const inviteMutation = api.org.inviteUser.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.org.listMembers.invalidate(),
        utils.org.listInvitations.invalidate(),
        utils.project.listMembers.invalidate(),
      ]);
      onClose();
      if (onSuccess) onSuccess();
    },
    onError: (err) => {
      setErrorMessage(err.message || "Failed to send invitations.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Parse single or comma-separated emails
    const emails = rawEmails
      .split(/[,;\n]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.length > 0);

    if (emails.length === 0) {
      setErrorMessage("Please enter at least one valid email address.");
      return;
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = emails.filter((e) => !emailRegex.test(e));
    if (invalidEmails.length > 0) {
      setErrorMessage(
        `Invalid email format: ${invalidEmails.slice(0, 2).join(", ")}${
          invalidEmails.length > 2 ? "..." : ""
        }`,
      );
      return;
    }

    setErrorMessage(null);
    inviteMutation.mutate({
      emails,
      role,
      teamIds: selectedTeamIds.length > 0 ? selectedTeamIds : undefined,
    });
  };

  if (!isOpen) return null;

  const currentRole = ROLES.find((r) => r.id === role) ?? ROLES[0]!;

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
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Invite Team Members
              </h2>
              <p className="text-xs text-slate-500">
                Grant access to Centvis organization and allocate to squads
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
          {/* Email Input (Single or Bulk comma-separated) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700">
                Email Address(es) <span className="text-red-500">*</span>
              </label>
              <span className="text-[10px] text-slate-400">
                Single email or comma-separated
              </span>
            </div>
            <textarea
              rows={2}
              value={rawEmails}
              onChange={(e) => setRawEmails(e.target.value)}
              placeholder="e.g. alex@centvis.com, rachel.green@centvis.com"
              required
              autoFocus
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <p className="text-[11px] text-slate-400">
              Paste multiple emails separated by commas or line breaks for bulk onboarding.
            </p>
          </div>

          {/* Organization Role Selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Organization Role <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as RoleType)}
                className="w-full appearance-none rounded-xl border border-slate-300 bg-white py-2.5 pl-3.5 pr-8 text-xs font-semibold text-slate-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {ROLES.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label} ({r.id})
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            </div>

            {/* Role Permission Guidance Banner */}
            <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-2.5 text-xs">
              <div className="flex items-center space-x-2">
                <span
                  className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${currentRole.badgeColor}`}
                >
                  {currentRole.label}
                </span>
              </div>
              <p className="mt-1 text-slate-600 text-[11px]">
                {currentRole.description}
              </p>
            </div>
          </div>

          {/* Initial Squad / Team Assignment Multi-Select */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700">
                Initial Squad Allocation
              </label>
              <span className="text-[10px] text-slate-400">
                {selectedTeamIds.length} squads selected
              </span>
            </div>

            {teamsLoading ? (
              <div className="flex items-center justify-center p-3 border border-slate-200 rounded-xl bg-slate-50">
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              </div>
            ) : teams && teams.length > 0 ? (
              <div className="max-h-28 overflow-y-auto rounded-xl border border-slate-200 p-1.5 space-y-1 bg-slate-50/50">
                {teams.map((team) => {
                  const isSelected = selectedTeamIds.includes(team.id);
                  return (
                    <button
                      type="button"
                      key={team.id}
                      onClick={() => toggleTeam(team.id)}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition ${
                        isSelected
                          ? "bg-blue-50 border border-blue-200 text-blue-900"
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
                        <span className="font-medium">{team.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {team._count?.memberships ?? 0} engineers
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No squads created yet.</p>
            )}
          </div>

          {/* Auth Mode Note Requirement */}
          <div className="flex items-start space-x-2.5 rounded-xl border border-blue-200 bg-blue-50/70 p-3 text-xs text-blue-900">
            <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <span className="font-semibold">Authentication Notice:</span> Users
              with <span className="font-mono font-semibold">@centvis.com</span>{" "}
              Microsoft accounts can log in directly; external contractors can use
              temporary credentials.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={inviteMutation.isPending}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={inviteMutation.isPending || !rawEmails.trim()}
              className="flex items-center space-x-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-50 transition active:scale-95"
            >
              {inviteMutation.isPending && (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              )}
              <span>Send Invitation</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
