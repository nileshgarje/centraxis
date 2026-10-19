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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Alert,
  AlertDescription,
} from "@centraxis/ui";

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
      clientId: selectedClientId && selectedClientId !== "none" ? selectedClientId : undefined,
      description: description.trim() || undefined,
      teamIds: selectedTeamIds.length > 0 ? selectedTeamIds : undefined,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
        {/* Header */}
        <div className="border-b border-border px-6 py-4 bg-muted/20">
          <DialogHeader className="flex flex-row items-center space-x-3 space-y-0 text-left">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Create New Project
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Set up an agile workspace with multi-team matrix allocation
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4 pt-4 max-h-[75vh] overflow-y-auto">
          {/* Project Name */}
          <div className="space-y-1.5">
            <Label htmlFor="project-name" className="text-xs font-semibold text-foreground">
              Project Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="project-name"
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Centraxis Core Mobile"
              required
              autoFocus
              className="h-9 text-xs"
            />
          </div>

          {/* Client Tenant Selection */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="project-client" className="text-xs font-semibold text-foreground">
                Client Tenant
              </Label>
              <span className="text-[11px] text-muted-foreground">Optional</span>
            </div>
            <Select
              value={selectedClientId || "none"}
              onValueChange={(val) => setSelectedClientId(val === "none" ? "" : val)}
            >
              <SelectTrigger id="project-client" className="w-full h-9 text-xs font-medium">
                <SelectValue placeholder="-- No Client (Internal Project) --" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">-- No Client (Internal Project) --</SelectItem>
                {clients?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} ({c.slug})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Project Key */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="project-key" className="text-xs font-semibold text-foreground">
                Project Key <span className="text-destructive">*</span>
              </Label>
              {cleanKey.length >= 2 && (
                <div className="flex items-center space-x-1 text-[11px]">
                  {isCheckingKey ? (
                    <span className="flex items-center space-x-1 text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Checking...</span>
                    </span>
                  ) : isKeyAvailable ? (
                    <span className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Available</span>
                    </span>
                  ) : (
                    <span className="flex items-center space-x-1 text-destructive font-medium">
                      <AlertCircle className="h-3.5 w-3.5" />
                      <span>Already in use</span>
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="relative">
              <Input
                id="project-key"
                type="text"
                value={key}
                maxLength={5}
                onChange={(e) => {
                  setIsKeyManuallyEdited(true);
                  setKey(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""));
                }}
                placeholder="e.g. CCM"
                required
                className="h-9 pr-9 font-mono text-xs font-bold uppercase"
              />
              <Key className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Prefix used on all work items (e.g. {cleanKey || "KEY"}-1,{" "}
              {cleanKey || "KEY"}-2). 2–5 uppercase characters.
            </p>
          </div>

          {/* Associated Squads / Teams Multi-Select */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-foreground">
                Associated Squads / Engineering Teams
              </Label>
              <span className="text-[11px] text-muted-foreground">
                {selectedTeamIds.length} selected
              </span>
            </div>

            {teamsLoading ? (
              <div className="flex items-center justify-center p-4 border border-border rounded-lg bg-muted/20">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : teams && teams.length > 0 ? (
              <div className="max-h-36 overflow-y-auto rounded-lg border border-border p-2 space-y-1.5 bg-muted/20">
                {teams.map((team) => {
                  const isSelected = selectedTeamIds.includes(team.id);
                  return (
                    <button
                      type="button"
                      key={team.id}
                      onClick={() => toggleTeam(team.id)}
                      className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-xs transition ${
                        isSelected
                          ? "bg-primary/10 border border-primary/30 text-primary shadow-xs"
                          : "bg-card border border-border text-foreground hover:bg-muted"
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <div
                          className={`flex h-4 w-4 items-center justify-center rounded border ${
                            isSelected
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-border bg-background"
                          }`}
                        >
                          {isSelected && <CheckCircle2 className="h-3.5 w-3.5" />}
                        </div>
                        <span className="font-semibold">{team.name}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-medium">
                        {team._count?.memberships ?? 0} members
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                No teams found in organization.
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="project-desc" className="text-xs font-semibold text-foreground">
                Description
              </Label>
              <span className="text-[10px] text-muted-foreground">Optional</span>
            </div>
            <Textarea
              id="project-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="High-level mission and context for this agile project..."
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
              disabled={
                createMutation.isPending ||
                !name.trim() ||
                cleanKey.length < 2 ||
                keyCheckData?.available === false
              }
              className="gap-1.5"
            >
              {createMutation.isPending && (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              )}
              <span>Create Project</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
