import * as React from "react";
import { cn } from "../../lib/utils";

export interface LogoProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
  showBadge?: boolean;
  variant?: "centraxis" | "centvis";
}

/**
 * Official Centvis Emblem (Icon only)
 * Derived from the official Centvis brand SVG assets.
 */
export function CentvisEmblem({
  className,
  size = 28,
  ...props
}: React.SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="259 270.659 71 57.437"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      {...props}
    >
      {/* Centvis C Curve - Adapts from Navy on light to White on dark */}
      <path
        d="M287.745,328.1a28.727,28.727,0,1,1,20.318-49.035l-10.072,10.07a14.49,14.49,0,1,0,0,20.494l10.072,10.069A28.644,28.644,0,0,1,287.745,328.1Z"
        className="fill-[#042479] dark:fill-white transition-colors"
      />
      {/* Centvis Inner White Shape in Dark mode */}
      <path
        d="M316.012,308.843l9.164-9.164-9.164-9.164-1.751,8.672Z"
        className="hidden dark:block fill-white"
      />
      {/* Centvis Orange Chevron Accent */}
      <g fill="#fff" strokeMiterlimit="10">
        <path
          d="M 311.17236328125 314.1929931640625 L 303.8052368164062 306.7142944335938 L 310.0099182128906 300.7434692382812 L 311.3836059570312 299.4215393066406 L 310.0365600585938 298.0724487304688 L 303.7350158691406 291.7612915039062 L 311.2138366699219 284.3938903808594 L 326.3656311035156 299.5722045898438 L 311.17236328125 314.1929931640625 Z"
          stroke="none"
          className="fill-white dark:fill-slate-900"
        />
        <path
          d="M 311.20751953125 311.5616760253906 L 323.6943054199219 299.54541015625 L 311.2027893066406 287.0320129394531 L 306.3908386230469 291.7722473144531 L 314.0551147460938 299.4482116699219 L 306.4674987792969 306.7498779296875 L 311.20751953125 311.5616760253906 M 311.13720703125 316.8243103027344 L 301.1430053710938 306.6787414550781 L 308.7121276855469 299.3948669433594 L 301.0791931152344 291.7503051757812 L 311.2248840332031 281.7557678222656 L 329.0369567871094 299.5990295410156 L 311.13720703125 316.8243103027344 Z"
          stroke="none"
          fill="#f6ab40"
        />
      </g>
    </svg>
  );
}

/**
 * Official Centvis Full Logo (Wordmark + Emblem)
 * Automatically adapts between centvis-on-light.svg and centvis-on-dark.svg based on active theme.
 */
export function CentvisLogo({
  className,
  height = 28,
  ...props
}: React.SVGProps<SVGSVGElement> & { height?: number | string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 327.549 57.437"
      height={height}
      className={cn("h-auto max-h-8 w-auto shrink-0 select-none", className)}
      {...props}
    >
      <g transform="translate(-259.027 -270.659)">
        {/* White wedge in dark mode */}
        <path
          d="M316.012,308.843l9.164-9.164-9.164-9.164-1.751,8.672Z"
          className="hidden dark:block fill-white"
        />
        {/* Emblem C */}
        <path
          d="M287.745,328.1a28.727,28.727,0,1,1,20.318-49.035l-10.072,10.07a14.49,14.49,0,1,0,0,20.494l10.072,10.069A28.644,28.644,0,0,1,287.745,328.1Z"
          className="fill-[#042479] dark:fill-white transition-colors"
        />
        {/* Wordmark Letters: ENTVIS */}
        <g className="fill-[#042479] dark:fill-white transition-colors">
          <path d="M311.15,272.632h43.228V285.3H325.892v8.138h25.8v11.748h-25.8v8.523h28.87V326.38H311.15Z" />
          <path d="M359.294,272.632h13.9l22.113,28.41v-28.41h14.742V326.38H396.994l-22.957-29.485V326.38H359.294Z" />
          <path d="M429.628,285.686H413.5V272.632h47.145v13.054H444.524V326.38h-14.9Z" />
          <path d="M462.877,272.632h16.661l12.209,34.014,12.208-34.014H520.31L498.5,326.764H484.683Z" />
          <path d="M522,272.632h14.973V326.38H522Z" />
          <path d="M539.663,318.395l8.291-9.906a27.68,27.68,0,0,0,17.43,6.45c3.992,0,6.143-1.381,6.143-3.685V311.1c0-2.227-1.766-3.456-9.061-5.145-11.44-2.611-20.27-5.836-20.27-16.893v-.153c0-9.981,7.909-17.2,20.808-17.2,9.137,0,16.278,2.457,22.114,7.141l-7.449,10.519c-4.914-3.455-10.289-5.3-15.048-5.3-3.61,0-5.375,1.535-5.375,3.455v.154c0,2.457,1.842,3.532,9.29,5.221,12.362,2.687,20.04,6.68,20.04,16.739v.153c0,10.979-8.676,17.507-21.729,17.507C555.326,327.3,546.265,324.307,539.663,318.395Z" />
        </g>
        {/* Accent Orange Chevron */}
        <g fill="#fff" strokeMiterlimit="10">
          <path
            d="M 311.17236328125 314.1929931640625 L 303.8052368164062 306.7142944335938 L 310.0099182128906 300.7434692382812 L 311.3836059570312 299.4215393066406 L 310.0365600585938 298.0724487304688 L 303.7350158691406 291.7612915039062 L 311.2138366699219 284.3938903808594 L 326.3656311035156 299.5722045898438 L 311.17236328125 314.1929931640625 Z"
            stroke="none"
            className="fill-white dark:fill-slate-900"
          />
          <path
            d="M 311.20751953125 311.5616760253906 L 323.6943054199219 299.54541015625 L 311.2027893066406 287.0320129394531 L 306.3908386230469 291.7722473144531 L 314.0551147460938 299.4482116699219 L 306.4674987792969 306.7498779296875 L 311.20751953125 311.5616760253906 M 311.13720703125 316.8243103027344 L 301.1430053710938 306.6787414550781 L 308.7121276855469 299.3948669433594 L 301.0791931152344 291.7503051757812 L 311.2248840332031 281.7557678222656 L 329.0369567871094 299.5990295410156 L 311.13720703125 316.8243103027344 Z"
            stroke="none"
            fill="#f6ab40"
          />
        </g>
      </g>
    </svg>
  );
}

/**
 * Centraxis Brand Logo
 * Combines the official Centvis emblem + Centraxis wordmark + by Centvis badge.
 */
export function CentraxisLogo({
  size = "md",
  showWordmark = true,
  showBadge = true,
  variant = "centraxis",
  className,
  ...props
}: LogoProps) {
  const sizeStyles = {
    sm: {
      box: "h-7 w-7",
      iconSize: 20,
      text: "text-base",
      badge: "text-[9px] px-1 py-0.2",
      gap: "gap-2",
      centvisHeight: 20,
    },
    md: {
      box: "h-9 w-9",
      iconSize: 24,
      text: "text-lg",
      badge: "text-[10px] px-1.5 py-0.5",
      gap: "gap-2.5",
      centvisHeight: 24,
    },
    lg: {
      box: "h-12 w-12",
      iconSize: 32,
      text: "text-2xl",
      badge: "text-xs px-2 py-0.5",
      gap: "gap-3",
      centvisHeight: 30,
    },
  }[size];

  if (variant === "centvis") {
    return (
      <div className={cn("flex items-center", className)} {...props}>
        <CentvisLogo height={sizeStyles.centvisHeight} />
      </div>
    );
  }

  return (
    <div
      className={cn("flex items-center select-none", sizeStyles.gap, className)}
      {...props}
    >
      {/* Official Centvis Brand Emblem */}
      <div
        className={cn(
          "relative flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm shrink-0 p-1 transition-transform group-hover:scale-105",
          sizeStyles.box,
        )}
      >
        <CentvisEmblem size={sizeStyles.iconSize} />
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
                "rounded-md border border-[#042479]/20 bg-[#042479]/5 dark:border-amber-500/20 dark:bg-amber-500/10 font-bold uppercase tracking-wider text-[#042479] dark:text-amber-400 font-mono",
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
