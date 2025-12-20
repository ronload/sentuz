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
  ChevronsUpDown,
  Plus,
  Sun,
  Moon,
  Languages,
  LogOut,
  User,
  ChevronRight,
} from "lucide-react";
import { signIn, signOut } from "next-auth/react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { useTheme } from "next-themes";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Kbd } from "@/components/ui/kbd";
import { useI18n } from "@/lib/i18n";

interface Account {
  id: string;
  email: string;
  provider: string;
  image?: string;
  needsReauth?: boolean;
}

type FolderType = "inbox" | "starred" | "sent" | "drafts" | "important" | "spam" | "trash";

interface AppSidebarProps {
  accounts: Account[];
  selectedAccountId?: string;
  selectedFolder?: FolderType;
  onSelectAccount: (accountId: string) => void;
  onSelectFolder: (folder: FolderType) => void;
  onAddAccount: () => void;
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export function AppSidebar({
  accounts,
  selectedAccountId,
  selectedFolder,
  onSelectAccount,
  onSelectFolder,
  onAddAccount,
  user,
}: AppSidebarProps) {
  const { t, setLocale } = useI18n();
  const { theme, setTheme } = useTheme();
  const [themeOpen, setThemeOpen] = React.useState(false);
  const [languageOpen, setLanguageOpen] = React.useState(false);

  const selectedAccount = accounts.find((acc) => acc.id === selectedAccountId) || accounts[0];
  const displayEmail = selectedAccount?.email || "";

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col gap-4 p-4">
      {/* Account selector */}
      <DropdownMenu>
        <DropdownMenuTrigger className="bg-card flex h-12 w-full items-center gap-3 rounded-xl px-4 shadow-sm">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage src={selectedAccount?.image} />
            <AvatarFallback className="bg-foreground text-background text-xs">
              {displayEmail[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="flex-1 truncate text-left text-sm">{displayEmail}</span>
          <ChevronsUpDown className="text-muted-foreground h-4 w-4 shrink-0" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          {accounts.map((account) => (
            <DropdownMenuItem
              key={account.id}
              onClick={() => {
                if (account.needsReauth) {
                  const provider =
                    account.provider === "google" ? "google" : "microsoft-entra-id";
                  signIn(provider);
                } else {
                  onSelectAccount(account.id);
                }
              }}
              className={selectedAccountId === account.id ? "bg-accent" : ""}
            >
              <Avatar className="mr-2 h-6 w-6">
                <AvatarImage src={account.image} />
                <AvatarFallback className="text-xs">
                  {account.email[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="flex-1 truncate">{account.email}</span>
              {account.needsReauth && (
                <span className="text-destructive ml-2 flex items-center gap-1 text-xs">
                  <AlertTriangle className="h-3 w-3" />
                  Reconnect
                </span>
              )}
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
      <div className="bg-card flex-1 rounded-xl p-2 shadow-sm">
        <nav className="space-y-1">
          <button
            className={cn(
              "hover:bg-accent flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm",
              selectedFolder === "inbox" && "bg-accent"
            )}
            onClick={() => onSelectFolder("inbox")}
          >
            <Inbox className="text-muted-foreground h-4 w-4" />
            <span className="flex-1 text-left">{t.sidebar.inbox}</span>
            <Kbd>⌘</Kbd>
            <Kbd>1</Kbd>
          </button>
          <button
            className={cn(
              "hover:bg-accent flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm",
              selectedFolder === "starred" && "bg-accent"
            )}
            onClick={() => onSelectFolder("starred")}
          >
            <Star className="text-muted-foreground h-4 w-4" />
            <span className="flex-1 text-left">{t.sidebar.starred}</span>
          </button>
          <button
            className={cn(
              "hover:bg-accent flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm",
              selectedFolder === "sent" && "bg-accent"
            )}
            onClick={() => onSelectFolder("sent")}
          >
            <Send className="text-muted-foreground h-4 w-4" />
            <span className="flex-1 text-left">{t.sidebar.sent}</span>
          </button>
          <button
            className={cn(
              "hover:bg-accent flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm",
              selectedFolder === "drafts" && "bg-accent"
            )}
            onClick={() => onSelectFolder("drafts")}
          >
            <FileText className="text-muted-foreground h-4 w-4" />
            <span className="flex-1 text-left">{t.sidebar.drafts}</span>
          </button>
          <button
            className={cn(
              "hover:bg-accent flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm",
              selectedFolder === "important" && "bg-accent"
            )}
            onClick={() => onSelectFolder("important")}
          >
            <AlertCircle className="text-muted-foreground h-4 w-4" />
            <span className="flex-1 text-left">{t.sidebar.important}</span>
          </button>
          <button
            className={cn(
              "hover:bg-accent flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm",
              selectedFolder === "spam" && "bg-accent"
            )}
            onClick={() => onSelectFolder("spam")}
          >
            <AlertTriangle className="text-muted-foreground h-4 w-4" />
            <span className="flex-1 text-left">{t.sidebar.spam}</span>
          </button>
          <button
            className={cn(
              "hover:bg-accent flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm",
              selectedFolder === "trash" && "bg-accent"
            )}
            onClick={() => onSelectFolder("trash")}
          >
            <Trash2 className="text-muted-foreground h-4 w-4" />
            <span className="flex-1 text-left">{t.sidebar.trash}</span>
          </button>

          {/* Account collapsible */}
          <Collapsible>
            <CollapsibleTrigger className="hover:bg-accent flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm">
              <User className="text-muted-foreground h-4 w-4" />
              <span className="flex-1 text-left">{t.sidebar.accounts}</span>
              <ChevronRight className="text-muted-foreground h-4 w-4 transition-transform duration-200 [[data-state=open]>&]:rotate-90" />
            </CollapsibleTrigger>
            <CollapsibleContent className="mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l px-2.5 py-0.5">
              {/* User info - no click action */}
              <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={user?.image || undefined} />
                  <AvatarFallback className="text-xs">
                    {(user?.name || "U")[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{user?.name || "User"}</span>
              </div>
              {/* Sign out */}
              <button
                className="text-destructive hover:bg-destructive/10 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm"
                onClick={() => signOut({ callbackUrl: "/login" })}
              >
                <LogOut className="h-4 w-4" />
                <span>{t.auth.signOut}</span>
              </button>
            </CollapsibleContent>
          </Collapsible>

          {/* Settings collapsible */}
          <Collapsible>
            <CollapsibleTrigger className="hover:bg-accent flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm">
              <Settings className="text-muted-foreground h-4 w-4" />
              <span className="flex-1 text-left">{t.settings.settings}</span>
              <ChevronRight className="text-muted-foreground h-4 w-4 transition-transform duration-200 [[data-state=open]>&]:rotate-90" />
            </CollapsibleTrigger>
            <CollapsibleContent className="mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l px-2.5 py-0.5">
              {/* Theme dropdown - hover trigger */}
              <DropdownMenu open={themeOpen} onOpenChange={setThemeOpen}>
                <DropdownMenuTrigger
                  className="hover:bg-accent flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm"
                  onMouseEnter={() => setThemeOpen(true)}
                  onMouseLeave={() => setThemeOpen(false)}
                >
                  {theme === "dark" ? (
                    <Moon className="text-muted-foreground h-4 w-4" />
                  ) : (
                    <Sun className="text-muted-foreground h-4 w-4" />
                  )}
                  <span className="flex-1 text-left">{t.settings.theme}</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  side="right"
                  onMouseEnter={() => setThemeOpen(true)}
                  onMouseLeave={() => setThemeOpen(false)}
                >
                  <DropdownMenuItem onClick={() => setTheme("light")}>
                    <Sun className="mr-2 h-4 w-4" />
                    {t.settings.light}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("dark")}>
                    <Moon className="mr-2 h-4 w-4" />
                    {t.settings.dark}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {/* Language dropdown - hover trigger */}
              <DropdownMenu open={languageOpen} onOpenChange={setLanguageOpen}>
                <DropdownMenuTrigger
                  className="hover:bg-accent flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm"
                  onMouseEnter={() => setLanguageOpen(true)}
                  onMouseLeave={() => setLanguageOpen(false)}
                >
                  <Languages className="text-muted-foreground h-4 w-4" />
                  <span className="flex-1 text-left">{t.settings.language}</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  side="right"
                  onMouseEnter={() => setLanguageOpen(true)}
                  onMouseLeave={() => setLanguageOpen(false)}
                >
                  <DropdownMenuItem onClick={() => setLocale("en")}>English</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocale("zh")}>繁體中文</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CollapsibleContent>
          </Collapsible>
        </nav>
      </div>
    </aside>
  );
}
