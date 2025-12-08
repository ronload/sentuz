"use client";

import * as React from "react";
import {
  Inbox,
  Star,
  Send,
  FileText,
  AlertCircle,
  AlertTriangle,
  Trash2,
  Settings,
  ChevronDown,
  Plus,
  Sun,
  Moon,
  Languages,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { Kbd } from "@/components/ui/kbd";
import { useI18n } from "@/lib/i18n";

interface Account {
  id: string;
  email: string;
  provider: string;
  image?: string;
}

type FolderType = "inbox" | "starred" | "sent" | "drafts" | "important" | "spam" | "trash";

interface AppSidebarProps {
  accounts: Account[];
  selectedAccountId?: string;
  selectedFolder?: FolderType;
  onSelectAccount: (accountId: string) => void;
  onSelectFolder: (folder: FolderType) => void;
  onAddAccount: () => void;
}

export function AppSidebar({
  accounts,
  selectedAccountId,
  selectedFolder,
  onSelectAccount,
  onSelectFolder,
  onAddAccount,
}: AppSidebarProps) {
  const { t, locale, setLocale } = useI18n();
  const { theme, setTheme } = useTheme();

  const selectedAccount = accounts.find((acc) => acc.id === selectedAccountId) || accounts[0];
  const displayEmail = selectedAccount?.email || "";

  return (
    <aside className="flex w-72 shrink-0 flex-col gap-4 p-4">
      {/* Account selector */}
      <DropdownMenu>
        <DropdownMenuTrigger className="flex h-12 w-full items-center gap-3 rounded-xl bg-card px-4 shadow-sm">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage src={selectedAccount?.image} />
            <AvatarFallback className="bg-foreground text-background text-xs">
              {displayEmail[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="flex-1 truncate text-left text-sm">
            {displayEmail}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          {accounts.map((account) => (
            <DropdownMenuItem
              key={account.id}
              onClick={() => onSelectAccount(account.id)}
              className={selectedAccountId === account.id ? "bg-accent" : ""}
            >
              <Avatar className="mr-2 h-6 w-6">
                <AvatarImage src={account.image} />
                <AvatarFallback className="text-xs">
                  {account.email[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{account.email}</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onAddAccount}>
            <Plus className="mr-2 h-4 w-4" />
            {t.sidebar.addAccount}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Menu items */}
      <div className="flex-1 rounded-xl bg-card p-2 shadow-sm">
        <nav className="space-y-1">
          <button
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-accent",
              selectedFolder === "inbox" && "bg-accent"
            )}
            onClick={() => onSelectFolder("inbox")}
          >
            <Inbox className="h-4 w-4 text-muted-foreground" />
            <span className="flex-1 text-left">{t.sidebar.inbox}</span>
            <Kbd>⌘</Kbd><Kbd>1</Kbd>
          </button>
          <button
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-accent",
              selectedFolder === "starred" && "bg-accent"
            )}
            onClick={() => onSelectFolder("starred")}
          >
            <Star className="h-4 w-4 text-muted-foreground" />
            <span className="flex-1 text-left">{t.sidebar.starred}</span>
          </button>
          <button
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-accent",
              selectedFolder === "sent" && "bg-accent"
            )}
            onClick={() => onSelectFolder("sent")}
          >
            <Send className="h-4 w-4 text-muted-foreground" />
            <span className="flex-1 text-left">{t.sidebar.sent}</span>
          </button>
          <button
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-accent",
              selectedFolder === "drafts" && "bg-accent"
            )}
            onClick={() => onSelectFolder("drafts")}
          >
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="flex-1 text-left">{t.sidebar.drafts}</span>
          </button>
          <button
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-accent",
              selectedFolder === "important" && "bg-accent"
            )}
            onClick={() => onSelectFolder("important")}
          >
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
            <span className="flex-1 text-left">{t.sidebar.important}</span>
          </button>
          <button
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-accent",
              selectedFolder === "spam" && "bg-accent"
            )}
            onClick={() => onSelectFolder("spam")}
          >
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            <span className="flex-1 text-left">{t.sidebar.spam}</span>
          </button>
          <button
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-accent",
              selectedFolder === "trash" && "bg-accent"
            )}
            onClick={() => onSelectFolder("trash")}
          >
            <Trash2 className="h-4 w-4 text-muted-foreground" />
            <span className="flex-1 text-left">{t.sidebar.trash}</span>
          </button>

          {/* Settings with hover dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-accent">
              <Settings className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 text-left">{t.settings.settings}</span>
              <Kbd>⌘</Kbd><Kbd>S</Kbd>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="right" className="w-48">
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  {theme === "dark" ? (
                    <Moon className="mr-2 h-4 w-4" />
                  ) : (
                    <Sun className="mr-2 h-4 w-4" />
                  )}
                  <span>{t.settings.theme}</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => setTheme("light")}>
                    <Sun className="mr-2 h-4 w-4" />
                    {t.settings.light}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("dark")}>
                    <Moon className="mr-2 h-4 w-4" />
                    {t.settings.dark}
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Languages className="mr-2 h-4 w-4" />
                  <span>{t.settings.language}</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => setLocale("en")}>
                    English
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocale("zh")}>
                    繁體中文
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
      </div>
    </aside>
  );
}
