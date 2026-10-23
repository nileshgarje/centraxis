"use client";

import React from "react";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarRail,
} from "@centraxis/ui";
import { AppClientSwitcher } from "./app-client-switcher";
import { AppSidebarNav } from "./app-sidebar-nav";
import { AppSidebarUser } from "./app-sidebar-user";

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  clientSlug: string;
}

export function AppSidebar({ clientSlug, ...props }: AppSidebarProps) {
  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-sidebar-border"
      data-testid="app-sidebar"
      {...props}
    >
      <SidebarHeader>
        <AppClientSwitcher currentClientSlug={clientSlug} />
      </SidebarHeader>

      <SidebarContent>
        <AppSidebarNav clientSlug={clientSlug} />
      </SidebarContent>

      <SidebarFooter>
        <AppSidebarUser />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
