"use client";

import React, { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Badge, Button } from "@centraxis/ui";
import { Edit2, Trash2 } from "lucide-react";

export interface StateNodeData {
  id: string;
  name: string;
  slug: string;
  category: "START" | "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
  color?: string;
  onEdit?: (data: any) => void;
  onDelete?: (id: string) => void;
}

export const StateNode = memo(({ data, selected }: NodeProps<any>) => {
  const nodeData = data as StateNodeData;
  const color = nodeData.color || "#3b82f6";

  return (
    <div
      className={`group relative min-w-[190px] rounded-xl border bg-card p-3 shadow-sm transition-all select-none ${
        selected
          ? "border-primary ring-2 ring-primary ring-offset-2 dark:ring-offset-slate-950 shadow-md scale-102"
          : "border-border hover:border-slate-300 dark:hover:border-slate-700 hover:shadow"
      }`}
      style={{
        borderLeftWidth: "4px",
        borderLeftColor: color,
      }}
    >
      {/* React Flow Connection Handles */}
      <Handle
        type="target"
        position={Position.Top}
        className="!h-3 !w-3 !rounded-full !border-2 !border-background !bg-slate-400 hover:!bg-primary transition-colors"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="!h-3 !w-3 !rounded-full !border-2 !border-background !bg-slate-400 hover:!bg-primary transition-colors"
      />

      {/* Header: Title and Actions */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center space-x-2 truncate">
          <span
            className="h-2 w-2 rounded-full shrink-0"
            style={{ backgroundColor: color }}
          />
          <span className="font-bold text-xs uppercase tracking-wider text-foreground truncate">
            {nodeData.name}
          </span>
        </div>

        {/* Hover Action Buttons */}
        <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-0.5 transition-opacity">
          {nodeData.onEdit && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                nodeData.onEdit?.(nodeData);
              }}
              className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-muted"
              title="Edit state"
            >
              <Edit2 className="h-3 w-3" />
            </button>
          )}
          {nodeData.onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                nodeData.onDelete?.(nodeData.id);
              }}
              className="p-1 text-muted-foreground hover:text-destructive rounded hover:bg-destructive/10"
              title="Delete state"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Category Pill & Slug */}
      <div className="mt-2 flex items-center justify-between text-[10px]">
        <span
          className="inline-flex items-center px-1.5 py-0.2 rounded font-semibold uppercase tracking-wider"
          style={{
            backgroundColor: `${color}18`,
            color: color,
          }}
        >
          {nodeData.category}
        </span>
        <span className="font-mono text-muted-foreground truncate max-w-[80px]">
          {nodeData.slug}
        </span>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-3 !w-3 !rounded-full !border-2 !border-background !bg-primary hover:!scale-125 transition-transform"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!h-3 !w-3 !rounded-full !border-2 !border-background !bg-primary hover:!scale-125 transition-transform"
      />
    </div>
  );
});

StateNode.displayName = "StateNode";
