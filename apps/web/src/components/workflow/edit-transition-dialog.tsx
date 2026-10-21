"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@centraxis/ui";
import { ArrowRight, Globe, Lock, Loader2 } from "lucide-react";

export interface TransitionFormData {
  name: string;
  fromStateId: string | null;
  toStateId: string;
  requiredRole?: "PROJECT_LEAD" | "MEMBER" | "VIEWER";
}

interface EditTransitionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceStateName?: string;
  targetStateName?: string;
  sourceStateId: string | null;
  targetStateId: string;
  onSubmit: (data: TransitionFormData) => void;
  isLoading?: boolean;
}

export function EditTransitionDialog({
  open,
  onOpenChange,
  sourceStateName,
  targetStateName,
  sourceStateId,
  targetStateId,
  onSubmit,
  isLoading,
}: EditTransitionDialogProps) {
  const [name, setName] = useState("");
  const [isAnySource, setIsAnySource] = useState(false);
  const [requiredRole, setRequiredRole] = useState<string>("NONE");

  useEffect(() => {
    setName("");
    setIsAnySource(sourceStateId === null);
    setRequiredRole("NONE");
  }, [open, sourceStateId, targetStateId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSubmit({
      name: name.trim(),
      fromStateId: isAnySource ? null : sourceStateId,
      toStateId: targetStateId,
      requiredRole:
        requiredRole !== "NONE"
          ? (requiredRole as "PROJECT_LEAD" | "MEMBER" | "VIEWER")
          : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Configure State Transition</DialogTitle>
          <DialogDescription className="text-xs">
            Define the action trigger label and execution rules when moving work items between these states.
          </DialogDescription>
        </DialogHeader>

        {/* State Flow Preview Pill */}
        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-3 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-foreground">
            {isAnySource ? (
              <span className="flex items-center gap-1 text-primary">
                <Globe className="h-3.5 w-3.5" />
                <span>Any State</span>
              </span>
            ) : (
              <span>{sourceStateName || "Source State"}</span>
            )}
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="font-semibold text-primary">
            {targetStateName || "Target State"}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Action Trigger Name */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Action Trigger Label</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Submit to QA, Start Testing, Close Issue"
              required
              className="h-8 text-xs font-medium"
            />
            <p className="text-[11px] text-muted-foreground">
              This label will be shown on button triggers and action menus.
            </p>
          </div>

          {/* Any State Checkbox */}
          <div className="flex items-center space-x-2 pt-1">
            <label className="flex items-center space-x-2 text-xs text-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isAnySource}
                onChange={(e) => setIsAnySource(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
              />
              <span>Allow transition from Any State (Global action)</span>
            </label>
          </div>

          {/* Permission Guard */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1.5">
              <Lock className="h-3 w-3 text-muted-foreground" />
              <span>Permission Guard (Optional)</span>
            </Label>
            <Select value={requiredRole} onValueChange={setRequiredRole}>
              <SelectTrigger className="h-8 text-xs font-medium">
                <SelectValue placeholder="No restriction" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">
                  No restriction (All Contributors)
                </SelectItem>
                <SelectItem value="MEMBER">
                  Members & Project Leads
                </SelectItem>
                <SelectItem value="PROJECT_LEAD">
                  Project Leads & Admins Only
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Restrict who can trigger this state change (e.g. only QA or Leads).
            </p>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isLoading || !name.trim()}
              className="gap-1.5"
            >
              {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>Save Transition</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
