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
import { Loader2 } from "lucide-react";

export interface StateFormData {
  id?: string;
  name: string;
  slug: string;
  category: "START" | "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
  color?: string;
}

interface AddStateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflowId: string;
  initialData?: StateFormData | null;
  onSubmit: (data: StateFormData) => void;
  isLoading?: boolean;
}

const COLOR_PRESETS = [
  { label: "Slate", value: "#64748b" },
  { label: "Blue", value: "#3b82f6" },
  { label: "Indigo", value: "#6366f1" },
  { label: "Purple", value: "#8b5cf6" },
  { label: "Amber", value: "#f59e0b" },
  { label: "Emerald", value: "#10b981" },
  { label: "Green", value: "#22c55e" },
  { label: "Rose", value: "#f43f5e" },
  { label: "Red", value: "#ef4444" },
];

export function AddStateDialog({
  open,
  onOpenChange,
  workflowId,
  initialData,
  onSubmit,
  isLoading,
}: AddStateDialogProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [category, setCategory] = useState<StateFormData["category"]>("TODO");
  const [color, setColor] = useState("#3b82f6");

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setSlug(initialData.slug);
      setCategory(initialData.category);
      setColor(initialData.color || "#3b82f6");
    } else {
      setName("");
      setSlug("");
      setCategory("TODO");
      setColor("#3b82f6");
    }
  }, [initialData, open]);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!initialData) {
      const generatedSlug = val
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
      setSlug(generatedSlug);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSubmit({
      id: initialData?.id,
      name: name.trim().toUpperCase(),
      slug: slug.trim() || name.trim().toLowerCase().replace(/\s+/g, "_"),
      category,
      color,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Edit State Node" : "Add Workflow State"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Configure the state name, standard status category, and theme color token.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* State Name */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">State Name</Label>
            <Input
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. SECURITY REVIEW"
              required
              className="h-8 text-xs font-medium uppercase tracking-wider"
            />
          </div>

          {/* State Slug */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">State Key / Slug</Label>
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="e.g. security_review"
              required
              className="h-8 text-xs font-mono"
            />
            <p className="text-[11px] text-muted-foreground">
              Unique programmatic identifier for this state in the workflow.
            </p>
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Category</Label>
            <Select
              value={category}
              onValueChange={(val: any) => setCategory(val)}
            >
              <SelectTrigger className="h-8 text-xs font-medium">
                <SelectValue placeholder="Select Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODO">TO DO (Planning & Backlog)</SelectItem>
                <SelectItem value="IN_PROGRESS">
                  IN PROGRESS (Active Engineering)
                </SelectItem>
                <SelectItem value="IN_REVIEW">
                  IN REVIEW (QA, Security & Audit)
                </SelectItem>
                <SelectItem value="DONE">DONE (Resolved & Closed)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Color Picker */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Color Accent</Label>
            <div className="flex items-center gap-2 flex-wrap">
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setColor(preset.value)}
                  className={`h-6 w-6 rounded-full border-2 transition-transform ${
                    color === preset.value
                      ? "border-primary scale-110 shadow-sm"
                      : "border-transparent hover:scale-105"
                  }`}
                  style={{ backgroundColor: preset.value }}
                  title={preset.label}
                />
              ))}
            </div>
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
              <span>{initialData ? "Update State" : "Add State"}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
