"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Building2,
  Users,
  FolderGit2,
  Shield,
  Plus,
  ArrowRight,
  ExternalLink,
  Kanban,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@centraxis/ui";
import { api } from "~/trpc/react";
import { CentraxisLogo } from "@centraxis/ui";
import { ThemeToggle } from "@centraxis/ui";
import { CreateClientDialog } from "~/components/clients/create-client-dialog";
import { NotificationPopover } from "~/components/layout/notification-popover";

export default function AdminOverviewPage() {
  const { data: session } = useSession();
  const [isCreateClientOpen, setIsCreateClientOpen] = useState(false);

  const { data: clients, isLoading: clientsLoading } =
    api.clients.list.useQuery();
  const { data: members, isLoading: membersLoading } =
    api.org.listMembers.useQuery();
  const { data: projects, isLoading: projectsLoading } =
    api.project.list.useQuery();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur px-6">
        <div className="flex h-14 items-center justify-between gap-4">
          <div className="flex items-center gap-4 shrink-0">
            <CentraxisLogo size="md" />
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Shield className="h-4 w-4 text-primary" />
                <span>Global System Administration</span>
              </div>
              {session?.user?.isTemporary && (
                <Badge
                  variant="outline"
                  className="border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 gap-1 text-[11px] font-semibold"
                >
                  <AlertTriangle className="h-3 w-3 text-amber-500" />
                  <span>Temporary User</span>
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              asChild
              className="gap-1.5 text-xs font-semibold"
            >
              <Link href="/settings/members">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Manage Users & Roles</span>
              </Link>
            </Button>
            <NotificationPopover />
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-[1300px] w-full mx-auto px-6 py-8 space-y-8">
        {/* Admin Header */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-sm shrink-0">
                <Shield className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-foreground">
                  Global Enterprise Administration
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Manage multi-client tenant allocations, projects, and global
                  RBAC matrices across Centraxis.
                </p>
              </div>
            </div>

            <Button
              onClick={() => setIsCreateClientOpen(true)}
              size="sm"
              className="gap-2 shrink-0 self-start sm:self-auto"
            >
              <Plus className="h-4 w-4" />
              <span>Add Client Tenant</span>
            </Button>
          </div>
        </div>

        {/* Temporary Bootstrap Administrator Security Callout */}
        {session?.user?.isTemporary && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-amber-950 dark:text-amber-200 shadow-sm">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold">
                    Signed in with Temporary Bootstrap Administrator
                  </h3>
                  <Badge
                    variant="outline"
                    className="border-amber-500/40 bg-amber-500/20 text-amber-800 dark:text-amber-300 text-[10px] font-mono font-semibold"
                  >
                    BOOTSTRAP_ADMIN
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl">
                  This account was provisioned via environment credentials for
                  initial configuration. Set up a permanent administrator
                  account in Workspace Members and remove this temporary
                  account.
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              asChild
              className="border-amber-500/40 hover:bg-amber-500/20 text-xs shrink-0 self-start sm:self-auto font-semibold"
            >
              <Link href="/settings/members">Create Permanent Admin</Link>
            </Button>
          </div>
        )}

        {/* Global Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Total Clients
              </p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {clients?.length ?? 0}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 flex items-center justify-center">
              <Building2 className="h-5 w-5" />
            </div>
          </Card>

          <Card className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Active Projects
              </p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {projects?.length ?? 0}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 flex items-center justify-center">
              <FolderGit2 className="h-5 w-5" />
            </div>
          </Card>

          <Card className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Organization Users
              </p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {members?.length ?? 0}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400 flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
          </Card>
        </div>

        {/* Client Spaces Grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-foreground">
                Configured Client Workspaces
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                All client workspaces accessible within this enterprise instance
              </p>
            </div>
          </div>

          {!clients || clients.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-12 text-center bg-card">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground mb-3">
                <Building2 className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">
                No client workspaces configured yet
              </h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Create your first client workspace to start allocating projects,
                sprints, and team members.
              </p>
              <Button
                onClick={() => setIsCreateClientOpen(true)}
                size="sm"
                className="mt-4 gap-2"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add First Client</span>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {clients.map((c) => (
                <Card
                  key={c.id}
                  className="hover:border-primary/50 transition duration-150"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <span className="font-mono text-xs font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded">
                        {c.slug}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {c.projects?.length ?? 0} Projects
                      </Badge>
                    </div>
                    <CardTitle className="text-base font-bold text-foreground mt-2">
                      {c.name}
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">
                      {c.contactEmail || "No contact email specified"}
                    </CardDescription>
                  </CardHeader>
                  <CardFooter className="pt-2 border-t border-border/60 flex items-center justify-between">
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      className="h-7 text-xs font-semibold gap-1"
                    >
                      <Link href={`/${c.slug}/settings`}>
                        <span>Settings</span>
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      asChild
                      className="h-7 text-xs font-semibold gap-1"
                    >
                      <Link href={`/${c.slug}`}>
                        <span>Enter Workspace</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <CreateClientDialog
        isOpen={isCreateClientOpen}
        onClose={() => setIsCreateClientOpen(false)}
      />
    </div>
  );
}
