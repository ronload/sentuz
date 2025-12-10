"use client";

import * as React from "react";
import { ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { EmailCard } from "./email-card";
import { cn } from "@/lib/utils";
import type { Email } from "./email-list";

interface EmailCardStackProps {
  title: string;
  emails: Email[];
  defaultExpanded?: boolean;
  selectedEmailId?: string;
  currentAccountEmail?: string;
  currentAccountImage?: string;
  unsubscribedIds?: Set<string>;
  newEmailIds?: Set<string>;
  onSelectEmail?: (email: Email) => void;
  onStarEmail?: (emailId: string, isStarred: boolean) => void;
  onMarkAsRead?: (emailId: string) => void;
  onMarkAsUnread?: (emailId: string) => void;
  onDeleteEmail?: (emailId: string) => void;
  onReplyEmail?: (emailId: string) => void;
  onForwardEmail?: (emailId: string) => void;
  onUnsubscribeEmail?: (email: Email) => void;
}

export function EmailCardStack({
  title,
  emails,
  defaultExpanded = false,
  selectedEmailId,
  currentAccountEmail,
  currentAccountImage,
  unsubscribedIds,
  newEmailIds,
  onSelectEmail,
  onStarEmail,
  onMarkAsRead,
  onMarkAsUnread,
  onDeleteEmail,
  onReplyEmail,
  onForwardEmail,
  onUnsubscribeEmail,
}: EmailCardStackProps) {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);

  if (emails.length === 0) return null;

  // Preview: show up to 3 cards in stack
  const previewEmails = emails.slice(0, 3);

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      {/* Header */}
      <CollapsibleTrigger asChild>
        <button type="button" className="email-stack-header w-full text-left">
          <ChevronRight
            className={cn(
              "h-4 w-4 shrink-0 transition-transform duration-200",
              isExpanded && "rotate-90"
            )}
          />
          <span className="text-muted-foreground">{title}</span>
          <span className="email-stack-count">{emails.length}</span>
        </button>
      </CollapsibleTrigger>

      {/* Collapsed: Show stacked cards */}
      {!isExpanded && (
        <div className="email-stack-collapsed" onClick={() => setIsExpanded(true)}>
          {previewEmails.map((email, index) => (
            <div
              key={email.id}
              className={cn(
                "email-stack-card",
                newEmailIds?.has(email.id) && "animate-slide-in-top"
              )}
              style={{ "--stack-index": index } as React.CSSProperties}
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
                onClick={index === 0 ? () => onSelectEmail?.(email) : undefined}
                onStar={index === 0 ? () => onStarEmail?.(email.id, !email.isStarred) : undefined}
                onMarkAsRead={index === 0 ? () => onMarkAsRead?.(email.id) : undefined}
                onMarkAsUnread={index === 0 ? () => onMarkAsUnread?.(email.id) : undefined}
                onDelete={index === 0 ? () => onDeleteEmail?.(email.id) : undefined}
                onReply={index === 0 ? () => onReplyEmail?.(email.id) : undefined}
                onForward={index === 0 ? () => onForwardEmail?.(email.id) : undefined}
                onUnsubscribe={index === 0 ? () => onUnsubscribeEmail?.(email) : undefined}
              />
            </div>
          ))}
        </div>
      )}

      {/* Expanded: Show all cards */}
      <CollapsibleContent>
        <div className="email-stack-expanded">
          {emails.map((email) => (
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
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
