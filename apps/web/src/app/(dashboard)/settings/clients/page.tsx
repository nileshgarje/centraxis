"use client";

import React, { useState } from "react";
import {
  Building2,
  Plus,
  Search,
  Mail,
  FolderGit2,
  Layers,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
} from "lucide-react";
import {
  Button,
  Alert,
  AlertTitle,
  AlertDescription,
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
  toast,
} from "@centraxis/ui";
import { api } from "~/trpc/react";
import { CreateClientDialog } from "~/components/clients/create-client-dialog";

export default function ClientsSettingsPage() {
  const utils = api.useUtils();
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: clients, isLoading } = api.clients.list.useQuery();

  const deleteMutation = api.clients.delete.useMutation({
    onSuccess: async () => {
      toast.success("Client deleted successfully.");
      setActionError(null);
      setClientToDelete(null);
      await Promise.all([
        utils.clients.list.invalidate(),
        utils.project.list.invalidate(),
      ]);
    },
    onError: (err) => {
      const msg = err.message || "Failed to delete client.";
      setActionError(msg);
      toast.error(msg);
      setClientToDelete(null);
    },
  });

  const filteredClients = (clients ?? []).filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.slug.toLowerCase().includes(q) ||
      c.contactEmail?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Clients & Multi-Tenancy
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Segment your organization into dedicated client spaces (Clients
            &rarr; Projects &rarr; Teams &rarr; Sprints)
          </p>
        </div>

        <Button
          onClick={() => setIsAddClientOpen(true)}
          size="sm"
          className="gap-1.5 shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Add Client</span>
        </Button>
      </div>

      {/* Action Error Alert */}
      {actionError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{actionError}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActionError(null)}
              className="h-auto p-0 text-xs font-semibold hover:bg-transparent"
            >
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Search Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full max-w-sm">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search clients by name, slug, or email..."
            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-xs font-medium text-foreground placeholder:text-muted-foreground transition focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        </div>

        <div className="text-xs text-muted-foreground font-medium">
          {filteredClients.length}{" "}
          {filteredClients.length === 1 ? "Client" : "Clients"}
        </div>
      </div>

      {/* Clients Grid */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center space-y-3">
          <Building2 className="h-10 w-10 text-muted-foreground mx-auto opacity-50" />
          <h3 className="text-sm font-semibold text-foreground">
            No clients found
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Create your first client tenant space to isolate projects and team
            allocations for client accounts.
          </p>
          <Button
            onClick={() => setIsAddClientOpen(true)}
            size="sm"
            variant="outline"
            className="gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create Client</span>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredClients.map((client) => {
            const projectCount = client.projects?.length ?? 0;
            const totalWorkItems = client.projects?.reduce(
              (acc, p) => acc + (p._count?.workItems ?? 0),
              0,
            );

            return (
              <div
                key={client.id}
                className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-4 hover:border-border/80 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-bold text-sm">
                      {client.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">
                        {client.name}
                      </h3>
                      <div className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground">
                        <span>slug:</span>
                        <span className="rounded bg-muted px-1 py-0.2 font-semibold">
                          {client.slug}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setClientToDelete({ id: client.id, name: client.name })
                    }
                    title="Delete Client"
                    className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {client.contactEmail && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{client.contactEmail}</span>
                  </div>
                )}

                {/* Multitenant SSO Domains */}
                {client.allowedDomains && client.allowedDomains.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">
                      SSO Domains:
                    </span>
                    {client.allowedDomains.map((dom, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center rounded-md border border-indigo-200 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-950/40 px-2 py-0.5 text-[11px] font-mono font-medium text-indigo-700 dark:text-indigo-300"
                      >
                        @{dom}
                      </span>
                    ))}
                  </div>
                )}

                {/* Associated Projects Section */}
                <div className="space-y-2 border-t border-border/60 pt-3">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                    <span className="uppercase tracking-wider">
                      Allocated Projects ({projectCount})
                    </span>
                    <span>{totalWorkItems} work items</span>
                  </div>

                  {projectCount === 0 ? (
                    <div className="text-xs text-muted-foreground/80 italic">
                      No projects currently assigned to this client.
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {client.projects.map((proj) => (
                        <span
                          key={proj.id}
                          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2 py-1 text-xs font-medium text-foreground"
                        >
                          <FolderGit2 className="h-3 w-3 text-primary" />
                          <span className="font-semibold">{proj.name}</span>
                          <span className="rounded bg-muted px-1 font-mono text-[10px] text-muted-foreground">
                            {proj.key}
                          </span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog
        open={!!clientToDelete}
        onOpenChange={(open) => {
          if (!open) setClientToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client Tenant?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete client{" "}
              <strong className="text-foreground">
                "{clientToDelete?.name}"
              </strong>
              ? Projects assigned to this client will become unassigned internal
              projects.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (clientToDelete) {
                  deleteMutation.mutate({ id: clientToDelete.id });
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Client"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal Dialog */}
      <CreateClientDialog
        isOpen={isAddClientOpen}
        onClose={() => setIsAddClientOpen(false)}
      />
    </div>
  );
}
