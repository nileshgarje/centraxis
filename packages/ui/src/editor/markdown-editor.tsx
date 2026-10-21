"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  useEditor,
  EditorContent,
  ReactNodeViewRenderer,
  NodeViewWrapper,
  NodeViewContent,
  type NodeViewProps,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Link from "@tiptap/extension-link";
import { Markdown } from "tiptap-markdown";
import { common, createLowlight } from "lowlight";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  FileCode,
  List,
  CheckSquare,
  Quote,
  Link as LinkIcon,
  Heading1,
  Heading2,
  Heading3,
  Undo,
  Redo,
  Check,
  Copy,
  Eye,
  PenTool,
} from "lucide-react";
import { MarkdownRenderer } from "./markdown-renderer";

const lowlight = createLowlight(common);

const SUPPORTED_LANGUAGES = [
  { value: "typescript", label: "TypeScript" },
  { value: "javascript", label: "JavaScript" },
  { value: "python", label: "Python" },
  { value: "sql", label: "SQL" },
  { value: "bash", label: "Bash" },
  { value: "json", label: "JSON" },
  { value: "yaml", label: "YAML" },
  { value: "html", label: "HTML" },
];

/**
 * Custom TipTap NodeView for Syntax Highlighted Code Blocks
 * Includes language selector dropdown and 1-click Copy button
 */
function CodeBlockView({ node, updateAttributes }: NodeViewProps) {
  const language = node.attrs.language || "typescript";
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const code = node.textContent;
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy code to clipboard:", err);
    }
  };

  return (
    <NodeViewWrapper className="code-block-wrapper relative my-3 overflow-hidden rounded-xl border border-slate-700/80 bg-slate-900 shadow-md">
      {/* Upper Control Bar */}
      <div
        contentEditable={false}
        className="flex items-center justify-between border-b border-slate-800 bg-slate-950/80 px-3 py-1.5 text-xs text-slate-300 select-none"
      >
        <div className="flex items-center space-x-2">
          <FileCode className="h-3.5 w-3.5 text-blue-400" />
          <select
            value={language}
            onChange={(e) => updateAttributes({ language: e.target.value })}
            className="rounded border border-slate-700 bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-200 hover:bg-slate-700/90 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copy code block"
          className="flex items-center space-x-1 rounded border border-slate-700 bg-slate-800/90 px-2 py-0.5 text-[11px] font-medium text-slate-200 transition hover:bg-slate-700 hover:text-white"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3 text-slate-400" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Editable Code Content */}
      <pre className="overflow-x-auto p-3.5 font-mono text-xs leading-relaxed text-slate-100">
        <NodeViewContent />
      </pre>
    </NodeViewWrapper>
  );
}

// Extend CodeBlockLowlight with Custom NodeView and Cmd+Shift+C shortcut
const CustomCodeBlockLowlight = CodeBlockLowlight.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockView);
  },
  addKeyboardShortcuts() {
    return {
      "Mod-Shift-c": () =>
        this.editor.commands.toggleCodeBlock({ language: "typescript" }),
      "Mod-Shift-C": () =>
        this.editor.commands.toggleCodeBlock({ language: "typescript" }),
    };
  },
}).configure({
  lowlight,
  defaultLanguage: "typescript",
});

export interface MarkdownEditorProps {
  value?: string;
  onChange?: (markdown: string) => void;
  placeholder?: string;
  minHeight?: string;
  className?: string;
  disabled?: boolean;
}

export function MarkdownEditor({
  value = "",
  onChange,
  placeholder = "Write in GitHub-flavored Markdown... (supports code blocks, checklists, Gherkin)",
  minHeight = "160px",
  className = "",
  disabled = false,
}: MarkdownEditorProps) {
  const [activeTab, setActiveTab] = useState<"write" | "preview">("write");
  const [isMounted, setIsMounted] = useState(false);
  const lastEmittedValue = useRef(value);

  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      CustomCodeBlockLowlight,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-blue-600 underline cursor-pointer",
        },
      }),
      Markdown.configure({
        html: false,
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: `prose-sm max-w-none focus:outline-none p-3.5 text-slate-900 text-sm leading-relaxed`,
        style: `min-height: ${minHeight};`,
      },
    },
    onUpdate: ({ editor }) => {
      // Extract clean GFM markdown directly
      const markdown = (editor.storage as any).markdown?.getMarkdown() || "";
      lastEmittedValue.current = markdown;
      onChange?.(markdown);
    },
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Synchronize when value changes externally (and differs from internal editor state)
  useEffect(() => {
    if (editor && value !== undefined && value !== lastEmittedValue.current) {
      lastEmittedValue.current = value;
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  // Handle checklist toggles in Preview mode
  const handlePreviewChecklistChange = (updatedMarkdown: string) => {
    lastEmittedValue.current = updatedMarkdown;
    onChange?.(updatedMarkdown);
    if (editor) {
      editor.commands.setContent(updatedMarkdown);
    }
  };

  const setLink = () => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("URL", previousUrl);

    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  if (!isMounted) {
    return (
      <div
        style={{ minHeight }}
        className="w-full rounded-xl border border-slate-300 bg-slate-50/50 p-4 text-xs text-slate-400"
      >
        Loading Markdown Editor...
      </div>
    );
  }

  const currentMarkdown = editor
    ? (editor.storage as any).markdown?.getMarkdown() || ""
    : value;

  return (
    <div
      className={`overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm transition focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 ${className}`}
    >
      {/* Editor Header / Toolbar */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-200 bg-slate-50 px-2 py-1.5 gap-y-1">
        {/* Left: Tab Switcher (Write vs Preview) */}
        <div className="flex items-center space-x-1 rounded-lg border border-slate-200 bg-white p-0.5 shadow-xs">
          <button
            type="button"
            onClick={() => setActiveTab("write")}
            className={`flex items-center space-x-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition ${
              activeTab === "write"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <PenTool className="h-3 w-3" />
            <span>Write</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("preview")}
            className={`flex items-center space-x-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition ${
              activeTab === "preview"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Eye className="h-3 w-3" />
            <span>Preview</span>
          </button>
        </div>

        {/* Right: Rich Action Buttons (active in Write mode) */}
        {activeTab === "write" && editor && (
          <div className="flex flex-wrap items-center space-x-0.5 text-slate-600">
            {/* Headings */}
            <button
              type="button"
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 1 }).run()
              }
              title="Heading 1"
              className={`p-1.5 rounded hover:bg-slate-200/70 transition ${
                editor.isActive("heading", { level: 1 })
                  ? "bg-slate-200 text-blue-600 font-bold"
                  : ""
              }`}
            >
              <Heading1 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 2 }).run()
              }
              title="Heading 2"
              className={`p-1.5 rounded hover:bg-slate-200/70 transition ${
                editor.isActive("heading", { level: 2 })
                  ? "bg-slate-200 text-blue-600 font-bold"
                  : ""
              }`}
            >
              <Heading2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 3 }).run()
              }
              title="Heading 3"
              className={`p-1.5 rounded hover:bg-slate-200/70 transition ${
                editor.isActive("heading", { level: 3 })
                  ? "bg-slate-200 text-blue-600 font-bold"
                  : ""
              }`}
            >
              <Heading3 className="h-3.5 w-3.5" />
            </button>

            <div className="h-4 w-[1px] bg-slate-300 mx-1" />

            {/* Inline Formats */}
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBold().run()}
              title="Bold (Cmd+B)"
              className={`p-1.5 rounded hover:bg-slate-200/70 transition ${
                editor.isActive("bold")
                  ? "bg-slate-200 text-blue-600 font-bold"
                  : ""
              }`}
            >
              <Bold className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              title="Italic (Cmd+I)"
              className={`p-1.5 rounded hover:bg-slate-200/70 transition ${
                editor.isActive("italic") ? "bg-slate-200 text-blue-600" : ""
              }`}
            >
              <Italic className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleStrike().run()}
              title="Strikethrough"
              className={`p-1.5 rounded hover:bg-slate-200/70 transition ${
                editor.isActive("strike") ? "bg-slate-200 text-blue-600" : ""
              }`}
            >
              <Strikethrough className="h-3.5 w-3.5" />
            </button>

            <div className="h-4 w-[1px] bg-slate-300 mx-1" />

            {/* Code & Code Block */}
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleCode().run()}
              title="Inline Code (Cmd+E)"
              className={`p-1.5 rounded hover:bg-slate-200/70 transition ${
                editor.isActive("code")
                  ? "bg-slate-200 text-blue-600 font-mono"
                  : ""
              }`}
            >
              <Code className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() =>
                editor
                  .chain()
                  .focus()
                  .toggleCodeBlock({ language: "typescript" })
                  .run()
              }
              title="Code Block (Cmd+Shift+C)"
              className={`p-1.5 rounded hover:bg-slate-200/70 transition ${
                editor.isActive("codeBlock") ? "bg-slate-200 text-blue-600" : ""
              }`}
            >
              <FileCode className="h-3.5 w-3.5" />
            </button>

            <div className="h-4 w-[1px] bg-slate-300 mx-1" />

            {/* Lists & Tasks */}
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              title="Bullet List"
              className={`p-1.5 rounded hover:bg-slate-200/70 transition ${
                editor.isActive("bulletList")
                  ? "bg-slate-200 text-blue-600"
                  : ""
              }`}
            >
              <List className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleTaskList().run()}
              title="Task Checkbox List"
              className={`p-1.5 rounded hover:bg-slate-200/70 transition ${
                editor.isActive("taskList") ? "bg-slate-200 text-blue-600" : ""
              }`}
            >
              <CheckSquare className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              title="Quote"
              className={`p-1.5 rounded hover:bg-slate-200/70 transition ${
                editor.isActive("blockquote")
                  ? "bg-slate-200 text-blue-600"
                  : ""
              }`}
            >
              <Quote className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={setLink}
              title="Add Link"
              className={`p-1.5 rounded hover:bg-slate-200/70 transition ${
                editor.isActive("link") ? "bg-slate-200 text-blue-600" : ""
              }`}
            >
              <LinkIcon className="h-3.5 w-3.5" />
            </button>

            <div className="h-4 w-[1px] bg-slate-300 mx-1" />

            {/* Undo / Redo */}
            <button
              type="button"
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              title="Undo"
              className="p-1.5 rounded hover:bg-slate-200/70 transition disabled:opacity-30"
            >
              <Undo className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              title="Redo"
              className="p-1.5 rounded hover:bg-slate-200/70 transition disabled:opacity-30"
            >
              <Redo className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Editor Body or Preview Body */}
      <div className="relative bg-white">
        {/* Write View: always kept in DOM to preserve undo history and Prosemirror state */}
        <div className={activeTab === "write" ? "block" : "hidden"}>
          <EditorContent editor={editor} />
        </div>

        {/* Preview View */}
        {activeTab === "preview" && (
          <div
            style={{ minHeight }}
            className="p-3.5 bg-slate-50/30 overflow-y-auto"
          >
            <MarkdownRenderer
              content={currentMarkdown}
              allowTaskToggle={!disabled}
              onContentChange={handlePreviewChecklistChange}
              emptyMessage={placeholder}
            />
          </div>
        )}
      </div>
    </div>
  );
}
