"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, User, Building2, Users, ShieldCheck, GitFork } from "lucide-react";
import { CentvisLogo, ThemeToggle } from "@centraxis/ui";

const SETTINGS_NAV = [
  {
    name: "Account & Profile",
    href: "/settings/profile",
    icon: User,
    description: "Personal identity and notification preferences",
  },
  {
    name: "Clients & Tenancy",
    href: "/settings/clients",
    icon: Building2,
    description: "Client tenant spaces and portfolio isolation",
  },
  {
    name: "Workspace Members",
    href: "/settings/members",
    icon: Users,
    description: "RBAC permissions, roles, and member invitations",
  },
  {
    name: "Workflow Schemes",
    href: "/settings/workflows",
    icon: GitFork,
    description: "Publishable state machines (Global, Client, Project)",
  },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur px-6">
        <div className="flex h-14 items-center justify-between gap-4 max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
              title="Centvis"
            >
              <CentvisLogo height={26} />
            </Link>
            <div className="h-4 w-px bg-border" />
            <Link
              href="/"
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Workspace</span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1 rounded bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 font-sans text-xs font-semibold text-indigo-700 dark:text-indigo-300">
              <ShieldCheck className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              Settings Hub
            </span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Settings Body */}
      <div className="max-w-7xl mx-auto w-full px-6 py-8 flex flex-col md:flex-row gap-8 flex-1">
        {/* Settings Navigation Sidebar */}
        <aside className="w-full md:w-64 shrink-0 space-y-1">
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Settings & Administration
          </div>
          <nav className="space-y-1">
            {SETTINGS_NAV.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-medium transition ${
                    isActive
                      ? "bg-accent font-semibold text-accent-foreground shadow-xs"
                      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      isActive ? "text-primary" : "text-muted-foreground"
                    }`}
                  />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Content Viewport */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
