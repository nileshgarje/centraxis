"use client";

import React, { useState, useEffect, useRef } from "react";
import { Pencil } from "lucide-react";

export interface InlineTitleEditorProps {
  value: string;
  onSave: (newTitle: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  "data-testid"?: string;
}

export function InlineTitleEditor({
  value,
  onSave,
  placeholder = "Issue title...",
  className = "",
  disabled = false,
  "data-testid": dataTestId = "inline-title-editor",
}: InlineTitleEditorProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [title, setTitle] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const initialValueRef = useRef(value);

  const isCancelledRef = useRef(false);

  // Synchronize when value changes externally while not focused
  useEffect(() => {
    if (!isFocused) {
      setTitle(value);
      initialValueRef.current = value;
    }
  }, [value, isFocused]);

  const handleCommit = () => {
    if (isCancelledRef.current) {
      isCancelledRef.current = false;
      return;
    }
    const trimmed = title.trim();
    setIsFocused(false);
    if (trimmed && trimmed !== initialValueRef.current) {
      initialValueRef.current = trimmed;
      onSave(trimmed);
    } else {
      setTitle(initialValueRef.current);
    }
  };

  const handleCancel = () => {
    isCancelledRef.current = true;
    setTitle(initialValueRef.current);
    setIsFocused(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (e.key === "Enter") {
      e.preventDefault();
      handleCommit();
      inputRef.current?.blur();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  return (
    <div className="w-full space-y-1.5" data-testid={dataTestId}>
      <div className="group relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          value={title}
          disabled={disabled}
          onChange={(e) => setTitle(e.target.value)}
          onFocus={(e) => {
            if (!disabled) {
              setIsFocused(true);
              initialValueRef.current = value;
              e.target.select();
            }
          }}
          onBlur={handleCommit}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          data-testid="inline-title-input"
          className={`w-full text-xl font-bold tracking-tight text-foreground rounded-md px-2 -mx-2 py-1 transition-all duration-150 ${
            isFocused
              ? "bg-background dark:bg-slate-900 ring-2 ring-primary ring-offset-1 border border-primary/80 shadow-xs focus:outline-none"
              : "bg-transparent border border-transparent hover:border-border/60 hover:bg-muted/50 cursor-pointer focus:outline-none"
          } ${className}`}
        />
        {!isFocused && !disabled && (
          <span
            onClick={() => inputRef.current?.focus()}
            className="absolute right-0 opacity-0 group-hover:opacity-70 transition-opacity text-muted-foreground pointer-events-none p-1"
          >
            <Pencil className="h-3.5 w-3.5" />
          </span>
        )}
      </div>

      {/* Helper Badge: visible only while actively focused/editing */}
      {isFocused && !disabled && (
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground select-none animate-in fade-in duration-150 pl-0.5">
          <span className="font-semibold text-foreground/80 bg-muted px-1.5 py-0.5 rounded border border-border/60">
            Enter ↵
          </span>
          <span>to save</span>
          <span>•</span>
          <span className="font-semibold text-foreground/80 bg-muted px-1.5 py-0.5 rounded border border-border/60">
            Esc
          </span>
          <span>to discard</span>
        </div>
      )}
    </div>
  );
}
