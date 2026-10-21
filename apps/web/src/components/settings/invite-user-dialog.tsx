"use client";

import React, { useState, useEffect } from "react";
import { Mail, CheckCircle2, AlertCircle, Loader2, Info } from "lucide-react";
import { api } from "~/trpc/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Textarea,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Alert,
  AlertDescription,
} from "@centraxis/ui";

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

  const currentRole = ROLES.find((r) => r.id === role) ?? ROLES[0]!;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
        {/* Header */}
        <div className="border-b border-border px-6 py-4 bg-muted/20">
          <DialogHeader className="flex flex-row items-center space-x-3 space-y-0 text-left">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Invite Team Members
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Grant access to Centvis organization and allocate to squads
              </DialogDescription>
            </div>
          </DialogHeader>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mx-6 mt-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          </div>
        )}

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-4 pt-4 max-h-[75vh] overflow-y-auto"
        >
          {/* Email Input (Single or Bulk comma-separated) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="invite-emails"
                className="text-xs font-semibold text-foreground"
              >
                Email Address(es) <span className="text-destructive">*</span>
              </Label>
              <span className="text-[10px] text-muted-foreground">
                Single email or comma-separated
              </span>
            </div>
            <Textarea
              id="invite-emails"
              rows={2}
              value={rawEmails}
              onChange={(e) => setRawEmails(e.target.value)}
              placeholder="e.g. alex@centvis.com, rachel.green@centvis.com"
              required
              autoFocus
              className="text-xs resize-none"
            />
            <p className="text-[11px] text-muted-foreground">
              Paste multiple emails separated by commas or line breaks for bulk
              onboarding.
            </p>
          </div>

          {/* Organization Role Selector */}
          <div className="space-y-1.5">
            <Label
              htmlFor="invite-role"
              className="text-xs font-semibold text-foreground"
            >
              Organization Role <span className="text-destructive">*</span>
            </Label>
            <Select
              value={role}
              onValueChange={(val) => setRole(val as RoleType)}
            >
              <SelectTrigger
                id="invite-role"
                className="w-full h-9 text-xs font-semibold"
              >
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.label} ({r.id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Role Permission Guidance Banner */}
            <div className="rounded-lg border border-border bg-muted/30 p-2.5 text-xs">
              <div className="flex items-center space-x-2">
                <span
                  className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${currentRole.badgeColor}`}
                >
                  {currentRole.label}
                </span>
              </div>
              <p className="mt-1 text-muted-foreground text-[11px]">
                {currentRole.description}
              </p>
            </div>
          </div>

          {/* Initial Squad / Team Assignment Multi-Select */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-foreground">
                Initial Squad Allocation
              </Label>
              <span className="text-[10px] text-muted-foreground">
                {selectedTeamIds.length} squads selected
              </span>
            </div>

            {teamsLoading ? (
              <div className="flex items-center justify-center p-3 border border-border rounded-lg bg-muted/20">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : teams && teams.length > 0 ? (
              <div className="max-h-28 overflow-y-auto rounded-lg border border-border p-1.5 space-y-1 bg-muted/20">
                {teams.map((team) => {
                  const isSelected = selectedTeamIds.includes(team.id);
                  return (
                    <button
                      type="button"
                      key={team.id}
                      onClick={() => toggleTeam(team.id)}
                      className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs transition ${
                        isSelected
                          ? "bg-primary/10 border border-primary/30 text-primary"
                          : "bg-card border border-border text-foreground hover:bg-muted"
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <div
                          className={`flex h-4 w-4 items-center justify-center rounded border ${
                            isSelected
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-border bg-background"
                          }`}
                        >
                          {isSelected && <CheckCircle2 className="h-3 w-3" />}
                        </div>
                        <span className="font-medium">{team.name}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {team._count?.memberships ?? 0} engineers
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                No squads created yet.
              </p>
            )}
          </div>

          {/* Auth Mode Note Requirement */}
          <div className="flex items-start space-x-2.5 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-foreground">
            <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <span className="font-semibold">Authentication Notice:</span>{" "}
              Users with{" "}
              <span className="font-mono font-semibold">@centvis.com</span>{" "}
              Microsoft accounts can log in directly; external contractors can
              use temporary credentials.
            </p>
          </div>

          {/* Action Buttons */}
          <DialogFooter className="pt-3 border-t border-border flex items-center justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={inviteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={inviteMutation.isPending || !rawEmails.trim()}
              className="gap-1.5"
            >
              {inviteMutation.isPending && (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              )}
              <span>Send Invitation</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
