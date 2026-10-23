"use client";

import React, { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@centraxis/ui";

interface CommandSearchInputProps {
  onOpen?: () => void;
  className?: string;
}

export function CommandSearchInput({
  onOpen,
  className = "",
}: CommandSearchInputProps) {
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().indexOf("MAC") >= 0);
  }, []);

  const handleClick = () => {
    if (onOpen) {
      onOpen();
    } else {
      window.dispatchEvent(new CustomEvent("open-command-menu"));
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      data-testid="command-search-button"
      onClick={handleClick}
      className={`relative h-8 w-40 sm:w-64 justify-start rounded-md bg-muted/40 text-xs font-normal text-muted-foreground shadow-none hover:bg-muted/70 hover:text-foreground ${className}`}
    >
      <Search className="mr-2 h-3.5 w-3.5" />
      <span className="hidden sm:inline-block">Search workspace...</span>
      <span className="inline-block sm:hidden">Search...</span>
      <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-5 select-none items-center gap-1 rounded border border-border bg-background px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
        <span>{isMac ? "⌘" : "Ctrl"}</span>K
      </kbd>
    </Button>
  );
}
