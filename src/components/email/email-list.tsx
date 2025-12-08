"use client";

import * as React from "react";
import { Inbox } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmailCard } from "./email-card";
import { useI18n } from "@/lib/i18n";

export interface Email {
  id: string;
  threadId?: string;
  subject: string;
  from: {
    name?: string;
    address: string;
  };
  snippet: string;
  receivedAt: Date;
  isRead: boolean;
  isStarred: boolean;
  hasAttachments: boolean;
}

interface EmailListProps {
  emails: Email[];
  isLoading?: boolean;
  selectedEmailId?: string;
  onSelectEmail?: (email: Email) => void;
  onStarEmail?: (emailId: string, isStarred: boolean) => void;
  onMarkAsRead?: (emailId: string) => void;
  onMarkAsUnread?: (emailId: string) => void;
  onDeleteEmail?: (emailId: string) => void;
  onReplyEmail?: (emailId: string) => void;
  onForwardEmail?: (emailId: string) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

function EmailListSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="flex h-16 items-center justify-center rounded-xl bg-card px-6 shadow-sm"
        >
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  const { t } = useI18n();

  return (
    <div className="flex h-64 flex-col items-center justify-center gap-4 rounded-xl bg-card text-center shadow-sm">
      <div className="rounded-full bg-muted p-4">
        <Inbox className="h-8 w-8 text-muted-foreground" />
      </div>
      <div>
        <h3 className="font-medium">{t.email.noEmails}</h3>
        <p className="text-sm text-muted-foreground">
          {t.email.noEmailsDescription}
        </p>
      </div>
    </div>
  );
}

export function EmailList({
  emails,
  isLoading,
  selectedEmailId,
  onSelectEmail,
  onStarEmail,
  onMarkAsRead,
  onMarkAsUnread,
  onDeleteEmail,
  onReplyEmail,
  onForwardEmail,
  onLoadMore,
  hasMore,
}: EmailListProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const handleScroll = React.useCallback(() => {
    if (!scrollRef.current || !hasMore || isLoading) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    if (scrollHeight - scrollTop - clientHeight < 200) {
      onLoadMore?.();
    }
  }, [hasMore, isLoading, onLoadMore]);

  if (isLoading && emails.length === 0) {
    return <EmailListSkeleton />;
  }

  if (!isLoading && emails.length === 0) {
    return <EmptyState />;
  }

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      style={{ height: "100%", width: "100%", overflowY: "auto", overflowX: "hidden" }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {emails.map((email) => (
          <EmailCard
            key={email.id}
            id={email.id}
            subject={email.subject}
            from={email.from}
            snippet={email.snippet}
            receivedAt={email.receivedAt}
            isRead={email.isRead}
            isStarred={email.isStarred}
            hasAttachments={email.hasAttachments}
            isSelected={selectedEmailId === email.id}
            onClick={() => onSelectEmail?.(email)}
            onStar={() => onStarEmail?.(email.id, !email.isStarred)}
            onMarkAsRead={() => onMarkAsRead?.(email.id)}
            onMarkAsUnread={() => onMarkAsUnread?.(email.id)}
            onDelete={() => onDeleteEmail?.(email.id)}
            onReply={() => onReplyEmail?.(email.id)}
            onForward={() => onForwardEmail?.(email.id)}
          />
        ))}
        {isLoading && (
          <div className="py-4 text-center">
            <Skeleton className="mx-auto h-8 w-8 rounded-full" />
          </div>
        )}
      </div>
    </div>
  );
}
