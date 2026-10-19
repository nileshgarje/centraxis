"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { api } from "~/trpc/react";

export default function RootPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const { data: clients, isLoading: clientsLoading } = api.clients.list.useQuery(
    undefined,
    {
      enabled: status === "authenticated",
      retry: false,
    },
  );

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }

    if (status === "authenticated" && !clientsLoading) {
      if (clients && clients.length > 0) {
        const firstClient = clients[0]!;
        router.replace(`/${firstClient.slug}`);
      } else if (
        session?.user?.globalRole === "SYSTEM_ADMIN" ||
        session?.user?.role === "ORG_ADMIN"
      ) {
        router.replace("/admin");
      } else {
        router.replace("/settings/profile");
      }
    }
  }, [status, clientsLoading, clients, session, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-xs font-semibold text-muted-foreground">
          Resolving active workspace...
        </p>
      </div>
    </div>
  );
}
