"use client";

import React, { use, useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Bookmark,
  CheckSquare,
  Bug,
  Layers,
  Zap,
  User,
  Calendar,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  GitFork,
  ArrowLeft,
  Copy,
  Check,
  LayoutGrid,
  ListTodo,
} from "lucide-react";
import { api } from "~/trpc/react";
import { WorkflowViewerDialog } from "~/components/workflow/workflow-viewer-dialog";
import { WorkItemDrawer } from "~/components/work-items/work-item-drawer";
import { DueDateBadge } from "~/components/work-items/due-date-badge";
import { InlineTitleEditor } from "~/components/work-items/inline-title-editor";
import { AttachmentsSection } from "~/components/work-items/attachments-section";
import {
  MarkdownEditor,
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@centraxis/ui";
import { SubTasksSection } from "~/components/work-items/sub-tasks-section";
import { CommentSection } from "~/components/comments/comment-section";

const ITEM_TYPES = [
  {
    type: "STORY" as const,
    label: "Story",
    icon: Bookmark,
    color:
      "text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-900",
  },
  {
    type: "TASK" as const,
    label: "Task",
    icon: CheckSquare,
    color:
      "text-slate-600 bg-slate-100 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  },
  {
    type: "BUG" as const,
    label: "Bug",
    icon: Bug,
    color:
      "text-red-600 bg-red-50 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-900",
  },
  {
    type: "FEATURE" as const,
    label: "Feature",
    icon: Layers,
    color:
      "text-indigo-600 bg-indigo-50 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-400 dark:border-indigo-900",
  },
  {
    type: "EPIC" as const,
    label: "Epic",
    icon: Zap,
    color:
      "text-purple-600 bg-purple-50 border-purple-200 dark:bg-purple-950 dark:text-purple-400 dark:border-purple-900",
  },
];

const STATUS_OPTIONS = [
  {
    value: "BACKLOG",
    label: "Backlog",
    color:
      "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300",
  },
  {
    value: "TODO",
    label: "To Do",
    color:
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400",
  },
  {
    value: "IN_PROGRESS",
    label: "In Progress",
    color:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400",
  },
  {
    value: "IN_REVIEW",
    label: "In Review",
    color:
      "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-400",
  },
  {
    value: "DONE",
    label: "Done",
    color:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400",
  },
];

const PRIORITY_OPTIONS = [
  { value: "LOW", label: "Low", color: "text-slate-500" },
  { value: "MEDIUM", label: "Medium", color: "text-blue-500" },
  { value: "HIGH", label: "High", color: "text-amber-500" },
  { value: "URGENT", label: "Urgent", color: "text-red-500" },
];

const STORY_POINTS_OPTIONS = [0, 1, 2, 3, 5, 8, 13, 21];

interface WorkItemPageProps {
  params: Promise<{ clientSlug: string; projectKey: string }>;
}

export default function WorkItemFullPage({ params }: WorkItemPageProps) {
  const router = useRouter();
  const { clientSlug, projectKey } = use(params);

  const isItemKey = /-[0-9]+$/.test(projectKey);
  const baseProjectKey = isItemKey
    ? projectKey.slice(0, projectKey.lastIndexOf("-"))
    : projectKey;

  // If this route is accessed with just the project key (e.g. /client-apex/CTX), redirect to board
  useEffect(() => {
    if (!isItemKey) {
      router.replace(`/${clientSlug}/${projectKey}/board`);
    }
  }, [isItemKey, clientSlug, projectKey, router]);

  const utils = api.useUtils();

  const {
    data: item,
    isLoading,
    error,
  } = api.backlog.getItemByKey.useQuery(
    { clientSlug, key: projectKey },
    { enabled: isItemKey, retry: false },
  );

  const { data: assignableUsers } = api.project.getAssignableUsers.useQuery(
    { projectId: item?.projectId ?? "" },
    { enabled: !!item?.projectId },
  );

  const { data: sprints } = api.sprint.list.useQuery(
    { projectId: item?.projectId ?? "" },
    { enabled: !!item?.projectId },
  );

  const { data: workflowData } = api.workflow.getAvailableTransitions.useQuery(
    { workItemId: item?.id ?? "" },
    { enabled: !!item?.id },
  );

  const { data: session } = useSession();

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [acceptanceCriteria, setAcceptanceCriteria] = useState("");
  const [status, setStatus] = useState("TODO");
  const [priority, setPriority] = useState("MEDIUM");
  const [storyPoints, setStoryPoints] = useState<number | null>(null);
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [sprintId, setSprintId] = useState("");
  const [type, setType] = useState<
    "STORY" | "TASK" | "BUG" | "FEATURE" | "EPIC"
  >("STORY");

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isWorkflowModalOpen, setIsWorkflowModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [drawerSubTaskId, setDrawerSubTaskId] = useState<string | null>(null);

  const prevItemIdRef = useRef<string | null>(null);

  // Synchronize state when work item data loads
  useEffect(() => {
    if (item) {
      const isNewItem = prevItemIdRef.current !== item.id;
      prevItemIdRef.current = item.id;

      setStatus(item.status);
      setPriority(item.priority);
      setStoryPoints(item.storyPoints ?? null);
      setAssigneeId(item.assigneeId || "");
      setDueDate(
        item.dueDate ? new Date(item.dueDate).toISOString().split("T")[0]! : "",
      );
      setSprintId(item.sprintId || "");
      setType(item.type as any);
      setErrorMessage(null);

      // Only re-initialize title, description, and acceptanceCriteria if switching to a new work item!
      // This prevents background refetches from overwriting active typing.
      if (isNewItem) {
        setTitle(item.title);
        setDescription(item.description || "");
        setAcceptanceCriteria(item.acceptanceCriteria || "");
      }
    }
  }, [item]);

  // Workflow allowed transition filtering
  const allowedStatusOptions = useMemo(() => {
    if (!workflowData?.availableTransitions) {
      return STATUS_OPTIONS;
    }
    const targetStatusSet = new Set<string>();
    if (status) targetStatusSet.add(status);

    for (const tr of workflowData.availableTransitions) {
      const cat = tr.toState.category;
      if (cat === "TODO") targetStatusSet.add("TODO");
      else if (cat === "IN_PROGRESS") targetStatusSet.add("IN_PROGRESS");
      else if (cat === "IN_REVIEW") targetStatusSet.add("IN_REVIEW");
      else if (cat === "DONE") targetStatusSet.add("DONE");
      else if (cat === "START") targetStatusSet.add("BACKLOG");
    }

    return STATUS_OPTIONS.filter((s) => targetStatusSet.has(s.value));
  }, [workflowData, status]);

  const updateMutation = api.backlog.updateItem.useMutation({
    onMutate: () => {
      setIsSaving(true);
      setErrorMessage(null);
    },
    onSuccess: (updatedItem, variables) => {
      setIsSaving(false);
      setSaveSuccess(true);
      setErrorMessage(null);
      setTimeout(() => setSaveSuccess(false), 2000);

      // Optimistically update tRPC item cache with the mutation result
      if (item?.id && updatedItem) {
        utils.backlog.getItem.setData({ id: item.id }, (old) => {
          if (!old) return old;
          return {
            ...old,
            ...updatedItem,
          };
        });
        utils.backlog.getItemByKey.setData(
          { clientSlug, key: projectKey },
          (old) => {
            if (!old) return old;
            return {
              ...old,
              ...updatedItem,
            };
          },
        );
      }

      const isContentOnlyUpdate =
        (variables.description !== undefined ||
          variables.acceptanceCriteria !== undefined) &&
        variables.status === undefined &&
        variables.type === undefined &&
        variables.assigneeId === undefined &&
        variables.sprintId === undefined &&
        variables.parentId === undefined &&
        variables.storyPoints === undefined &&
        variables.dueDate === undefined &&
        variables.title === undefined;

      if (!isContentOnlyUpdate) {
        void utils.backlog.getItemByKey.invalidate({
          clientSlug,
          key: projectKey,
        });
        if (item?.id) {
          void utils.backlog.getItem.invalidate({ id: item.id });
        }
      }
      void utils.backlog.getItems.invalidate();
      void utils.backlog.getTree.invalidate();
      void utils.board.getBoardData.invalidate();
    },
    onError: (err) => {
      setIsSaving(false);
      setErrorMessage(err.message || "Failed to update work item.");
      if (item) setStatus(item.status);
    },
  });

  const handleSaveField = (fields: {
    title?: string;
    description?: string | null;
    acceptanceCriteria?: string | null;
    status?: any;
    priority?: any;
    storyPoints?: number | null;
    assigneeId?: string | null;
    dueDate?: Date | null;
    sprintId?: string | null;
    type?: any;
  }) => {
    if (!item?.id) return;
    updateMutation.mutate({
      id: item.id,
      ...fields,
    });
  };

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  if (!isItemKey) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center space-y-3 bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-xs font-semibold text-muted-foreground">
          Loading work item [{projectKey.toUpperCase()}]...
        </p>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-2xl border border-destructive/20 bg-card p-8 text-center shadow-lg">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mb-4">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h1 className="text-lg font-bold text-foreground">
            Work Item Not Found
          </h1>
          <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
            Work item{" "}
            <span className="font-mono font-bold text-primary">
              [{projectKey.toUpperCase()}]
            </span>{" "}
            under client workspace{" "}
            <span className="font-semibold text-foreground font-mono">
              "{clientSlug}"
            </span>{" "}
            does not exist or you do not have permission to view it.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Button
              onClick={() =>
                router.push(`/${clientSlug}/${baseProjectKey}/board`)
              }
              className="w-full gap-2 text-xs"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Sprint Board</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      {/* Top Header & Breadcrumbs Bar */}
      <div className="border-b border-border bg-card/50 backdrop-blur-xs sticky top-0 z-20 px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Breadcrumb Hierarchy */}
          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            <Link
              href={`/${clientSlug}`}
              className="hover:text-foreground font-medium transition"
            >
              {item.project.client?.name || clientSlug}
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
            <Link
              href={`/${clientSlug}/${baseProjectKey}/board`}
              className="hover:text-foreground font-medium transition"
            >
              {item.project.name} ({baseProjectKey})
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
            <span className="font-mono font-bold text-primary">{item.key}</span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            {/* Auto-save status feedback */}
            <div className="flex items-center space-x-1.5 text-xs text-muted-foreground mr-2">
              {isSaving && (
                <>
                  <Loader2 className="h-3 w-3 animate-spin text-primary" />
                  <span className="text-[11px]">Saving...</span>
                </>
              )}
              {saveSuccess && (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium text-[11px]">
                    Saved
                  </span>
                </>
              )}
            </div>

            {/* Back to Board */}
            <Button
              variant="outline"
              size="sm"
              asChild
              className="h-8 text-xs font-medium gap-1.5"
            >
              <Link href={`/${clientSlug}/${baseProjectKey}/board`}>
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>Board</span>
              </Link>
            </Button>

            {/* Back to Backlog */}
            <Button
              variant="outline"
              size="sm"
              asChild
              className="h-8 text-xs font-medium gap-1.5"
            >
              <Link href={`/${clientSlug}/${baseProjectKey}/backlog`}>
                <ListTodo className="h-3.5 w-3.5" />
                <span>Backlog</span>
              </Link>
            </Button>

            {/* View Workflow Diagram */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsWorkflowModalOpen(true)}
              className="h-8 text-xs font-medium gap-1.5 border-dashed hover:border-primary hover:text-primary transition"
              title="Open task state-machine workflow viewer"
            >
              <GitFork className="h-3.5 w-3.5 text-primary" />
              <span>Workflow</span>
            </Button>

            {/* Copy Link */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="h-8 text-xs font-medium gap-1.5"
              title="Copy issue link to clipboard"
            >
              {copiedLink ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-emerald-600">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy Link</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Quality Gate / Validation Error Banner */}
        {errorMessage && (
          <div className="mb-6 flex items-center justify-between rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-xs text-destructive font-medium animate-in fade-in-0">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-xs hover:underline font-semibold ml-2 cursor-pointer shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Content Area (8 Cols) */}
          <div className="lg:col-span-8 space-y-8">
            {/* Title & Key Header */}
            <div>
              <div className="flex items-center space-x-2.5 mb-3">
                <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                  {item.key}
                </span>

                <Select
                  value={type}
                  onValueChange={(val) => {
                    const newType = val as any;
                    setType(newType);
                    handleSaveField({ type: newType });
                  }}
                >
                  <SelectTrigger className="h-7 w-auto gap-1.5 text-xs font-semibold">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ITEM_TYPES.map((t) => {
                      const Icon = t.icon;
                      return (
                        <SelectItem key={t.type} value={t.type}>
                          <div className="flex items-center space-x-2">
                            <Icon className="h-3.5 w-3.5" />
                            <span>{t.label}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>

                {dueDate && <DueDateBadge dueDate={dueDate} status={status} />}

                {item.parent && (
                  <Link
                    href={`/${clientSlug}/${item.parent.key}`}
                    className="flex items-center space-x-1 text-xs text-muted-foreground hover:text-primary transition"
                  >
                    <span>
                      {item.type === "TASK" || item.type === "BUG"
                        ? "Subtask of"
                        : "Child of"}
                    </span>
                    <span className="font-mono font-medium underline">
                      {item.parent.key}
                    </span>
                  </Link>
                )}
              </div>

              {/* Title Inline Editor */}
              <InlineTitleEditor
                value={title}
                onSave={(newTitle) => {
                  setTitle(newTitle);
                  handleSaveField({ title: newTitle });
                }}
                placeholder="Issue title"
                className="text-2xl font-bold"
              />
            </div>

            {/* Description Section */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Description
              </Label>
              <div className="rounded-lg border border-border bg-card shadow-2xs">
                <MarkdownEditor
                  key={`desc-${item?.id}`}
                  value={description}
                  onChange={setDescription}
                  onSave={(val) =>
                    handleSaveField({ description: val.trim() || null })
                  }
                  uploadExtraData={{ workItemId: item?.id }}
                  onAttachmentUploaded={() => {
                    if (item?.id) {
                      void utils.workItem.getAttachments.invalidate({
                        workItemId: item.id,
                      });
                    }
                  }}
                  placeholder="Add a detailed description... (Markdown supported)"
                  minHeight="180px"
                />
              </div>
            </div>

            {/* Acceptance Criteria Section */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Acceptance Criteria (INVEST)
                </Label>
              </div>
              <div className="rounded-lg border border-border bg-card shadow-2xs">
                <MarkdownEditor
                  key={`ac-${item?.id}`}
                  value={acceptanceCriteria}
                  onChange={setAcceptanceCriteria}
                  onSave={(val) =>
                    handleSaveField({ acceptanceCriteria: val.trim() || null })
                  }
                  uploadExtraData={{ workItemId: item?.id }}
                  onAttachmentUploaded={() => {
                    if (item?.id) {
                      void utils.workItem.getAttachments.invalidate({
                        workItemId: item.id,
                      });
                    }
                  }}
                  placeholder="Given [context] When [action] Then [outcome]..."
                  minHeight="140px"
                />
              </div>
            </div>

            {/* Attachments Section */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-2xs">
              <AttachmentsSection
                workItemId={item.id}
                projectId={item.projectId}
              />
            </div>

            {/* Sub-tasks Section */}
            {!(
              item.parent &&
              (item.type === "TASK" || item.type === "BUG")
            ) && (
              <div className="rounded-xl border border-border bg-card p-6 shadow-2xs">
                <SubTasksSection
                  parentId={item.id}
                  projectId={item.projectId}
                  onOpenSubTask={(subTaskId) => setDrawerSubTaskId(subTaskId)}
                />
              </div>
            )}

            {/* Comments & Discussion Feed */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-2xs">
              <CommentSection workItemId={item.id} projectId={item.projectId} />
            </div>
          </div>

          {/* Right Sidebar Meta Area (4 Cols) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Status Card (Enforced by Workflow Engine) */}
            <Card className="border-border shadow-2xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Select
                  value={status}
                  onValueChange={(val) => {
                    setStatus(val);
                    handleSaveField({ status: val as any });
                  }}
                >
                  <SelectTrigger className="w-full text-xs font-semibold uppercase tracking-wider">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {allowedStatusOptions.map((st) => (
                      <SelectItem key={st.value} value={st.value}>
                        {st.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {dueDate && <DueDateBadge dueDate={dueDate} status={status} />}

                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Allowed transitions are governed by the active{" "}
                  <button
                    type="button"
                    onClick={() => setIsWorkflowModalOpen(true)}
                    className="text-primary underline font-medium hover:text-primary/80"
                  >
                    workflow scheme
                  </button>
                  .
                </p>
              </CardContent>
            </Card>

            {/* Attributes Card */}
            <Card className="border-border shadow-2xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Attributes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Assignee */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium text-muted-foreground flex items-center space-x-1.5">
                      <User className="h-3.5 w-3.5" />
                      <span>Assignee</span>
                    </Label>
                    {session?.user?.id && assigneeId !== session.user.id && (
                      <button
                        type="button"
                        onClick={() => {
                          setAssigneeId(session.user.id);
                          handleSaveField({ assigneeId: session.user.id });
                        }}
                        className="text-[11px] text-primary hover:underline font-semibold"
                        title="Assign to me"
                      >
                        Assign to me
                      </button>
                    )}
                  </div>
                  <Select
                    value={assigneeId || "unassigned"}
                    onValueChange={(val) => {
                      const newAssignee = val === "unassigned" ? null : val;
                      setAssigneeId(newAssignee || "");
                      handleSaveField({ assigneeId: newAssignee });
                    }}
                  >
                    <SelectTrigger className="w-full text-xs">
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {assignableUsers?.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          <div className="flex items-center space-x-2">
                            <span className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                              {u.name?.charAt(0) || "U"}
                            </span>
                            <span>{u.name || u.email}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Priority */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Priority
                  </Label>
                  <Select
                    value={priority}
                    onValueChange={(val) => {
                      setPriority(val);
                      handleSaveField({ priority: val as any });
                    }}
                  >
                    <SelectTrigger className="w-full text-xs font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITY_OPTIONS.map((po) => (
                        <SelectItem key={po.value} value={po.value}>
                          <span className={po.color}>{po.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Story Points */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Story Points
                  </Label>
                  <Select
                    value={storyPoints !== null ? String(storyPoints) : "none"}
                    onValueChange={(val) => {
                      const pts = val === "none" ? null : Number(val);
                      setStoryPoints(pts);
                      handleSaveField({ storyPoints: pts });
                    }}
                  >
                    <SelectTrigger className="w-full text-xs">
                      <SelectValue placeholder="Estimate points" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No estimate</SelectItem>
                      {STORY_POINTS_OPTIONS.map((pt) => (
                        <SelectItem key={pt} value={String(pt)}>
                          {pt} {pt === 1 ? "point" : "points"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Sprint */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground flex items-center space-x-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Sprint</span>
                  </Label>
                  <Select
                    value={sprintId || "backlog"}
                    onValueChange={(val) => {
                      const newSprint = val === "backlog" ? null : val;
                      setSprintId(newSprint || "");
                      handleSaveField({ sprintId: newSprint });
                    }}
                  >
                    <SelectTrigger className="w-full text-xs">
                      <SelectValue placeholder="Select Sprint" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="backlog">
                        Backlog (No Sprint)
                      </SelectItem>
                      {sprints?.map((sp) => (
                        <SelectItem key={sp.id} value={sp.id}>
                          {sp.name} {sp.status === "ACTIVE" ? "(Active)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Due Date */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium text-muted-foreground flex items-center space-x-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>Due Date</span>
                    </Label>
                    {dueDate && (
                      <button
                        type="button"
                        onClick={() => {
                          setDueDate("");
                          handleSaveField({ dueDate: null });
                        }}
                        className="text-[11px] text-muted-foreground hover:text-destructive font-medium"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <input
                    type="date"
                    value={dueDate ? dueDate.split("T")[0] : ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDueDate(val);
                      handleSaveField({ dueDate: val ? new Date(val) : null });
                    }}
                    className="w-full h-8 text-xs font-medium rounded-md border border-input bg-background px-3 py-1 shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
                  />
                  {dueDate && (
                    <div className="pt-0.5">
                      <DueDateBadge dueDate={dueDate} status={status} />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* People & Dates Card */}
            <Card className="border-border shadow-2xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  History & People
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Reporter</span>
                  <div className="flex items-center space-x-1.5 font-medium text-foreground">
                    <span className="h-4 w-4 rounded-full bg-muted flex items-center justify-center text-[9px] font-bold">
                      {item.reporter?.name?.charAt(0) || "U"}
                    </span>
                    <span>
                      {item.reporter?.name || item.reporter?.email || "System"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span className="text-foreground">
                    {new Date(item.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Updated</span>
                  <span className="text-foreground">
                    {new Date(item.updatedAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Workflow Diagram Viewer Modal */}
      {item && (
        <WorkflowViewerDialog
          open={isWorkflowModalOpen}
          onOpenChange={setIsWorkflowModalOpen}
          workItemId={item.id}
          itemKey={item.key}
          onTransitionSuccess={() => {
            void utils.backlog.getItemByKey.invalidate({
              clientSlug,
              key: projectKey,
            });
            void utils.backlog.getItem.invalidate({ id: item.id });
            void utils.backlog.getItems.invalidate();
            void utils.board.getBoardData.invalidate();
          }}
        />
      )}

      {/* Sub-Task Drawer when opened in edit mode */}
      {drawerSubTaskId && item && (
        <WorkItemDrawer
          itemId={drawerSubTaskId}
          isOpen={!!drawerSubTaskId}
          onClose={() => setDrawerSubTaskId(null)}
          projectId={item.projectId}
        />
      )}
    </div>
  );
}
