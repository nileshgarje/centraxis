"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Building2,
  Users,
  Shield,
  ShieldAlert,
  ArrowLeft,
  Mail,
  CheckCircle2,
  AlertCircle,
  Save,
  Loader2,
  UserPlus,
  Trash2,
} from "lucide-react";
import {
  Button,
  Input,
  Label,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  toast,
} from "@centraxis/ui";
import { useClient } from "~/context/client-context";
import { api } from "~/trpc/react";
import { CentvisLogo } from "@centraxis/ui";
import { ClientProjectSwitcher } from "~/components/layout/client-project-switcher";

export default function ClientSettingsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const utils = api.useUtils();
  const { client, clientSlug } = useClient();

  const isSystemAdmin =
    session?.user?.globalRole === "SYSTEM_ADMIN" ||
    session?.user?.role === "ORG_ADMIN";

  const userClientMember = client.members?.find(
    (m) => m.userId === session?.user?.id,
  );
  const isClientAdmin = isSystemAdmin || userClientMember?.role === "CLIENT_ADMIN";

  const [name, setName] = useState(client.name);
  const [contactEmail, setContactEmail] = useState(client.contactEmail ?? "");
  const [isSaving, setIsSaving] = useState(false);

  if (!isClientAdmin) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4" data-testid="access-denied-screen">
        <div className="w-full max-w-md rounded-2xl border border-destructive/20 bg-card p-8 text-center shadow-lg">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mb-4">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h1 className="text-lg font-bold text-foreground">
            Access Denied
          </h1>
          <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
            You do not have administrative privileges to manage settings for client workspace{" "}
            <span className="font-semibold text-foreground font-mono">"{clientSlug}"</span>.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Button
              onClick={() => router.push(`/${clientSlug}`)}
              className="w-full gap-2 text-xs"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Client Workspace</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const updateMutation = api.clients.update.useMutation({
    onSuccess: async () => {
      toast.success("Client details updated successfully.");
      setIsSaving(false);
      await Promise.all([
        utils.clients.getBySlug.invalidate({ slug: clientSlug }),
        utils.clients.list.invalidate(),
      ]);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update client.");
      setIsSaving(false);
    },
  });

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Client name is required.");
      return;
    }
    setIsSaving(true);
    updateMutation.mutate({
      id: client.id,
      name: name.trim(),
      contactEmail: contactEmail.trim() || null,
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur px-6">
        <div className="flex h-14 items-center justify-between gap-4">
          <div className="flex items-center gap-4 shrink-0">
            <Link
              href="/"
              className="flex items-center hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
              title="Centvis"
            >
              <CentvisLogo height={26} />
            </Link>
            <div className="h-4 w-px bg-border" />
            <ClientProjectSwitcher currentClientSlug={clientSlug} />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="gap-1.5 text-xs"
            >
              <Link href={`/${clientSlug}`}>
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to {client.name}</span>
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-[1000px] w-full mx-auto px-6 py-8 space-y-8">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Client Workspace Settings
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure profile, identity, and membership permissions for{" "}
            <span className="font-semibold text-foreground">{client.name}</span>
            .
          </p>
        </div>

        {/* Client Profile Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Building2 className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-bold text-foreground">
                Client Profile & Identity
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Update organization name and primary contact email.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="client-name"
                    className="text-xs font-semibold"
                  >
                    Client Name
                  </Label>
                  <Input
                    id="client-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Acme Corporation"
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="client-slug"
                    className="text-xs font-semibold"
                  >
                    Workspace Slug (Immutable)
                  </Label>
                  <Input
                    id="client-slug"
                    value={client.slug}
                    disabled
                    className="h-9 text-xs font-mono bg-muted text-muted-foreground"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="contact-email"
                  className="text-xs font-semibold"
                >
                  Primary Contact Email
                </Label>
                <Input
                  id="contact-email"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="contact@client.com"
                  className="h-9 text-xs"
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSaving}
                  className="gap-2 text-xs font-semibold"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5" />
                      <span>Save Changes</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Client Members Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-blue-600" />
                <CardTitle className="text-sm font-bold text-foreground">
                  Client Members & Scoped Roles ({client.members?.length ?? 0})
                </CardTitle>
              </div>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Users assigned to this client tenant can access client projects
              and be assigned to issues.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!client.members || client.members.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-4">
                No members assigned directly to this client. Use Organization
                Settings to allocate users.
              </p>
            ) : (
              <div className="divide-y divide-border rounded-lg border border-border">
                {client.members.map((cm) => (
                  <div
                    key={cm.id}
                    className="flex items-center justify-between p-3 text-xs"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                        {cm.user.name?.slice(0, 2).toUpperCase() || "U"}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">
                          {cm.user.name || cm.user.email}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {cm.user.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Badge
                        variant="outline"
                        className={
                          cm.role === "CLIENT_ADMIN"
                            ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300"
                            : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300"
                        }
                      >
                        {cm.role === "CLIENT_ADMIN" ? "Client Admin" : "Member"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
