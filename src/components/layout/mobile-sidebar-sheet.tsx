"use client";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { AppSidebar } from "./app-sidebar";

interface Account {
  id: string;
  email: string;
  provider: string;
  image?: string;
}

type FolderType = "inbox" | "starred" | "sent" | "drafts" | "important" | "spam" | "trash";

interface MobileSidebarSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

export function MobileSidebarSheet({
  open,
  onOpenChange,
  accounts,
  selectedAccountId,
  selectedFolder,
  onSelectAccount,
  onSelectFolder,
  onAddAccount,
  user,
}: MobileSidebarSheetProps) {
  const handleSelectAccount = (accountId: string) => {
    onSelectAccount(accountId);
    onOpenChange(false);
  };

  const handleSelectFolder = (folder: FolderType) => {
    onSelectFolder(folder);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-72 p-0">
        <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
        <AppSidebar
          accounts={accounts}
          selectedAccountId={selectedAccountId}
          selectedFolder={selectedFolder}
          onSelectAccount={handleSelectAccount}
          onSelectFolder={handleSelectFolder}
          onAddAccount={onAddAccount}
          user={user}
        />
      </SheetContent>
    </Sheet>
  );
}
