import * as React from "react";
import { cn } from "../../lib/utils";

export interface LogoProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
  showBadge?: boolean;
}

export function CentraxisLogo({
  size = "md",
  showWordmark = true,
  showBadge = true,
  className,
  ...props
}: LogoProps) {
  const sizeStyles = {
    sm: {
      box: "h-7 w-7",
      iconSize: 18,
      text: "text-base",
      badge: "text-[9px] px-1 py-0.2",
      gap: "gap-2",
    },
    md: {
      box: "h-9 w-9",
      iconSize: 22,
      text: "text-lg",
      badge: "text-[10px] px-1.5 py-0.5",
      gap: "gap-2.5",
    },
    lg: {
      box: "h-12 w-12",
      iconSize: 30,
      text: "text-2xl",
      badge: "text-xs px-2 py-0.5",
      gap: "gap-3",
    },
  }[size];

  return (
    <div
      className={cn("flex items-center select-none", sizeStyles.gap, className)}
      {...props}
    >
      {/* Convergence Axis Emblem (Centvis Brand DNA) */}
      <div
        className={cn(
          "relative flex items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/25 ring-1 ring-white/20 shrink-0",
          sizeStyles.box,
        )}
      >
        <svg
          width={sizeStyles.iconSize}
          height={sizeStyles.iconSize}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="transition-transform group-hover:scale-105"
        >
          {/* North-South Convergence Axis */}
          <path
            d="M12 2L12 8M12 16L12 22"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          {/* East-West Convergence Axis */}
          <path
            d="M2 12L8 12M16 12L22 12"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          {/* Central Nexus Prism */}
          <rect
            x="8.5"
            y="8.5"
            width="7"
            height="7"
            rx="2"
            transform="rotate(45 12 12)"
            fill="white"
            fillOpacity="0.95"
          />
          <circle cx="12" cy="12" r="1.5" fill="#4f46e5" />
        </svg>
      </div>

      {/* Typography: Wordmark + Centvis Brand Badge */}
      {showWordmark && (
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "font-bold tracking-tight text-foreground",
              sizeStyles.text,
            )}
          >
            Centraxis
          </span>
          {showBadge && (
            <span
              className={cn(
                "rounded-md border border-indigo-500/20 bg-indigo-50 dark:bg-indigo-950/50 font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 font-mono",
                sizeStyles.badge,
              )}
            >
              by Centvis
            </span>
          )}
        </div>
      )}
    </div>
  );
}
