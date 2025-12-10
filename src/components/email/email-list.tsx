"use client";

import * as React from "react";
import { Inbox, LayoutList, Layers } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { EmailCard } from "./email-card";
import { EmailCardStack } from "./email-card-stack";
import { LayoutGroup } from "motion/react";
import { useI18n } from "@/lib/i18n";

export type EmailViewMode = "list" | "stack";
export type DateFilter = "all" | "today" | "yesterday" | "thisWeek" | "thisMonth" | "older";

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
  dateFilter?: DateFilter;
  onDateFilterChange?: (filter: DateFilter) => void;
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
  newEmailIds?: Set<string>;
}

const DATE_FILTERS: { value: DateFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "thisWeek", label: "This Week" },
  { value: "thisMonth", label: "This Month" },
  { value: "older", label: "Older" },
];

// Email type classification
type EmailType = "primary" | "transaction" | "updates" | "promotions" | "social";

interface CategorizedByType {
  primary: Email[];
  transaction: Email[];
  updates: Email[];
  promotions: Email[];
  social: Email[];
}

function categorizeEmailByType(email: Email): EmailType {
  const from = email.from.address.toLowerCase();
  const subject = email.subject.toLowerCase();

  // Social: social media platforms
  if (
    /facebook|twitter|linkedin|instagram|pinterest|tiktok|snapchat|reddit|discord|slack|x\.com/.test(
      from
    )
  ) {
    return "social";
  }

  // Transaction: order/payment related
  if (/order|receipt|invoice|payment|confirmation|shipping|delivery|tracking/.test(subject)) {
    return "transaction";
  }

  // Promotions: marketing/sales
  if (/sale|discount|offer|deal|promo|coupon|%\s*off|limited|exclusive|free/.test(subject)) {
    return "promotions";
  }

  // Updates: notifications
  if (/update|notification|alert|reminder|newsletter|digest|weekly|monthly/.test(subject)) {
    return "updates";
  }

  return "primary";
}

function categorizeEmailsByType(emails: Email[]): CategorizedByType {
  const result: CategorizedByType = {
    primary: [],
    transaction: [],
    updates: [],
    promotions: [],
    social: [],
  };

  for (const email of emails) {
    const type = categorizeEmailByType(email);
    result[type].push(email);
  }

  return result;
}

function filterEmailsByDate(emails: Email[], filter: DateFilter): Email[] {
  if (filter === "all") return emails;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - today.getDay());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  return emails.filter((email) => {
    const emailDate = new Date(email.receivedAt);
    const emailDay = new Date(emailDate.getFullYear(), emailDate.getMonth(), emailDate.getDate());

    switch (filter) {
      case "today":
        return emailDay.getTime() === today.getTime();
      case "yesterday":
        return emailDay.getTime() === yesterday.getTime();
      case "thisWeek":
        return (
          emailDay >= weekStart && emailDay < today && emailDay.getTime() !== yesterday.getTime()
        );
      case "thisMonth":
        return emailDay >= monthStart && emailDay < weekStart;
      case "older":
        return emailDay < monthStart;
      default:
        return true;
    }
  });
}

function DateFilterNav({
  dateFilter,
  onDateFilterChange,
}: {
  dateFilter: DateFilter;
  onDateFilterChange?: (filter: DateFilter) => void;
}) {
  return (
    <div
      className="bg-card flex items-center rounded-lg shadow-sm"
      style={{ padding: "4px", gap: "4px" }}
    >
      {DATE_FILTERS.map((item) => (
        <button
          key={item.value}
          type="button"
          onClick={() => onDateFilterChange?.(item.value)}
          className={`rounded-md text-sm font-medium transition-colors ${
            dateFilter === item.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
          style={{ height: "28px", padding: "0 12px" }}
        >
          {item.label}
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
  dateFilter = "all",
  onDateFilterChange,
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
  newEmailIds,
}: EmailListProps) {
  const { t } = useI18n();
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const handleScroll = React.useCallback(() => {
    if (!scrollRef.current || !hasMore || isLoading) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    if (scrollHeight - scrollTop - clientHeight < 200) {
      onLoadMore?.();
    }
  }, [hasMore, isLoading, onLoadMore]);

  // Filter emails by date first
  const filteredEmails = filterEmailsByDate(emails, dateFilter);

  const toolbar = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        paddingBottom: "16px",
      }}
    >
      <DateFilterNav dateFilter={dateFilter} onDateFilterChange={onDateFilterChange} />
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

  if (!isLoading && filteredEmails.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        {toolbar}
        <EmptyState />
      </div>
    );
  }

  // Categorize emails by type for stack mode
  const categorizedByType = viewMode === "stack" ? categorizeEmailsByType(filteredEmails) : null;

  // Stack mode rendering - group by email type
  if (viewMode === "stack" && categorizedByType) {
    const typeCategories: { key: EmailType; title: string }[] = [
      { key: "primary", title: t.email.category.primary },
      { key: "transaction", title: t.email.category.transaction },
      { key: "updates", title: t.email.category.updates },
      { key: "promotions", title: t.email.category.promotions },
      { key: "social", title: t.email.category.social },
    ];

    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        {toolbar}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}
        >
          <LayoutGroup>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {typeCategories.map(({ key, title }) => (
                <EmailCardStack
                  key={key}
                  title={title}
                  emails={categorizedByType[key]}
                  defaultExpanded={key === "primary"}
                  selectedEmailId={selectedEmailId}
                  currentAccountEmail={currentAccountEmail}
                  currentAccountImage={currentAccountImage}
                  unsubscribedIds={unsubscribedIds}
                  newEmailIds={newEmailIds}
                  onSelectEmail={onSelectEmail}
                  onStarEmail={onStarEmail}
                  onMarkAsRead={onMarkAsRead}
                  onMarkAsUnread={onMarkAsUnread}
                  onDeleteEmail={onDeleteEmail}
                  onReplyEmail={onReplyEmail}
                  onForwardEmail={onForwardEmail}
                  onUnsubscribeEmail={onUnsubscribeEmail}
                />
              ))}
              {isLoading && (
                <div className="py-4 text-center">
                  <Skeleton className="mx-auto h-8 w-8 rounded-full" />
                </div>
              )}
            </div>
          </LayoutGroup>
        </div>
      </div>
    );
  }

  // List mode rendering
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {toolbar}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {filteredEmails.map((email) => (
            <div
              key={email.id}
              className={newEmailIds?.has(email.id) ? "animate-slide-in-top" : ""}
            >
              <EmailCard
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
            </div>
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
