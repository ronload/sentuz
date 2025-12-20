"use client";

import * as React from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Header } from "@/components/layout/header";
import { MobileSidebarSheet } from "@/components/layout/mobile-sidebar-sheet";
import { MobileDetailHeader } from "@/components/layout/mobile-detail-header";
import {
  EmailList,
  type EmailViewMode,
  type DateFilter,
  type Email,
} from "@/components/email/email-list";
import { EmailThreadView } from "@/components/email/email-thread-view";
import { ComposeDialog } from "@/components/email/compose-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useFolders, useEmails, useEmailThread, useEmailActions } from "@/hooks/use-emails";
import { useInitialData } from "@/hooks/use-initial-data";
import { useEmailPolling } from "@/hooks/use-email-polling";
import { useI18n } from "@/lib/i18n";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

// localStorage keys for persisting user preferences
const STORAGE_KEYS = {
  SELECTED_ACCOUNT: "sentuz-selected-account",
  SELECTED_FOLDER_TYPE: "sentuz-selected-folder-type",
} as const;

type FolderType = "inbox" | "starred" | "sent" | "drafts" | "important" | "spam" | "trash";

interface User {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

interface DashboardClientProps {
  user: User;
}

export function DashboardClient({ user }: DashboardClientProps) {
  const { t } = useI18n();
  const isMobile = useIsMobile();

  // Mobile navigation state
  const [mobileView, setMobileView] = React.useState<"list" | "detail">("list");
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const [selectedAccountId, setSelectedAccountIdState] = React.useState<string>();
  const [selectedFolderId, setSelectedFolderId] = React.useState<string>();
  const [selectedFolderType, setSelectedFolderTypeState] = React.useState<FolderType>(() => {
    if (typeof window === "undefined") return "inbox";
    return (localStorage.getItem(STORAGE_KEYS.SELECTED_FOLDER_TYPE) as FolderType) || "inbox";
  });

  // Wrapper for setSelectedAccountId that persists to localStorage
  const setSelectedAccountId = React.useCallback((id: string | undefined) => {
    setSelectedAccountIdState(id);
    if (id) {
      localStorage.setItem(STORAGE_KEYS.SELECTED_ACCOUNT, id);
    }
  }, []);

  // Wrapper for setSelectedFolderType that persists to localStorage
  const setSelectedFolderType = React.useCallback((type: FolderType) => {
    setSelectedFolderTypeState(type);
    localStorage.setItem(STORAGE_KEYS.SELECTED_FOLDER_TYPE, type);
  }, []);
  const [selectedEmailId, setSelectedEmailId] = React.useState<string>();
  const [selectedThreadId, setSelectedThreadId] = React.useState<string>();
  const [searchQuery, setSearchQuery] = React.useState<string>();
  const [composeOpen, setComposeOpen] = React.useState(false);
  const [composeMode, setComposeMode] = React.useState<"compose" | "reply" | "forward">("compose");
  const [composeInitialData, setComposeInitialData] = React.useState<{
    to?: string[];
    cc?: string[];
    subject?: string;
    content?: string;
  }>();
  const [replyToEmailId, setReplyToEmailId] = React.useState<string>();
  const [emailViewMode, setEmailViewMode] = React.useState<EmailViewMode>("list");
  const [dateFilter, setDateFilter] = React.useState<DateFilter>("today");

  // Unsubscribe state
  const [unsubscribeDialogOpen, setUnsubscribeDialogOpen] = React.useState(false);
  const [pendingUnsubscribe, setPendingUnsubscribe] = React.useState<{
    id: string;
    url: string;
  } | null>(null);
  const [unsubscribedIds, setUnsubscribedIds] = React.useState<Set<string>>(new Set());

  // Track if we should use initial data or fetch new data
  // Only need to fetch when: folder changes from INBOX, or search query is applied
  const [useInitialEmails, setUseInitialEmails] = React.useState(true);

  // New email IDs for animation
  const [newEmailIds, setNewEmailIds] = React.useState<Set<string>>(new Set());

  // Initial data loading - parallel fetch of ALL accounts' folders and emails
  const {
    accounts,
    accountDataMap,
    defaultAccountId,
    isLoading: initialLoading,
    getAccountData,
    updateAccountEmail,
    removeAccountEmail,
    restoreAccountEmail,
    prependAccountEmails,
  } = useInitialData();

  // Get current account's initial data
  const currentAccountData = selectedAccountId ? getAccountData(selectedAccountId) : undefined;
  const initialFolders = currentAccountData?.folders ?? [];
  const initialEmails = currentAccountData?.emails ?? [];
  const defaultFolderId = currentAccountData?.defaultFolderId;

  // Subsequent data loading - for folder changes from INBOX, search, etc.
  const { folders: subsequentFolders } = useFolders(
    useInitialEmails ? undefined : selectedAccountId
  );
  const {
    emails: subsequentEmails,
    isLoading: subsequentEmailsLoading,
    hasMore,
    loadMore,
    refetch: refetchEmails,
    updateEmail: updateSubsequentEmail,
    removeEmail: removeSubsequentEmail,
    restoreEmail: restoreSubsequentEmail,
    prependEmails: prependSubsequentEmails,
  } = useEmails({
    accountId: useInitialEmails ? undefined : selectedAccountId,
    folderId: useInitialEmails ? undefined : selectedFolderId,
    query: searchQuery,
  });

  // Use initial data until user changes folder from INBOX or applies search
  const folders = useInitialEmails ? initialFolders : subsequentFolders;
  const emails = useInitialEmails ? initialEmails : subsequentEmails;
  const emailsLoading = useInitialEmails ? initialLoading : subsequentEmailsLoading;

  // Wrap account-specific methods to bind current accountId
  const updateEmail = React.useCallback(
    (emailId: string, updates: Partial<Email>) => {
      if (useInitialEmails && selectedAccountId) {
        updateAccountEmail(selectedAccountId, emailId, updates);
      } else {
        updateSubsequentEmail(emailId, updates);
      }
    },
    [useInitialEmails, selectedAccountId, updateAccountEmail, updateSubsequentEmail]
  );

  const removeEmail = React.useCallback(
    (emailId: string) => {
      if (useInitialEmails && selectedAccountId) {
        removeAccountEmail(selectedAccountId, emailId);
      } else {
        removeSubsequentEmail(emailId);
      }
    },
    [useInitialEmails, selectedAccountId, removeAccountEmail, removeSubsequentEmail]
  );

  const restoreEmail = React.useCallback(
    (email: Email, index?: number) => {
      if (useInitialEmails && selectedAccountId) {
        restoreAccountEmail(selectedAccountId, email, index);
      } else {
        restoreSubsequentEmail(email, index);
      }
    },
    [useInitialEmails, selectedAccountId, restoreAccountEmail, restoreSubsequentEmail]
  );

  const prependEmails = React.useCallback(
    (newEmails: Email[]) => {
      if (useInitialEmails && selectedAccountId) {
        prependAccountEmails(selectedAccountId, newEmails);
      } else {
        prependSubsequentEmails(newEmails);
      }
    },
    [useInitialEmails, selectedAccountId, prependAccountEmails, prependSubsequentEmails]
  );

  // Email polling for realtime updates
  useEmailPolling({
    accountId: selectedAccountId,
    folderId: selectedFolderId,
    currentEmails: emails,
    enabled: !searchQuery && !emailsLoading,
    interval: 30000,
    onNewEmails: (newEmails) => {
      prependEmails(newEmails);
      setNewEmailIds(new Set(newEmails.map((e) => e.id)));
      // Clear animation after it completes
      setTimeout(() => setNewEmailIds(new Set()), 500);
    },
  });

  const { messages: threadMessages, isLoading: threadLoading } = useEmailThread(
    selectedAccountId,
    selectedThreadId
  );
  const { markAsRead, markAsUnread, star, unstar, deleteEmail, sendEmail, reply, forward } =
    useEmailActions(selectedAccountId);

  // Set initial selection from initial data (with localStorage persistence)
  React.useEffect(() => {
    if (!initialLoading && accounts.length > 0 && !selectedAccountId) {
      const storedAccountId = localStorage.getItem(STORAGE_KEYS.SELECTED_ACCOUNT);
      const isValidStoredAccount =
        storedAccountId && accounts.some((acc) => acc.id === storedAccountId);

      if (isValidStoredAccount) {
        setSelectedAccountId(storedAccountId);
        // Check if this account has preloaded data - if so, use it
        const hasPreloadedData = accountDataMap.has(storedAccountId);
        setUseInitialEmails(hasPreloadedData);
      } else if (defaultAccountId) {
        setSelectedAccountId(defaultAccountId);
        // Default account always has preloaded data
        setUseInitialEmails(true);
      }
    }
  }, [
    initialLoading,
    accounts,
    defaultAccountId,
    selectedAccountId,
    setSelectedAccountId,
    accountDataMap,
  ]);

  React.useEffect(() => {
    if (!initialLoading && folders.length > 0 && !selectedFolderId) {
      const storedFolderType = localStorage.getItem(
        STORAGE_KEYS.SELECTED_FOLDER_TYPE
      ) as FolderType | null;
      const targetFolderType = storedFolderType || "inbox";
      const matchingFolder = folders.find((f) => f.type === targetFolderType);

      if (matchingFolder) {
        setSelectedFolderId(matchingFolder.id);
        // If using stored folder type (not inbox), need to fetch that folder's emails
        if (storedFolderType && storedFolderType !== "inbox") {
          setUseInitialEmails(false);
        }
      } else if (defaultFolderId) {
        setSelectedFolderId(defaultFolderId);
      }
    }
  }, [initialLoading, folders, defaultFolderId, selectedFolderId]);

  React.useEffect(() => {
    if (selectedEmailId && threadMessages.length > 0) {
      const email = threadMessages.find((m) => m.id === selectedEmailId);
      if (email && !email.isRead) {
        markAsRead(selectedEmailId);
      }
    }
  }, [selectedEmailId, threadMessages, markAsRead]);

  const handleSelectEmail = (email: { id: string; threadId?: string }) => {
    setSelectedEmailId(email.id);
    setSelectedThreadId(email.threadId || email.id);
    // On mobile, switch to detail view when selecting an email
    if (isMobile) {
      setMobileView("detail");
    }
  };

  // Mobile back button handler
  const handleBackToList = () => {
    setMobileView("list");
  };

  const handleStarEmail = async (emailId: string, isStarred: boolean) => {
    // Optimistic update - immediate UI feedback
    updateEmail(emailId, { isStarred });
    try {
      if (isStarred) {
        await star(emailId);
      } else {
        await unstar(emailId);
      }
    } catch {
      // Rollback on error
      updateEmail(emailId, { isStarred: !isStarred });
    }
  };

  const handleMarkAsRead = async (emailId: string) => {
    // Optimistic update
    updateEmail(emailId, { isRead: true });
    try {
      await markAsRead(emailId);
    } catch {
      // Rollback on error
      updateEmail(emailId, { isRead: false });
    }
  };

  const handleMarkAsUnread = async (emailId: string) => {
    // Optimistic update
    updateEmail(emailId, { isRead: false });
    try {
      await markAsUnread(emailId);
    } catch {
      // Rollback on error
      updateEmail(emailId, { isRead: true });
    }
  };

  const handleDeleteEmail = async (emailId: string) => {
    // Store email index for rollback
    const emailIndex = emails.findIndex((e) => e.id === emailId);
    const emailToDelete = emails[emailIndex];

    // Optimistic update - remove from list immediately
    removeEmail(emailId);
    if (selectedEmailId === emailId) {
      setSelectedEmailId(undefined);
      setSelectedThreadId(undefined);
    }

    try {
      await deleteEmail(emailId);
    } catch {
      // Rollback on error - restore the email at original position
      if (emailToDelete) {
        restoreEmail(emailToDelete, emailIndex);
      }
    }
  };

  const handleReply = (emailId: string, replyAll?: boolean) => {
    const email = threadMessages.find((m) => m.id === emailId);
    if (!email) return;
    setReplyToEmailId(emailId);
    setComposeMode("reply");
    setComposeInitialData({
      to: replyAll ? [email.from.address, ...email.to.map((t) => t.address)] : [email.from.address],
      cc: replyAll ? email.cc?.map((c) => c.address) : undefined,
      subject: email.subject.startsWith("Re:") ? email.subject : `Re: ${email.subject}`,
      content: "",
    });
    setComposeOpen(true);
  };

  const handleForward = (emailId: string) => {
    const email = threadMessages.find((m) => m.id === emailId);
    if (!email) return;
    setReplyToEmailId(emailId);
    setComposeMode("forward");
    setComposeInitialData({
      subject: email.subject.startsWith("Fwd:") ? email.subject : `Fwd: ${email.subject}`,
      content: `\n\n---------- Forwarded message ---------\nFrom: ${email.from.name || email.from.address}\nDate: ${email.receivedAt.toLocaleString()}\nSubject: ${email.subject}\nTo: ${email.to.map((t) => t.address).join(", ")}\n\n${email.body.text || ""}`,
    });
    setComposeOpen(true);
  };

  const handleSend = async (data: {
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    content: string;
  }) => {
    if (composeMode === "reply" && replyToEmailId) {
      await reply(replyToEmailId, data.content, !!composeInitialData?.cc);
    } else if (composeMode === "forward" && replyToEmailId) {
      await forward(replyToEmailId, data.to, data.content);
    } else {
      await sendEmail(data);
    }
    setReplyToEmailId(undefined);
    refetchEmails();
  };

  const handleAddAccount = () => {
    window.location.href = "/link-account";
  };

  const handleSearch = (query: string) => {
    setUseInitialEmails(false);
    setSearchQuery(query || undefined);
    setSelectedEmailId(undefined);
    setSelectedThreadId(undefined);
  };

  const handleDateFilterChange = (filter: DateFilter) => {
    setDateFilter(filter);
  };

  const handleUnsubscribe = (email: Email) => {
    if (email.unsubscribeUrl) {
      setPendingUnsubscribe({ id: email.id, url: email.unsubscribeUrl });
      setUnsubscribeDialogOpen(true);
    }
  };

  const confirmUnsubscribe = () => {
    if (pendingUnsubscribe) {
      // Open unsubscribe URL in new tab
      window.open(pendingUnsubscribe.url, "_blank");
      // Mark as unsubscribed locally
      setUnsubscribedIds((prev) => new Set([...prev, pendingUnsubscribe.id]));
    }
    setUnsubscribeDialogOpen(false);
    setPendingUnsubscribe(null);
  };

  const accountsWithEmail = accounts.map((acc) => ({
    id: acc.id,
    email: acc.email || user.email || acc.providerAccountId,
    provider: acc.provider,
    image: acc.image || undefined,
    needsReauth: acc.needsReauth,
  }));

  const selectedAccount = accountsWithEmail.find((acc) => acc.id === selectedAccountId);

  // Get selected email for mobile header
  const selectedEmail = emails.find((e) => e.id === selectedEmailId);

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* Desktop Sidebar - hidden on mobile */}
      <div className="hidden h-full md:block">
        <AppSidebar
          accounts={accountsWithEmail}
          selectedAccountId={selectedAccountId}
          selectedFolder={selectedFolderType}
          onSelectAccount={(id) => {
            const hasPreloadedData = accountDataMap.has(id);
            setUseInitialEmails(hasPreloadedData && selectedFolderType === "inbox");
            setSelectedAccountId(id);
            setSelectedFolderType("inbox");
            setSelectedFolderId(undefined);
            setSelectedEmailId(undefined);
            setSelectedThreadId(undefined);
          }}
          onSelectFolder={(folder) => {
            if (folder !== selectedFolderType) {
              setUseInitialEmails(false);
            }
            setSelectedFolderType(folder);
            const matchingFolder = folders.find((f) => f.type === folder);
            if (matchingFolder) {
              setSelectedFolderId(matchingFolder.id);
            }
            setSelectedEmailId(undefined);
            setSelectedThreadId(undefined);
          }}
          onAddAccount={handleAddAccount}
          user={user}
        />
      </div>

      {/* Mobile Sidebar Sheet */}
      <MobileSidebarSheet
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
        accounts={accountsWithEmail}
        selectedAccountId={selectedAccountId}
        selectedFolder={selectedFolderType}
        onSelectAccount={(id) => {
          const hasPreloadedData = accountDataMap.has(id);
          setUseInitialEmails(hasPreloadedData && selectedFolderType === "inbox");
          setSelectedAccountId(id);
          setSelectedFolderType("inbox");
          setSelectedFolderId(undefined);
          setSelectedEmailId(undefined);
          setSelectedThreadId(undefined);
        }}
        onSelectFolder={(folder) => {
          if (folder !== selectedFolderType) {
            setUseInitialEmails(false);
          }
          setSelectedFolderType(folder);
          const matchingFolder = folders.find((f) => f.type === folder);
          if (matchingFolder) {
            setSelectedFolderId(matchingFolder.id);
          }
          setSelectedEmailId(undefined);
          setSelectedThreadId(undefined);
        }}
        onAddAccount={handleAddAccount}
        user={user}
      />

      {/* Main content area */}
      <div className="min-w-0 flex-1 overflow-hidden p-4 md:pl-0">
        <div className="grid h-full grid-cols-1 gap-4 md:grid-cols-2">
          {/* Email list panel */}
          <div
            className={cn(
              "flex flex-col gap-4 overflow-hidden",
              isMobile && mobileView === "detail" && "hidden"
            )}
          >
            {/* Searchbar */}
            <Header onSearch={handleSearch} onMenuClick={() => setSidebarOpen(true)} />

            {/* Email list */}
            <div className="min-w-0 flex-1 overflow-hidden">
              <EmailList
                emails={emails}
                isLoading={emailsLoading}
                selectedEmailId={selectedEmailId}
                viewMode={emailViewMode}
                onViewModeChange={setEmailViewMode}
                dateFilter={dateFilter}
                onDateFilterChange={handleDateFilterChange}
                onSelectEmail={handleSelectEmail}
                onStarEmail={handleStarEmail}
                onMarkAsRead={handleMarkAsRead}
                onMarkAsUnread={handleMarkAsUnread}
                onDeleteEmail={handleDeleteEmail}
                onUnsubscribeEmail={handleUnsubscribe}
                unsubscribedIds={unsubscribedIds}
                onLoadMore={loadMore}
                hasMore={hasMore}
                currentAccountEmail={selectedAccount?.email}
                currentAccountImage={selectedAccount?.image}
                newEmailIds={newEmailIds}
              />
            </div>
          </div>

          {/* Email thread panel */}
          <div
            className={cn(
              "flex flex-col overflow-hidden",
              isMobile && mobileView === "list" && "hidden"
            )}
          >
            {/* Mobile back header */}
            {isMobile && mobileView === "detail" && (
              <MobileDetailHeader onBack={handleBackToList} subject={selectedEmail?.subject} />
            )}
            <div className="min-h-0 flex-1 overflow-hidden">
              <EmailThreadView
                messages={threadMessages}
                isLoading={threadLoading}
                currentAccountEmail={selectedAccount?.email}
                currentAccountImage={selectedAccount?.image}
                onReply={handleReply}
                onForward={handleForward}
                onStar={(emailId) => {
                  const email = threadMessages.find((m) => m.id === emailId);
                  if (email) {
                    handleStarEmail(emailId, !email.isStarred);
                  }
                }}
                onDelete={handleDeleteEmail}
              />
            </div>
          </div>
        </div>
      </div>

      <ComposeDialog
        open={composeOpen}
        onOpenChange={setComposeOpen}
        onSend={handleSend}
        initialData={composeInitialData}
        mode={composeMode}
      />

      {/* Unsubscribe confirmation dialog */}
      <Dialog open={unsubscribeDialogOpen} onOpenChange={setUnsubscribeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.email.unsubscribeConfirmTitle}</DialogTitle>
            <DialogDescription>{t.email.unsubscribeConfirmMessage}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnsubscribeDialogOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button onClick={confirmUnsubscribe}>{t.common.confirm}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
