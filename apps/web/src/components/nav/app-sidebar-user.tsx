"use client";

import React from "react";
import { useSession, signOut } from "next-auth/react";
import {
  ChevronsUpDown,
  LogOut,
  Moon,
  Sun,
  Laptop,
  ShieldCheck,
  Shield,
  User,
  Sparkles,
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
  DropdownMenuGroup,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Badge,
  useSidebar,
  useTheme,
} from "@centraxis/ui";

export function AppSidebarUser() {
  const { data: session } = useSession();
  const { isMobile } = useSidebar();
  const { setTheme, theme } = useTheme();

  if (!session?.user) {
    return null;
  }

  const user = session.user;
  const initials =
    user.name
      ?.split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "CX";

  const isSystemAdmin = user.globalRole === "SYSTEM_ADMIN";
  const isOrgAdmin = user.role === "ORG_ADMIN";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              data-testid="user-profile-button"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage
                  src={user.image ?? undefined}
                  alt={user.name ?? "User"}
                />
                <AvatarFallback className="rounded-lg bg-primary/20 text-primary font-bold text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold text-sidebar-foreground">
                  {user.name || "Team Member"}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {user.email}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg bg-popover text-popover-foreground shadow-lg border border-border"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
            data-testid="user-profile-dropdown"
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage
                    src={user.image ?? undefined}
                    alt={user.name ?? "User"}
                  />
                  <AvatarFallback className="rounded-lg bg-primary/20 text-primary font-bold text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold text-foreground">
                    {user.name}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {user.email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>

            <div className="px-2 py-1.5 flex flex-wrap gap-1 border-t border-border mt-1">
              {isSystemAdmin ? (
                <Badge
                  variant="outline"
                  className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 text-[10px]"
                >
                  <ShieldCheck className="h-3 w-3 mr-1" />
                  System Admin
                </Badge>
              ) : isOrgAdmin ? (
                <Badge
                  variant="outline"
                  className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 text-[10px]"
                >
                  <Shield className="h-3 w-3 mr-1" />
                  Org Admin
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[10px]">
                  {user.role || "Developer"}
                </Badge>
              )}

              <Badge
                variant="outline"
                className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 text-[10px]"
              >
                Microsoft Entra ID
              </Badge>
            </div>

            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-2 py-1">
                Theme
              </DropdownMenuLabel>
              <div className="grid grid-cols-3 gap-1 px-2 py-1">
                <button
                  type="button"
                  onClick={() => setTheme("light")}
                  className={`flex flex-col items-center justify-center rounded-md p-1.5 text-xs transition border ${
                    theme === "light"
                      ? "border-primary bg-primary/10 text-primary font-semibold"
                      : "border-border hover:bg-muted text-muted-foreground"
                  }`}
                >
                  <Sun className="h-3.5 w-3.5 mb-0.5 text-amber-500" />
                  <span>Light</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTheme("dark")}
                  className={`flex flex-col items-center justify-center rounded-md p-1.5 text-xs transition border ${
                    theme === "dark"
                      ? "border-primary bg-primary/10 text-primary font-semibold"
                      : "border-border hover:bg-muted text-muted-foreground"
                  }`}
                >
                  <Moon className="h-3.5 w-3.5 mb-0.5 text-indigo-400" />
                  <span>Dark</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTheme("system")}
                  className={`flex flex-col items-center justify-center rounded-md p-1.5 text-xs transition border ${
                    theme === "system"
                      ? "border-primary bg-primary/10 text-primary font-semibold"
                      : "border-border hover:bg-muted text-muted-foreground"
                  }`}
                >
                  <Laptop className="h-3.5 w-3.5 mb-0.5" />
                  <span>System</span>
                </button>
              </div>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              data-testid="user-profile-logout"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer gap-2"
            >
              <LogOut className="size-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
