"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Badge,
  Checkbox,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  toast,
} from "@centraxis/ui";
import { Shield, Building, FolderKanban, Loader2 } from "lucide-react";
import { api } from "~/trpc/react";

interface MemberWithAccess {
  id: string;
  name: string | null;
  email: string | null;
  image?: string | null;
  role: string;
  globalRole: "SYSTEM_ADMIN" | "USER";
  clientMemberships: Array<{
    clientId: string;
    role: "CLIENT_ADMIN" | "CLIENT_MEMBER";
    client: { id: string; name: string; slug: string };
  }>;
  projectMemberships: Array<{
    projectId: string;
    role: "PROJECT_LEAD" | "MEMBER" | "VIEWER";
    project: { id: string; name: string; key: string };
  }>;
}

interface EditUserAccessDialogProps {
  member: MemberWithAccess | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditUserAccessDialog({
  member,
  isOpen,
  onClose,
  onSuccess,
}: EditUserAccessDialogProps) {
  const [globalRole, setGlobalRole] = useState<"SYSTEM_ADMIN" | "USER">("USER");
  const [clientRoles, setClientRoles] = useState<
    Record<string, "CLIENT_ADMIN" | "CLIENT_MEMBER">
  >({});
  const [projectRoles, setProjectRoles] = useState<
    Record<string, "PROJECT_LEAD" | "MEMBER" | "VIEWER">
  >({});

  const { data: clients, isLoading: clientsLoading } =
    api.clients.list.useQuery(undefined, {
      enabled: isOpen,
    });
  const { data: projects, isLoading: projectsLoading } =
    api.project.list.useQuery(undefined, {
      enabled: isOpen,
    });

  useEffect(() => {
    if (member && isOpen) {
      setGlobalRole(member.globalRole ?? "USER");

      const initialClients: Record<string, "CLIENT_ADMIN" | "CLIENT_MEMBER"> =
        {};
      member.clientMemberships?.forEach((cm) => {
        initialClients[cm.clientId] = cm.role;
      });
      setClientRoles(initialClients);

      const initialProjects: Record<
        string,
        "PROJECT_LEAD" | "MEMBER" | "VIEWER"
      > = {};
      member.projectMemberships?.forEach((pm) => {
        initialProjects[pm.projectId] = pm.role;
      });
      setProjectRoles(initialProjects);
    }
  }, [member, isOpen]);

  const updateMutation = api.org.updateUserAccessMatrix.useMutation({
    onSuccess: () => {
      toast.success("User access matrix updated successfully.");
      onSuccess();
      onClose();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update access matrix.");
    },
  });

  const handleSave = () => {
    if (!member) return;

    const clientMemberships = Object.entries(clientRoles).map(
      ([clientId, role]) => ({
        clientId,
        role,
      }),
    );

    const projectMemberships = Object.entries(projectRoles).map(
      ([projectId, role]) => ({
        projectId,
        role,
      }),
    );

    updateMutation.mutate({
      userId: member.id,
      globalRole,
      clientMemberships,
      projectMemberships,
    });
  };

  const toggleClient = (clientId: string) => {
    setClientRoles((prev) => {
      const next = { ...prev };
      if (next[clientId]) {
        delete next[clientId];
      } else {
        next[clientId] = "CLIENT_MEMBER";
      }
      return next;
    });
  };

  const toggleProject = (projectId: string) => {
    setProjectRoles((prev) => {
      const next = { ...prev };
      if (next[projectId]) {
        delete next[projectId];
      } else {
        next[projectId] = "MEMBER";
      }
      return next;
    });
  };

  if (!member) return null;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-background border-border">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Edit User Access Matrix
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Configure global role, client memberships, and project
                contributor scopes for{" "}
                <span className="font-semibold text-foreground">
                  {member.name || member.email}
                </span>
                .
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Global Role */}
          <div className="space-y-3 rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Shield className="h-4 w-4 text-primary" />
                  Global RBAC Role
                </Label>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  SYSTEM_ADMIN gives unrestricted administrative visibility
                  across all clients and projects.
                </p>
              </div>
              <Select
                value={globalRole}
                onValueChange={(val: "SYSTEM_ADMIN" | "USER") =>
                  setGlobalRole(val)
                }
              >
                <SelectTrigger className="w-40 h-8 text-xs font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">Standard User</SelectItem>
                  <SelectItem value="SYSTEM_ADMIN">SYSTEM_ADMIN</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Client Memberships */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Building className="h-4 w-4 text-blue-600" />
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Client Allocations
                </h4>
              </div>
              <span className="text-[11px] text-muted-foreground">
                {Object.keys(clientRoles).length} of {clients?.length ?? 0}{" "}
                assigned
              </span>
            </div>

            {clientsLoading ? (
              <div className="flex py-6 justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : !clients || clients.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                No clients configured.
              </p>
            ) : (
              <div className="space-y-2 rounded-lg border border-border bg-card p-3">
                {clients.map((c) => {
                  const isAssigned = !!clientRoles[c.id];
                  const currentRole = clientRoles[c.id] || "CLIENT_MEMBER";

                  return (
                    <div
                      key={c.id}
                      className={`flex items-center justify-between p-2.5 rounded-lg border transition ${
                        isAssigned
                          ? "border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20"
                          : "border-transparent hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          id={`client-${c.id}`}
                          checked={isAssigned}
                          onCheckedChange={() => toggleClient(c.id)}
                        />
                        <label
                          htmlFor={`client-${c.id}`}
                          className="text-xs font-medium text-foreground cursor-pointer"
                        >
                          <span className="font-bold">{c.name}</span>
                          <span className="text-muted-foreground ml-1.5 text-[11px]">
                            ({c.slug})
                          </span>
                        </label>
                      </div>

                      {isAssigned && (
                        <Select
                          value={currentRole}
                          onValueChange={(
                            val: "CLIENT_ADMIN" | "CLIENT_MEMBER",
                          ) =>
                            setClientRoles((prev) => ({ ...prev, [c.id]: val }))
                          }
                        >
                          <SelectTrigger className="w-36 h-7 text-[11px] font-semibold bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CLIENT_MEMBER">
                              Client Member
                            </SelectItem>
                            <SelectItem value="CLIENT_ADMIN">
                              Client Admin
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Project Memberships */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FolderKanban className="h-4 w-4 text-indigo-600" />
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Project Memberships & Scoped Roles
                </h4>
              </div>
              <span className="text-[11px] text-muted-foreground">
                {Object.keys(projectRoles).length} of {projects?.length ?? 0}{" "}
                assigned
              </span>
            </div>

            {projectsLoading ? (
              <div className="flex py-6 justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : !projects || projects.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                No projects configured.
              </p>
            ) : (
              <div className="space-y-2 rounded-lg border border-border bg-card p-3">
                {projects.map((p) => {
                  const isAssigned = !!projectRoles[p.id];
                  const currentRole = projectRoles[p.id] || "MEMBER";

                  return (
                    <div
                      key={p.id}
                      className={`flex items-center justify-between p-2.5 rounded-lg border transition ${
                        isAssigned
                          ? "border-indigo-200 bg-indigo-50/50 dark:border-indigo-900 dark:bg-indigo-950/20"
                          : "border-transparent hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          id={`proj-${p.id}`}
                          checked={isAssigned}
                          onCheckedChange={() => toggleProject(p.id)}
                        />
                        <label
                          htmlFor={`proj-${p.id}`}
                          className="text-xs font-medium text-foreground cursor-pointer"
                        >
                          <span className="font-mono text-primary font-bold mr-1.5">
                            [{p.key}]
                          </span>
                          <span className="font-semibold">{p.name}</span>
                          {p.client && (
                            <span className="text-muted-foreground text-[10px] ml-1.5">
                              • {p.client.name}
                            </span>
                          )}
                        </label>
                      </div>

                      {isAssigned && (
                        <Select
                          value={currentRole}
                          onValueChange={(
                            val: "PROJECT_LEAD" | "MEMBER" | "VIEWER",
                          ) =>
                            setProjectRoles((prev) => ({
                              ...prev,
                              [p.id]: val,
                            }))
                          }
                        >
                          <SelectTrigger className="w-36 h-7 text-[11px] font-semibold bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MEMBER">Member</SelectItem>
                            <SelectItem value="PROJECT_LEAD">
                              Project Lead
                            </SelectItem>
                            <SelectItem value="VIEWER">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="px-6 py-3 border-t border-border bg-muted/20">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={updateMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                Saving Access...
              </>
            ) : (
              "Save Access Matrix"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
