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
  Building,
  FolderKanban,
  X,
} from "lucide-react";
import {
  Button,
  Badge,
  Alert,
  AlertTitle,
  AlertDescription,
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  toast,
} from "@centraxis/ui";
import { api } from "~/trpc/react";
import { InviteUserDialog } from "~/components/settings/invite-user-dialog";
import { EditUserAccessDialog } from "~/components/settings/edit-user-access-dialog";

type TabType = "active" | "pending";

const ROLE_BADGES: Record<string, string> = {
  ORG_ADMIN:
    "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
  SCRUM_MASTER:
    "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
  DEVELOPER:
    "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
  VIEWER:
    "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
};

export default function MembersSettingsPage() {
  const utils = api.useUtils();

  const [activeTab, setActiveTab] = useState<TabType>("active");
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [memberToEditAccess, setMemberToEditAccess] = useState<any | null>(
    null,
  );
  const [inviteToRevoke, setInviteToRevoke] = useState<{
    id: string;
    email: string;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  // Queries
  const { data: members, isLoading: membersLoading } =
    api.org.listMembers.useQuery();
  const { data: invitations, isLoading: invitesLoading } =
    api.org.listInvitations.useQuery();

  // Mutations
  const updateRoleMutation = api.org.updateMemberRole.useMutation({
    onSuccess: async () => {
      toast.success("Member role updated successfully.");
      setActionError(null);
      await utils.org.listMembers.invalidate();
    },
    onError: (err) => {
      const msg = err.message || "Failed to update member role.";
      setActionError(msg);
      toast.error(msg);
    },
  });

  const resendInviteMutation = api.org.resendInvite.useMutation({
    onSuccess: async () => {
      toast.success("Invitation resent successfully.");
      setActionError(null);
      await utils.org.listInvitations.invalidate();
    },
    onError: (err) => {
      const msg = err.message || "Failed to resend invitation.";
      setActionError(msg);
      toast.error(msg);
    },
  });

  const revokeInviteMutation = api.org.revokeInvite.useMutation({
    onSuccess: async () => {
      toast.success("Invitation revoked.");
      setActionError(null);
      setInviteToRevoke(null);
      await utils.org.listInvitations.invalidate();
    },
    onError: (err) => {
      const msg = err.message || "Failed to revoke invitation.";
      setActionError(msg);
      toast.error(msg);
      setInviteToRevoke(null);
    },
  });

  const removeMemberMutation = api.org.removeMember.useMutation({
    onSuccess: async () => {
      toast.success("Member removed from organization.");
      setActionError(null);
      setMemberToRemove(null);
      await utils.org.listMembers.invalidate();
    },
    onError: (err) => {
      const msg = err.message || "Failed to remove member.";
      setActionError(msg);
      toast.error(msg);
      setMemberToRemove(null);
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
    <div className="space-y-6">
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
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{actionError}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActionError(null)}
              className="h-auto p-0 text-xs font-semibold hover:bg-transparent"
            >
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
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
            <div className="col-span-3">User & Identity</div>
            <div className="col-span-4">Client & Project Access</div>
            <div className="col-span-2">Assigned Squads</div>
            <div className="col-span-1">Org Role</div>
            <div className="col-span-2 text-right">Actions</div>
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
                  <div className="col-span-3 flex items-center space-x-3">
                    <div className="h-9 w-9 overflow-hidden rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-blue-700 shrink-0">
                      {member.name?.slice(0, 2).toUpperCase() ?? "U"}
                    </div>
                    <div className="truncate">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {member.name}
                        </p>
                        {member.globalRole === "SYSTEM_ADMIN" && (
                          <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-950/50 dark:text-purple-300">
                            SysAdmin
                          </span>
                        )}
                        {member.isTemporary && (
                          <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/50 dark:text-amber-300">
                            Temporary
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">
                        {member.email}
                      </p>
                    </div>
                  </div>

                  {/* Client & Project Access Matrix */}
                  <div className="col-span-4 flex flex-wrap gap-1">
                    {member.clientMemberships &&
                      member.clientMemberships.length > 0 &&
                      member.clientMemberships.map((cm) => (
                        <span
                          key={cm.id}
                          className="inline-flex items-center space-x-1 rounded-md bg-blue-50 border border-blue-200 px-1.5 py-0.5 text-[10px] font-medium text-blue-800 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300"
                          title={`Client ${cm.client.name} - ${cm.role}`}
                        >
                          <Building className="h-2.5 w-2.5 text-blue-500" />
                          <span>{cm.client.name}</span>
                          <span className="opacity-75 text-[9px]">
                            ({cm.role === "CLIENT_ADMIN" ? "Admin" : "Member"})
                          </span>
                        </span>
                      ))}
                    {member.projectMemberships &&
                      member.projectMemberships.length > 0 &&
                      member.projectMemberships.map((pm) => (
                        <span
                          key={pm.id}
                          className="inline-flex items-center space-x-1 rounded-md bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 text-[10px] font-medium text-indigo-800 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300"
                          title={`Project [${pm.project.key}] ${pm.project.name} - ${pm.role}`}
                        >
                          <FolderKanban className="h-2.5 w-2.5 text-indigo-500" />
                          <span className="font-mono font-bold">
                            [{pm.project.key}]
                          </span>
                          <span className="opacity-75 text-[9px]">
                            (
                            {pm.role === "PROJECT_LEAD"
                              ? "Lead"
                              : pm.role === "VIEWER"
                                ? "Viewer"
                                : "Member"}
                            )
                          </span>
                        </span>
                      ))}
                    {(!member.clientMemberships ||
                      member.clientMemberships.length === 0) &&
                      (!member.projectMemberships ||
                        member.projectMemberships.length === 0) && (
                        <span className="text-[11px] text-slate-400 italic">
                          No scoped access
                        </span>
                      )}
                  </div>

                  {/* Assigned Squads */}
                  <div className="col-span-2 flex flex-wrap gap-1">
                    {member.teams.length > 0 ? (
                      member.teams.map((t) => (
                        <span
                          key={t.id}
                          className="inline-flex items-center space-x-1 rounded-md bg-slate-100 border border-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-700"
                        >
                          <Briefcase className="h-2.5 w-2.5 text-slate-400" />
                          <span className="truncate max-w-[85px]">
                            {t.name}
                          </span>
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">
                        None
                      </span>
                    )}
                  </div>

                  {/* Organization Role (Inline Selector) */}
                  <div className="col-span-1">
                    <Select
                      value={member.role}
                      onValueChange={(val) =>
                        updateRoleMutation.mutate({
                          userId: member.id,
                          role: val as any,
                        })
                      }
                    >
                      <SelectTrigger
                        className={`h-6 w-[88px] rounded-lg border px-1.5 text-[9px] font-bold uppercase tracking-wider ${ROLE_BADGES[member.role] ?? ROLE_BADGES.DEVELOPER}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DEVELOPER">Dev</SelectItem>
                        <SelectItem value="SCRUM_MASTER">Scrum</SelectItem>
                        <SelectItem value="ORG_ADMIN">Admin</SelectItem>
                        <SelectItem value="VIEWER">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Actions */}
                  <div className="col-span-2 flex items-center justify-end gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setMemberToEditAccess(member as any)}
                      className="h-7 px-2 text-[11px] font-semibold gap-1"
                      title="Edit user client and project access matrix"
                    >
                      <Shield className="h-3 w-3 text-blue-600" />
                      <span>Access</span>
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setMemberToRemove({
                          id: member.id,
                          name: member.name ?? member.email ?? "Member",
                        })
                      }
                      title="Remove member from organization"
                      className="h-7 w-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
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
              No pending invitations. Click "+ Invite Member" to invite
              teammates.
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
                  <div className="col-span-2 flex items-center justify-end space-x-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        resendInviteMutation.mutate({ invitationId: inv.id })
                      }
                      disabled={resendInviteMutation.isPending}
                      className="h-7 px-2.5 text-xs gap-1"
                    >
                      <RotateCw className="h-3 w-3 text-primary" />
                      <span>Resend</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setInviteToRevoke({ id: inv.id, email: inv.email })
                      }
                      disabled={revokeInviteMutation.isPending}
                      className="h-7 w-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
                      title="Revoke invitation"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Remove Member Confirmation Dialog */}
      <AlertDialog
        open={!!memberToRemove}
        onOpenChange={(open) => {
          if (!open) setMemberToRemove(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remove Member from Organization?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{" "}
              <strong className="text-foreground">
                "{memberToRemove?.name}"
              </strong>{" "}
              from the organization? They will immediately lose access to all
              projects, squads, and boards.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeMemberMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={removeMemberMutation.isPending}
              onClick={() => {
                if (memberToRemove) {
                  removeMemberMutation.mutate({ userId: memberToRemove.id });
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeMemberMutation.isPending ? "Removing..." : "Remove Member"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revoke Invite Confirmation Dialog */}
      <AlertDialog
        open={!!inviteToRevoke}
        onOpenChange={(open) => {
          if (!open) setInviteToRevoke(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Invitation?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke the pending invitation for{" "}
              <strong className="text-foreground">
                "{inviteToRevoke?.email}"
              </strong>
              ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revokeInviteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={revokeInviteMutation.isPending}
              onClick={() => {
                if (inviteToRevoke) {
                  revokeInviteMutation.mutate({
                    invitationId: inviteToRevoke.id,
                  });
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {revokeInviteMutation.isPending
                ? "Revoking..."
                : "Revoke Invitation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Invite Member Modal Dialog */}
      <InviteUserDialog
        isOpen={isInviteDialogOpen}
        onClose={() => setIsInviteDialogOpen(false)}
      />

      {/* Edit User Access Modal Dialog */}
      <EditUserAccessDialog
        member={memberToEditAccess}
        isOpen={!!memberToEditAccess}
        onClose={() => setMemberToEditAccess(null)}
        onSuccess={() => utils.org.listMembers.invalidate()}
      />
    </div>
  );
}
