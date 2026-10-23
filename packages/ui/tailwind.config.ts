import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export const centraxisTailwindConfig = {
  darkMode: ["class"],
  content: [
    "./src/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
    "../../apps/web/src/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        status: {
          backlog: "hsl(var(--status-backlog))",
          "backlog-bg": "hsl(var(--status-backlog-bg))",
          todo: "hsl(var(--status-todo))",
          "todo-bg": "hsl(var(--status-todo-bg))",
          "in-progress": "hsl(var(--status-in-progress))",
          "in-progress-bg": "hsl(var(--status-in-progress-bg))",
          "in-review": "hsl(var(--status-in-review))",
          "in-review-bg": "hsl(var(--status-in-review-bg))",
          done: "hsl(var(--status-done))",
          "done-bg": "hsl(var(--status-done-bg))",
        },
        priority: {
          low: "hsl(var(--priority-low))",
          medium: "hsl(var(--priority-medium))",
          high: "hsl(var(--priority-high))",
          urgent: "hsl(var(--priority-urgent))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        centvis: {
          50: "#f0f0ff",
          100: "#e4e3ff",
          200: "#ccbaff",
          300: "#af8fff",
          400: "#8f5eff",
          500: "#7033ff",
          600: "#5b19f0",
          700: "#490ec7",
          800: "#3d0ea4",
          900: "#340f84",
          950: "#1d0554",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;

export default centraxisTailwindConfig;
