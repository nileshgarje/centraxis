"use client";

import React, { useState, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  Paperclip,
  FileText,
  FileArchive,
  File,
  Image as ImageIcon,
  Download,
  Trash2,
  Plus,
  X,
  UploadCloud,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { api } from "~/trpc/react";
import { Button } from "@centraxis/ui";

export interface AttachmentsSectionProps {
  workItemId: string;
  projectId?: string;
  disabled?: boolean;
}

function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export function AttachmentsSection({
  workItemId,
  disabled = false,
}: AttachmentsSectionProps) {
  const { data: session } = useSession();
  const utils = api.useUtils();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [previewImage, setPreviewImage] = useState<{
    url: string;
    filename: string;
  } | null>(null);

  const { data: attachments = [], isLoading } =
    api.workItem.getAttachments.useQuery(
      { workItemId },
      { enabled: !!workItemId },
    );

  const deleteMutation = api.workItem.deleteAttachment.useMutation({
    onMutate: async ({ id }) => {
      await utils.workItem.getAttachments.cancel({ workItemId });
      const prev = utils.workItem.getAttachments.getData({ workItemId });
      utils.workItem.getAttachments.setData({ workItemId }, (old) => {
        if (!old) return [];
        return old.filter((a) => a.id !== id);
      });
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) {
        utils.workItem.getAttachments.setData({ workItemId }, context.prev);
      }
    },
    onSettled: () => {
      void utils.workItem.getAttachments.invalidate({ workItemId });
      void utils.backlog.getItem.invalidate({ id: workItemId });
    },
  });

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("workItemId", workItemId);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to upload attachment");
      }

      await utils.workItem.getAttachments.invalidate({ workItemId });
      void utils.backlog.getItem.invalidate({ id: workItemId });
    } catch (err: any) {
      console.error("Upload failed:", err);
      alert(err?.message || "Attachment upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    for (const file of Array.from(files)) {
      void uploadFile(file);
    }
  };

  const isImage = (mimeType: string) => mimeType.startsWith("image/");
  const isArchive = (mimeType: string) =>
    mimeType.includes("zip") || mimeType.includes("tar") || mimeType.includes("rar");
  const isDoc = (mimeType: string) =>
    mimeType.includes("pdf") ||
    mimeType.includes("text") ||
    mimeType.includes("document");

  const getFileIcon = (mimeType: string) => {
    if (isImage(mimeType)) return <ImageIcon className="h-4 w-4 text-blue-500" />;
    if (isArchive(mimeType))
      return <FileArchive className="h-4 w-4 text-amber-500" />;
    if (isDoc(mimeType))
      return <FileText className="h-4 w-4 text-emerald-500" />;
    return <File className="h-4 w-4 text-slate-500" />;
  };

  return (
    <div className="space-y-3" data-testid="attachments-section">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Paperclip className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
            Attachments ({attachments.length})
          </h4>
        </div>
        {!disabled && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="h-7 text-xs gap-1.5 px-2.5 font-semibold"
            data-testid="attach-file-btn"
          >
            {isUploading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            <span>Attach File</span>
          </Button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {/* Dropzone Container */}
      {!disabled && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              setIsDragging(false);
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            handleFiles(e.dataTransfer.files);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`flex items-center justify-center gap-2 rounded-xl border border-dashed py-3 px-4 text-xs cursor-pointer transition-all ${
            isDragging
              ? "border-primary bg-primary/10 text-primary scale-[1.01]"
              : "border-border hover:border-primary/50 hover:bg-muted/40 text-muted-foreground"
          }`}
        >
          <UploadCloud className="h-4 w-4 shrink-0" />
          <span>
            {isUploading
              ? "Uploading attachment..."
              : "Drop files here to attach or paste screenshots anywhere"}
          </span>
        </div>
      )}

      {/* Loading state */}
      {isLoading && attachments.length === 0 && (
        <div className="flex items-center justify-center p-4 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
          <span>Loading attachments...</span>
        </div>
      )}

      {/* Attachments Grid */}
      {attachments.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
          {attachments.map((att) => {
            const isImg = isImage(att.mimeType);
            const canDelete =
              !disabled &&
              (session?.user?.id === att.uploaderId ||
                session?.user?.globalRole === "SYSTEM_ADMIN" ||
                session?.user?.role === "ORG_ADMIN");

            return (
              <div
                key={att.id}
                className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xs hover:shadow-xs transition"
                data-testid={`attachment-card-${att.id}`}
              >
                {/* Thumbnail / Header Area */}
                {isImg ? (
                  <div
                    onClick={() =>
                      setPreviewImage({ url: att.fileUrl, filename: att.filename })
                    }
                    className="relative h-28 w-full bg-slate-100 dark:bg-slate-900 cursor-pointer overflow-hidden flex items-center justify-center"
                  >
                    <img
                      src={att.fileUrl}
                      alt={att.filename}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 pointer-events-none">
                      <span className="text-white text-xs font-semibold bg-black/60 px-2 py-1 rounded-md flex items-center gap-1">
                        <ExternalLink className="h-3 w-3" />
                        <span>Preview</span>
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-20 bg-muted/30 border-b border-border">
                    <div className="p-3 bg-background rounded-xl border border-border shadow-2xs">
                      {getFileIcon(att.mimeType)}
                    </div>
                  </div>
                )}

                {/* Details Footer */}
                <div className="p-2.5 flex items-center justify-between gap-1.5 min-w-0 bg-card">
                  <div className="min-w-0 flex-1">
                    <p
                      className="text-xs font-semibold text-foreground truncate"
                      title={att.filename}
                    >
                      {att.filename}
                    </p>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                      <span>{formatBytes(att.fileSize)}</span>
                      <span>•</span>
                      <span>
                        {new Date(att.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <a
                      href={att.fileUrl}
                      download={att.filename}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition"
                      title="Download file"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </a>
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => deleteMutation.mutate({ id: att.id })}
                        disabled={deleteMutation.isPending}
                        className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition"
                        title="Delete attachment"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox / Preview Modal */}
      {previewImage && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl max-h-[90vh] flex flex-col bg-background rounded-2xl overflow-hidden shadow-2xl border border-border"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
              <span className="text-xs font-bold text-foreground truncate max-w-md">
                {previewImage.filename}
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={previewImage.url}
                  download={previewImage.filename}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition text-xs font-semibold flex items-center gap-1"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewImage(null)}
                  aria-label="Close preview"
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Modal Image Body */}
            <div className="p-4 overflow-auto flex items-center justify-center bg-muted/20">
              <img
                src={previewImage.url}
                alt={previewImage.filename}
                className="max-h-[75vh] w-auto max-w-full rounded-lg object-contain shadow-md"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
