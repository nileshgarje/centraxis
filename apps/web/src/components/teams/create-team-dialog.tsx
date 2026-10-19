"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  Zap,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Search,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
  Textarea,
  Label,
  Alert,
  AlertDescription,
} from "@centraxis/ui";
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg p-0 overflow-hidden sm:max-w-lg bg-background border-border">
        {/* Header */}
        <DialogHeader className="border-b border-border bg-muted/40 px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
              <Users className="h-5 w-5" />
            </div>
            <div className="text-left">
              <DialogTitle className="text-base font-bold text-foreground">
                Create New Squad
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Form an agile engineering squad with cadence & target velocity
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Error Alert */}
        {errorMessage && (
          <div className="px-6 pt-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Team Name */}
          <div className="space-y-1.5">
            <Label htmlFor="squad-name" className="text-xs font-semibold">
              Squad / Team Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="squad-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Squad Platform or DevSecOps Squad"
              required
              autoFocus
              className="text-sm"
            />
          </div>

          {/* Cadence & Velocity Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Default Sprint Cadence */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Default Sprint Cadence
              </Label>
              <div className="grid grid-cols-3 gap-1.5">
                {[1, 2, 4].map((weeks) => (
                  <Button
                    key={weeks}
                    type="button"
                    variant={cadenceWeeks === weeks ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCadenceWeeks(weeks)}
                    className="h-8 text-xs font-semibold"
                  >
                    {weeks}w
                  </Button>
                ))}
              </div>
            </div>

            {/* Target Velocity */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="target-velocity" className="text-xs font-semibold">
                  Target Velocity
                </Label>
                <span className="text-[10px] text-muted-foreground">pts / sprint</span>
              </div>
              <div className="relative">
                <Input
                  id="target-velocity"
                  type="number"
                  min={1}
                  max={200}
                  value={targetVelocity}
                  onChange={(e) => setTargetVelocity(Number(e.target.value))}
                  className="h-8 pr-8 text-xs font-semibold"
                />
                <Zap className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>
          </div>

          {/* Member Multi-Select */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">
                Squad Members ({selectedUserIds.length} Selected)
              </Label>
              <span className="text-[10px] text-muted-foreground">
                From Organization Directory
              </span>
            </div>

            {/* Search filter */}
            <div className="relative">
              <Input
                type="text"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Filter members by name or role..."
                className="h-8 pl-8 text-xs"
              />
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            </div>

            {membersLoading ? (
              <div className="flex items-center justify-center p-4 border border-border rounded-lg bg-muted/20">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="max-h-36 overflow-y-auto rounded-lg border border-border p-1.5 space-y-1 bg-muted/20">
                {filteredMembers.map((member) => {
                  const isSelected = selectedUserIds.includes(member.id);
                  return (
                    <button
                      type="button"
                      key={member.id}
                      onClick={() => toggleUser(member.id)}
                      className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs transition ${
                        isSelected
                          ? "bg-primary/10 border border-primary/30 text-foreground"
                          : "bg-background border border-border/70 text-muted-foreground hover:bg-muted"
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
                        <div className="h-5 w-5 rounded-full bg-secondary text-[10px] font-bold flex items-center justify-center text-secondary-foreground">
                          {member.name?.slice(0, 1) ?? "U"}
                        </div>
                        <span className="font-semibold text-foreground">{member.name}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground uppercase font-medium">
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
              <Label htmlFor="squad-desc" className="text-xs font-semibold">
                Squad Mission & Description
              </Label>
              <span className="text-[10px] text-muted-foreground">Optional</span>
            </div>
            <Textarea
              id="squad-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Primary functional responsibilities of this squad..."
              className="text-xs resize-none"
            />
          </div>

          {/* Actions */}
          <DialogFooter className="pt-3 border-t border-border flex items-center justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={createMutation.isPending || !name.trim()}
              className="gap-1.5"
            >
              {createMutation.isPending && (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              )}
              <span>Create Squad</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
