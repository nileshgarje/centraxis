"use client";

import React from "react";
import { Calendar, AlertCircle, Clock } from "lucide-react";

export interface DueDateBadgeProps {
  dueDate: Date | string | null | undefined;
  status?: string | null;
  className?: string;
  size?: "sm" | "default";
}

export function getDueDateInfo(
  dueDate: Date | string | null | undefined,
  status?: string | null,
) {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  if (isNaN(due.getTime())) return null;

  const isDone = status === "DONE";
  const now = new Date();
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const dueStart = new Date(
    due.getFullYear(),
    due.getMonth(),
    due.getDate(),
  ).getTime();
  const diffDays = Math.round((dueStart - todayStart) / (1000 * 60 * 60 * 24));

  const formattedDate = due.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  if (isDone) {
    return {
      category: "DONE" as const,
      diffDays,
      text: formattedDate,
      shortText: formattedDate,
      tooltip: `Completed (Due: ${due.toLocaleDateString()})`,
      className:
        "bg-muted/50 text-muted-foreground/70 border-border/50 dark:bg-muted/30 line-through",
      icon: Calendar,
      iconColor: "text-muted-foreground/70",
    };
  }

  if (diffDays < 0) {
    const daysAgo = Math.abs(diffDays);
    const text = daysAgo === 1 ? "1d overdue" : `${daysAgo}d overdue`;
    return {
      category: "OVERDUE" as const,
      diffDays,
      text: `${text} (${formattedDate})`,
      shortText: text,
      tooltip: `Overdue by ${daysAgo} day${daysAgo > 1 ? "s" : ""} (Due: ${due.toLocaleDateString()})`,
      className:
        "bg-red-500/10 text-red-600 border-red-500/30 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800 font-semibold",
      icon: AlertCircle,
      iconColor: "text-red-600 dark:text-red-400",
    };
  }

  if (diffDays <= 2) {
    const text =
      diffDays === 0
        ? "Due today"
        : diffDays === 1
          ? "Due tomorrow"
          : "Due in 2d";
    return {
      category: "DUE_SOON" as const,
      diffDays,
      text: `${text} (${formattedDate})`,
      shortText: text,
      tooltip: `Due soon: ${due.toLocaleDateString()}`,
      className:
        "bg-amber-500/10 text-amber-600 border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800 font-medium",
      icon: Clock,
      iconColor: "text-amber-600 dark:text-amber-400",
    };
  }

  return {
    category: "NORMAL" as const,
    diffDays,
    text: formattedDate,
    shortText: formattedDate,
    tooltip: `Due: ${due.toLocaleDateString()}`,
    className:
      "bg-muted/60 text-muted-foreground border-border dark:bg-muted/40 font-medium",
    icon: Calendar,
    iconColor: "text-muted-foreground",
  };
}

export function DueDateBadge({
  dueDate,
  status,
  className = "",
  size = "default",
}: DueDateBadgeProps) {
  const info = getDueDateInfo(dueDate, status);
  if (!info) return null;

  const Icon = info.icon;
  const isSm = size === "sm";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded border transition shrink-0 ${
        isSm ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs"
      } ${info.className} ${className}`}
      title={info.tooltip}
      data-testid="due-date-badge"
      data-due-category={info.category}
    >
      <Icon
        className={`${isSm ? "h-3 w-3" : "h-3.5 w-3.5"} shrink-0 ${info.iconColor}`}
      />
      <span className="truncate">
        {isSm ? (info.shortText ?? info.text) : info.text}
      </span>
    </span>
  );
}
