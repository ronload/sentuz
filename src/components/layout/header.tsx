"use client";

import * as React from "react";
import { Search, Menu } from "lucide-react";
import { Kbd } from "@/components/ui/kbd";
import { useIsMobile } from "@/hooks/use-mobile";

interface HeaderProps {
  onSearch?: (query: string) => void;
  onMenuClick?: () => void;
}

export function Header({ onSearch, onMenuClick }: HeaderProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const isMobile = useIsMobile();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchQuery);
  };

  return (
    <form
      onSubmit={handleSearch}
      className="bg-card flex h-12 items-center gap-3 rounded-xl px-4 shadow-sm"
    >
      {isMobile ? (
        <button type="button" onClick={onMenuClick} className="shrink-0">
          <Menu className="text-muted-foreground h-4 w-4" />
        </button>
      ) : (
        <Search className="text-muted-foreground h-4 w-4 shrink-0" />
      )}
      <input
        type="search"
        placeholder="Search emails..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="placeholder:text-muted-foreground flex-1 bg-transparent text-sm outline-none"
      />
      <Kbd className="hidden md:flex">/</Kbd>
    </form>
  );
}
