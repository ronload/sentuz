"use client";

import * as React from "react";
import { Send } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n";

interface ComposeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSend: (data: {
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    content: string;
  }) => Promise<void>;
  initialData?: {
    to?: string[];
    cc?: string[];
    subject?: string;
    content?: string;
  };
  mode?: "compose" | "reply" | "forward";
}

export function ComposeDialog({
  open,
  onOpenChange,
  onSend,
  initialData,
  mode = "compose",
}: ComposeDialogProps) {
  const { t } = useI18n();
  const [to, setTo] = React.useState(initialData?.to?.join(", ") || "");
  const [cc, setCc] = React.useState(initialData?.cc?.join(", ") || "");
  const [showCc, setShowCc] = React.useState(!!initialData?.cc?.length);
  const [subject, setSubject] = React.useState(initialData?.subject || "");
  const [content, setContent] = React.useState(initialData?.content || "");
  const [isSending, setIsSending] = React.useState(false);

  React.useEffect(() => {
    if (open && initialData) {
      setTo(initialData.to?.join(", ") || "");
      setCc(initialData.cc?.join(", ") || "");
      setShowCc(!!initialData.cc?.length);
      setSubject(initialData.subject || "");
      setContent(initialData.content || "");
    }
  }, [open, initialData]);

  const handleSend = async () => {
    if (!to.trim()) return;

    setIsSending(true);
    try {
      const toAddresses = to
        .split(",")
        .map((addr) => addr.trim())
        .filter(Boolean);
      const ccAddresses = cc
        .split(",")
        .map((addr) => addr.trim())
        .filter(Boolean);

      await onSend({
        to: toAddresses,
        cc: ccAddresses.length > 0 ? ccAddresses : undefined,
        subject,
        content,
      });

      onOpenChange(false);
      setTo("");
      setCc("");
      setSubject("");
      setContent("");
    } finally {
      setIsSending(false);
    }
  };

  const getTitle = () => {
    switch (mode) {
      case "reply":
        return t.email.reply;
      case "forward":
        return t.email.forward;
      default:
        return t.email.compose;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="to">{t.email.to}</Label>
            <Input
              id="to"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="email@example.com"
            />
          </div>

          {showCc ? (
            <div className="space-y-2">
              <Label htmlFor="cc">{t.email.cc}</Label>
              <Input
                id="cc"
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                placeholder="email@example.com"
              />
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCc(true)}
              className="text-muted-foreground text-xs"
            >
              + {t.email.cc}
            </Button>
          )}

          <div className="space-y-2">
            <Label htmlFor="subject">{t.email.subject}</Label>
            <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[200px] resize-none"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t.common.cancel}
            </Button>
            <Button onClick={handleSend} disabled={!to.trim() || isSending}>
              <Send className="mr-2 h-4 w-4" />
              {t.email.send}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
