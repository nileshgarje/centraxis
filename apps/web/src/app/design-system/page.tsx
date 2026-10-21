"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  CentraxisLogo,
  CentvisLogo,
  CentvisEmblem,
  ThemeToggle,
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Input,
  Textarea,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Checkbox,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Separator,
  Skeleton,
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
  toast,
} from "@centraxis/ui";
import {
  Sparkles,
  Layers,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Info,
  Clock,
  ExternalLink,
  Code2,
  Calendar as CalendarIcon,
  Bell,
  Terminal,
} from "lucide-react";

export default function DesignSystemKitchenSinkPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground antialiased transition-colors duration-200">
      {/* Top Sticky Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="flex items-center hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
              title="Centvis"
            >
              <CentvisLogo height={26} />
            </Link>
            <span className="hidden sm:inline-block text-xs font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              Design System v2.0
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-1.5">
                <span>Back to App</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6 md:p-10 space-y-12">
        {/* Hero Section */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-400">
            <Sparkles className="h-3.5 w-3.5" />
            <span>
              Centvis Electric Indigo Design Tokens & shadcn/ui Primitives
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Centraxis Design System
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base max-w-3xl leading-relaxed">
            A developer-first, linear-inspired design system engineered for
            enterprise Agile planning, high-contrast readability, and real-time
            sprint execution. Default dark mode with seamless light mode theme
            support.
          </p>
        </div>

        {/* Section 1: Brand Identity & Logo Variants */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <div>
              <h2 className="text-xl font-bold tracking-tight">
                1. Brand Identity & Convergence Axis
              </h2>
              <p className="text-xs text-muted-foreground">
                Centvis brand DNA icon and typography size variants
              </p>
            </div>
            <Badge variant="outline" className="font-mono text-[10px]">
              packages/ui/src/components/brand/logo.tsx
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription className="text-xs font-mono uppercase tracking-wider">
                  Centvis Brand Logo
                </CardDescription>
                <CardTitle className="text-base">Official SVG Vector</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-center p-6 bg-muted/20 rounded-b-xl">
                <CentvisLogo height={26} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription className="text-xs font-mono uppercase tracking-wider">
                  Size: Large (lg)
                </CardDescription>
                <CardTitle className="text-base">Login & Splash</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-center p-6 bg-muted/20 rounded-b-xl">
                <CentraxisLogo size="lg" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription className="text-xs font-mono uppercase tracking-wider">
                  Size: Medium (md)
                </CardDescription>
                <CardTitle className="text-base">Navbar & Headers</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-center p-6 bg-muted/20 rounded-b-xl">
                <CentraxisLogo size="md" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription className="text-xs font-mono uppercase tracking-wider">
                  Size: Small (sm)
                </CardDescription>
                <CardTitle className="text-base">Sidebar & Compact</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-center p-6 bg-muted/20 rounded-b-xl">
                <CentraxisLogo size="sm" />
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Section 2: Color Palette & Custom Centvis Tokens */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <div>
              <h2 className="text-xl font-bold tracking-tight">
                2. Color Palette & Status Tokens
              </h2>
              <p className="text-xs text-muted-foreground">
                High-contrast primary electric indigo, neutrals, and status
                indicators
              </p>
            </div>
          </div>

          {/* Primary & Surface Swatches */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Core Surface & Brand Accents
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
              <div className="rounded-lg border border-border p-3 space-y-2 bg-card">
                <div className="h-10 rounded-md bg-primary shadow-xs" />
                <div className="text-xs font-medium">Primary Accent</div>
                <div className="text-[10px] text-muted-foreground font-mono">
                  hsl(245, 82%, 62%)
                </div>
              </div>

              <div className="rounded-lg border border-border p-3 space-y-2 bg-card">
                <div className="h-10 rounded-md bg-background border border-border shadow-xs" />
                <div className="text-xs font-medium">Background</div>
                <div className="text-[10px] text-muted-foreground font-mono">
                  hsl(224, 71%, 4%)
                </div>
              </div>

              <div className="rounded-lg border border-border p-3 space-y-2 bg-card">
                <div className="h-10 rounded-md bg-card border border-border shadow-xs" />
                <div className="text-xs font-medium">Surface Card</div>
                <div className="text-[10px] text-muted-foreground font-mono">
                  hsl(224, 71%, 6%)
                </div>
              </div>

              <div className="rounded-lg border border-border p-3 space-y-2 bg-card">
                <div className="h-10 rounded-md bg-secondary text-secondary-foreground flex items-center justify-center font-bold text-xs" />
                <div className="text-xs font-medium">Secondary</div>
                <div className="text-[10px] text-muted-foreground font-mono">
                  hsl(224, 30%, 12%)
                </div>
              </div>

              <div className="rounded-lg border border-border p-3 space-y-2 bg-card">
                <div className="h-10 rounded-md bg-muted text-muted-foreground flex items-center justify-center font-bold text-xs" />
                <div className="text-xs font-medium">Muted Neutral</div>
                <div className="text-[10px] text-muted-foreground font-mono">
                  hsl(224, 30%, 12%)
                </div>
              </div>

              <div className="rounded-lg border border-border p-3 space-y-2 bg-card">
                <div className="h-10 rounded-md bg-destructive text-destructive-foreground shadow-xs" />
                <div className="text-xs font-medium">Destructive</div>
                <div className="text-[10px] text-muted-foreground font-mono">
                  hsl(0, 84%, 60%)
                </div>
              </div>
            </div>
          </div>

          {/* Work Item Status Tokens */}
          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Work Item Status Tokens
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              <div className="rounded-lg border border-border p-3 space-y-2 bg-card">
                <Badge
                  variant="status-backlog"
                  className="w-full justify-center py-1"
                >
                  BACKLOG
                </Badge>
                <div className="text-xs font-medium text-center">Backlog</div>
                <div className="text-[10px] text-muted-foreground text-center font-mono">
                  Slate Neutral
                </div>
              </div>

              <div className="rounded-lg border border-border p-3 space-y-2 bg-card">
                <Badge
                  variant="status-todo"
                  className="w-full justify-center py-1"
                >
                  TO DO
                </Badge>
                <div className="text-xs font-medium text-center">To Do</div>
                <div className="text-[10px] text-muted-foreground text-center font-mono">
                  Sky Blue
                </div>
              </div>

              <div className="rounded-lg border border-border p-3 space-y-2 bg-card">
                <Badge
                  variant="status-in-progress"
                  className="w-full justify-center py-1"
                >
                  IN PROGRESS
                </Badge>
                <div className="text-xs font-medium text-center">
                  In Progress
                </div>
                <div className="text-[10px] text-muted-foreground text-center font-mono">
                  Amber Yellow
                </div>
              </div>

              <div className="rounded-lg border border-border p-3 space-y-2 bg-card">
                <Badge
                  variant="status-in-review"
                  className="w-full justify-center py-1"
                >
                  IN REVIEW
                </Badge>
                <div className="text-xs font-medium text-center">In Review</div>
                <div className="text-[10px] text-muted-foreground text-center font-mono">
                  Violet Purple
                </div>
              </div>

              <div className="rounded-lg border border-border p-3 space-y-2 bg-card">
                <Badge
                  variant="status-done"
                  className="w-full justify-center py-1"
                >
                  DONE
                </Badge>
                <div className="text-xs font-medium text-center">Done</div>
                <div className="text-[10px] text-muted-foreground text-center font-mono">
                  Emerald Green
                </div>
              </div>
            </div>
          </div>

          {/* Priority Tokens */}
          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Priority Indicators
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg border border-border p-3 space-y-2 bg-card">
                <Badge
                  variant="priority-low"
                  className="w-full justify-center py-1"
                >
                  LOW PRIORITY
                </Badge>
                <div className="text-[10px] text-muted-foreground text-center font-mono">
                  Slate / Informal
                </div>
              </div>

              <div className="rounded-lg border border-border p-3 space-y-2 bg-card">
                <Badge
                  variant="priority-medium"
                  className="w-full justify-center py-1"
                >
                  MEDIUM PRIORITY
                </Badge>
                <div className="text-[10px] text-muted-foreground text-center font-mono">
                  Blue / Standard
                </div>
              </div>

              <div className="rounded-lg border border-border p-3 space-y-2 bg-card">
                <Badge
                  variant="priority-high"
                  className="w-full justify-center py-1"
                >
                  HIGH PRIORITY
                </Badge>
                <div className="text-[10px] text-muted-foreground text-center font-mono">
                  Orange / Important
                </div>
              </div>

              <div className="rounded-lg border border-border p-3 space-y-2 bg-card">
                <Badge
                  variant="priority-urgent"
                  className="w-full justify-center py-1"
                >
                  URGENT / BLOCKER
                </Badge>
                <div className="text-[10px] text-muted-foreground text-center font-mono">
                  Rose / Critical
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Button Variants & Interactive Controls */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <div>
              <h2 className="text-xl font-bold tracking-tight">
                3. Button Variants & Feedback Triggers
              </h2>
              <p className="text-xs text-muted-foreground">
                New York style buttons with custom electric indigo primary
              </p>
            </div>
          </div>

          <Card>
            <CardContent className="p-6 space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="default">Primary Default</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="subtle">Subtle Indigo</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="link">Link Style</Button>
              </div>

              <Separator />

              {/* Sizes and Icon Integrations */}
              <div className="flex flex-wrap items-center gap-3">
                <Button size="sm">Small (sm)</Button>
                <Button size="default">Default</Button>
                <Button size="lg">Large (lg)</Button>
                <Button size="icon" variant="outline" title="Settings">
                  <Terminal className="h-4 w-4" />
                </Button>
                <Button variant="default" className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  <span>Generate with AI</span>
                </Button>
              </div>

              <Separator />

              {/* Sonner Toast Triggers */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase">
                  Interactive Sonner Toasts
                </span>
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      toast.success("Sprint 3 started successfully!", {
                        description:
                          "12 stories committed (34 total story points).",
                      })
                    }
                  >
                    Trigger Success Toast
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      toast.error("Subtask Guardrail Triggered", {
                        description:
                          "Cannot complete story while subtasks remain unfinished.",
                      })
                    }
                  >
                    Trigger Error Toast
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      toast.info("Auto-Rollover Activated", {
                        description:
                          "2 incomplete tasks moved to next planned sprint.",
                      })
                    }
                  >
                    Trigger Info Toast
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Section 4: Overlays & Modals (Dialog, Sheet, AlertDialog) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <div>
              <h2 className="text-xl font-bold tracking-tight">
                4. Overlays & Dialogs
              </h2>
              <p className="text-xs text-muted-foreground">
                Accessible Radix UI modal dialogs, slide-out sheets, and
                confirmation alerts
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Modal Dialog */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Modal Dialog</CardTitle>
                <CardDescription>
                  Centered overlay dialog with backdrop blur
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      Open Dialog
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Centraxis Work Item Dialog</DialogTitle>
                      <DialogDescription>
                        Create or edit tasks with full Markdown support and
                        acceptance criteria.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold">Title</label>
                        <Input placeholder="e.g. Implement Entra ID OAuth Provider" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold">Type</label>
                        <Select defaultValue="STORY">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="EPIC">Epic</SelectItem>
                            <SelectItem value="FEATURE">Feature</SelectItem>
                            <SelectItem value="STORY">User Story</SelectItem>
                            <SelectItem value="TASK">Task</SelectItem>
                            <SelectItem value="BUG">Bug</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setIsDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => {
                          setIsDialogOpen(false);
                          toast.success("Saved!");
                        }}
                      >
                        Create Item
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>

            {/* Slide-out Sheet */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Slide-Out Sheet</CardTitle>
                <CardDescription>
                  Right-anchored drawer for work item detail panels
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="w-full">
                      Open Drawer Sheet
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right">
                    <SheetHeader>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-primary">
                          CTX-101
                        </span>
                        <Badge variant="status-in-progress">In Progress</Badge>
                      </div>
                      <SheetTitle>
                        Configure NextAuth Session Adapter
                      </SheetTitle>
                      <SheetDescription>
                        Inspect details, assignees, subtasks, and lowlight code
                        snippets.
                      </SheetDescription>
                    </SheetHeader>
                    <div className="py-4 space-y-4">
                      <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-1 font-mono">
                        <div>Assignee: Alex Morgan</div>
                        <div>Sprint: Sprint 1 (Active)</div>
                        <div>Estimate: 5 Story Points</div>
                      </div>
                    </div>
                    <SheetFooter>
                      <Button onClick={() => setIsSheetOpen(false)}>
                        Close Drawer
                      </Button>
                    </SheetFooter>
                  </SheetContent>
                </Sheet>
              </CardContent>
            </Card>

            {/* Confirmation Alert Dialog */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Alert Dialog</CardTitle>
                <CardDescription>
                  Destructive and confirmation modal
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full">
                      Delete Sprint...
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Are you absolutely sure?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. All incomplete items will
                        be returned to the unassigned backlog.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => toast.success("Sprint deleted")}
                      >
                        Confirm Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Section 5: Inputs, Forms & Selects */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <div>
              <h2 className="text-xl font-bold tracking-tight">
                5. Inputs, Controls & Form Components
              </h2>
              <p className="text-xs text-muted-foreground">
                High-contrast inputs with focus ring styling
              </p>
            </div>
          </div>

          <Card>
            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Standard Text Input
                  </label>
                  <Input placeholder="Enter work item title..." />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Select Dropdown
                  </label>
                  <Select defaultValue="medium">
                    <SelectTrigger>
                      <SelectValue placeholder="Select Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low Priority</SelectItem>
                      <SelectItem value="medium">Medium Priority</SelectItem>
                      <SelectItem value="high">High Priority</SelectItem>
                      <SelectItem value="urgent">Urgent Priority</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox id="terms" defaultChecked />
                  <label
                    htmlFor="terms"
                    className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Enforce Subtask Completion Guardrail on Board
                  </label>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Rich Textarea
                </label>
                <Textarea
                  rows={5}
                  placeholder="Provide markdown description, Gherkin acceptance criteria, or technical implementation notes..."
                  defaultValue="## Feature Brief&#10;Implement Microsoft Entra ID corporate SSO authentication with tenant validation."
                />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Section 6: Structure & Navigation (Tabs, Accordion, Table) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <div>
              <h2 className="text-xl font-bold tracking-tight">
                6. Navigation & Structure
              </h2>
              <p className="text-xs text-muted-foreground">
                Tab navigation, collapsible accordions, and data tables
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tabs Showcase */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tabs Component</CardTitle>
                <CardDescription>
                  Switch between view modes seamlessly
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="board">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="board">Active Board</TabsTrigger>
                    <TabsTrigger value="backlog">Backlog</TabsTrigger>
                    <TabsTrigger value="metrics">Burndown</TabsTrigger>
                  </TabsList>
                  <TabsContent
                    value="board"
                    className="p-4 rounded-lg border border-border mt-3 text-xs text-muted-foreground"
                  >
                    Kanban board preview with 4 status lanes (To Do, In
                    Progress, In Review, Done).
                  </TabsContent>
                  <TabsContent
                    value="backlog"
                    className="p-4 rounded-lg border border-border mt-3 text-xs text-muted-foreground"
                  >
                    Hierarchical backlog tree with Epics, Stories, and inline
                    quick-add rows.
                  </TabsContent>
                  <TabsContent
                    value="metrics"
                    className="p-4 rounded-lg border border-border mt-3 text-xs text-muted-foreground"
                  >
                    Sprint burndown chart and rolling velocity calculations.
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Accordion Showcase */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Accordion Component</CardTitle>
                <CardDescription>
                  Smooth animated disclosures for settings and FAQs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible defaultValue="item-1">
                  <AccordionItem value="item-1">
                    <AccordionTrigger>
                      What is the Centvis Convergence Axis?
                    </AccordionTrigger>
                    <AccordionContent>
                      The convergence axis emblem represents the intersection of
                      multi-project orchestration, autonomous AI story agents,
                      and real-time developer workflows.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-2">
                    <AccordionTrigger>
                      How does optimistic drag-and-drop sync work?
                    </AccordionTrigger>
                    <AccordionContent>
                      Changes to work item status or rank order update client
                      state immediately while mutating tRPC endpoints
                      asynchronously in the background.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border pt-8 pb-16 text-center text-xs text-muted-foreground">
          <p>
            © 2026 Centvis Technologies. All rights reserved. Centraxis
            Enterprise Agile Platform.
          </p>
        </footer>
      </main>
    </div>
  );
}
