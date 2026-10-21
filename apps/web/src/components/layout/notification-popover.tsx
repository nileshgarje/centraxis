"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  AtSign,
  UserCheck,
  CheckCircle2,
  Clock,
  ExternalLink,
} from "lucide-react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  Button,
  Badge,
} from "@centraxis/ui";
import { api } from "~/trpc/react";

function formatRelativeTime(dateInput: Date | string): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Just now";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  return date.toLocaleDateString();
}

export function NotificationPopover() {
  const router = useRouter();
  const utils = api.useUtils();
  const [isOpen, setIsOpen] = useState(false);

  const { data: unreadData } = api.notification.getUnreadCount.useQuery(
    undefined,
    { refetchInterval: 15000 },
  );

  const { data: notifications = [], isLoading } =
    api.notification.listRecent.useQuery(undefined, {
      enabled: isOpen,
    });

  const markAsReadMutation = api.notification.markAsRead.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.notification.getUnreadCount.invalidate(),
        utils.notification.listRecent.invalidate(),
      ]);
    },
  });

  const markAllAsReadMutation = api.notification.markAllAsRead.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.notification.getUnreadCount.invalidate(),
        utils.notification.listRecent.invalidate(),
      ]);
    },
  });

  const unreadCount = unreadData?.count ?? 0;

  const handleNotificationClick = (item: (typeof notifications)[0]) => {
    if (!item.isRead) {
      markAsReadMutation.mutate({ notificationId: item.id });
    }
    setIsOpen(false);
    if (item.link) {
      router.push(item.link);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background hover:bg-muted text-foreground transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          title="Notifications & Mentions"
        >
          <Bell className="h-4 w-4 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground shadow-xs animate-in zoom-in-50">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 sm:w-96 p-0 shadow-2xl rounded-2xl border-border bg-popover overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-muted/20">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-foreground">
              Notifications
            </span>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-bold">
                {unreadCount} new
              </Badge>
            )}
          </div>

          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
              className="h-6 text-[11px] gap-1 px-2 text-muted-foreground hover:text-foreground"
            >
              <CheckCheck className="h-3 w-3" />
              <span>Mark all read</span>
            </Button>
          )}
        </div>

        {/* List */}
        <div className="max-h-[360px] overflow-y-auto divide-y divide-border/60">
          {isLoading ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-10 text-center px-4">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground mb-2">
                <Bell className="h-5 w-5 opacity-60" />
              </div>
              <p className="text-xs font-semibold text-foreground">
                No notifications right now
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                When teammates mention you in comments or assign tasks, you'll see them here.
              </p>
            </div>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                onClick={() => handleNotificationClick(item)}
                className={`group flex items-start gap-3 p-3 text-left transition cursor-pointer hover:bg-muted/40 ${
                  !item.isRead ? "bg-primary/5 dark:bg-primary/10" : ""
                }`}
              >
                <div
                  className={`mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg shrink-0 ${
                    item.type === "MENTION"
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                      : "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                  }`}
                >
                  <AtSign className="h-3.5 w-3.5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p className={`text-xs truncate ${!item.isRead ? "font-bold text-foreground" : "font-medium text-foreground/80"}`}>
                      {item.title}
                    </p>
                    <span className="text-[10px] text-muted-foreground shrink-0 flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      {formatRelativeTime(item.createdAt)}
                    </span>
                  </div>

                  <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 leading-snug">
                    {item.message}
                  </p>
                </div>

                {!item.isRead && (
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                )}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
