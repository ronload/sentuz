"use client";

import * as React from "react";
import {
  ArrowLeft,
  Reply,
  ReplyAll,
  Forward,
  Star,
  Trash2,
  MoreHorizontal,
  Paperclip,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

interface Attachment {
  id: string;
  name: string;
  contentType: string;
  size: number;
}

interface EmailDetailData {
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
  attachments?: Attachment[];
}

interface EmailDetailProps {
  email?: EmailDetailData;
  isLoading?: boolean;
  onBack: () => void;
  onReply: () => void;
  onReplyAll: () => void;
  onForward: () => void;
  onStar: () => void;
  onDelete: () => void;
  onDownloadAttachment?: (attachmentId: string) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function EmailDetailSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b p-4">
        <Skeleton className="h-9 w-9" />
        <Skeleton className="h-6 flex-1" />
      </div>
      <div className="flex-1 p-6">
        <div className="flex items-start gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
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

export function EmailDetail({
  email,
  isLoading,
  onBack,
  onReply,
  onReplyAll,
  onForward,
  onStar,
  onDelete,
  onDownloadAttachment,
}: EmailDetailProps) {
  const { t } = useI18n();

  if (isLoading) {
    return <EmailDetailSkeleton />;
  }

  if (!email) {
    return null;
  }

  const senderName = email.from.name || email.from.address.split("@")[0];
  const senderInitial = senderName[0]?.toUpperCase() || "?";

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b p-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <h1 className="flex-1 truncate text-lg font-semibold">
          {email.subject || "(No Subject)"}
        </h1>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={onReply}>
            <Reply className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onReplyAll}>
            <ReplyAll className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onForward}>
            <Forward className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onStar}>
            <Star
              className={cn(
                "h-4 w-4",
                email.isStarred
                  ? "fill-yellow-400 text-yellow-400"
                  : ""
              )}
            />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <Avatar className="h-12 w-12">
              <AvatarFallback>{senderInitial}</AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{senderName}</span>
                <span className="text-sm text-muted-foreground">
                  &lt;{email.from.address}&gt;
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                {t.email.to}:{" "}
                {email.to
                  .map((addr) => addr.name || addr.address)
                  .join(", ")}
              </div>
              {email.cc && email.cc.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  {t.email.cc}:{" "}
                  {email.cc
                    .map((addr) => addr.name || addr.address)
                    .join(", ")}
                </div>
              )}
              <div className="text-xs text-muted-foreground">
                {email.receivedAt.toLocaleString()}
              </div>
            </div>
          </div>

          {email.attachments && email.attachments.length > 0 && (
            <>
              <Separator className="my-4" />
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Paperclip className="h-4 w-4" />
                  {t.email.attachments} ({email.attachments.length})
                </div>
                <div className="flex flex-wrap gap-2">
                  {email.attachments.map((attachment) => (
                    <Badge
                      key={attachment.id}
                      variant="secondary"
                      className="cursor-pointer gap-2 py-2"
                      onClick={() => onDownloadAttachment?.(attachment.id)}
                    >
                      {attachment.name}
                      <span className="text-xs text-muted-foreground">
                        ({formatFileSize(attachment.size)})
                      </span>
                      <Download className="h-3 w-3" />
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          <Separator className="my-4" />

          <div className="prose prose-sm dark:prose-invert max-w-none">
            {email.body.html ? (
              <div
                dangerouslySetInnerHTML={{ __html: email.body.html }}
              />
            ) : (
              <pre className="whitespace-pre-wrap font-sans">
                {email.body.text}
              </pre>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
