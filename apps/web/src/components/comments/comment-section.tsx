"use client";

import React, { useState } from "react";
import { MessageSquare, Send, Trash2, Loader2, Sparkles } from "lucide-react";
import { useSession } from "next-auth/react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Badge,
} from "@centraxis/ui";
import { api } from "~/trpc/react";
import { MentionInput, FormattedCommentBody } from "./mention-input";

interface CommentSectionProps {
  workItemId: string;
  projectId: string;
}

function formatRelativeTime(dateInput: Date | string): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Just now";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  return date.toLocaleDateString();
}

export function CommentSection({ workItemId, projectId }: CommentSectionProps) {
  const { data: session } = useSession();
  const utils = api.useUtils();

  const [commentText, setCommentText] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: comments = [], isLoading } = api.comment.listByWorkItem.useQuery(
    { workItemId },
    { enabled: !!workItemId },
  );

  const createMutation = api.comment.create.useMutation({
    onSuccess: async () => {
      setCommentText("");
      setErrorMessage(null);
      await Promise.all([
        utils.comment.listByWorkItem.invalidate({ workItemId }),
        utils.notification.getUnreadCount.invalidate(),
        utils.notification.listRecent.invalidate(),
      ]);
    },
    onError: (err) => {
      setErrorMessage(err.message || "Failed to post comment.");
    },
  });

  const deleteMutation = api.comment.delete.useMutation({
    onSuccess: async () => {
      await utils.comment.listByWorkItem.invalidate({ workItemId });
    },
  });

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!commentText.trim() || createMutation.isPending) return;

    createMutation.mutate({
      workItemId,
      body: commentText.trim(),
    });
  };

  return (
    <div className="space-y-4 pt-4 border-t border-border">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-xs font-semibold text-foreground uppercase tracking-wider">
          <MessageSquare className="h-4 w-4 text-primary" />
          <span>Discussion & Comments ({comments.length})</span>
        </div>
        <span className="text-[11px] text-muted-foreground">
          Type <span className="font-mono text-primary font-bold">@</span> to mention team members
        </span>
      </div>

      {/* Comment Input Card */}
      <div className="rounded-xl border border-border bg-card p-3 shadow-xs space-y-2">
        <MentionInput
          value={commentText}
          onChange={setCommentText}
          projectId={projectId}
          placeholder="Write a comment... (Type @ to mention team members)"
          disabled={createMutation.isPending}
          minHeight="75px"
        />

        {errorMessage && (
          <p className="text-[11px] text-destructive font-medium">{errorMessage}</p>
        )}

        <div className="flex items-center justify-between pt-1">
          <p className="text-[10px] text-muted-foreground">
            Supports rich markdown & tagged team notifications
          </p>
          <Button
            size="sm"
            onClick={() => handleSubmit()}
            disabled={!commentText.trim() || createMutation.isPending}
            className="gap-1.5 h-8 text-xs font-semibold"
          >
            {createMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            <span>Post Comment</span>
          </Button>
        </div>
      </div>

      {/* Comments Stream */}
      {isLoading ? (
        <div className="py-6 flex items-center justify-center text-xs text-muted-foreground gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span>Loading discussion...</span>
        </div>
      ) : comments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/80 p-6 text-center bg-muted/10">
          <MessageSquare className="h-6 w-6 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-xs font-medium text-foreground">No comments yet</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Start the conversation by posting an update or mentioning a teammate with @.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => {
            const isAuthor = session?.user?.id === comment.authorId;
            const canDelete =
              isAuthor ||
              session?.user?.globalRole === "SYSTEM_ADMIN" ||
              session?.user?.role === "ORG_ADMIN";

            const authorInitials =
              comment.author.name
                ?.split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2) || "U";

            return (
              <div
                key={comment.id}
                className="group relative rounded-xl border border-border bg-card p-3 shadow-2xs hover:border-border/80 transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <Avatar className="h-7 w-7 ring-1 ring-border shrink-0">
                      <AvatarImage src={comment.author.image ?? undefined} />
                      <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                        {authorInitials}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-foreground">
                        {comment.author.name || "Team Member"}
                      </span>
                      {comment.author.globalRole === "SYSTEM_ADMIN" ? (
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1 py-0 border-purple-300 text-purple-700 bg-purple-50 dark:bg-purple-950/40 dark:text-purple-300"
                        >
                          Admin
                        </Badge>
                      ) : null}
                      <span className="text-[10px] text-muted-foreground">
                        • {formatRelativeTime(comment.createdAt)}
                      </span>
                    </div>
                  </div>

                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => deleteMutation.mutate({ commentId: comment.id })}
                      disabled={deleteMutation.isPending}
                      className="opacity-0 group-hover:opacity-100 transition p-1 text-muted-foreground hover:text-destructive rounded hover:bg-destructive/10"
                      title="Delete comment"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="mt-2.5 pl-9">
                  <FormattedCommentBody body={comment.body} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
