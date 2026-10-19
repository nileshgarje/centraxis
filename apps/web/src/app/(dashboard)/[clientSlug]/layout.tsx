"use client";

import React, { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldAlert, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@centraxis/ui";
import { api } from "~/trpc/react";
import { ClientProvider } from "~/context/client-context";

interface ClientLayoutProps {
  children: React.ReactNode;
  params: Promise<{ clientSlug: string }>;
}

export default function ClientLayout({ children, params }: ClientLayoutProps) {
  const router = useRouter();
  const { clientSlug } = use(params);


  const { data: client, isLoading, error } = api.clients.getBySlug.useQuery(
    { slug: clientSlug },
    {
      retry: false,
    },
  );

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-xs font-semibold text-muted-foreground">
            Resolving client workspace...
          </p>
        </div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-2xl border border-destructive/20 bg-card p-8 text-center shadow-lg">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mb-4">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h1 className="text-lg font-bold text-foreground">
            Workspace Access Denied or Not Found
          </h1>
          <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
            You do not have permission to access client workspace{" "}
            <span className="font-semibold text-foreground font-mono">
              "{clientSlug}"
            </span>
            , or it does not exist in your organization.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Button
              onClick={() => router.push("/")}
              className="w-full gap-2 text-xs"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Authorized Workspaces</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ClientProvider client={client} clientSlug={clientSlug}>
      {children}
    </ClientProvider>
  );
}
