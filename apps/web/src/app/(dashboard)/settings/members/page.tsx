"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Users,
  Mail,
  UserPlus,
  Shield,
  ArrowLeft,
  Search,
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCw,
  Trash2,
  ChevronDown,
  Loader2,
  Briefcase,
  X,
} from "lucide-react";
import { api } from "~/trpc/react";
import { InviteUserDialog } from "~/components/settings/invite-user-dialog";

type TabType = "active" | "pending";

const ROLE_BADGES: Record<string, string> = {
  ORG_ADMIN: "bg-purple-100 text-purple-800 border-purple-200",
  SCRUM_MASTER: "bg-blue-100 text-blue-800 border-blue-200",
  DEVELOPER: "bg-emerald-100 text-emerald-800 border-emerald-200",
  VIEWER: "bg-slate-100 text-slate-700 border-slate-200",
};

export default function MembersSettingsPage() {
  const utils = api.useUtils();

  const [activeTab, setActiveTab] = useState<TabType>("active");
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Queries
  const { data: members, isLoading: membersLoading } =
    api.org.listMembers.useQuery();
  const { data: invitations, isLoading: invitesLoading } =
    api.org.listInvitations.useQuery();

  // Mutations
  const updateRoleMutation = api.org.updateMemberRole.useMutation({
    onSuccess: async () => {
      setActionSuccess("Member role updated successfully.");
      setActionError(null);
      await utils.org.listMembers.invalidate();
    },
    onError: (err) => {
      setActionError(err.message || "Failed to update member role.");
    },
  });

  const resendInviteMutation = api.org.resendInvite.useMutation({
    onSuccess: async () => {
      setActionSuccess("Invitation resent successfully.");
      setActionError(null);
      await utils.org.listInvitations.invalidate();
    },
    onError: (err) => {
      setActionError(err.message || "Failed to resend invitation.");
    },
  });

  const revokeInviteMutation = api.org.revokeInvite.useMutation({
    onSuccess: async () => {
      setActionSuccess("Invitation revoked.");
      setActionError(null);
      await utils.org.listInvitations.invalidate();
    },
    onError: (err) => {
      setActionError(err.message || "Failed to revoke invitation.");
    },
  });

  const removeMemberMutation = api.org.removeMember.useMutation({
    onSuccess: async () => {
      setActionSuccess("Member removed from organization.");
      setActionError(null);
      await utils.org.listMembers.invalidate();
    },
    onError: (err) => {
      setActionError(err.message || "Failed to remove member.");
    },
  });

  // Filtered lists
  const filteredMembers = (members ?? []).filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.name?.toLowerCase().includes(q) ||
      m.email?.toLowerCase().includes(q) ||
      m.role.toLowerCase().includes(q)
    );
  });

  const filteredInvites = (invitations ?? []).filter((inv) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      inv.email.toLowerCase().includes(q) || inv.role.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-slate-50/70 p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500">
          <Link
            href="/"
            className="flex items-center space-x-1 hover:text-slate-900 transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Centraxis Workspace</span>
          </Link>
          <span>/</span>
          <span className="text-slate-700">Settings</span>
          <span>/</span>
          <span className="text-blue-600 font-bold">Members</span>
        </div>

        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center space-x-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/20">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                Team Members & Access Management
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage 25-person organization RBAC permissions, squad allocations,
                and pending onboarding invites
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsInviteDialogOpen(true)}
            className="flex items-center space-x-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 transition active:scale-95 shrink-0"
          >
            <UserPlus className="h-4 w-4" />
            <span>+ Invite Member</span>
          </button>
        </div>

        {/* Feedback Alerts */}
        {actionError && (
          <div className="flex items-center justify-between rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-700 font-medium">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
              <span>{actionError}</span>
            </div>
            <button
              onClick={() => setActionError(null)}
              className="text-red-500 hover:text-red-700 font-bold"
            >
              Dismiss
            </button>
          </div>
        )}

        {actionSuccess && (
          <div className="flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs text-emerald-800 font-medium">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{actionSuccess}</span>
            </div>
            <button
              onClick={() => setActionSuccess(null)}
              className="text-emerald-600 hover:text-emerald-800 font-bold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Toolbar & Tabs */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Tabs */}
          <div className="flex items-center space-x-1 rounded-xl bg-slate-200/70 p-1">
            <button
              onClick={() => setActiveTab("active")}
              className={`flex items-center space-x-2 rounded-lg px-4 py-2 text-xs font-semibold transition ${
                activeTab === "active"
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>Active Members</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold">
                {members?.length ?? 0}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("pending")}
              className={`flex items-center space-x-2 rounded-lg px-4 py-2 text-xs font-semibold transition ${
                activeTab === "pending"
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Mail className="h-3.5 w-3.5" />
              <span>Pending Invites</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold">
                {invitations?.length ?? 0}
              </span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, or role..."
              className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3.5 text-xs text-slate-800 placeholder:text-slate-400 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
            />
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        {/* ======================================================== */}
        {/* ACTIVE MEMBERS TABLE                                     */}
        {/* ======================================================== */}
        {activeTab === "active" && (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-3.5 grid grid-cols-12 gap-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <div className="col-span-4">User & Identity</div>
              <div className="col-span-3">Assigned Squads</div>
              <div className="col-span-2">Organization Role</div>
              <div className="col-span-2">Member Since</div>
              <div className="col-span-1 text-right">Actions</div>
            </div>

            {membersLoading ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">
                No active members found matching your search query.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredMembers.map((member) => (
                  <div
                    key={member.id}
                    className="px-6 py-3.5 grid grid-cols-12 gap-4 items-center hover:bg-slate-50/60 transition"
                  >
                    {/* User & Identity */}
                    <div className="col-span-4 flex items-center space-x-3">
                      <div className="h-9 w-9 overflow-hidden rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-blue-700 shrink-0">
                        {member.name?.slice(0, 2).toUpperCase() ?? "U"}
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {member.name}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {member.email}
                        </p>
                      </div>
                    </div>

                    {/* Assigned Squads */}
                    <div className="col-span-3 flex flex-wrap gap-1">
                      {member.teams.length > 0 ? (
                        member.teams.map((t) => (
                          <span
                            key={t.id}
                            className="inline-flex items-center space-x-1 rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-700"
                          >
                            <Briefcase className="h-2.5 w-2.5 text-slate-400" />
                            <span>{t.name}</span>
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">
                          No squad assigned
                        </span>
                      )}
                    </div>

                    {/* Organization Role (Inline Selector) */}
                    <div className="col-span-2">
                      <div className="relative inline-block">
                        <select
                          value={member.role}
                          onChange={(e) =>
                            updateRoleMutation.mutate({
                              userId: member.id,
                              role: e.target.value as any,
                            })
                          }
                          className={`appearance-none rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider focus:outline-none cursor-pointer pr-6 ${
                            ROLE_BADGES[member.role] ?? ROLE_BADGES.DEVELOPER
                          }`}
                        >
                          <option value="DEVELOPER">Developer</option>
                          <option value="SCRUM_MASTER">Scrum Master</option>
                          <option value="ORG_ADMIN">Admin</option>
                          <option value="VIEWER">Viewer</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 opacity-60" />
                      </div>
                    </div>

                    {/* Member Since / Last Active */}
                    <div className="col-span-2 text-xs text-slate-500 font-medium">
                      {new Date(member.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>

                    {/* Remove Action */}
                    <div className="col-span-1 flex justify-end">
                      <button
                        onClick={() => {
                          if (
                            confirm(
                              `Are you sure you want to remove ${member.name} from the organization?`,
                            )
                          ) {
                            removeMemberMutation.mutate({ userId: member.id });
                          }
                        }}
                        title="Remove member from organization"
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* PENDING INVITATIONS TABLE                                */}
        {/* ======================================================== */}
        {activeTab === "pending" && (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-3.5 grid grid-cols-12 gap-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <div className="col-span-4">Invited Email</div>
              <div className="col-span-2">Assigned Role</div>
              <div className="col-span-2">Invited By</div>
              <div className="col-span-2">Expires</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>

            {invitesLoading ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : filteredInvites.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">
                No pending invitations. Click "+ Invite Member" to invite teammates.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredInvites.map((inv) => (
                  <div
                    key={inv.id}
                    className="px-6 py-3.5 grid grid-cols-12 gap-4 items-center hover:bg-slate-50/60 transition"
                  >
                    {/* Invited Email */}
                    <div className="col-span-4 flex items-center space-x-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600 font-bold text-xs">
                        <Mail className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-semibold text-slate-900 truncate">
                        {inv.email}
                      </span>
                    </div>

                    {/* Assigned Role */}
                    <div className="col-span-2">
                      <span
                        className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          ROLE_BADGES[inv.role] ?? ROLE_BADGES.DEVELOPER
                        }`}
                      >
                        {inv.role}
                      </span>
                    </div>

                    {/* Invited By */}
                    <div className="col-span-2 text-xs text-slate-600 font-medium truncate">
                      {inv.invitedBy?.name ?? "Admin"}
                    </div>

                    {/* Expires At */}
                    <div className="col-span-2 flex items-center space-x-1.5 text-xs text-slate-500">
                      <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>
                        {new Date(inv.expiresAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>

                    {/* Actions: Resend / Revoke */}
                    <div className="col-span-2 flex items-center justify-end space-x-2">
                      <button
                        onClick={() =>
                          resendInviteMutation.mutate({ invitationId: inv.id })
                        }
                        disabled={resendInviteMutation.isPending}
                        className="flex items-center space-x-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                      >
                        <RotateCw className="h-3 w-3 text-blue-600" />
                        <span>Resend</span>
                      </button>
                      <button
                        onClick={() =>
                          revokeInviteMutation.mutate({ invitationId: inv.id })
                        }
                        disabled={revokeInviteMutation.isPending}
                        className="rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                        title="Revoke invitation"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Invite Member Modal Dialog */}
      <InviteUserDialog
        isOpen={isInviteDialogOpen}
        onClose={() => setIsInviteDialogOpen(false)}
      />
    </div>
  );
}
