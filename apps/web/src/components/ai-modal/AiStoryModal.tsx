"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Check,
  ListTodo,
  FileCheck,
  ArrowRight,
  AlertCircle,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
  Alert,
  AlertDescription,
} from "@centraxis/ui";
import { api } from "~/trpc/react";
import type { UserStoryOutput } from "@centraxis/ai";

interface AiStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

const EXAMPLE_PROMPTS = [
  "Export active sprint burndown chart to PDF with team velocity forecast",
  "Automate Slack webhook notifications when PR passes QA code review",
  "Implement drag-and-drop column reordering on team backlog grooming view",
];

export function AiStoryModal({
  isOpen,
  onClose,
  projectId,
}: AiStoryModalProps) {
  const utils = api.useUtils();
  const [prompt, setPrompt] = useState("");
  const [generatedStory, setGeneratedStory] = useState<UserStoryOutput | null>(
    null,
  );
  const [modelUsed, setModelUsed] = useState<string>("gpt-4o");
  const [commitSuccess, setCommitSuccess] = useState(false);

  // Keyboard shortcut listener (Cmd+J / Ctrl+J)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        if (isOpen) {
          onClose();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const generateMutation = api.ai.generateStoryFromPrompt.useMutation({
    onSuccess: (data) => {
      setGeneratedStory(data.story);
      setModelUsed(data.modelUsed);
    },
  });

  const commitMutation = api.ai.commitStoryToBacklog.useMutation({
    onSuccess: () => {
      setCommitSuccess(true);
      void utils.board.getBoardData.invalidate();
      void utils.backlog.getItems.invalidate();
      setTimeout(() => {
        setCommitSuccess(false);
        setGeneratedStory(null);
        setPrompt("");
        onClose();
      }, 1200);
    },
  });

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || prompt.length < 5) return;
    generateMutation.mutate({
      prompt: prompt.trim(),
      projectId,
    });
  };

  const handleCommit = () => {
    if (!generatedStory) return;
    commitMutation.mutate({
      projectId,
      rawPrompt: prompt,
      storyData: generatedStory,
      modelUsed,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden sm:max-w-3xl bg-background border-border">
        {/* Modal Header */}
        <DialogHeader className="border-b border-border bg-muted/40 px-6 py-4">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-xs">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="text-left">
              <DialogTitle className="text-base font-bold text-foreground">
                Centraxis AI Story Agent
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Generate INVEST-compliant user stories with Gherkin acceptance
                criteria
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Modal Body */}
        <div className="max-h-[70vh] overflow-y-auto p-6 space-y-6">
          {/* Prompt Form */}
          <form onSubmit={handleGenerate} className="space-y-3">
            <label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
              Feature Concept / User Need
            </label>
            <div className="flex space-x-2">
              <Input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. Export sprint burndown chart to PDF with velocity forecast..."
                className="flex-1 text-sm"
                autoFocus
              />
              <Button
                type="submit"
                disabled={generateMutation.isPending || prompt.length < 5}
                className="gap-1.5 shrink-0"
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Generate</span>
                  </>
                )}
              </Button>
            </div>

            {/* Quick Inspiration Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] font-medium text-muted-foreground mr-1">
                Try:
              </span>
              {EXAMPLE_PROMPTS.map((example, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPrompt(example)}
                  className="rounded-md border border-border bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground hover:border-primary/50 hover:bg-primary/5 hover:text-foreground transition"
                >
                  {example.slice(0, 42)}...
                </button>
              ))}
            </div>
          </form>

          {/* Error Message */}
          {generateMutation.isError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {generateMutation.error.message}
              </AlertDescription>
            </Alert>
          )}

          {/* INVEST Story Preview */}
          {generatedStory && (
            <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-5 shadow-xs animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center space-x-2">
                  <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                    INVEST Story Preview
                  </span>
                  <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                    Model: {modelUsed}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="rounded-full bg-primary px-3 py-0.5 text-xs font-bold text-primary-foreground shadow-xs">
                    {generatedStory.estimatedPoints} Story Points
                  </span>
                </div>
              </div>

              {/* Title & User Story */}
              <div>
                <h4 className="text-base font-bold text-foreground">
                  {generatedStory.title}
                </h4>
                <div className="mt-2 rounded-lg border-l-4 border-primary bg-background p-3 text-sm italic text-foreground shadow-xs">
                  "{generatedStory.story}"
                </div>
              </div>

              {/* Estimation Rationale */}
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-700 dark:text-amber-300">
                <span className="font-semibold">Estimation Rationale: </span>
                {generatedStory.estimationRationale}
              </div>

              {/* Gherkin Criteria */}
              <div>
                <div className="flex items-center space-x-1.5 text-xs font-bold text-foreground mb-2">
                  <FileCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Acceptance Criteria (Gherkin Scenarios)</span>
                </div>
                <div className="space-y-1.5">
                  {generatedStory.acceptanceCriteria.map(
                    (scenario: string, i: number) => (
                      <div
                        key={i}
                        className="rounded-lg border border-border bg-background p-2.5 text-xs font-mono text-foreground"
                      >
                        {scenario}
                      </div>
                    ),
                  )}
                </div>
              </div>

              {/* Subtasks */}
              <div>
                <div className="flex items-center space-x-1.5 text-xs font-bold text-foreground mb-2">
                  <ListTodo className="h-3.5 w-3.5 text-primary" />
                  <span>
                    Technical Subtasks Breakdown (
                    {generatedStory.subTasks.length})
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {generatedStory.subTasks.map((task: string, i: number) => (
                    <div
                      key={i}
                      className="flex items-center space-x-2 rounded-lg border border-border bg-background p-2.5 text-xs text-foreground"
                    >
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                        {i + 1}
                      </span>
                      <span className="truncate">{task}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {generatedStory && (
          <DialogFooter className="flex items-center justify-between border-t border-border bg-muted/30 px-6 py-3">
            <p className="text-xs text-muted-foreground">
              Will insert 1 parent Story and {generatedStory.subTasks.length}{" "}
              child technical tasks into backlog.
            </p>

            <Button
              onClick={handleCommit}
              disabled={commitMutation.isPending || commitSuccess}
              variant={commitSuccess ? "default" : "default"}
              size="sm"
              className={
                commitSuccess
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                  : "gap-1.5"
              }
            >
              {commitMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Committing...</span>
                </>
              ) : commitSuccess ? (
                <>
                  <Check className="h-4 w-4" />
                  <span>Committed to Backlog!</span>
                </>
              ) : (
                <>
                  <span>Commit to Backlog</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
