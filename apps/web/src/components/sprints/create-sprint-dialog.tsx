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
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@centraxis/ui";

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

      const initialTeamId =
        defaultTeamId ?? (teams && teams.length > 0 ? teams[0]?.id : "");
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

    const nextNumber = maxNumber > 0 ? maxNumber + 1 : teamSprints.length + 1;
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
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                {isEditing ? "Edit Sprint" : "Create Planned Sprint"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {isEditing
                  ? "Update sprint iteration goals, dates, and squad alignment"
                  : "Plan and schedule a new agile sprint iteration"}
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
          {/* Sprint Name */}
          <div className="space-y-1.5">
            <Label
              htmlFor="sprint-name"
              className="text-xs font-semibold text-foreground"
            >
              Sprint Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="sprint-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Frontend Squad Sprint 2"
              required
              autoFocus
              className="h-9 text-xs"
            />
            <p className="text-[11px] text-muted-foreground">
              Convention auto-populated from squad and past iteration numbers.
            </p>
          </div>

          {/* Team / Squad Selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">
              Assigned Squad / Team
            </Label>
            <Select
              value={teamId || "all"}
              onValueChange={(val) => setTeamId(val === "all" ? "" : val)}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Project Wide (All Squads)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Project Wide (All Squads)</SelectItem>
                {teams?.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Duration Selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">
              Sprint Duration
            </Label>
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
                <Button
                  key={opt.id}
                  type="button"
                  variant={duration === opt.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleDurationChange(opt.id)}
                  className="h-8 text-xs font-semibold"
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Interactive Date Pickers */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label
                htmlFor="start-date"
                className="text-xs font-semibold text-foreground"
              >
                Start Date
              </Label>
              <Input
                id="start-date"
                type="date"
                value={startDateStr}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="end-date"
                className="text-xs font-semibold text-foreground"
              >
                End Date
              </Label>
              <Input
                id="end-date"
                type="date"
                value={endDateStr}
                onChange={(e) => {
                  setEndDateStr(e.target.value);
                  setDuration("CUSTOM");
                }}
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* Sprint Goal */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="sprint-goal"
                className="text-xs font-semibold text-foreground"
              >
                Sprint Goal
              </Label>
              <span className="text-[10px] text-muted-foreground">
                Optional
              </span>
            </div>
            <Textarea
              id="sprint-goal"
              rows={3}
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="What is the primary deliverable or outcome of this iteration?"
              className="text-xs resize-none"
            />
          </div>

          {/* Dialog Action Buttons */}
          <DialogFooter className="pt-3 border-t border-border flex items-center justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isPending || !name.trim()}
              className="gap-1.5"
            >
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>{isEditing ? "Save Changes" : "Create Sprint"}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
