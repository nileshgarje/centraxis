"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Badge,
} from "@centraxis/ui";
import {
  ArrowRight,
  CheckCircle2,
  GitFork,
  Maximize2,
  Minimize2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Sliders,
  Layers,
  Settings2,
  Shield,
  Loader2,
  Check,
  AlertTriangle,
} from "lucide-react";
import { api } from "~/trpc/react";

interface WorkflowViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workItemId: string;
  itemKey?: string;
  onTransitionSuccess?: () => void;
}

// Fixed or algorithmic node positioning
interface NodePosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

const PRESET_COORDINATES: Record<string, { x: number; y: number }> = {
  todo: { x: 120, y: 60 },
  in_development: { x: 120, y: 190 },
  ready_for_qa: { x: 120, y: 320 },
  in_qa: { x: 120, y: 450 },
  reopened: { x: 460, y: 260 },
  resolved: { x: 460, y: 450 },
  done: { x: 460, y: 60 },
};

export function WorkflowViewerDialog({
  open,
  onOpenChange,
  workItemId,
  itemKey,
  onTransitionSuccess,
}: WorkflowViewerDialogProps) {
  const utils = api.useUtils();
  const [showLabels, setShowLabels] = useState(true);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [executingSlug, setExecutingSlug] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  // Load available transitions and active workflow for this work item
  const { data, isLoading, error } =
    api.workflow.getAvailableTransitions.useQuery(
      { workItemId },
      { enabled: open && !!workItemId },
    );

  // Transition execution mutation
  const transitionMutation = api.workflow.executeTransition.useMutation({
    onSuccess: () => {
      setExecutingSlug(null);
      setFeedbackError(null);
      void utils.workflow.getAvailableTransitions.invalidate({ workItemId });
      void utils.backlog.getItem.invalidate({ id: workItemId });
      void utils.backlog.getItems.invalidate();
      void utils.board.getBoardData.invalidate();
      if (onTransitionSuccess) onTransitionSuccess();
    },
    onError: (err) => {
      setExecutingSlug(null);
      setFeedbackError(err.message || "Failed to execute state transition.");
    },
  });

  const handleExecute = (targetSlug: string) => {
    setExecutingSlug(targetSlug);
    setFeedbackError(null);
    transitionMutation.mutate({
      workItemId,
      targetStateSlug: targetSlug,
    });
  };

  // Node layout calculation
  const nodePositions = useMemo<Record<string, NodePosition>>(() => {
    if (!data?.workflow?.states) return {};
    const pos: Record<string, NodePosition> = {};
    const states = data.workflow.states;

    states.forEach((st, idx) => {
      const preset = PRESET_COORDINATES[st.slug];
      if (preset) {
        pos[st.id] = {
          x: preset.x,
          y: preset.y,
          width: 170,
          height: 52,
        };
      } else {
        // Fallback dynamic grid for custom states
        const col = idx % 2 === 0 ? 120 : 460;
        const row = Math.floor(idx / 2) * 120 + 60;
        pos[st.id] = {
          x: col,
          y: row,
          width: 170,
          height: 52,
        };
      }
    });

    return pos;
  }, [data?.workflow?.states]);

  // Pan interaction
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsPanning(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleResetZoom = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  };

  const currentState = data?.currentState;
  const availableTargetStates = data?.availableTargetStates ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden flex flex-col h-[85vh] sm:h-[80vh] bg-background border-border">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-border bg-card shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <GitFork className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold text-foreground">
                  Task workflow
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {itemKey ? `${itemKey} · ` : ""}
                  {data?.workflow?.name ?? "Agile State Machine"}{" "}
                  {data?.workflow?.resolutionLevel && (
                    <span className="font-mono text-[10px] uppercase font-bold text-primary/80">
                      ({data.workflow.resolutionLevel} SCOPED)
                    </span>
                  )}
                </DialogDescription>
              </div>
            </div>

            {/* Transition Labels Toggle */}
            <div className="flex items-center space-x-2">
              <label className="flex items-center space-x-1.5 text-xs text-muted-foreground select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={showLabels}
                  onChange={(e) => setShowLabels(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
                />
                <span>Show transition labels</span>
              </label>
            </div>
          </div>
        </DialogHeader>

        {/* Status Ribbon */}
        <div className="bg-muted/40 border-b border-border px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-muted-foreground font-medium">
              Current status:
            </span>
            {currentState ? (
              <Badge
                variant="outline"
                className="font-semibold uppercase tracking-wider text-xs px-2.5 py-0.5"
                style={{
                  borderColor: currentState.color ?? "#3b82f6",
                  color: currentState.color ?? "#3b82f6",
                  backgroundColor: `${currentState.color ?? "#3b82f6"}15`,
                }}
              >
                {currentState.name}
              </Badge>
            ) : (
              <Badge variant="outline">Unknown</Badge>
            )}
          </div>

          {/* Permitted destination states */}
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-muted-foreground font-medium">
              This work item can be moved to:
            </span>
            <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
              {availableTargetStates.length === 0 ? (
                <span className="text-xs text-muted-foreground italic">
                  No active transitions permitted
                </span>
              ) : (
                availableTargetStates.map((st) => {
                  const isExecuting = executingSlug === st.slug;
                  return (
                    <Button
                      key={st.id}
                      size="sm"
                      variant="outline"
                      disabled={isExecuting || transitionMutation.isPending}
                      onClick={() => handleExecute(st.slug)}
                      className="h-7 text-xs font-semibold px-2.5 transition hover:border-primary hover:text-primary gap-1"
                    >
                      {isExecuting && (
                        <Loader2 className="h-3 w-3 animate-spin text-primary" />
                      )}
                      <span>{st.name}</span>
                    </Button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Error / Validation Warning Banner */}
        {feedbackError && (
          <div className="bg-destructive/10 border-b border-destructive/20 px-6 py-2 flex items-center justify-between text-xs text-destructive font-medium shrink-0 animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{feedbackError}</span>
            </div>
            <button
              onClick={() => setFeedbackError(null)}
              className="text-xs hover:underline font-semibold ml-2 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Interactive Visual Graph Canvas */}
        <div
          className="relative flex-1 bg-slate-50 dark:bg-slate-950 overflow-hidden cursor-grab active:cursor-grabbing select-none"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {isLoading ? (
            <div className="flex h-full items-center justify-center space-x-2 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-sm">Rendering workflow diagram...</span>
            </div>
          ) : error ? (
            <div className="flex h-full items-center justify-center p-6 text-center text-destructive text-sm">
              Failed to load workflow scheme: {error.message}
            </div>
          ) : (
            <div
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
                transformOrigin: "center center",
                transition: isPanning ? "none" : "transform 0.1s ease-out",
                width: "740px",
                height: "560px",
                position: "absolute",
                left: "calc(50% - 370px)",
                top: "calc(50% - 280px)",
              }}
            >
              {/* SVG Connector Layer */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{ overflow: "visible" }}
              >
                <defs>
                  {/* Default arrow marker */}
                  <marker
                    id="arrowhead-default"
                    viewBox="0 0 10 10"
                    refX="9"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-fill"
                  >
                    <path
                      d="M 0 1 L 10 5 L 0 9 z"
                      className="fill-slate-400 dark:fill-slate-600"
                    />
                  </marker>
                  {/* Highlighted arrow marker for active transitions */}
                  <marker
                    id="arrowhead-active"
                    viewBox="0 0 10 10"
                    refX="9"
                    refY="5"
                    markerWidth="7"
                    markerHeight="7"
                    orient="auto-fill"
                  >
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#3b82f6" />
                  </marker>
                </defs>

                {/* Render Transitions */}
                {data?.workflow?.transitions?.map((tr) => {
                  const toPos = nodePositions[tr.toStateId];
                  if (!toPos) return null;

                  // "Create" transition or Any State transition (fromStateId is null)
                  if (!tr.fromStateId) {
                    if (tr.toState.slug === "todo") {
                      // Initial Start node -> TO DO
                      return (
                        <g key={tr.id}>
                          <circle
                            cx={40}
                            cy={toPos.y + toPos.height / 2}
                            r={8}
                            className="fill-primary stroke-white dark:stroke-slate-900 stroke-2"
                          />
                          <path
                            d={`M 48 ${toPos.y + toPos.height / 2} L ${toPos.x - 2} ${toPos.y + toPos.height / 2}`}
                            className="stroke-primary stroke-2"
                            markerEnd="url(#arrowhead-active)"
                          />
                          {showLabels && (
                            <text
                              x={65}
                              y={toPos.y + toPos.height / 2 - 8}
                              className="text-[10px] font-bold fill-primary font-sans"
                            >
                              Create
                            </text>
                          )}
                        </g>
                      );
                    }
                    return null;
                  }

                  const fromPos = nodePositions[tr.fromStateId];
                  if (!fromPos) return null;

                  // Determine if this transition originates from the work item's current state
                  const isTransitionAvailable =
                    currentState && tr.fromStateId === currentState.id;

                  // Compute source and target anchor coordinates
                  let x1 = fromPos.x + fromPos.width / 2;
                  let y1 = fromPos.y + fromPos.height / 2;
                  let x2 = toPos.x + toPos.width / 2;
                  let y2 = toPos.y + toPos.height / 2;

                  let pathD = "";
                  let labelX = (x1 + x2) / 2;
                  let labelY = (y1 + y2) / 2;

                  // Vertical column transition (straight down)
                  if (Math.abs(fromPos.x - toPos.x) < 40) {
                    if (y1 < y2) {
                      y1 = fromPos.y + fromPos.height;
                      y2 = toPos.y - 4;
                      pathD = `M ${x1} ${y1} L ${x2} ${y2}`;
                      labelX = x1 + 10;
                      labelY = (y1 + y2) / 2;
                    } else {
                      // Upwards reverse
                      x1 = fromPos.x + fromPos.width;
                      x2 = toPos.x + toPos.width;
                      y1 = fromPos.y + fromPos.height / 2;
                      y2 = toPos.y + toPos.height / 2;
                      const cx = Math.max(x1, x2) + 60;
                      pathD = `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2 + 4} ${y2}`;
                      labelX = cx + 8;
                      labelY = (y1 + y2) / 2;
                    }
                  } else if (fromPos.x < toPos.x) {
                    // Left to Right transition
                    x1 = fromPos.x + fromPos.width;
                    x2 = toPos.x - 4;
                    if (Math.abs(y1 - y2) < 30) {
                      pathD = `M ${x1} ${y1} L ${x2} ${y2}`;
                      labelY -= 8;
                    } else {
                      const cx = (x1 + x2) / 2;
                      pathD = `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`;
                      labelX = cx;
                      labelY = (y1 + y2) / 2 - 8;
                    }
                  } else {
                    // Right to Left transition (e.g. REOPENED -> IN DEV)
                    x1 = fromPos.x;
                    x2 = toPos.x + toPos.width + 4;
                    const cx = (x1 + x2) / 2;
                    pathD = `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`;
                    labelX = cx;
                    labelY = (y1 + y2) / 2 - 8;
                  }

                  return (
                    <g key={tr.id} className="transition-all">
                      <path
                        d={pathD}
                        fill="none"
                        className={
                          isTransitionAvailable
                            ? "stroke-primary stroke-[2.2] transition-colors"
                            : "stroke-slate-300 dark:stroke-slate-700 stroke-[1.5] transition-colors"
                        }
                        markerEnd={
                          isTransitionAvailable
                            ? "url(#arrowhead-active)"
                            : "url(#arrowhead-default)"
                        }
                      />
                      {showLabels && (
                        <g transform={`translate(${labelX}, ${labelY})`}>
                          <rect
                            x={-tr.name.length * 3.3 - 6}
                            y={-9}
                            width={tr.name.length * 6.6 + 12}
                            height={18}
                            rx={4}
                            className={
                              isTransitionAvailable
                                ? "fill-primary text-white"
                                : "fill-white dark:fill-slate-900 stroke-border stroke-[1]"
                            }
                          />
                          <text
                            textAnchor="middle"
                            y={3.5}
                            className={
                              isTransitionAvailable
                                ? "text-[10px] font-bold fill-white select-none pointer-events-none"
                                : "text-[10px] font-medium fill-slate-600 dark:fill-slate-300 select-none pointer-events-none"
                            }
                          >
                            {tr.name}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}
              </svg>

              {/* Render State Nodes */}
              {data?.workflow?.states?.map((st) => {
                const pos = nodePositions[st.id];
                if (!pos) return null;

                const isCurrent = currentState?.id === st.id;
                const isPermittedTarget = availableTargetStates.some(
                  (t) => t.id === st.id,
                );

                return (
                  <div
                    key={st.id}
                    onClick={() => {
                      if (isPermittedTarget) handleExecute(st.slug);
                    }}
                    style={{
                      left: `${pos.x}px`,
                      top: `${pos.y}px`,
                      width: `${pos.width}px`,
                      height: `${pos.height}px`,
                    }}
                    className={`absolute flex items-center justify-between px-3.5 rounded-lg border text-xs font-semibold select-none shadow-xs transition-all ${
                      isCurrent
                        ? "bg-card border-primary ring-2 ring-primary ring-offset-2 dark:ring-offset-slate-950 shadow-md shadow-primary/20 scale-105 z-20"
                        : isPermittedTarget
                          ? "bg-card border-slate-300 dark:border-slate-700 hover:border-primary hover:shadow-md cursor-pointer hover:scale-102 z-10"
                          : "bg-muted/30 border-border/70 text-muted-foreground opacity-80"
                    }`}
                  >
                    {/* Node status label + color marker */}
                    <div className="flex items-center space-x-2 truncate">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: st.color ?? "#94a3b8" }}
                      />
                      <span
                        className={`truncate tracking-wide uppercase ${
                          isCurrent
                            ? "font-bold text-foreground"
                            : "text-foreground"
                        }`}
                      >
                        {st.name}
                      </span>
                    </div>

                    {/* Status badges */}
                    {isCurrent && (
                      <span className="shrink-0 rounded bg-primary px-1.5 py-0.5 text-[9px] font-bold text-white uppercase tracking-wider animate-pulse">
                        Current
                      </span>
                    )}

                    {isPermittedTarget && !isCurrent && (
                      <span className="shrink-0 text-primary group-hover:translate-x-0.5 transition-transform">
                        <ArrowRight className="h-3 w-3" />
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Canvas Bottom-Right Controls: Zoom & Pan */}
          <div className="absolute bottom-4 right-4 flex items-center space-x-2 bg-card/90 backdrop-blur border border-border shadow-md rounded-lg p-1.5 z-30">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => setScale((s) => Math.max(0.5, s - 0.1))}
              title="Zoom out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>

            <div className="flex items-center space-x-1.5 px-1">
              <input
                type="range"
                min="50"
                max="150"
                value={Math.round(scale * 100)}
                onChange={(e) => setScale(Number(e.target.value) / 100)}
                className="w-16 h-1 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <span className="font-mono text-[10px] text-muted-foreground w-8 text-right">
                {Math.round(scale * 100)}%
              </span>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => setScale((s) => Math.min(1.5, s + 0.1))}
              title="Zoom in"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>

            <div className="h-4 w-px bg-border mx-0.5" />

            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={handleResetZoom}
              title="Reset view"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3 border-t border-border bg-card flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            <span>Click any reachable state node or ribbon button to trigger an instant transition.</span>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
