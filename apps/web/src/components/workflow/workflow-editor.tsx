"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { Button, Badge, Input, toast } from "@centraxis/ui";
import {
  ArrowLeft,
  CheckCircle2,
  GitFork,
  Plus,
  Save,
  Trash2,
  Sliders,
  RotateCcw,
  Shield,
  Loader2,
  Globe,
  Building2,
  Briefcase,
  Layers,
} from "lucide-react";

import { api } from "~/trpc/react";
import { StateNode, type StateNodeData } from "./state-node";
import { AddStateDialog, type StateFormData } from "./add-state-dialog";
import {
  EditTransitionDialog,
  type TransitionFormData,
} from "./edit-transition-dialog";

interface WorkflowEditorProps {
  workflowId: string;
  backHref?: string;
}

const PRESET_COORDINATES: Record<string, { x: number; y: number }> = {
  todo: { x: 120, y: 80 },
  in_development: { x: 120, y: 220 },
  ready_for_qa: { x: 120, y: 360 },
  in_qa: { x: 120, y: 500 },
  reopened: { x: 480, y: 290 },
  resolved: { x: 480, y: 500 },
  done: { x: 480, y: 80 },
};

const nodeTypes = {
  stateNode: StateNode as any,
};

export function WorkflowEditor({
  workflowId,
  backHref = "/settings/workflows",
}: WorkflowEditorProps) {
  const router = useRouter();
  const utils = api.useUtils();

  const [workflowName, setWorkflowName] = useState("");
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);

  // Dialog states
  const [isStateDialogOpen, setIsStateDialogOpen] = useState(false);
  const [editingState, setEditingState] = useState<StateFormData | null>(null);

  const [isTransitionDialogOpen, setIsTransitionDialogOpen] = useState(false);
  const [pendingConnection, setPendingConnection] = useState<{
    sourceId: string | null;
    targetId: string;
    sourceName?: string;
    targetName?: string;
  } | null>(null);

  // Queries
  const {
    data: workflow,
    isLoading,
    error,
  } = api.workflow.getWorkflowForEdit.useQuery(
    { workflowId },
    { enabled: !!workflowId },
  );

  // Mutations
  const upsertStateMutation = api.workflow.upsertState.useMutation({
    onSuccess: () => {
      setIsStateDialogOpen(false);
      setEditingState(null);
      void utils.workflow.getWorkflowForEdit.invalidate({ workflowId });
      toast.success("State node saved.");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to save state.");
    },
  });

  const deleteStateMutation = api.workflow.deleteState.useMutation({
    onSuccess: () => {
      void utils.workflow.getWorkflowForEdit.invalidate({ workflowId });
      toast.success("State node removed.");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete state.");
    },
  });

  const createTransitionMutation = api.workflow.createTransition.useMutation({
    onSuccess: () => {
      setIsTransitionDialogOpen(false);
      setPendingConnection(null);
      void utils.workflow.getWorkflowForEdit.invalidate({ workflowId });
      toast.success("Transition connected.");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to connect transition.");
    },
  });

  const deleteTransitionMutation = api.workflow.deleteTransition.useMutation({
    onSuccess: () => {
      setSelectedEdge(null);
      void utils.workflow.getWorkflowForEdit.invalidate({ workflowId });
      toast.success("Transition deleted.");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete transition.");
    },
  });

  const publishMutation = api.workflow.publishWorkflow.useMutation({
    onSuccess: () => {
      void utils.workflow.getWorkflowForEdit.invalidate({ workflowId });
      void utils.workflow.listWorkflows.invalidate();
      toast.success("Workflow published successfully!");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to publish workflow.");
    },
  });

  const updateMetaMutation = api.workflow.updateWorkflowMeta.useMutation({
    onSuccess: () => {
      void utils.workflow.getWorkflowForEdit.invalidate({ workflowId });
      toast.success("Workflow title saved.");
    },
  });

  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Initialize or synchronize nodes & edges from backend
  useEffect(() => {
    if (!workflow) return;

    setWorkflowName(workflow.name);

    // Build Nodes
    const flowNodes: Node[] = workflow.states.map((st, idx) => {
      const preset = PRESET_COORDINATES[st.slug];
      const position = preset || {
        x: (idx % 2) * 360 + 120,
        y: Math.floor(idx / 2) * 140 + 80,
      };

      return {
        id: st.id,
        type: "stateNode",
        position,
        data: {
          id: st.id,
          name: st.name,
          slug: st.slug,
          category: st.category,
          color: st.color,
          onEdit: (data: StateFormData) => {
            setEditingState(data);
            setIsStateDialogOpen(true);
          },
          onDelete: (id: string) => {
            if (
              confirm(
                `Delete state "${st.name}"? Connected transitions will also be removed.`,
              )
            ) {
              deleteStateMutation.mutate({ stateId: id });
            }
          },
        },
      };
    });

    // Build Edges
    const flowEdges: Edge[] = workflow.transitions
      .filter((tr) => tr.fromStateId !== null)
      .map((tr) => ({
        id: tr.id,
        source: tr.fromStateId!,
        target: tr.toStateId,
        label: tr.name,
        type: "smoothstep",
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 16,
          height: 16,
          color: "#3b82f6",
        },
        style: {
          stroke: "#3b82f6",
          strokeWidth: 2,
        },
        labelStyle: {
          fill: "#1e293b",
          fontWeight: 600,
          fontSize: 10,
        },
        labelBgStyle: {
          fill: "#ffffff",
          fillOpacity: 0.95,
        },
        labelBgPadding: [6, 3] as [number, number],
        labelBgBorderRadius: 4,
      }));

    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [workflow]);

  // Handle line connection between nodes
  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      if (connection.source === connection.target) {
        toast.error("Self-transitions are not permitted.");
        return;
      }

      const sourceNode = workflow?.states.find(
        (s) => s.id === connection.source,
      );
      const targetNode = workflow?.states.find(
        (s) => s.id === connection.target,
      );

      setPendingConnection({
        sourceId: connection.source,
        targetId: connection.target,
        sourceName: sourceNode?.name,
        targetName: targetNode?.name,
      });
      setIsTransitionDialogOpen(true);
    },
    [workflow],
  );

  const handleStateSubmit = (data: StateFormData) => {
    upsertStateMutation.mutate({
      workflowId,
      stateId: data.id,
      name: data.name,
      slug: data.slug,
      category: data.category,
      color: data.color,
    });
  };

  const handleTransitionSubmit = (data: TransitionFormData) => {
    createTransitionMutation.mutate({
      workflowId,
      name: data.name,
      fromStateId: data.fromStateId,
      toStateId: data.toStateId,
      requiredRole: data.requiredRole,
    });
  };

  const handleNameBlur = () => {
    if (workflowName.trim() && workflowName !== workflow?.name) {
      updateMetaMutation.mutate({
        workflowId,
        name: workflowName.trim(),
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center space-x-2 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="text-sm font-medium">
          Loading visual workflow canvas...
        </span>
      </div>
    );
  }

  if (error || !workflow) {
    return (
      <div className="p-8 text-center text-destructive">
        <p className="font-semibold text-base">Failed to load workflow</p>
        <p className="text-xs text-muted-foreground mt-1">
          {error?.message || "Workflow not found"}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(backHref)}
          className="mt-4"
        >
          Return to Workflows
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -m-6 overflow-hidden bg-background">
      {/* Top Control Toolbar */}
      <div className="flex items-center justify-between border-b border-border bg-card px-6 py-3 shrink-0 shadow-xs z-30">
        {/* Left: Back + Title + Scope Badge */}
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(backHref)}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            title="Back to workflows"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center space-x-2.5">
            <Input
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              onBlur={handleNameBlur}
              placeholder="Workflow scheme name..."
              className="h-8 max-w-[280px] font-bold text-sm tracking-tight border-transparent hover:border-border focus:border-primary transition"
            />

            <Badge
              variant="outline"
              className={`text-[10px] font-semibold tracking-wider uppercase shrink-0 ${
                workflow.scope === "GLOBAL"
                  ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300"
                  : workflow.scope === "CLIENT"
                    ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300"
              }`}
            >
              {workflow.scope}
            </Badge>

            <span className="font-mono text-xs text-muted-foreground">
              v{workflow.version}
            </span>

            {workflow.isPublished ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="h-2.5 w-2.5" />
                Published
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400 border border-amber-500/20">
                Draft Mode
              </span>
            )}
          </div>
        </div>

        {/* Center: Add Status & Actions */}
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setEditingState(null);
              setIsStateDialogOpen(true);
            }}
            className="h-8 text-xs font-semibold gap-1.5 border-dashed hover:border-primary hover:text-primary transition"
          >
            <Plus className="h-3.5 w-3.5 text-primary" />
            <span>Add Status</span>
          </Button>

          {/* Delete Transition when edge is selected */}
          {selectedEdge && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                if (confirm(`Delete transition "${selectedEdge.label}"?`)) {
                  deleteTransitionMutation.mutate({
                    transitionId: selectedEdge.id,
                  });
                }
              }}
              disabled={deleteTransitionMutation.isPending}
              className="h-8 text-xs font-semibold gap-1.5"
            >
              <Trash2 className="h-3 w-3" />
              <span>Delete Transition</span>
            </Button>
          )}
        </div>

        {/* Right: Discard Draft & Publish */}
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(backHref)}
            className="h-8 text-xs text-muted-foreground hover:text-foreground"
          >
            Cancel
          </Button>

          <Button
            size="sm"
            onClick={() => publishMutation.mutate({ workflowId })}
            disabled={
              publishMutation.isPending || (workflow.states?.length ?? 0) < 2
            }
            className="h-8 text-xs font-semibold gap-1.5"
          >
            {publishMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            <span>Publish Workflow</span>
          </Button>
        </div>
      </div>

      {/* Main React Flow Canvas */}
      <div className="flex-1 w-full h-full relative bg-slate-50 dark:bg-slate-950">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          onEdgeClick={(_, edge) => setSelectedEdge(edge)}
          onPaneClick={() => setSelectedEdge(null)}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.3}
          maxZoom={1.8}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#94a3b8" gap={20} size={1} />
          <Controls
            position="bottom-right"
            className="!bg-card !border-border !shadow-md"
          />
          <MiniMap
            position="bottom-left"
            className="!bg-card !border-border !shadow-sm !rounded-lg overflow-hidden"
            nodeColor={(n) => (n.data?.color as string) || "#3b82f6"}
          />
        </ReactFlow>

        {/* Floating Instruction Banner */}
        <div className="absolute top-4 left-6 pointer-events-none bg-card/90 backdrop-blur border border-border px-3.5 py-2 rounded-lg shadow-sm text-xs text-muted-foreground flex items-center space-x-2 z-10">
          <span className="font-semibold text-foreground">Canvas Hint:</span>
          <span>
            Drag between node handles to create transitions. Click any
            transition line to select and delete.
          </span>
        </div>
      </div>

      {/* Add / Edit State Dialog */}
      <AddStateDialog
        open={isStateDialogOpen}
        onOpenChange={setIsStateDialogOpen}
        workflowId={workflowId}
        initialData={editingState}
        onSubmit={handleStateSubmit}
        isLoading={upsertStateMutation.isPending}
      />

      {/* Transition Connection Dialog */}
      {pendingConnection && (
        <EditTransitionDialog
          open={isTransitionDialogOpen}
          onOpenChange={setIsTransitionDialogOpen}
          sourceStateId={pendingConnection.sourceId}
          targetStateId={pendingConnection.targetId}
          sourceStateName={pendingConnection.sourceName}
          targetStateName={pendingConnection.targetName}
          onSubmit={handleTransitionSubmit}
          isLoading={createTransitionMutation.isPending}
        />
      )}
    </div>
  );
}
