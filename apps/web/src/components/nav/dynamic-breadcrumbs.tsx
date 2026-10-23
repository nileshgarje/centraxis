"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, FolderKanban } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@centraxis/ui";
import { api } from "~/trpc/react";

interface DynamicBreadcrumbsProps {
  clientSlug: string;
}

export function DynamicBreadcrumbs({ clientSlug }: DynamicBreadcrumbsProps) {
  const pathname = usePathname();

  const { data: client } = api.clients.getBySlug.useQuery(
    { slug: clientSlug },
    { enabled: !!clientSlug },
  );

  const parts = pathname.split("/").filter(Boolean);
  // Path format:
  // /clientSlug
  // /clientSlug/projectKey/board
  // /clientSlug/projectKey/backlog
  // /clientSlug/settings/...

  let projectKey: string | null = null;
  let screen: string | null = null;

  if (parts.length >= 2) {
    if (parts[1] === "settings") {
      screen = parts.slice(1).join(" / ");
    } else {
      projectKey = parts[1]!.toUpperCase();
      if (parts.length >= 3) {
        screen = parts[2]!.charAt(0).toUpperCase() + parts[2]!.slice(1);
      } else {
        screen = "Overview";
      }
    }
  }

  return (
    <Breadcrumb className="hidden sm:block">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link
              href={`/${clientSlug}`}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <Building2 className="size-3.5" />
              <span>{client?.name || clientSlug}</span>
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {projectKey && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link
                  href={`/${clientSlug}/${projectKey}/board`}
                  className="flex items-center gap-1.5 text-xs font-mono font-medium text-muted-foreground hover:text-foreground"
                >
                  <FolderKanban className="size-3.5 text-primary" />
                  <span>{projectKey}</span>
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
          </>
        )}

        {screen && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="text-xs font-semibold text-foreground">
                {screen}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
