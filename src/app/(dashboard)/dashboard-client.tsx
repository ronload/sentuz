"use client";

import * as React from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Header } from "@/components/layout/header";
import { EmailList, type EmailViewMode, type EmailCategory } from "@/components/email/email-list";
import { EmailThreadView } from "@/components/email/email-thread-view";
import { ComposeDialog } from "@/components/email/compose-dialog";
import {
  useAccounts,
  useFolders,
  useEmails,
  useEmailThread,
  useEmailActions,
} from "@/hooks/use-emails";

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
  const [emailCategory, setEmailCategory] = React.useState<EmailCategory>("all");

  const { accounts } = useAccounts();
  const { folders } = useFolders(selectedAccountId);
  const {
    emails,
    isLoading: emailsLoading,
    hasMore,
    loadMore,
    refetch: refetchEmails,
  } = useEmails({
    accountId: selectedAccountId,
    folderId: selectedFolderId,
    query: searchQuery,
    category: emailCategory,
  });
  const { messages: threadMessages, isLoading: threadLoading } = useEmailThread(
    selectedAccountId,
    selectedThreadId
  );
  const { markAsRead, markAsUnread, star, unstar, deleteEmail, sendEmail, reply, forward } =
    useEmailActions(selectedAccountId);

  React.useEffect(() => {
    if (accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, selectedAccountId]);

  React.useEffect(() => {
    if (folders.length > 0 && !selectedFolderId) {
      const targetFolder = folders.find((f) => f.type === selectedFolderType);
      if (targetFolder) {
        setSelectedFolderId(targetFolder.id);
      }
    }
  }, [folders, selectedFolderId, selectedFolderType]);

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
    if (isStarred) {
      await star(emailId);
    } else {
      await unstar(emailId);
    }
    refetchEmails();
  };

  const handleMarkAsRead = async (emailId: string) => {
    await markAsRead(emailId);
    refetchEmails();
  };

  const handleMarkAsUnread = async (emailId: string) => {
    await markAsUnread(emailId);
    refetchEmails();
  };

  const handleDeleteEmail = async (emailId: string) => {
    await deleteEmail(emailId);
    if (selectedEmailId === emailId) {
      setSelectedEmailId(undefined);
      setSelectedThreadId(undefined);
    }
    refetchEmails();
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
    window.location.href = "/login";
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query || undefined);
    setSelectedEmailId(undefined);
    setSelectedThreadId(undefined);
  };

  const accountsWithEmail = accounts.map((acc) => ({
    id: acc.id,
    email: acc.email || user.email || acc.providerAccountId,
    provider: acc.provider,
    image: acc.image || undefined,
  }));

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* Sidebar */}
      <AppSidebar
        accounts={accountsWithEmail}
        selectedAccountId={selectedAccountId}
        selectedFolder={selectedFolderType}
        onSelectAccount={(id) => {
          setSelectedAccountId(id);
          setSelectedFolderId(undefined);
          setSelectedEmailId(undefined);
          setSelectedThreadId(undefined);
        }}
        onSelectFolder={(folder) => {
          setSelectedFolderType(folder);
          const matchingFolder = folders.find((f) => f.type === folder);
          if (matchingFolder) {
            setSelectedFolderId(matchingFolder.id);
          }
          setSelectedEmailId(undefined);
          setSelectedThreadId(undefined);
        }}
        onAddAccount={handleAddAccount}
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
              category={emailCategory}
              onCategoryChange={setEmailCategory}
              onSelectEmail={handleSelectEmail}
              onStarEmail={handleStarEmail}
              onMarkAsRead={handleMarkAsRead}
              onMarkAsUnread={handleMarkAsUnread}
              onDeleteEmail={handleDeleteEmail}
              onLoadMore={loadMore}
              hasMore={hasMore}
            />
          </div>
        </div>

        {/* Email thread panel (50%) */}
        <div className="overflow-hidden">
          <EmailThreadView
            messages={threadMessages}
            isLoading={threadLoading}
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
    </div>
  );
}
