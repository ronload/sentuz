"use client";

import * as React from "react";
import { Mail, Reply, ReplyAll, Forward, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "next-themes";

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

// Extract domain from email address
function getEmailDomain(email: string): string {
  return email.split("@")[1]?.toLowerCase() || "";
}

// Extract root domain from a full domain (e.g., em.uber.com -> uber.com)
function getRootDomain(domain: string): string {
  const parts = domain.split(".");
  if (parts.length <= 2) return domain;

  const secondLevelTlds = new Set(["co", "com", "net", "org", "edu", "gov", "ac", "or", "ne"]);

  if (parts.length >= 3 && secondLevelTlds.has(parts[parts.length - 2])) {
    return parts.slice(-3).join(".");
  }

  return parts.slice(-2).join(".");
}

// Get company logo URL using Google Favicon API
function getCompanyLogoUrl(email: string): string | null {
  const domain = getEmailDomain(email);
  if (!domain) return null;

  const rootDomain = getRootDomain(domain);
  if (PERSONAL_EMAIL_DOMAINS.has(rootDomain)) {
    return null;
  }

  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(rootDomain)}&sz=128`;
}

// Render email HTML in an isolated iframe to prevent style leakage
function EmailHtmlContent({ html }: { html: string }) {
  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = React.useState(200);
  const { resolvedTheme } = useTheme();

  React.useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const doc = iframe.contentDocument;
    if (!doc) return;

    // Inject styles for dark mode support and base styling
    const isDark = resolvedTheme === "dark";
    const baseStyles = `
      <style>
        * { box-sizing: border-box; }
        body {
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          font-size: 14px;
          line-height: 1.6;
          color: ${isDark ? "#e5e5e5" : "#171717"};
          background: transparent;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }
        a { color: ${isDark ? "#60a5fa" : "#2563eb"}; }
        img { max-width: 100%; height: auto; }
        table { max-width: 100%; }
        pre, code {
          background: ${isDark ? "#262626" : "#f5f5f5"};
          padding: 2px 4px;
          border-radius: 4px;
          font-size: 13px;
        }
        blockquote {
          margin: 8px 0;
          padding-left: 12px;
          border-left: 3px solid ${isDark ? "#525252" : "#d4d4d4"};
          color: ${isDark ? "#a3a3a3" : "#737373"};
        }
      </style>
    `;

    doc.open();
    doc.write(`<!DOCTYPE html><html><head>${baseStyles}</head><body>${html}</body></html>`);
    doc.close();

    // Adjust iframe height to content
    const updateHeight = () => {
      if (doc.body) {
        const newHeight = doc.body.scrollHeight;
        if (newHeight > 0) {
          setHeight(newHeight);
        }
      }
    };

    // Wait for content to render
    setTimeout(updateHeight, 100);
    setTimeout(updateHeight, 500);

    // Handle images loading
    const images = doc.querySelectorAll("img");
    images.forEach((img) => {
      img.addEventListener("load", updateHeight);
    });

    return () => {
      images.forEach((img) => {
        img.removeEventListener("load", updateHeight);
      });
    };
  }, [html, resolvedTheme]);

  return (
    <iframe
      ref={iframeRef}
      title="Email content"
      sandbox="allow-same-origin"
      style={{
        width: "100%",
        height: `${height}px`,
        border: "none",
        background: "transparent",
      }}
    />
  );
}

// Generate a consistent color based on email address
function stringToHslColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 65%, 45%)`;
}

interface EmailMessage {
  id: string;
  subject: string;
  from: {
    name?: string;
    address: string;
  };
  to: Array<{
    name?: string;
    address: string;
  }>;
  cc?: Array<{
    name?: string;
    address: string;
  }>;
  body: {
    text?: string;
    html?: string;
  };
  receivedAt: Date;
  isRead: boolean;
  isStarred: boolean;
}

interface EmailThreadViewProps {
  messages: EmailMessage[];
  isLoading?: boolean;
  onReply?: (emailId: string, replyAll?: boolean) => void;
  onForward?: (emailId: string) => void;
  onStar?: (emailId: string) => void;
  onDelete?: (emailId: string) => void;
}

function EmptyState() {
  const { t } = useI18n();

  return (
    <div className="bg-card flex h-full flex-col items-center justify-center gap-4 rounded-xl text-center shadow-sm">
      <div className="bg-muted rounded-full p-4">
        <Mail className="text-muted-foreground h-8 w-8" />
      </div>
      <div>
        <h3 className="font-medium">{t.email.noEmailSelected}</h3>
        <p className="text-muted-foreground text-sm">{t.email.selectEmailToView}</p>
      </div>
    </div>
  );
}

function ThreadSkeleton() {
  return (
    <div className="flex h-full flex-col gap-4">
      <div className="bg-card flex-1 rounded-xl p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="mt-6 space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    </div>
  );
}

interface ThreadMessageCardProps {
  message: EmailMessage;
  isFullHeight?: boolean;
  onReply?: () => void;
  onReplyAll?: () => void;
  onForward?: () => void;
  onStar?: () => void;
  onDelete?: () => void;
}

function ThreadMessageCard({
  message,
  isFullHeight,
  onReply,
  onReplyAll,
  onForward,
  onStar,
  onDelete,
}: ThreadMessageCardProps) {
  const { t } = useI18n();
  const senderName = message.from.name || message.from.address.split("@")[0];
  const senderInitial = senderName[0]?.toUpperCase() || "?";
  const avatarColor = stringToHslColor(message.from.address);
  const logoUrl = getCompanyLogoUrl(message.from.address);

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
    img.onload = () => setLogoStatus("loaded");
    img.onerror = () => setLogoStatus("error");
    img.src = logoUrl;
  }, [logoUrl]);

  return (
    <div className={cn("bg-card flex flex-col rounded-xl shadow-sm", isFullHeight ? "h-full" : "")}>
      {/* Header */}
      <div className="flex items-start gap-4 border-b p-4">
        <Avatar className="h-10 w-10 shrink-0">
          {logoStatus === "loaded" && logoUrl ? (
            <img
              src={logoUrl}
              alt={senderName}
              className="aspect-square size-full object-contain"
            />
          ) : (
            <AvatarFallback
              className="text-sm font-medium text-white"
              style={{ backgroundColor: avatarColor }}
            >
              {senderInitial}
            </AvatarFallback>
          )}
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-semibold">{senderName}</span>
            <span className="text-muted-foreground truncate text-sm">
              &lt;{message.from.address}&gt;
            </span>
          </div>
          <div className="text-muted-foreground truncate text-sm">
            {t.email.to}: {message.to.map((addr) => addr.name || addr.address).join(", ")}
          </div>
          <div className="text-muted-foreground text-xs">{message.receivedAt.toLocaleString()}</div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="ghost" size="icon" onClick={onReply} title="Reply">
            <Reply className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onReplyAll} title="Reply All">
            <ReplyAll className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onForward} title="Forward">
            <Forward className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onStar} title="Star">
            <Star
              className={cn("h-4 w-4", message.isStarred ? "fill-yellow-400 text-yellow-400" : "")}
            />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            title="Delete"
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className={cn("overflow-auto p-4", isFullHeight ? "flex-1" : "")}>
        {message.body.html ? (
          <EmailHtmlContent html={message.body.html} />
        ) : (
          <pre className="font-sans text-sm whitespace-pre-wrap">{message.body.text}</pre>
        )}
      </div>
    </div>
  );
}

export function EmailThreadView({
  messages,
  isLoading,
  onReply,
  onForward,
  onStar,
  onDelete,
}: EmailThreadViewProps) {
  if (isLoading) {
    return <ThreadSkeleton />;
  }

  if (messages.length === 0) {
    return <EmptyState />;
  }

  const isSingleMessage = messages.length === 1;

  return (
    <div className={cn("h-full", isSingleMessage ? "" : "overflow-y-auto")}>
      <div className={cn(isSingleMessage ? "h-full" : "flex flex-col gap-4")}>
        {messages.map((message) => (
          <ThreadMessageCard
            key={message.id}
            message={message}
            isFullHeight={isSingleMessage}
            onReply={() => onReply?.(message.id, false)}
            onReplyAll={() => onReply?.(message.id, true)}
            onForward={() => onForward?.(message.id)}
            onStar={() => onStar?.(message.id)}
            onDelete={() => onDelete?.(message.id)}
          />
        ))}
      </div>
    </div>
  );
}
