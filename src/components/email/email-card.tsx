"use client";

import * as React from "react";
import NextImage from "next/image";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

// Common personal email domains that won't have company logos
const PERSONAL_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "yahoo.com",
  "yahoo.co.jp",
  "ymail.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "protonmail.com",
  "proton.me",
  "zoho.com",
  "mail.com",
  "gmx.com",
  "gmx.net",
  "qq.com",
  "163.com",
  "126.com",
  "sina.com",
  "foxmail.com",
]);

// Generate a consistent color based on email address (industry standard approach)
function stringToHslColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 65%, 45%)`;
}

// Extract domain from email address
function getEmailDomain(email: string): string {
  return email.split("@")[1]?.toLowerCase() || "";
}

// Extract root domain from a full domain (e.g., em.uber.com -> uber.com)
function getRootDomain(domain: string): string {
  const parts = domain.split(".");
  if (parts.length <= 2) return domain;

  // Common second-level TLDs (for domains like example.co.uk)
  const secondLevelTlds = new Set(["co", "com", "net", "org", "edu", "gov", "ac", "or", "ne"]);

  if (parts.length >= 3 && secondLevelTlds.has(parts[parts.length - 2])) {
    return parts.slice(-3).join(".");
  }

  // e.g., mail.example.com -> example.com, em.uber.com -> uber.com
  return parts.slice(-2).join(".");
}

// Format date relative to now (e.g., "10:30 AM", "Yesterday", "Mon", "Dec 5")
function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    // Today: show time
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  } else if (days === 1) {
    return "Yesterday";
  } else if (days < 7) {
    // This week: show day name
    return date.toLocaleDateString([], { weekday: "short" });
  } else {
    // Older: show date
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  }
}

// Get company logo URL using Google Favicon API (free, no CORS, high coverage)
function getCompanyLogoUrl(email: string): string | null {
  const domain = getEmailDomain(email);
  if (!domain) return null;

  const rootDomain = getRootDomain(domain);
  if (PERSONAL_EMAIL_DOMAINS.has(rootDomain)) {
    return null;
  }

  // Google Favicon API - returns high quality favicons, works globally
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(rootDomain)}&sz=128`;
}

export interface EmailCardProps {
  id: string;
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
  isSelected?: boolean;
  currentAccountEmail?: string;
  currentAccountImage?: string;
  unsubscribeUrl?: string;
  isUnsubscribed?: boolean;
  onClick?: () => void;
  onStar?: () => void;
  onMarkAsRead?: () => void;
  onMarkAsUnread?: () => void;
  onDelete?: () => void;
  onReply?: () => void;
  onForward?: () => void;
  onUnsubscribe?: () => void;
}

export function EmailCard({
  subject,
  from,
  snippet,
  receivedAt,
  isRead,
  isSelected,
  currentAccountEmail,
  currentAccountImage,
  unsubscribeUrl,
  isUnsubscribed,
  onClick,
  onUnsubscribe,
}: EmailCardProps) {
  const { t } = useI18n();
  const senderName = from.name || from.address.split("@")[0];
  const title = subject || "(No Subject)";
  const initial = (from.name || from.address)[0]?.toUpperCase() || "?";
  const avatarColor = stringToHslColor(from.address);

  // Check if the email is from the current user
  const isCurrentUser =
    currentAccountEmail && from.address.toLowerCase() === currentAccountEmail.toLowerCase();

  // Only fetch company logo if not current user
  const logoUrl = isCurrentUser ? null : getCompanyLogoUrl(from.address);

  const [logoStatus, setLogoStatus] = React.useState<"loading" | "loaded" | "error">(
    logoUrl ? "loading" : "error"
  );

  React.useEffect(() => {
    if (!logoUrl) {
      setLogoStatus("error");
      return;
    }

    setLogoStatus("loading");
    const img = new Image();
    img.onload = () => {
      // Google Favicon API returns a small default icon (16x16) when no favicon exists
      // Real company logos are typically larger, so reject small images
      if (img.naturalWidth <= 16 || img.naturalHeight <= 16) {
        setLogoStatus("error");
      } else {
        setLogoStatus("loaded");
      }
    };
    img.onerror = () => setLogoStatus("error");
    img.src = logoUrl;
  }, [logoUrl]);

  return (
    <div
      className={cn(
        "flex cursor-pointer items-center gap-4 rounded-xl px-4 py-4 shadow-sm transition-colors",
        isSelected ? "bg-accent" : "bg-card hover:bg-accent"
      )}
      style={{ width: "100%", maxWidth: "100%", overflow: "hidden" }}
      onClick={onClick}
    >
      <div className="relative shrink-0">
        <Avatar className="h-12 w-12">
          {isCurrentUser && currentAccountImage ? (
            <NextImage
              src={currentAccountImage}
              alt={senderName}
              width={48}
              height={48}
              className="aspect-square size-full object-cover"
              unoptimized
            />
          ) : logoStatus === "loaded" && logoUrl ? (
            <NextImage
              src={logoUrl}
              alt={senderName}
              width={48}
              height={48}
              className="aspect-square size-full object-contain"
              unoptimized
            />
          ) : (
            <AvatarFallback
              className="text-xs font-medium text-white"
              style={{ backgroundColor: avatarColor }}
            >
              {initial}
            </AvatarFallback>
          )}
        </Avatar>
        {!isRead && (
          <div
            style={{
              position: "absolute",
              top: "-2px",
              right: "-2px",
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor: "#3b82f6",
            }}
          />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "8px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flex: 1,
              minWidth: 0,
              overflow: "hidden",
            }}
          >
            <div
              className={cn("text-sm", !isRead && "font-semibold")}
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {senderName}
            </div>
            {unsubscribeUrl && !isUnsubscribed && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onUnsubscribe?.();
                }}
                className="text-muted-foreground hover:text-foreground shrink-0 text-xs underline"
              >
                {t.email.unsubscribe}
              </button>
            )}
            {isUnsubscribed && (
              <span className="text-muted-foreground/50 shrink-0 text-xs">
                {t.email.unsubscribed}
              </span>
            )}
          </div>
          <div className="text-muted-foreground shrink-0 text-xs">
            {formatRelativeDate(receivedAt)}
          </div>
        </div>
        <div
          className={cn("text-sm", isRead ? "text-muted-foreground" : "font-medium")}
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {title}
        </div>
        <div
          className={cn("text-xs", isRead ? "text-muted-foreground/70" : "text-foreground/80")}
          style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
        >
          {snippet}
        </div>
      </div>
    </div>
  );
}
