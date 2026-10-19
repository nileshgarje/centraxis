"use client";

import React from "react";
import {
  TrendingDown,
  Zap,
  CheckCircle2,
  Calendar,
  AlertCircle,
  BarChart3,
  Award,
} from "lucide-react";
import { api } from "~/trpc/react";

interface SprintMetricsProps {
  projectId: string;
}

export function SprintMetrics({ projectId }: { projectId: string }) {
  const { data: activeSprint } = api.sprint.getActive.useQuery(
    { projectId },
    { enabled: !!projectId },
  );

  const { data: burndownData, isLoading: burndownLoading } =
    api.metrics.getBurndownData.useQuery(
      { sprintId: activeSprint?.id ?? "" },
      { enabled: !!activeSprint?.id },
    );

  const { data: velocityData, isLoading: velocityLoading } =
    api.metrics.getTeamVelocity.useQuery(
      { projectId },
      { enabled: !!projectId },
    );

  if (burndownLoading || velocityLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-sm font-medium text-slate-500">Computing sprint metrics and burndown trajectory...</p>
        </div>
      </div>
    );
  }

  const days = burndownData?.days ?? [];
  const maxPoints = burndownData?.sprint.totalPoints || 30;

  // SVG Chart Dimensions
  const svgWidth = 650;
  const svgHeight = 220;
  const paddingX = 45;
  const paddingY = 25;
  const chartWidth = svgWidth - paddingX * 2;
  const chartHeight = svgHeight - paddingY * 2;

  // Generate SVG coordinates for ideal and actual lines
  const numSteps = Math.max(1, days.length - 1);

  const idealPointsString = days
    .map((d, i) => {
      const x = paddingX + (i / numSteps) * chartWidth;
      const y =
        paddingY +
        chartHeight -
        ((d.ideal ?? 0) / (maxPoints || 1)) * chartHeight;
      return `${x},${y}`;
    })
    .join(" ");

  const actualDays = days.filter((d) => d.actual !== null);
  const actualPointsString = actualDays
    .map((d, i) => {
      const x = paddingX + (i / numSteps) * chartWidth;
      const y =
        paddingY +
        chartHeight -
        ((d.actual ?? 0) / (maxPoints || 1)) * chartHeight;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="space-y-6">
      {/* Top Velocity & Efficiency KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Rolling Velocity
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Zap className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {velocityData?.averageVelocity ?? 24}{" "}
            <span className="text-xs font-normal text-slate-500">pts/sprint</span>
          </p>
          <p className="mt-1 text-[11px] text-emerald-600 font-semibold">
            Based on rolling 3-sprint average
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Sprint Committed
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <Award className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {burndownData?.sprint.totalPoints ?? 0}{" "}
            <span className="text-xs font-normal text-slate-500">pts</span>
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            {activeSprint?.name ?? "Current Sprint"}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Completed
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-600">
            {burndownData?.sprint.completedPoints ?? 0}{" "}
            <span className="text-xs font-normal text-slate-500">pts</span>
          </p>
          <p className="mt-1 text-[11px] text-emerald-600 font-medium">
            Accepted in Done lane
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Remaining Points
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-600">
            {burndownData?.sprint.remainingPoints ?? 0}{" "}
            <span className="text-xs font-normal text-slate-500">pts</span>
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Across active backlog cards
          </p>
        </div>
      </div>

      {/* Burndown Chart Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              <h3 className="text-base font-bold text-slate-900">
                Sprint Burndown Chart
              </h3>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              Ideal trajectory vs actual remaining story points across the 14-day sprint iteration
            </p>
          </div>

          <div className="flex items-center space-x-4 text-xs font-medium">
            <div className="flex items-center space-x-1.5">
              <span className="h-0.5 w-4 border-t-2 border-dashed border-slate-400" />
              <span className="text-slate-600">Ideal Guideline</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="h-1 w-4 rounded-full bg-blue-600" />
              <span className="text-blue-700 font-semibold">Actual Burn</span>
            </div>
          </div>
        </div>

        {/* SVG Burndown Rendering */}
        <div className="mt-6 w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-64 text-slate-400 select-none"
          >
            {/* Grid Lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
              const y = paddingY + chartHeight * pct;
              const val = Math.round(maxPoints * (1 - pct));
              return (
                <g key={idx}>
                  <line
                    x1={paddingX}
                    y1={y}
                    x2={svgWidth - paddingX}
                    y2={y}
                    stroke="#f1f5f9"
                    strokeWidth="1"
                  />
                  <text
                    x={paddingX - 10}
                    y={y + 4}
                    textAnchor="end"
                    fontSize="10"
                    fill="#94a3b8"
                  >
                    {val}
                  </text>
                </g>
              );
            })}

            {/* Ideal Burndown Line (Dashed Slate) */}
            {idealPointsString && (
              <polyline
                fill="none"
                stroke="#94a3b8"
                strokeWidth="2"
                strokeDasharray="4 4"
                points={idealPointsString}
              />
            )}

            {/* Actual Burndown Line (Solid Blue with points) */}
            {actualPointsString && (
              <>
                <polyline
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={actualPointsString}
                />
                {actualDays.map((d, i) => {
                  const x = paddingX + (i / numSteps) * chartWidth;
                  const y =
                    paddingY +
                    chartHeight -
                    ((d.actual ?? 0) / (maxPoints || 1)) * chartHeight;
                  return (
                    <circle
                      key={i}
                      cx={x}
                      cy={y}
                      r="4"
                      className="fill-blue-600 stroke-white stroke-2"
                    />
                  );
                })}
              </>
            )}

            {/* X-axis day labels */}
            {days
              .filter((_, i) => i % 2 === 0 || i === days.length - 1)
              .map((d, idx) => {
                const origIndex = days.findIndex((item) => item.day === d.day);
                const x = paddingX + (origIndex / numSteps) * chartWidth;
                return (
                  <text
                    key={idx}
                    x={x}
                    y={svgHeight - 4}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#64748b"
                  >
                    {d.day}
                  </text>
                );
              })}
          </svg>
        </div>
      </div>

      {/* Historical Velocity Breakdown */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 mb-2">
          Historical Sprint Velocity Performance
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Tracking consistency and predictability across consecutive sprints
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {velocityData?.sprints.map((s, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-4"
            >
              <div>
                <p className="font-semibold text-xs text-slate-800">{s.name}</p>
                <p className="text-[10px] text-slate-400">Completed Sprint</p>
              </div>
              <div className="text-right">
                <p className="text-base font-bold text-blue-600">
                  {s.completedPoints} pts
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
