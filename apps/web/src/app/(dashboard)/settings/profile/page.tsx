"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import {
  User,
  Mail,
  ShieldCheck,
  Bell,
  CheckCircle2,
  Building,
  Key,
  Calendar,
  Layers,
  Save,
} from "lucide-react";
import {
  Button,
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@centraxis/ui";

export default function ProfileSettingsPage() {
  const { data: session } = useSession();

  const [name, setName] = useState(session?.user?.name || "Admin User");
  const [sprintKickoffEmail, setSprintKickoffEmail] = useState(true);
  const [taskAssignmentEmail, setTaskAssignmentEmail] = useState(true);
  const [rolloverDigestEmail, setRolloverDigestEmail] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const userInitials =
    (name || session?.user?.name || "AU")
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const email = session?.user?.email || "admin@centvis.com";
  const isEntraIdUser = email.toLowerCase().endsWith("@centvis.com");
  const role = session?.user?.role || "ORG_ADMIN";

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Account & Profile
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Manage your enterprise identity, authentication credentials, and transactional notifications
        </p>
      </div>

      {savedSuccess && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-4 py-3 text-xs text-emerald-800 dark:text-emerald-300 font-medium">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>Profile and notification preferences updated successfully.</span>
        </div>
      )}

      {/* Profile Details Card */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-6">
        <h2 className="text-sm font-bold text-foreground">User Identity</h2>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Avatar className="h-16 w-16 ring-2 ring-border">
            <AvatarImage src={session?.user?.image ?? undefined} />
            <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <div className="text-sm font-semibold text-foreground">
              {name}
            </div>
            <div className="text-xs text-muted-foreground">{email}</div>
            <div className="flex items-center gap-2 pt-1">
              <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 font-mono text-[10px] font-bold text-muted-foreground uppercase">
                Role: {role}
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4 max-w-md pt-2">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-foreground">
              Display Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground transition focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-foreground">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground cursor-not-allowed"
            />
            <p className="text-[11px] text-muted-foreground">
              Enterprise email is managed by your organization's directory.
            </p>
          </div>

          <Button type="submit" size="sm" className="gap-1.5">
            <Save className="h-3.5 w-3.5" />
            <span>Save Changes</span>
          </Button>
        </form>
      </div>

      {/* Microsoft Entra ID Authentication Card */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">
                Microsoft Entra ID Authentication
              </h2>
              <p className="text-xs text-muted-foreground">
                Single sign-on connection with Centvis Microsoft 365 Tenant
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            Connected & Active
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="rounded-lg border border-border/70 bg-muted/20 p-3 space-y-1">
            <div className="text-[10px] uppercase font-bold text-muted-foreground">
              Tenant Domain
            </div>
            <div className="text-xs font-semibold text-foreground">
              centvis.com
            </div>
          </div>

          <div className="rounded-lg border border-border/70 bg-muted/20 p-3 space-y-1">
            <div className="text-[10px] uppercase font-bold text-muted-foreground">
              SSO Protocol
            </div>
            <div className="text-xs font-semibold text-foreground">
              OAuth 2.0 / OpenID Connect
            </div>
          </div>

          <div className="rounded-lg border border-border/70 bg-muted/20 p-3 space-y-1">
            <div className="text-[10px] uppercase font-bold text-muted-foreground">
              Directory Policy
            </div>
            <div className="text-xs font-semibold text-foreground">
              Centvis Enterprise Agile
            </div>
          </div>
        </div>
      </div>

      {/* Transactional Email Preferences */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
            <Bell className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">
              Transactional Email Notifications
            </h2>
            <p className="text-xs text-muted-foreground">
              Configure automated SMTP notification dispatches for agile events
            </p>
          </div>
        </div>

        <div className="divide-y divide-border/60 pt-2">
          <div className="flex items-center justify-between py-3">
            <div>
              <div className="text-xs font-semibold text-foreground">
                Sprint Kickoff Notifications
              </div>
              <div className="text-[11px] text-muted-foreground">
                Receive an email summary when a planned sprint is started by Scrum Master
              </div>
            </div>
            <input
              type="checkbox"
              checked={sprintKickoffEmail}
              onChange={(e) => setSprintKickoffEmail(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <div className="text-xs font-semibold text-foreground">
                Task Assignment Alerts
              </div>
              <div className="text-[11px] text-muted-foreground">
                Receive real-time alerts when a work item or bug is assigned to you
              </div>
            </div>
            <input
              type="checkbox"
              checked={taskAssignmentEmail}
              onChange={(e) => setTaskAssignmentEmail(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <div className="text-xs font-semibold text-foreground">
                Sprint Closeout & Rollover Digest
              </div>
              <div className="text-[11px] text-muted-foreground">
                Get velocity metrics and incomplete item rollover summaries on sprint completion
              </div>
            </div>
            <input
              type="checkbox"
              checked={rolloverDigestEmail}
              onChange={(e) => setRolloverDigestEmail(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
