"use client";

import React, { createContext, useContext } from "react";
import type { RouterOutputs } from "~/trpc/react";

export type ClientData = RouterOutputs["clients"]["getBySlug"];

interface ClientContextValue {
  client: ClientData;
  clientSlug: string;
}

const ClientContext = createContext<ClientContextValue | null>(null);

export function ClientProvider({
  client,
  clientSlug,
  children,
}: {
  client: ClientData;
  clientSlug: string;
  children: React.ReactNode;
}) {
  return (
    <ClientContext.Provider value={{ client, clientSlug }}>
      {children}
    </ClientContext.Provider>
  );
}

export function useClient() {
  const context = useContext(ClientContext);
  if (!context) {
    throw new Error("useClient must be used within a ClientProvider");
  }
  return context;
}
