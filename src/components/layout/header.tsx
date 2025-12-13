"use client";

import * as React from "react";
import { Search, Menu } from "lucide-react";
import { Kbd } from "@/components/ui/kbd";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  onSearch?: (query: string) => void;
  onMenuClick?: () => void;
  showMenuButton?: boolean;
}

export function Header({ onSearch, onMenuClick, showMenuButton }: HeaderProps) {
  const [searchQuery, setSearchQuery] = React.useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchQuery);
  };

  return (
    <div className="flex items-center gap-2">
      {showMenuButton && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="bg-card h-12 w-12 shrink-0 rounded-xl shadow-sm"
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}
      <form
        onSubmit={handleSearch}
        className="bg-card flex h-12 flex-1 items-center gap-3 rounded-xl px-4 shadow-sm"
      >
        <Search className="text-muted-foreground h-4 w-4 shrink-0" />
        <input
          type="search"
          placeholder="Search emails..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="placeholder:text-muted-foreground flex-1 bg-transparent text-sm outline-none"
        />
        <Kbd className="hidden md:flex">/</Kbd>
      </form>
    </div>
  );
}
