"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  X,
  Check,
  ChevronRight,
  ListTodo,
  FileCheck,
  Zap,
  ArrowRight,
  AlertCircle,
  Loader2,
} from "lucide-react";
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

  // Keyboard shortcut listener (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Trigger open
        }
      } else if (e.key === "Escape" && isOpen) {
        onClose();
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-6 py-4">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Centraxis AI Story Agent
              </h3>
              <p className="text-xs text-slate-500">
                Generate INVEST-compliant user stories with Gherkin acceptance criteria
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="max-h-[75vh] overflow-y-auto p-6 space-y-6">
          {/* Prompt Form */}
          <form onSubmit={handleGenerate} className="space-y-3">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Feature Concept / User Need
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. Export sprint burndown chart to PDF with velocity forecast..."
                className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                autoFocus
              />
              <button
                type="submit"
                disabled={generateMutation.isPending || prompt.length < 5}
                className="flex items-center space-x-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/20 transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
              </button>
            </div>

            {/* Quick Inspiration Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] font-medium text-slate-400 mr-1">
                Try:
              </span>
              {EXAMPLE_PROMPTS.map((example, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPrompt(example)}
                  className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600 hover:border-blue-300 hover:bg-blue-50/50 hover:text-blue-700 transition"
                >
                  {example.slice(0, 42)}...
                </button>
              ))}
            </div>
          </form>

          {/* Error Message */}
          {generateMutation.isError && (
            <div className="flex items-center space-x-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
              <span>{generateMutation.error.message}</span>
            </div>
          )}

          {/* INVEST Story Preview */}
          {generatedStory && (
            <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-5 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center space-x-2">
                  <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-800">
                    INVEST Story Preview
                  </span>
                  <span className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-mono text-slate-600">
                    Model: {modelUsed}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="rounded-full bg-blue-600 px-3 py-0.5 text-xs font-bold text-white shadow-sm">
                    {generatedStory.estimatedPoints} Story Points
                  </span>
                </div>
              </div>

              {/* Title & User Story */}
              <div>
                <h4 className="text-base font-bold text-slate-900">
                  {generatedStory.title}
                </h4>
                <div className="mt-2 rounded-lg border-l-4 border-blue-600 bg-white p-3 text-sm italic text-slate-700 shadow-xs">
                  "{generatedStory.story}"
                </div>
              </div>

              {/* Estimation Rationale */}
              <div className="rounded-lg bg-amber-50/60 border border-amber-200/80 p-3 text-xs text-amber-900">
                <span className="font-semibold">Estimation Rationale: </span>
                {generatedStory.estimationRationale}
              </div>

              {/* Gherkin Criteria */}
              <div>
                <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800 mb-2">
                  <FileCheck className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Acceptance Criteria (Gherkin Scenarios)</span>
                </div>
                <div className="space-y-1.5">
                  {generatedStory.acceptanceCriteria.map((scenario: string, i: number) => (
                    <div
                      key={i}
                      className="rounded-lg border border-slate-200 bg-white p-2.5 text-xs font-mono text-slate-700"
                    >
                      {scenario}
                    </div>
                  ))}
                </div>
              </div>

              {/* Subtasks */}
              <div>
                <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800 mb-2">
                  <ListTodo className="h-3.5 w-3.5 text-blue-600" />
                  <span>Technical Subtasks Breakdown ({generatedStory.subTasks.length})</span>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {generatedStory.subTasks.map((task: string, i: number) => (
                    <div
                      key={i}
                      className="flex items-center space-x-2 rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-800"
                    >
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600">
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
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4">
            <p className="text-xs text-slate-500">
              Will insert 1 parent Story and {generatedStory.subTasks.length} child technical tasks into backlog.
            </p>

            <button
              onClick={handleCommit}
              disabled={commitMutation.isPending || commitSuccess}
              className={`flex items-center space-x-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-md transition ${
                commitSuccess
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-blue-600 hover:bg-blue-700 shadow-blue-500/20"
              } disabled:opacity-50`}
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
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
