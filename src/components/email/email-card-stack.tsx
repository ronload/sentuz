"use client";

import * as React from "react";
import { motion } from "motion/react";
import { ChevronRight } from "lucide-react";
import { EmailCard } from "./email-card";
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

// Spring transition for natural iOS-like feel with bounce
const springTransition = {
  type: "spring" as const,
  stiffness: 200,
  damping: 25,
};

export function EmailCardStack({
  title,
  emails,
  defaultExpanded = false,
  selectedEmailId,
  currentAccountEmail,
  currentAccountImage,
  unsubscribedIds,
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

  // Always render all emails - they're always in DOM
  const previewCount = 3;

  return (
    <motion.div layout transition={springTransition}>
      {/* Header */}
      <motion.button
        layout="position"
        type="button"
        className="email-stack-header w-full text-left"
        onClick={() => setIsExpanded(!isExpanded)}
        transition={springTransition}
      >
        <motion.div animate={{ rotate: isExpanded ? 90 : 0 }} transition={springTransition}>
          <ChevronRight className="h-4 w-4 shrink-0" />
        </motion.div>
        <span className="text-muted-foreground">{title}</span>
        <span className="email-stack-count">{emails.length}</span>
      </motion.button>
      {/* TODO: Fix this inlinecss below */}
      {/* Cards Container - all emails always in DOM */}
      <motion.div
        layout
        className="relative"
        style={{ paddingBottom: isExpanded ? 0 : 16 }}
        transition={springTransition}
      >
        {emails.map((email, index) => {
          const isTopCard = index === 0;
          const isInPreview = index < previewCount;
          const isVisible = isExpanded || isInPreview;

          // Calculate animation values
          let opacity: number;
          let scale: number;
          let y: number;

          if (isExpanded) {
            // Expanded: all cards fully visible
            opacity = 1;
            scale = 1;
            y = 0;
          } else if (isInPreview) {
            // Collapsed preview: stacked effect
            opacity = 1 - index * 0.2;
            scale = 1 - index * 0.02;
            y = index * 8;
          } else {
            // Collapsed hidden: cards beyond preview
            opacity = 0;
            scale = 0.9;
            y = previewCount * 8;
          }

          return (
            <motion.div
              key={email.id}
              layout
              animate={{
                opacity,
                scale,
                y,
                zIndex: emails.length - index,
              }}
              transition={{
                layout: springTransition,
                opacity: {
                  ...springTransition,
                  delay: isExpanded && !isInPreview ? (index - previewCount) * 0.03 : 0,
                },
                scale: {
                  ...springTransition,
                  delay: isExpanded && !isInPreview ? (index - previewCount) * 0.03 : 0,
                },
              }}
              style={{
                position: isExpanded ? "relative" : isTopCard ? "relative" : "absolute",
                top: isExpanded ? "auto" : 0,
                left: isExpanded ? "auto" : 0,
                right: isExpanded ? "auto" : 0,
                marginBottom: isExpanded ? 16 : 0,
                pointerEvents: isVisible && (isExpanded || isTopCard) ? "auto" : "none",
              }}
              onClick={!isExpanded && !isTopCard ? () => setIsExpanded(true) : undefined}
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
                onClick={isExpanded || isTopCard ? () => onSelectEmail?.(email) : undefined}
                onStar={
                  isExpanded || isTopCard
                    ? () => onStarEmail?.(email.id, !email.isStarred)
                    : undefined
                }
                onMarkAsRead={isExpanded || isTopCard ? () => onMarkAsRead?.(email.id) : undefined}
                onMarkAsUnread={
                  isExpanded || isTopCard ? () => onMarkAsUnread?.(email.id) : undefined
                }
                onDelete={isExpanded || isTopCard ? () => onDeleteEmail?.(email.id) : undefined}
                onReply={isExpanded || isTopCard ? () => onReplyEmail?.(email.id) : undefined}
                onForward={isExpanded || isTopCard ? () => onForwardEmail?.(email.id) : undefined}
                onUnsubscribe={
                  isExpanded || isTopCard ? () => onUnsubscribeEmail?.(email) : undefined
                }
              />
            </motion.div>
          );
        })}
      </motion.div>
    </motion.div>
  );
}
