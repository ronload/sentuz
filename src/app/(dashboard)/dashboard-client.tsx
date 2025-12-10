"use client";

import * as React from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Header } from "@/components/layout/header";
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
  const [selectedAccountId, setSelectedAccountId] = React.useState<string>();
  const [selectedFolderId, setSelectedFolderId] = React.useState<string>();
  const [selectedFolderType, setSelectedFolderType] = React.useState<
    "inbox" | "starred" | "sent" | "drafts" | "important" | "spam" | "trash"
  >("inbox");
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
  const [useInitialEmails, setUseInitialEmails] = React.useState(true);

  // New email IDs for animation
  const [newEmailIds, setNewEmailIds] = React.useState<Set<string>>(new Set());

  // Initial data loading - parallel fetch of accounts, folders, and emails
  const {
    accounts: initialAccounts,
    folders: initialFolders,
    emails: initialEmails,
    defaultAccountId,
    defaultFolderId,
    isLoading: initialLoading,
    updateEmail: updateInitialEmail,
    removeEmail: removeInitialEmail,
    restoreEmail: restoreInitialEmail,
    prependEmails: prependInitialEmails,
  } = useInitialData();

  // Subsequent data loading - for folder changes, search, etc.
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

  // Use initial data until user changes folder/search/category
  const accounts = initialAccounts;
  const folders = useInitialEmails ? initialFolders : subsequentFolders;
  const emails = useInitialEmails ? initialEmails : subsequentEmails;
  const emailsLoading = useInitialEmails ? initialLoading : subsequentEmailsLoading;
  const updateEmail = useInitialEmails ? updateInitialEmail : updateSubsequentEmail;
  const removeEmail = useInitialEmails ? removeInitialEmail : removeSubsequentEmail;
  const restoreEmail = useInitialEmails ? restoreInitialEmail : restoreSubsequentEmail;
  const prependEmails = useInitialEmails ? prependInitialEmails : prependSubsequentEmails;

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

  // Set initial selection from initial data
  React.useEffect(() => {
    if (!initialLoading && defaultAccountId && !selectedAccountId) {
      setSelectedAccountId(defaultAccountId);
    }
  }, [initialLoading, defaultAccountId, selectedAccountId]);

  React.useEffect(() => {
    if (!initialLoading && defaultFolderId && !selectedFolderId) {
      setSelectedFolderId(defaultFolderId);
    }
  }, [initialLoading, defaultFolderId, selectedFolderId]);

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
  }));

  const selectedAccount = accountsWithEmail.find((acc) => acc.id === selectedAccountId);

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* Sidebar */}
      <AppSidebar
        accounts={accountsWithEmail}
        selectedAccountId={selectedAccountId}
        selectedFolder={selectedFolderType}
        onSelectAccount={(id) => {
          setUseInitialEmails(false);
          setSelectedAccountId(id);
          setSelectedFolderId(undefined);
          setSelectedEmailId(undefined);
          setSelectedThreadId(undefined);
        }}
        onSelectFolder={(folder) => {
          // Only switch to subsequent data if folder actually changes
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

      {/* Main content area - using grid for precise 50/50 split */}
      <div
        className="min-w-0 flex-1 overflow-hidden p-4 pl-0"
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}
      >
        {/* Email list panel (50%) */}
        <div className="flex flex-col gap-4 overflow-hidden">
          {/* Searchbar */}
          <Header onSearch={handleSearch} />

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

        {/* Email thread panel (50%) */}
        <div className="overflow-hidden">
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
