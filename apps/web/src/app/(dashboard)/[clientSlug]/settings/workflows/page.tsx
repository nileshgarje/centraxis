"use client";

import React, { use } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ShieldAlert, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@centraxis/ui";
import { api } from "~/trpc/react";

interface PageProps {
  params: Promise<{ clientSlug: string }>;
}

export default function ClientWorkflowsPage({ params }: PageProps) {
  const { clientSlug } = use(params);
  const router = useRouter();
  const { data: session, status } = useSession();

  const { data: client, isLoading } = api.clients.getBySlug.useQuery(
    { slug: clientSlug },
    { enabled: !!clientSlug },
  );

  if (status === "loading" || isLoading) {
    return (
      <div className="flex h-96 items-center justify-center space-x-2 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="text-sm">Verifying client access...</span>
      </div>
    );
  }

  const isSystemAdmin =
    session?.user?.globalRole === "SYSTEM_ADMIN" ||
    session?.user?.role === "ORG_ADMIN";

  const userClientMember = client?.members?.find(
    (m) => m.userId === session?.user?.id,
  );
  const isClientAdmin = isSystemAdmin || userClientMember?.role === "CLIENT_ADMIN";

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
            You do not have administrative privileges to manage workflow schemes for workspace{" "}
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

  // Redirect client admin to settings page where workflow management lives
  router.replace(`/${clientSlug}/settings`);
  return null;
}
