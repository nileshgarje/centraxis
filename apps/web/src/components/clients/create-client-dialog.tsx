"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Building2,
  Mail,
  Link2,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { api } from "~/trpc/react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
  Label,
} from "@centraxis/ui";

interface CreateClientDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onClientCreated?: (clientId: string) => void;
}

function generateClientSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function CreateClientDialog({
  isOpen,
  onClose,
  onClientCreated,
}: CreateClientDialogProps) {
  const utils = api.useUtils();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const [contactEmail, setContactEmail] = useState("");
  const [logo, setLogo] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName("");
      setSlug("");
      setIsSlugManuallyEdited(false);
      setContactEmail("");
      setLogo("");
      setErrorMessage(null);
    }
  }, [isOpen]);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!isSlugManuallyEdited) {
      setSlug(generateClientSlug(val));
    }
  };

  const createMutation = api.clients.create.useMutation({
    onSuccess: async (created) => {
      await Promise.all([
        utils.clients.list.invalidate(),
        utils.project.list.invalidate(),
      ]);
      onClose();
      if (onClientCreated && created?.id) {
        onClientCreated(created.id);
      }
    },
    onError: (err) => {
      setErrorMessage(err.message || "Failed to create client tenant.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage("Client name is required.");
      return;
    }

    const cleanSlug = slug.trim() ? slug.trim().toLowerCase() : generateClientSlug(name);

    setErrorMessage(null);
    createMutation.mutate({
      name: name.trim(),
      slug: cleanSlug || undefined,
      contactEmail: contactEmail.trim() || undefined,
      logo: logo.trim() || undefined,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        {/* Header */}
        <div className="border-b border-border px-6 py-4 bg-muted/20">
          <DialogHeader className="flex flex-row items-center space-x-3 space-y-0 text-left">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Add Client Tenant
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Segment enterprise projects into dedicated client spaces
              </DialogDescription>
            </div>
          </DialogHeader>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mx-6 mt-4 flex items-center space-x-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3.5 py-2.5 text-xs text-destructive font-medium">
            <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 pt-4">
          {/* Client Name */}
          <div className="space-y-1.5">
            <Label htmlFor="client-name" className="text-xs font-semibold text-foreground">
              Client / Account Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="client-name"
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Acme Corporation"
              required
              autoFocus
              className="h-9 text-xs"
            />
          </div>

          {/* Client Slug */}
          <div className="space-y-1.5">
            <Label htmlFor="client-slug" className="text-xs font-semibold text-foreground">
              Client Slug <span className="text-destructive">*</span>
            </Label>
            <Input
              id="client-slug"
              type="text"
              value={slug}
              onChange={(e) => {
                setIsSlugManuallyEdited(true);
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
              }}
              placeholder="e.g. acme-corporation"
              required
              className="h-9 font-mono text-xs"
            />
            <p className="text-[11px] text-muted-foreground">
              Unique URL identifier for this client tenant (lowercase letters, numbers, and hyphens).
            </p>
          </div>

          {/* Contact Email */}
          <div className="space-y-1.5">
            <Label htmlFor="client-email" className="text-xs font-semibold text-foreground">
              Primary Client Contact Email
            </Label>
            <div className="relative">
              <Input
                id="client-email"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="e.g. stakeholder@acme.com"
                className="h-9 pl-9 text-xs"
              />
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>

          {/* Logo URL */}
          <div className="space-y-1.5">
            <Label htmlFor="client-logo" className="text-xs font-semibold text-foreground">
              Client Logo URL
            </Label>
            <div className="relative">
              <Input
                id="client-logo"
                type="text"
                value={logo}
                onChange={(e) => setLogo(e.target.value)}
                placeholder="https://example.com/logo.png"
                className="h-9 pl-9 text-xs"
              />
              <Link2 className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>

          {/* Actions */}
          <DialogFooter className="pt-3 border-t border-border flex items-center justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={createMutation.isPending || !name.trim() || slug.trim().length < 2}
              className="gap-1.5"
            >
              {createMutation.isPending && (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              )}
              <span>Create Client</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
