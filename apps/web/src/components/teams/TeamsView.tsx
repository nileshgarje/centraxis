"use client";

import React, { useState } from "react";
import { Users, Shield, UserCheck, Briefcase, Plus } from "lucide-react";
import { api } from "~/trpc/react";
import { CreateTeamDialog } from "./create-team-dialog";

export function TeamsView({ projectId }: { projectId: string }) {
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);

  const { data: teams, isLoading: teamsLoading } =
    api.project.listTeams.useQuery({ projectId });
  const { data: members, isLoading: membersLoading } =
    api.project.listMembers.useQuery({ projectId });

  if (teamsLoading || membersLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-sm font-medium text-slate-500">Loading squads and team roster...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Squads Overview */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Assigned Squads & Engineering Teams
            </h2>
            <p className="text-xs text-slate-500">
              Cross-functional squads allocated to this agile project
            </p>
          </div>

          <button
            onClick={() => setIsCreateTeamOpen(true)}
            className="flex items-center space-x-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>+ New Squad</span>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teams?.map((team) => (
            <div
              key={team.id}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-center space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                  <Briefcase className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {team.name}
                  </h3>
                  <span className="text-xs text-slate-500">
                    {team._count?.memberships ?? 0} engineers
                  </span>
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-600 leading-relaxed">
                {team.description ?? "Engineering squad handling core platform delivery."}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 25 Users Directory */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              Team Roster ({members?.length ?? 0} Members)
            </h3>
            <p className="text-xs text-slate-500">
              User identity and RBAC role assignments provisioned via Microsoft Entra ID SSO
            </p>
          </div>
        </div>

        <div className="divide-y divide-slate-100 max-h-[480px] overflow-y-auto">
          {members?.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-50/50 transition"
            >
              <div className="flex items-center space-x-3.5">
                <div className="h-9 w-9 overflow-hidden rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-blue-700">
                  {member.name?.slice(0, 2).toUpperCase() ?? "U"}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {member.name}
                  </p>
                  <p className="text-xs text-slate-500">{member.email}</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    member.role === "ORG_ADMIN"
                      ? "bg-purple-100 text-purple-800"
                      : member.role === "SCRUM_MASTER"
                        ? "bg-blue-100 text-blue-800"
                        : member.role === "DEVELOPER"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {member.role}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Team / Squad Modal Dialog */}
      <CreateTeamDialog
        isOpen={isCreateTeamOpen}
        onClose={() => setIsCreateTeamOpen(false)}
        projectId={projectId}
      />
    </div>
  );
}
