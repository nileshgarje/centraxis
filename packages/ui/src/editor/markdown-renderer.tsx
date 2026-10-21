"use client";

import React, { useState } from "react";
import { marked, type Token, type Tokens } from "marked";
import { common, createLowlight } from "lowlight";
import { Check, Copy, Code2, ExternalLink } from "lucide-react";

// Initialize lowlight with common programming languages
const lowlight = createLowlight(common);

interface MarkdownRendererProps {
  content?: string | null;
  className?: string;
  allowTaskToggle?: boolean;
  onContentChange?: (updatedContent: string) => void;
  emptyMessage?: string;
}

/**
 * Recursive helper to render lowlight HAST syntax tree into native React virtual DOM
 */
function renderHast(node: any, key: string | number): React.ReactNode {
  if (!node) return null;
  if (node.type === "text") {
    return node.value;
  }
  if (node.type === "element") {
    const Tag = node.tagName || "span";
    const className = Array.isArray(node.properties?.className)
      ? node.properties.className.join(" ")
      : node.properties?.className || "";
    return (
      <Tag key={key} className={className}>
        {node.children?.map((child: any, i: number) =>
          renderHast(child, `${key}-${i}`),
        )}
      </Tag>
    );
  }
  if (node.type === "root") {
    return node.children?.map((child: any, i: number) =>
      renderHast(child, `${key}-${i}`),
    );
  }
  return null;
}

/**
 * Syntax-highlighted Code Block with 1-click Copy-to-Clipboard
 */
export function CodeBlockRenderer({
  code,
  language,
}: {
  code: string;
  language?: string;
}) {
  const [copied, setCopied] = useState(false);
  const langKey = (language || "typescript").toLowerCase().trim();

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy code to clipboard:", err);
    }
  };

  let highlightedTree: any = null;
  try {
    if (lowlight.registered(langKey)) {
      highlightedTree = lowlight.highlight(langKey, code);
    } else {
      highlightedTree = lowlight.highlightAuto(code);
    }
  } catch {
    highlightedTree = null;
  }

  return (
    <div className="group relative my-3 overflow-hidden rounded-xl border border-slate-700/80 bg-slate-900 shadow-md">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/80 px-3.5 py-1.5 text-xs text-slate-300">
        <div className="flex items-center space-x-1.5">
          <Code2 className="h-3.5 w-3.5 text-blue-400" />
          <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-300">
            {langKey || "code"}
          </span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copy code to clipboard"
          className="flex items-center space-x-1 rounded-md border border-slate-700 bg-slate-800/90 px-2 py-0.5 text-[11px] font-medium text-slate-200 transition hover:bg-slate-700 hover:text-white"
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

      {/* Code Area with Syntax Highlighting */}
      <pre className="overflow-x-auto p-3.5 font-mono text-xs leading-relaxed text-slate-100">
        <code>
          {highlightedTree ? renderHast(highlightedTree, "root") : code}
        </code>
      </pre>
    </div>
  );
}

/**
 * Highlight Gherkin acceptance criteria keywords
 */
function renderGherkinLine(text: string, key: string | number) {
  const gherkinRegex =
    /^(Scenario|Feature|Background|Given|When|Then|And|But)\b(.*)$/i;
  const match = text.match(gherkinRegex);

  if (match) {
    const keyword = match[1]!.toUpperCase();
    const rest = match[2]!;

    let badgeColor = "bg-blue-100 text-blue-800 border-blue-200";
    if (keyword === "WHEN")
      badgeColor = "bg-purple-100 text-purple-800 border-purple-200";
    if (keyword === "THEN")
      badgeColor = "bg-emerald-100 text-emerald-800 border-emerald-200";
    if (keyword === "AND" || keyword === "BUT")
      badgeColor = "bg-amber-100 text-amber-800 border-amber-200";
    if (keyword === "SCENARIO" || keyword === "FEATURE")
      badgeColor = "bg-indigo-100 text-indigo-900 border-indigo-300 font-bold";

    return (
      <div
        key={key}
        className="my-1 flex items-baseline space-x-2 font-mono text-xs"
      >
        <span
          className={`rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badgeColor}`}
        >
          {match[1]}
        </span>
        <span className="text-slate-800">{rest}</span>
      </div>
    );
  }

  return <span key={key}>{text}</span>;
}

/**
 * Toggle task checkbox at line index in raw markdown
 */
function toggleMarkdownCheckbox(rawText: string, targetIndex: number): string {
  let currentIndex = 0;
  const lines = rawText.split("\n");
  const updated = lines.map((line) => {
    const match = line.match(/^(\s*[-*+]\s+\[)([ xX])(\]\s+.*)$/);
    if (match) {
      if (currentIndex === targetIndex) {
        const isChecked = match[2]!.toLowerCase() === "x";
        const newBox = isChecked ? " " : "x";
        currentIndex++;
        return `${match[1]}${newBox}${match[3]}`;
      }
      currentIndex++;
    }
    return line;
  });
  return updated.join("\n");
}

export function MarkdownRenderer({
  content,
  className = "",
  allowTaskToggle = false,
  onContentChange,
  emptyMessage = "No description provided.",
}: MarkdownRendererProps) {
  if (!content || !content.trim()) {
    return (
      <div className={`text-xs italic text-slate-400 ${className}`}>
        {emptyMessage}
      </div>
    );
  }

  // Parse markdown into structured tokens
  let tokens: Token[] = [];
  try {
    tokens = marked.lexer(content);
  } catch (err) {
    console.error("Markdown lexer error:", err);
    return (
      <div
        className={`whitespace-pre-wrap font-sans text-sm text-slate-800 ${className}`}
      >
        {content}
      </div>
    );
  }

  let taskGlobalIndex = 0;

  const handleTaskCheck = (index: number) => {
    if (!allowTaskToggle || !onContentChange) return;
    const updated = toggleMarkdownCheckbox(content, index);
    onContentChange(updated);
  };

  const renderToken = (token: Token, idx: number): React.ReactNode => {
    switch (token.type) {
      case "heading": {
        const hToken = token as Tokens.Heading;
        const depth = hToken.depth;
        const text = hToken.text;
        if (depth === 1) {
          return (
            <h1
              key={idx}
              className="mt-4 mb-2 text-xl font-bold tracking-tight text-slate-900 border-b border-slate-200 pb-1"
            >
              {text}
            </h1>
          );
        }
        if (depth === 2) {
          return (
            <h2
              key={idx}
              className="mt-3.5 mb-1.5 text-lg font-bold tracking-tight text-slate-900"
            >
              {text}
            </h2>
          );
        }
        if (depth === 3) {
          return (
            <h3
              key={idx}
              className="mt-3 mb-1 text-base font-semibold text-slate-900"
            >
              {text}
            </h3>
          );
        }
        return (
          <h4
            key={idx}
            className="mt-2.5 mb-1 text-sm font-semibold text-slate-800"
          >
            {text}
          </h4>
        );
      }

      case "code": {
        const cToken = token as Tokens.Code;
        return (
          <CodeBlockRenderer
            key={idx}
            code={cToken.text}
            language={cToken.lang}
          />
        );
      }

      case "paragraph": {
        const pToken = token as Tokens.Paragraph;
        // Check if paragraph contains Gherkin scenario syntax
        const rawText = pToken.text;
        const lines = rawText.split("\n");
        const hasGherkin = lines.some((l) =>
          /^(Scenario|Feature|Background|Given|When|Then|And|But)\b/i.test(
            l.trim(),
          ),
        );

        if (hasGherkin) {
          return (
            <div
              key={idx}
              className="my-2 space-y-1 rounded-lg border border-slate-200 bg-slate-50/60 p-2.5"
            >
              {lines.map((l, lineIdx) =>
                renderGherkinLine(l.trim(), `${idx}-${lineIdx}`),
              )}
            </div>
          );
        }

        return (
          <p key={idx} className="my-2 text-sm leading-relaxed text-slate-800">
            {renderInlineTokens(pToken.tokens ?? [])}
          </p>
        );
      }

      case "list": {
        const lToken = token as Tokens.List;
        return (
          <ul
            key={idx}
            className={`my-2 space-y-1.5 ${
              lToken.ordered
                ? "list-decimal pl-5"
                : lToken.items.some((i) => i.task)
                  ? "list-none pl-0"
                  : "list-disc pl-5"
            } text-sm text-slate-800`}
          >
            {lToken.items.map((item, itemIdx) => {
              if (item.task) {
                const currentTaskIdx = taskGlobalIndex++;
                return (
                  <li key={itemIdx} className="flex items-start space-x-2.5">
                    <input
                      type="checkbox"
                      checked={item.checked}
                      disabled={!allowTaskToggle}
                      onChange={() => handleTaskCheck(currentTaskIdx)}
                      className={`mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 ${
                        allowTaskToggle ? "cursor-pointer" : "cursor-default"
                      }`}
                    />
                    <span
                      className={`flex-1 text-sm ${
                        item.checked
                          ? "text-slate-400 line-through"
                          : "text-slate-800"
                      }`}
                    >
                      {item.text}
                    </span>
                  </li>
                );
              }
              return (
                <li key={itemIdx} className="leading-relaxed">
                  {item.text}
                </li>
              );
            })}
          </ul>
        );
      }

      case "blockquote": {
        const bToken = token as Tokens.Blockquote;
        return (
          <blockquote
            key={idx}
            className="my-3 border-l-4 border-blue-500 bg-blue-50/40 py-1.5 pl-3.5 pr-2 italic text-sm text-slate-700 rounded-r"
          >
            {bToken.tokens?.map(renderToken)}
          </blockquote>
        );
      }

      case "table": {
        const tToken = token as Tokens.Table;
        return (
          <div
            key={idx}
            className="my-3 overflow-x-auto rounded-lg border border-slate-200"
          >
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 font-semibold text-slate-700">
                <tr>
                  {tToken.header.map((cell, cIdx) => (
                    <th key={cIdx} className="px-3 py-2">
                      {cell.text}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {tToken.rows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-50/50">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-3 py-2 text-slate-800">
                        {cell.text}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }

      case "hr": {
        return <hr key={idx} className="my-4 border-slate-200" />;
      }

      default:
        return null;
    }
  };

  /**
   * Render inline tokens (bold, italic, code, link)
   */
  const renderInlineTokens = (inlineTokens: Token[]): React.ReactNode => {
    return inlineTokens.map((t, i) => {
      switch (t.type) {
        case "strong":
          return (
            <strong key={i} className="font-semibold text-slate-900">
              {t.text}
            </strong>
          );
        case "em":
          return (
            <em key={i} className="italic">
              {t.text}
            </em>
          );
        case "codespan":
          return (
            <code
              key={i}
              className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[12px] font-medium text-blue-700 border border-slate-200"
            >
              {t.text}
            </code>
          );
        case "del":
          return (
            <del key={i} className="line-through text-slate-400">
              {t.text}
            </del>
          );
        case "link": {
          const l = t as Tokens.Link;
          return (
            <a
              key={i}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-blue-600 underline hover:text-blue-800"
            >
              <span>{l.text}</span>
              <ExternalLink className="ml-0.5 h-3 w-3 inline" />
            </a>
          );
        }
        case "text":
          return <span key={i}>{t.text}</span>;
        default:
          return <span key={i}>{(t as any).text || ""}</span>;
      }
    });
  };

  return (
    <div className={`prose-sm max-w-none text-slate-900 ${className}`}>
      {tokens.map((tok, i) => renderToken(tok, i))}
    </div>
  );
}
