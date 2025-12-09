import { google } from "googleapis";
import type {
  IEmailService,
  EmailMessage,
  EmailListItem,
  EmailFolder,
  EmailAddress,
  SendEmailParams,
  ListEmailsParams,
  ListEmailsResponse,
  Attachment,
  AttachmentContent,
  ReplyEmailParams,
  ForwardEmailParams,
} from "./types";

interface GmailHeader {
  name?: string | null;
  value?: string | null;
}

interface GmailMessageBody {
  attachmentId?: string | null;
  size?: number | null;
  data?: string | null;
}

interface GmailMessagePart {
  partId?: string | null;
  mimeType?: string | null;
  filename?: string | null;
  headers?: GmailHeader[];
  body?: GmailMessageBody;
  parts?: GmailMessagePart[];
}

interface GmailPayload extends GmailMessagePart {
  headers?: GmailHeader[];
}

interface GmailMessageData {
  id?: string | null;
  threadId?: string | null;
  labelIds?: string[] | null;
  snippet?: string | null;
  internalDate?: string | null;
  payload?: GmailPayload | null;
}

export class GmailService implements IEmailService {
  private gmail;

  constructor(accessToken: string) {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    this.gmail = google.gmail({ version: "v1", auth });
  }

  async listEmails(params: ListEmailsParams): Promise<ListEmailsResponse> {
    const response = await this.gmail.users.messages.list({
      userId: "me",
      maxResults: params.maxResults || 20,
      pageToken: params.pageToken,
      q: params.query,
      labelIds: params.folderId ? [params.folderId] : undefined,
    });

    if (!response.data.messages) {
      return { messages: [], nextPageToken: undefined };
    }

    // Parallel fetch all email details for better performance
    const detailPromises = response.data.messages.map((msg) =>
      this.gmail.users.messages.get({
        userId: "me",
        id: msg.id!,
        format: "metadata",
        metadataHeaders: ["From", "Subject", "Date"],
      })
    );

    const details = await Promise.all(detailPromises);
    const messages = details.map((detail) => this.parseEmailListItem(detail.data));

    return {
      messages,
      nextPageToken: response.data.nextPageToken || undefined,
    };
  }

  async getEmail(id: string): Promise<EmailMessage> {
    const response = await this.gmail.users.messages.get({
      userId: "me",
      id,
      format: "full",
    });

    return this.parseEmailMessage(response.data);
  }

  async getThread(threadId: string): Promise<EmailMessage[]> {
    const response = await this.gmail.users.threads.get({
      userId: "me",
      id: threadId,
      format: "full",
    });

    const messages: EmailMessage[] = [];
    if (response.data.messages) {
      for (const msg of response.data.messages) {
        messages.push(this.parseEmailMessage(msg));
      }
    }

    // Sort by date ascending (oldest first)
    return messages.sort((a, b) => a.receivedAt.getTime() - b.receivedAt.getTime());
  }

  async sendEmail(params: SendEmailParams): Promise<{ id: string }> {
    const message = this.createRawMessage(params);

    const response = await this.gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: message,
      },
    });

    return { id: response.data.id! };
  }

  async deleteEmail(id: string): Promise<void> {
    await this.gmail.users.messages.trash({
      userId: "me",
      id,
    });
  }

  async markAsRead(id: string): Promise<void> {
    await this.gmail.users.messages.modify({
      userId: "me",
      id,
      requestBody: {
        removeLabelIds: ["UNREAD"],
      },
    });
  }

  async markAsUnread(id: string): Promise<void> {
    await this.gmail.users.messages.modify({
      userId: "me",
      id,
      requestBody: {
        addLabelIds: ["UNREAD"],
      },
    });
  }

  async star(id: string): Promise<void> {
    await this.gmail.users.messages.modify({
      userId: "me",
      id,
      requestBody: {
        addLabelIds: ["STARRED"],
      },
    });
  }

  async unstar(id: string): Promise<void> {
    await this.gmail.users.messages.modify({
      userId: "me",
      id,
      requestBody: {
        removeLabelIds: ["STARRED"],
      },
    });
  }

  async listFolders(): Promise<EmailFolder[]> {
    const response = await this.gmail.users.labels.list({
      userId: "me",
    });

    const folders: EmailFolder[] = [];
    const systemLabels: Record<string, EmailFolder["type"]> = {
      INBOX: "inbox",
      SENT: "sent",
      DRAFT: "drafts",
      TRASH: "trash",
      SPAM: "spam",
    };

    for (const label of response.data.labels || []) {
      if (label.id && label.name) {
        const type = systemLabels[label.id] || "custom";
        if (type !== "custom" || label.type === "user") {
          folders.push({
            id: label.id,
            name: label.name,
            type,
            unreadCount: label.messagesUnread ?? undefined,
            totalCount: label.messagesTotal ?? undefined,
          });
        }
      }
    }

    return folders;
  }

  async moveToFolder(id: string, folderId: string): Promise<void> {
    const message = await this.gmail.users.messages.get({
      userId: "me",
      id,
      format: "minimal",
    });

    const currentLabels = message.data.labelIds || [];
    const systemLabels = ["INBOX", "SENT", "DRAFT", "TRASH", "SPAM"];
    const labelsToRemove = currentLabels.filter(
      (label) => systemLabels.includes(label) || !label.startsWith("CATEGORY_")
    );

    await this.gmail.users.messages.modify({
      userId: "me",
      id,
      requestBody: {
        addLabelIds: [folderId],
        removeLabelIds: labelsToRemove.filter((l) => l !== folderId),
      },
    });
  }

  async listAttachments(id: string): Promise<Attachment[]> {
    const response = await this.gmail.users.messages.get({
      userId: "me",
      id,
      format: "full",
    });

    const attachments: Attachment[] = [];
    const extractAttachments = (parts: GmailMessagePart[]) => {
      for (const part of parts) {
        if (part.filename && part.body?.attachmentId) {
          attachments.push({
            id: part.body.attachmentId,
            name: part.filename,
            contentType: part.mimeType || "application/octet-stream",
            size: part.body.size || 0,
          });
        }
        if (part.parts) {
          extractAttachments(part.parts);
        }
      }
    };

    if (response.data.payload?.parts) {
      extractAttachments(response.data.payload.parts);
    }

    return attachments;
  }

  async getAttachment(emailId: string, attachmentId: string): Promise<AttachmentContent> {
    const message = await this.gmail.users.messages.get({
      userId: "me",
      id: emailId,
      format: "full",
    });

    let foundName = "attachment";
    let foundContentType = "application/octet-stream";

    const findAttachment = (parts: GmailMessagePart[]) => {
      for (const part of parts) {
        if (part.body?.attachmentId === attachmentId) {
          foundName = part.filename || "attachment";
          foundContentType = part.mimeType || "application/octet-stream";
          return;
        }
        if (part.parts) {
          findAttachment(part.parts);
        }
      }
    };

    if (message.data.payload?.parts) {
      findAttachment(message.data.payload.parts);
    }

    const response = await this.gmail.users.messages.attachments.get({
      userId: "me",
      messageId: emailId,
      id: attachmentId,
    });

    return {
      id: attachmentId,
      name: foundName,
      contentType: foundContentType,
      size: response.data.size || 0,
      data: response.data.data || "",
    };
  }

  async reply(id: string, params: ReplyEmailParams): Promise<{ id: string }> {
    const original = await this.getEmail(id);

    const to = params.replyAll
      ? [original.from, ...(original.to || []), ...(original.cc || [])]
      : [original.from];

    const subject = original.subject.startsWith("Re:")
      ? original.subject
      : `Re: ${original.subject}`;

    const message = this.createReplyMessage({
      to,
      subject,
      body: params.body,
      threadId: original.threadId,
      inReplyTo: id,
    });

    const response = await this.gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: message,
        threadId: original.threadId,
      },
    });

    return { id: response.data.id! };
  }

  async forward(id: string, params: ForwardEmailParams): Promise<{ id: string }> {
    const original = await this.getEmail(id);

    const subject = original.subject.startsWith("Fwd:")
      ? original.subject
      : `Fwd: ${original.subject}`;

    const forwardHeader = [
      "",
      "---------- Forwarded message ---------",
      `From: ${original.from.name ? `${original.from.name} <${original.from.address}>` : original.from.address}`,
      `Date: ${original.receivedAt.toISOString()}`,
      `Subject: ${original.subject}`,
      `To: ${original.to.map((t) => t.address).join(", ")}`,
      "",
    ].join("\r\n");

    const bodyContent = params.body?.html || params.body?.text || "";
    const originalBody = original.body.html || original.body.text || "";

    const message = this.createRawMessage({
      to: params.to,
      subject,
      body: {
        html: original.body.html
          ? `${bodyContent}<br><br>${forwardHeader.replace(/\r\n/g, "<br>")}${originalBody}`
          : undefined,
        text: !original.body.html ? `${bodyContent}\r\n${forwardHeader}${originalBody}` : undefined,
      },
    });

    const response = await this.gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: message,
      },
    });

    return { id: response.data.id! };
  }

  private createReplyMessage(params: {
    to: EmailAddress[];
    subject: string;
    body: { text?: string; html?: string };
    threadId?: string;
    inReplyTo: string;
  }): string {
    const toHeader = params.to
      .map((addr) => (addr.name ? `"${addr.name}" <${addr.address}>` : addr.address))
      .join(", ");

    const lines = [
      `To: ${toHeader}`,
      `Subject: ${params.subject}`,
      `In-Reply-To: ${params.inReplyTo}`,
      `References: ${params.inReplyTo}`,
      "MIME-Version: 1.0",
    ];

    if (params.body.html) {
      lines.push('Content-Type: text/html; charset="UTF-8"');
      lines.push("");
      lines.push(params.body.html);
    } else {
      lines.push('Content-Type: text/plain; charset="UTF-8"');
      lines.push("");
      lines.push(params.body.text || "");
    }

    const message = lines.join("\r\n");
    return Buffer.from(message)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }

  private parseEmailListItem(data: GmailMessageData): EmailListItem {
    const headers = data.payload?.headers || [];
    const getHeader = (name: string) =>
      headers.find((h: GmailHeader) => h.name?.toLowerCase() === name.toLowerCase())?.value;

    return {
      id: data.id || "",
      threadId: data.threadId || undefined,
      subject: getHeader("Subject") || "(No Subject)",
      from: this.parseEmailAddress(getHeader("From") || ""),
      snippet: data.snippet || "",
      receivedAt: new Date(parseInt(data.internalDate || "0")),
      isRead: !data.labelIds?.includes("UNREAD"),
      isStarred: data.labelIds?.includes("STARRED") || false,
      hasAttachments: this.checkHasAttachments(data.payload),
    };
  }

  private parseEmailMessage(data: GmailMessageData): EmailMessage {
    const headers = data.payload?.headers || [];
    const getHeader = (name: string) =>
      headers.find((h: GmailHeader) => h.name?.toLowerCase() === name.toLowerCase())?.value;

    return {
      id: data.id || "",
      threadId: data.threadId || undefined,
      subject: getHeader("Subject") || "(No Subject)",
      from: this.parseEmailAddress(getHeader("From") || ""),
      to: this.parseEmailAddresses(getHeader("To") || ""),
      cc: this.parseEmailAddresses(getHeader("Cc") || ""),
      body: data.payload ? this.extractBody(data.payload) : {},
      snippet: data.snippet || "",
      receivedAt: new Date(parseInt(data.internalDate || "0")),
      isRead: !data.labelIds?.includes("UNREAD"),
      isStarred: data.labelIds?.includes("STARRED") || false,
      hasAttachments: this.checkHasAttachments(data.payload),
      labels: data.labelIds || [],
    };
  }

  private parseEmailAddress(value: string): EmailAddress {
    const match = value.match(/^(?:"?([^"]*)"?\s)?<?([^>]+)>?$/);
    if (match) {
      return {
        name: match[1]?.trim(),
        address: match[2].trim(),
      };
    }
    return { address: value.trim() };
  }

  private parseEmailAddresses(value: string): EmailAddress[] {
    if (!value) return [];
    return value.split(",").map((addr) => this.parseEmailAddress(addr.trim()));
  }

  private extractBody(payload: GmailPayload): { text?: string; html?: string } {
    const body: { text?: string; html?: string } = {};

    const extractFromPart = (part: GmailMessagePart) => {
      if (part.mimeType === "text/plain" && part.body?.data) {
        body.text = Buffer.from(part.body.data, "base64url").toString("utf-8");
      } else if (part.mimeType === "text/html" && part.body?.data) {
        body.html = Buffer.from(part.body.data, "base64url").toString("utf-8");
      } else if (part.parts) {
        part.parts.forEach(extractFromPart);
      }
    };

    if (payload.body?.data) {
      if (payload.mimeType === "text/html") {
        body.html = Buffer.from(payload.body.data, "base64url").toString("utf-8");
      } else {
        body.text = Buffer.from(payload.body.data, "base64url").toString("utf-8");
      }
    } else if (payload.parts) {
      payload.parts.forEach(extractFromPart);
    }

    return body;
  }

  private checkHasAttachments(payload: GmailPayload | null | undefined): boolean {
    if (!payload) return false;

    const check = (part: GmailMessagePart): boolean => {
      if (part.filename && part.filename.length > 0) {
        return true;
      }
      if (part.parts) {
        return part.parts.some(check);
      }
      return false;
    };

    return check(payload);
  }

  private createRawMessage(params: SendEmailParams): string {
    const toHeader = params.to
      .map((addr) => (addr.name ? `"${addr.name}" <${addr.address}>` : addr.address))
      .join(", ");

    const lines = [`To: ${toHeader}`, `Subject: ${params.subject}`, "MIME-Version: 1.0"];

    if (params.cc?.length) {
      const ccHeader = params.cc
        .map((addr) => (addr.name ? `"${addr.name}" <${addr.address}>` : addr.address))
        .join(", ");
      lines.push(`Cc: ${ccHeader}`);
    }

    if (params.body.html) {
      lines.push('Content-Type: text/html; charset="UTF-8"');
      lines.push("");
      lines.push(params.body.html);
    } else {
      lines.push('Content-Type: text/plain; charset="UTF-8"');
      lines.push("");
      lines.push(params.body.text || "");
    }

    const message = lines.join("\r\n");
    return Buffer.from(message)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }
}
