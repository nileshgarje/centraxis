"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Building2,
  ChevronsUpDown,
  Plus,
  Check,
  ShieldCheck,
} from "lucide-react";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  useSidebar,
} from "@centraxis/ui";
import { api } from "~/trpc/react";
import { CreateClientDialog } from "../clients/create-client-dialog";

interface AppClientSwitcherProps {
  currentClientSlug?: string;
}

export function AppClientSwitcher({
  currentClientSlug,
}: AppClientSwitcherProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const { isMobile } = useSidebar();
  const [isCreateClientOpen, setIsCreateClientOpen] = useState(false);

  const { data: clientList = [], isLoading } = api.clients.list.useQuery();

  const activeClient = clientList.find(
    (c) => c.slug.toLowerCase() === currentClientSlug?.toLowerCase(),
  ) ||
    clientList[0];

  const isSystemAdmin =
    session?.user?.globalRole === "SYSTEM_ADMIN" ||
    session?.user?.role === "ORG_ADMIN";

  const handleSelectClient = (slug: string) => {
    if (slug === currentClientSlug) return;
    router.push(`/${slug}`);
  };

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                data-testid="client-switcher-button"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-semibold shadow-xs">
                  {activeClient?.logo ? (
                    <img
                      src={activeClient.logo}
                      alt={activeClient.name}
                      className="size-8 rounded-lg object-cover"
                    />
                  ) : (
                    <Building2 className="size-4" />
                  )}
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold text-sidebar-foreground">
                    {activeClient?.name || (isLoading ? "Loading..." : "Centraxis")}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {activeClient?.tenantId ? "Enterprise Tenant" : "Client Workspace"}
                  </span>
                </div>
                <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg bg-popover border border-border shadow-lg"
              align="start"
              side={isMobile ? "bottom" : "right"}
              sideOffset={4}
              data-testid="client-switcher-dropdown"
            >
              <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Clients / Workspaces
              </DropdownMenuLabel>

              {clientList.map((client) => {
                const isSelected =
                  client.slug.toLowerCase() ===
                  activeClient?.slug.toLowerCase();

                return (
                  <DropdownMenuItem
                    key={client.id}
                    data-testid={`client-switcher-item-${client.slug}`}
                    onClick={() => handleSelectClient(client.slug)}
                    className="flex items-center justify-between gap-2 p-2 cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex size-6 items-center justify-center rounded-md border border-border bg-background">
                        {client.logo ? (
                          <img
                            src={client.logo}
                            alt={client.name}
                            className="size-4 rounded object-cover"
                          />
                        ) : (
                          <Building2 className="size-3 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-foreground">
                          {client.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          /{client.slug}
                        </span>
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="size-3.5 text-primary shrink-0" />
                    )}
                  </DropdownMenuItem>
                );
              })}

              {isSystemAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setIsCreateClientOpen(true)}
                    className="gap-2 p-2 cursor-pointer font-medium text-primary hover:text-primary"
                  >
                    <div className="flex size-6 items-center justify-center rounded-md border border-dashed border-primary/40 bg-primary/10">
                      <Plus className="size-3.5 text-primary" />
                    </div>
                    <span className="text-xs">Add Client Workspace</span>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <CreateClientDialog
        isOpen={isCreateClientOpen}
        onClose={() => setIsCreateClientOpen(false)}
        onClientCreated={(clientId) => {
          setIsCreateClientOpen(false);
        }}
      />
    </>
  );
}
