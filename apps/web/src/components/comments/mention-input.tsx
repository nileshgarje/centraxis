"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { AtSign, User, Shield } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage, Badge } from "@centraxis/ui";
import { api } from "~/trpc/react";

interface AssignableUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: string;
  globalRole?: string;
}

interface MentionInputProps {
  value: string;
  onChange: (val: string) => void;
  projectId: string;
  placeholder?: string;
  disabled?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  minHeight?: string;
}

export function MentionInput({
  value,
  onChange,
  projectId,
  placeholder = "Write a comment... (Type @ to mention team members)",
  disabled = false,
  onKeyDown,
  minHeight = "80px",
}: MentionInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: users = [] } = api.project.getAssignableUsers.useQuery(
    { projectId },
    { enabled: !!projectId },
  );

  const [isOpen, setIsOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionIndex, setMentionIndex] = useState(-1);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Filter users based on query
  const filteredUsers = (users as AssignableUser[]).filter((u) => {
    if (!mentionQuery.trim()) return true;
    const q = mentionQuery.toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q)
    );
  });

  const checkMentionTrigger = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursor = textarea.selectionStart;
    const textBefore = textarea.value.slice(0, cursor);

    // Look for @ preceding the cursor without spaces
    const atMatch = textBefore.match(/@([a-zA-Z0-9._-]*)$/);

    if (atMatch && atMatch.index !== undefined) {
      setMentionQuery(atMatch[1] ?? "");
      setMentionIndex(atMatch.index);
      setIsOpen(true);
      setSelectedIndex(0);
    } else {
      setIsOpen(false);
    }
  }, []);

  const handleSelectUser = useCallback(
    (user: AssignableUser) => {
      const textarea = textareaRef.current;
      if (!textarea || mentionIndex === -1) return;

      const displayName = user.name || user.email?.split("@")[0] || "User";
      const before = value.slice(0, mentionIndex);
      const after = value.slice(textarea.selectionStart);

      // Formatted mention token: @[DisplayName](userId)
      const token = `@[${displayName}](${user.id}) `;
      const newValue = before + token + after;

      onChange(newValue);
      setIsOpen(false);

      // Set focus and reposition cursor after inserted mention token
      setTimeout(() => {
        if (textareaRef.current) {
          const nextCursor = before.length + token.length;
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(nextCursor, nextCursor);
        }
      }, 0);
    },
    [value, mentionIndex, onChange],
  );

  const handleKeyDownInternal = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (isOpen && filteredUsers.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredUsers.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(
          (prev) => (prev - 1 + filteredUsers.length) % filteredUsers.length,
        );
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const selected = filteredUsers[selectedIndex];
        if (selected) {
          handleSelectUser(selected);
        }
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setIsOpen(false);
        return;
      }
    }

    if (onKeyDown) {
      onKeyDown(e);
    }
  };

  // Close suggestions if clicked outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full">
      <textarea
        ref={textareaRef}
        value={value}
        disabled={disabled}
        onChange={(e) => {
          onChange(e.target.value);
          checkMentionTrigger();
        }}
        onKeyUp={checkMentionTrigger}
        onClick={checkMentionTrigger}
        onKeyDown={handleKeyDownInternal}
        placeholder={placeholder}
        style={{ minHeight }}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition resize-y"
      />

      {/* Autocomplete Suggestions Popup */}
      {isOpen && filteredUsers.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 left-0 bottom-full mb-1 w-72 max-h-56 overflow-y-auto rounded-xl border border-border bg-popover p-1 shadow-xl animate-in fade-in-0 zoom-in-95"
        >
          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between border-b border-border/50 mb-1">
            <span className="flex items-center gap-1">
              <AtSign className="h-3 w-3 text-primary" />
              <span>Mention Project Member</span>
            </span>
            <span className="text-[9px] font-normal lowercase">↑↓ navigate ↵ select</span>
          </div>

          <div className="space-y-0.5">
            {filteredUsers.map((u, i) => {
              const isSelected = i === selectedIndex;
              const initials =
                u.name
                  ?.split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2) || "U";

              return (
                <button
                  key={u.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelectUser(u);
                  }}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left text-xs transition ${
                    isSelected
                      ? "bg-primary/10 text-primary font-medium"
                      : "hover:bg-muted text-foreground"
                  }`}
                >
                  <Avatar className="h-6 w-6 ring-1 ring-border shrink-0">
                    <AvatarImage src={u.image ?? undefined} />
                    <AvatarFallback className="text-[10px] font-bold bg-muted">
                      {initials}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate font-semibold text-xs">
                        {u.name || "Anonymous Member"}
                      </span>
                      {u.globalRole === "SYSTEM_ADMIN" ? (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 border-purple-300 text-purple-700 bg-purple-50 dark:bg-purple-950/40 dark:text-purple-300">
                          Admin
                        </Badge>
                      ) : (
                        <span className="text-[9px] text-muted-foreground capitalize">
                          {u.role.toLowerCase().replace("_", " ")}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {u.email}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Parses comment markdown body and renders interactive styled @mention pills
 */
export function FormattedCommentBody({ body }: { body: string }) {
  // Regex matches @[User Name](userId)
  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = mentionRegex.exec(body)) !== null) {
    // Text before mention
    if (match.index > lastIndex) {
      parts.push(body.slice(lastIndex, match.index));
    }

    const userName = match[1];
    const userId = match[2];

    parts.push(
      <span
        key={`mention-${match.index}-${userId}`}
        className="inline-flex items-center gap-0.5 rounded bg-primary/10 border border-primary/20 px-1.5 py-0.5 text-xs font-semibold text-primary hover:bg-primary/20 transition cursor-pointer"
        title={`User ID: ${userId}`}
      >
        <span className="text-primary/70">@</span>
        <span>{userName}</span>
      </span>,
    );

    lastIndex = match.index + match[0].length;
  }

  // Trailing text
  if (lastIndex < body.length) {
    parts.push(body.slice(lastIndex));
  }

  return (
    <div className="text-xs text-foreground whitespace-pre-wrap leading-relaxed break-words space-y-1">
      {parts}
    </div>
  );
}
