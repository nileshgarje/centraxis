"use client";

import React, { useState } from "react";
import {
  GitFork,
  CheckCircle2,
  AlertCircle,
  Plus,
  Building2,
  Briefcase,
  Globe,
  Layers,
  ArrowRight,
  Shield,
  Loader2,
  Check,
  RotateCcw,
} from "lucide-react";
import { api } from "~/trpc/react";
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  toast,
} from "@centraxis/ui";

export default function WorkflowsSettingsPage() {
  const utils = api.useUtils();
  const [scopeFilter, setScopeFilter] = useState<string>("ALL");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<any>(null);

  // Form states for creating a workflow
  const [newWorkflowName, setNewWorkflowName] = useState("");
  const [newWorkflowDescription, setNewWorkflowDescription] = useState("");
  const [newWorkflowScope, setNewWorkflowScope] = useState<
    "GLOBAL" | "CLIENT" | "PROJECT"
  >("CLIENT");
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  // Assign dialog state
  const [assignTargetType, setAssignTargetType] = useState<"CLIENT" | "PROJECT">(
    "CLIENT",
  );
  const [assignTargetId, setAssignTargetId] = useState<string>("");

  // Queries
  const { data: workflows, isLoading } = api.workflow.listWorkflows.useQuery();
  const { data: clients } = api.clients.list.useQuery();
  const { data: projects } = api.project.list.useQuery();

  // Mutations
  const createMutation = api.workflow.createWorkflow.useMutation({
    onSuccess: () => {
      setIsCreateOpen(false);
      setNewWorkflowName("");
      setNewWorkflowDescription("");
      void utils.workflow.listWorkflows.invalidate();
      toast.success("Workflow created successfully.");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create workflow.");
    },
  });

  const publishMutation = api.workflow.publishWorkflow.useMutation({
    onSuccess: () => {
      void utils.workflow.listWorkflows.invalidate();
      toast.success("Workflow published and active.");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to publish workflow.");
    },
  });

  const associateMutation = api.workflow.associateWorkflow.useMutation({
    onSuccess: () => {
      setIsAssignOpen(false);
      void utils.workflow.listWorkflows.invalidate();
      toast.success("Workflow association updated.");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to associate workflow.");
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkflowName.trim()) return;

    createMutation.mutate({
      name: newWorkflowName.trim(),
      description: newWorkflowDescription.trim() || undefined,
      scope: newWorkflowScope,
      clientId:
        newWorkflowScope === "CLIENT" ? selectedClientId || undefined : undefined,
      projectId:
        newWorkflowScope === "PROJECT"
          ? selectedProjectId || undefined
          : undefined,
      states: [
        { name: "TO DO", slug: "todo", category: "TODO", color: "#64748b", orderIndex: 0 },
        { name: "IN DEVELOPMENT", slug: "in_development", category: "IN_PROGRESS", color: "#3b82f6", orderIndex: 1 },
        { name: "READY FOR QA", slug: "ready_for_qa", category: "IN_REVIEW", color: "#8b5cf6", orderIndex: 2 },
        { name: "IN QA", slug: "in_qa", category: "IN_REVIEW", color: "#f59e0b", orderIndex: 3 },
        { name: "DONE", slug: "done", category: "DONE", color: "#22c55e", orderIndex: 4 },
      ],
    });
  };

  const handleAssignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkflow || !assignTargetId) return;

    associateMutation.mutate({
      workflowId: selectedWorkflow.id,
      targetType: assignTargetType,
      targetId: assignTargetId,
    });
  };

  const filteredWorkflows = workflows?.filter((wf) => {
    if (scopeFilter === "ALL") return true;
    return wf.scope === scopeFilter;
  });

  return (
    <div className="space-y-6">
      {/* Page Title & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Customizable Workflow Schemes
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Define, publish, and link state-machine workflows across Global, Client, and Project scopes with automatic hierarchical fallback.
          </p>
        </div>

        <Button
          onClick={() => setIsCreateOpen(true)}
          className="gap-1.5 text-xs h-8"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Workflow Scheme</span>
        </Button>
      </div>

      {/* Scope Filter Tabs */}
      <div className="flex items-center space-x-1.5 border-b border-border pb-2.5 text-xs">
        <button
          onClick={() => setScopeFilter("ALL")}
          className={`px-3 py-1.5 rounded-md font-medium transition ${
            scopeFilter === "ALL"
              ? "bg-primary text-white"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          All Schemes ({workflows?.length ?? 0})
        </button>
        <button
          onClick={() => setScopeFilter("GLOBAL")}
          className={`px-3 py-1.5 rounded-md font-medium transition flex items-center gap-1.5 ${
            scopeFilter === "GLOBAL"
              ? "bg-primary text-white"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <Globe className="h-3 w-3" />
          <span>Global Default</span>
        </button>
        <button
          onClick={() => setScopeFilter("CLIENT")}
          className={`px-3 py-1.5 rounded-md font-medium transition flex items-center gap-1.5 ${
            scopeFilter === "CLIENT"
              ? "bg-primary text-white"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <Building2 className="h-3 w-3" />
          <span>Client Scoped</span>
        </button>
        <button
          onClick={() => setScopeFilter("PROJECT")}
          className={`px-3 py-1.5 rounded-md font-medium transition flex items-center gap-1.5 ${
            scopeFilter === "PROJECT"
              ? "bg-primary text-white"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <Briefcase className="h-3 w-3" />
          <span>Project Scoped</span>
        </button>
      </div>

      {/* Workflows List */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center space-x-2 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-sm">Loading workflow schemes...</span>
        </div>
      ) : filteredWorkflows?.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
          <GitFork className="h-8 w-8 mx-auto mb-2 text-muted-foreground/60" />
          <p className="font-semibold text-sm">No workflow schemes found</p>
          <p className="text-xs mt-1">
            Create a custom workflow or adjust your filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filteredWorkflows?.map((wf) => (
            <Card
              key={wf.id}
              className="border-border hover:border-slate-300 dark:hover:border-slate-700 transition"
            >
              <CardHeader className="p-5 pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <CardTitle className="text-sm font-bold text-foreground">
                        {wf.name}
                      </CardTitle>
                      <Badge
                        variant="outline"
                        className="text-[10px] font-mono px-1.5 py-0.2"
                      >
                        v{wf.version}
                      </Badge>
                      {wf.isPublished ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="h-2.5 w-2.5" />
                          Published
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          Draft
                        </span>
                      )}
                    </div>
                    {wf.description && (
                      <CardDescription className="text-xs line-clamp-2">
                        {wf.description}
                      </CardDescription>
                    )}
                  </div>

                  {/* Scope Badge */}
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-semibold tracking-wider uppercase shrink-0 ${
                      wf.scope === "GLOBAL"
                        ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300"
                        : wf.scope === "CLIENT"
                          ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300"
                    }`}
                  >
                    {wf.scope}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-5 pt-0 space-y-4">
                {/* States Flow Pills */}
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground mb-1.5">
                    Defined Lifecycle States ({wf.states?.length ?? 0}):
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {wf.states?.map((st, i) => (
                      <React.Fragment key={st.id}>
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border"
                          style={{
                            borderColor: `${st.color ?? "#94a3b8"}40`,
                            backgroundColor: `${st.color ?? "#94a3b8"}15`,
                            color: st.color ?? "#94a3b8",
                          }}
                        >
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: st.color ?? "#94a3b8" }}
                          />
                          {st.name}
                        </span>
                        {i < wf.states.length - 1 && (
                          <span className="text-[10px] text-muted-foreground/40 font-mono">
                            &rarr;
                          </span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                {/* Scheme Metrics & Associations */}
                <div className="flex items-center justify-between text-xs border-t border-border pt-3">
                  <div className="flex items-center space-x-4 text-muted-foreground text-[11px]">
                    <span>
                      <strong>{wf.transitions?.length ?? 0}</strong> Transitions
                    </span>
                    {wf.client && (
                      <span>
                        Client: <strong>{wf.client.name}</strong>
                      </span>
                    )}
                    {wf.project && (
                      <span>
                        Project: <strong>{wf.project.key}</strong>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    {!wf.isPublished && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs font-semibold"
                        onClick={() =>
                          publishMutation.mutate({ workflowId: wf.id })
                        }
                        disabled={publishMutation.isPending}
                      >
                        Publish
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs font-semibold gap-1"
                      onClick={() => {
                        setSelectedWorkflow(wf);
                        setAssignTargetType(
                          wf.scope === "PROJECT" ? "PROJECT" : "CLIENT",
                        );
                        setIsAssignOpen(true);
                      }}
                    >
                      <span>Assign Scheme</span>
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Workflow Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Workflow Scheme</DialogTitle>
            <DialogDescription className="text-xs">
              Define a new state-machine scheme in draft mode. You can customize states and transitions before publishing.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Workflow Name</Label>
              <Input
                value={newWorkflowName}
                onChange={(e) => setNewWorkflowName(e.target.value)}
                placeholder="e.g. Mobile QA Delivery Workflow"
                required
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Description</Label>
              <Input
                value={newWorkflowDescription}
                onChange={(e) => setNewWorkflowDescription(e.target.value)}
                placeholder="Brief purpose of this lifecycle scheme"
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Scope</Label>
              <Select
                value={newWorkflowScope}
                onValueChange={(val: any) => setNewWorkflowScope(val)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select scope" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GLOBAL">Global (System Wide)</SelectItem>
                  <SelectItem value="CLIENT">Client Scoped</SelectItem>
                  <SelectItem value="PROJECT">Project Scoped</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newWorkflowScope === "CLIENT" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Target Client</Label>
                <Select
                  value={selectedClientId}
                  onValueChange={setSelectedClientId}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Choose client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({c.slug})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {newWorkflowScope === "PROJECT" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Target Project</Label>
                <Select
                  value={selectedProjectId}
                  onValueChange={setSelectedProjectId}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Choose project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({p.key})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createMutation.isPending || !newWorkflowName.trim()}
              >
                {createMutation.isPending ? "Creating..." : "Create Scheme"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Workflow Dialog */}
      <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Workflow Scheme</DialogTitle>
            <DialogDescription className="text-xs">
              Link &ldquo;{selectedWorkflow?.name}&rdquo; to an active Client or Project to override the global default.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAssignSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Target Type</Label>
              <Select
                value={assignTargetType}
                onValueChange={(val: any) => {
                  setAssignTargetType(val);
                  setAssignTargetId("");
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select target type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CLIENT">Client Workspace</SelectItem>
                  <SelectItem value="PROJECT">Specific Project</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {assignTargetType === "CLIENT" ? (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Select Client</Label>
                <Select
                  value={assignTargetId}
                  onValueChange={setAssignTargetId}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Choose client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({c.slug})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Select Project</Label>
                <Select
                  value={assignTargetId}
                  onValueChange={setAssignTargetId}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Choose project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({p.key})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAssignOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={associateMutation.isPending || !assignTargetId}
              >
                {associateMutation.isPending ? "Assigning..." : "Confirm Assignment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
