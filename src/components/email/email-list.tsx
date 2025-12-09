"use client";

import * as React from "react";
import { Inbox, LayoutList, Layers } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { EmailCard } from "./email-card";
import { useI18n } from "@/lib/i18n";

export type EmailViewMode = "list" | "stack";
export type EmailCategory = "all" | "transaction" | "updates" | "promotions";

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
  unsubscribeUrl?: string;
}

interface EmailListProps {
  emails: Email[];
  isLoading?: boolean;
  selectedEmailId?: string;
  viewMode?: EmailViewMode;
  onViewModeChange?: (mode: EmailViewMode) => void;
  category?: EmailCategory;
  onCategoryChange?: (category: EmailCategory) => void;
  onSelectEmail?: (email: Email) => void;
  onStarEmail?: (emailId: string, isStarred: boolean) => void;
  onMarkAsRead?: (emailId: string) => void;
  onMarkAsUnread?: (emailId: string) => void;
  onDeleteEmail?: (emailId: string) => void;
  onReplyEmail?: (emailId: string) => void;
  onForwardEmail?: (emailId: string) => void;
  onUnsubscribeEmail?: (email: Email) => void;
  unsubscribedIds?: Set<string>;
  onLoadMore?: () => void;
  hasMore?: boolean;
  currentAccountEmail?: string;
  currentAccountImage?: string;
}

const CATEGORIES: { value: EmailCategory; label: string }[] = [
  { value: "all", label: "All" },
  { value: "transaction", label: "Transaction" },
  { value: "updates", label: "Updates" },
  { value: "promotions", label: "Promotions" },
];

function CategoryFilter({
  category,
  onCategoryChange,
}: {
  category: EmailCategory;
  onCategoryChange?: (category: EmailCategory) => void;
}) {
  return (
    <div
      className="bg-card flex items-center rounded-lg shadow-sm"
      style={{ padding: "4px", gap: "4px" }}
    >
      {CATEGORIES.map((cat) => (
        <button
          key={cat.value}
          type="button"
          onClick={() => onCategoryChange?.(cat.value)}
          className={`rounded-md text-sm font-medium transition-colors ${
            category === cat.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
          style={{ height: "28px", padding: "0 12px" }}
        >
          {cat.label}
        </button>
      ))}
    </div>
  );
}

function ViewModeToggle({
  viewMode,
  onViewModeChange,
}: {
  viewMode: EmailViewMode;
  onViewModeChange?: (mode: EmailViewMode) => void;
}) {
  const buttonSize = 28;
  const padding = 4;
  const gap = 4;

  return (
    <div
      className="bg-card relative flex items-center rounded-lg shadow-sm"
      style={{ padding: `${padding}px`, gap: `${gap}px` }}
    >
      <div
        className="bg-background absolute rounded-md shadow-sm"
        style={{
          width: `${buttonSize}px`,
          height: `${buttonSize}px`,
          top: `${padding}px`,
          left: `${padding}px`,
          transform: `translateX(${viewMode === "list" ? buttonSize + gap : 0}px)`,
          transition: "transform 0.2s ease-in-out",
        }}
      />
      <Button
        variant="ghost"
        onClick={() => onViewModeChange?.("stack")}
        className="relative z-10 hover:bg-transparent"
        style={{ width: `${buttonSize}px`, height: `${buttonSize}px`, padding: 0 }}
      >
        <Layers className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        onClick={() => onViewModeChange?.("list")}
        className="relative z-10 hover:bg-transparent"
        style={{ width: `${buttonSize}px`, height: `${buttonSize}px`, padding: 0 }}
      >
        <LayoutList className="h-4 w-4" />
      </Button>
    </div>
  );
}

function EmailCardSkeleton() {
  return (
    <div className="bg-card flex items-center gap-4 rounded-xl px-4 py-4 shadow-sm">
      <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "6px" }}>
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-full max-w-[280px]" />
      </div>
    </div>
  );
}

function EmailListSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {Array.from({ length: 8 }).map((_, i) => (
        <EmailCardSkeleton key={i} />
      ))}
    </div>
  );
}

function EmptyState() {
  const { t } = useI18n();
  return (
    <div className="flex h-64 h-full flex-col items-center justify-center gap-4 rounded-xl text-center shadow-sm">
      <div className="rounded-full p-4">
        <Inbox className="text-muted-foreground h-8 w-8" />
      </div>
      <div>
        <h3 className="font-medium">{t.email.noEmails}</h3>
        <p className="text-muted-foreground text-sm">{t.email.noEmailsDescription}</p>
      </div>
    </div>
  );
}

export function EmailList({
  emails,
  isLoading,
  selectedEmailId,
  viewMode = "list",
  onViewModeChange,
  category = "all",
  onCategoryChange,
  onSelectEmail,
  onStarEmail,
  onMarkAsRead,
  onMarkAsUnread,
  onDeleteEmail,
  onReplyEmail,
  onForwardEmail,
  onUnsubscribeEmail,
  unsubscribedIds,
  onLoadMore,
  hasMore,
  currentAccountEmail,
  currentAccountImage,
}: EmailListProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const handleScroll = React.useCallback(() => {
    if (!scrollRef.current || !hasMore || isLoading) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    if (scrollHeight - scrollTop - clientHeight < 200) {
      onLoadMore?.();
    }
  }, [hasMore, isLoading, onLoadMore]);

  const toolbar = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        paddingBottom: "16px",
      }}
    >
      <CategoryFilter category={category} onCategoryChange={onCategoryChange} />
      <ViewModeToggle viewMode={viewMode} onViewModeChange={onViewModeChange} />
    </div>
  );

  if (isLoading && emails.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        {toolbar}
        <EmailListSkeleton />
      </div>
    );
  }

  if (!isLoading && emails.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        {toolbar}
        <EmptyState />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {toolbar}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
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
              currentAccountEmail={currentAccountEmail}
              currentAccountImage={currentAccountImage}
              unsubscribeUrl={email.unsubscribeUrl}
              isUnsubscribed={unsubscribedIds?.has(email.id)}
              onClick={() => onSelectEmail?.(email)}
              onStar={() => onStarEmail?.(email.id, !email.isStarred)}
              onMarkAsRead={() => onMarkAsRead?.(email.id)}
              onMarkAsUnread={() => onMarkAsUnread?.(email.id)}
              onDelete={() => onDeleteEmail?.(email.id)}
              onReply={() => onReplyEmail?.(email.id)}
              onForward={() => onForwardEmail?.(email.id)}
              onUnsubscribe={() => onUnsubscribeEmail?.(email)}
            />
          ))}
          {isLoading && (
            <div className="py-4 text-center">
              <Skeleton className="mx-auto h-8 w-8 rounded-full" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
