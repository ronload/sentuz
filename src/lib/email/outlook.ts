import type {
  IEmailService,
  EmailMessage,
  EmailListItem,
  EmailFolder,
  SendEmailParams,
  ListEmailsParams,
  ListEmailsResponse,
  Attachment,
  AttachmentContent,
  ReplyEmailParams,
  ForwardEmailParams,
} from "./types";

interface OutlookEmailAddress {
  name?: string;
  address: string;
}

interface OutlookRecipient {
  emailAddress: OutlookEmailAddress;
}

interface OutlookFlag {
  flagStatus: string;
}

interface OutlookBody {
  contentType: string;
  content: string;
}

interface OutlookInternetMessageHeader {
  name: string;
  value: string;
}

interface OutlookMessageData {
  id: string;
  conversationId?: string;
  subject?: string;
  from?: OutlookRecipient;
  toRecipients?: OutlookRecipient[];
  ccRecipients?: OutlookRecipient[];
  bccRecipients?: OutlookRecipient[];
  body?: OutlookBody;
  bodyPreview?: string;
  receivedDateTime: string;
  isRead?: boolean;
  flag?: OutlookFlag;
  hasAttachments?: boolean;
  parentFolderId?: string;
  internetMessageHeaders?: OutlookInternetMessageHeader[];
}

interface OutlookFolderData {
  id: string;
  displayName: string;
  totalItemCount?: number;
  unreadItemCount?: number;
}

interface OutlookAttachmentData {
  id: string;
  name: string;
  contentType?: string;
  size?: number;
  contentBytes?: string;
}

interface OutlookListResponse<T> {
  value: T[];
  "@odata.nextLink"?: string;
}

const GRAPH_API_BASE = "https://graph.microsoft.com/v1.0";

export class OutlookService implements IEmailService {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${GRAPH_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Microsoft Graph API error: ${response.status} ${error}`);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  async listEmails(params: ListEmailsParams): Promise<ListEmailsResponse> {
    let endpoint = "/me/messages";
    const queryParams = new URLSearchParams();

    queryParams.set(
      "$select",
      "id,subject,from,receivedDateTime,bodyPreview,isRead,flag,hasAttachments,conversationId,internetMessageHeaders"
    );
    queryParams.set("$orderby", "receivedDateTime desc");
    queryParams.set("$top", String(params.maxResults || 20));

    if (params.folderId) {
      endpoint = `/me/mailFolders/${params.folderId}/messages`;
    }

    if (params.query) {
      queryParams.set("$search", `"${params.query}"`);
    }

    if (params.pageToken) {
      const response = await this.fetch<OutlookListResponse<OutlookMessageData>>(params.pageToken);
      return {
        messages: response.value.map(this.parseEmailListItem),
        nextPageToken: response["@odata.nextLink"],
      };
    }

    const response = await this.fetch<OutlookListResponse<OutlookMessageData>>(
      `${endpoint}?${queryParams.toString()}`
    );

    return {
      messages: response.value.map(this.parseEmailListItem),
      nextPageToken: response["@odata.nextLink"],
    };
  }

  async getEmail(id: string): Promise<EmailMessage> {
    const response = await this.fetch<OutlookMessageData>(
      `/me/messages/${id}?$select=id,subject,body,from,toRecipients,ccRecipients,bccRecipients,receivedDateTime,isRead,flag,hasAttachments,conversationId,bodyPreview`
    );

    return this.parseEmailMessage(response);
  }

  async getThread(threadId: string): Promise<EmailMessage[]> {
    // Microsoft Graph uses conversationId for threads
    // We need to fetch all messages with the same conversationId
    const response = await this.fetch<OutlookListResponse<OutlookMessageData>>(
      `/me/messages?$filter=conversationId eq '${threadId}'&$select=id,subject,body,from,toRecipients,ccRecipients,bccRecipients,receivedDateTime,isRead,flag,hasAttachments,conversationId,bodyPreview&$orderby=receivedDateTime asc`
    );

    return response.value.map((msg: OutlookMessageData) => this.parseEmailMessage(msg));
  }

  async sendEmail(params: SendEmailParams): Promise<{ id: string }> {
    const message = {
      message: {
        subject: params.subject,
        body: {
          contentType: params.body.html ? "HTML" : "Text",
          content: params.body.html || params.body.text || "",
        },
        toRecipients: params.to.map((addr) => ({
          emailAddress: {
            address: addr.address,
            name: addr.name,
          },
        })),
        ccRecipients: params.cc?.map((addr) => ({
          emailAddress: {
            address: addr.address,
            name: addr.name,
          },
        })),
        bccRecipients: params.bcc?.map((addr) => ({
          emailAddress: {
            address: addr.address,
            name: addr.name,
          },
        })),
      },
      saveToSentItems: true,
    };

    await this.fetch("/me/sendMail", {
      method: "POST",
      body: JSON.stringify(message),
    });

    return { id: "sent" };
  }

  async deleteEmail(id: string): Promise<void> {
    await this.fetch(`/me/messages/${id}`, {
      method: "DELETE",
    });
  }

  async markAsRead(id: string): Promise<void> {
    await this.fetch(`/me/messages/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ isRead: true }),
    });
  }

  async markAsUnread(id: string): Promise<void> {
    await this.fetch(`/me/messages/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ isRead: false }),
    });
  }

  async star(id: string): Promise<void> {
    await this.fetch(`/me/messages/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        flag: { flagStatus: "flagged" },
      }),
    });
  }

  async unstar(id: string): Promise<void> {
    await this.fetch(`/me/messages/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        flag: { flagStatus: "notFlagged" },
      }),
    });
  }

  async listFolders(): Promise<EmailFolder[]> {
    const response = await this.fetch<OutlookListResponse<OutlookFolderData>>(
      "/me/mailFolders?$select=id,displayName,totalItemCount,unreadItemCount"
    );

    const folderTypeMap: Record<string, EmailFolder["type"]> = {
      inbox: "inbox",
      sentitems: "sent",
      drafts: "drafts",
      deleteditems: "trash",
      junkemail: "spam",
    };

    return response.value.map((folder: OutlookFolderData) => ({
      id: folder.id,
      name: folder.displayName,
      type: folderTypeMap[folder.displayName.toLowerCase()] || "custom",
      unreadCount: folder.unreadItemCount,
      totalCount: folder.totalItemCount,
    }));
  }

  async moveToFolder(id: string, folderId: string): Promise<void> {
    await this.fetch(`/me/messages/${id}/move`, {
      method: "POST",
      body: JSON.stringify({ destinationId: folderId }),
    });
  }

  async listAttachments(id: string): Promise<Attachment[]> {
    const response = await this.fetch<OutlookListResponse<OutlookAttachmentData>>(
      `/me/messages/${id}/attachments?$select=id,name,contentType,size`
    );

    return response.value.map((att: OutlookAttachmentData) => ({
      id: att.id,
      name: att.name,
      contentType: att.contentType || "application/octet-stream",
      size: att.size || 0,
    }));
  }

  async getAttachment(emailId: string, attachmentId: string): Promise<AttachmentContent> {
    const response = await this.fetch<OutlookAttachmentData>(
      `/me/messages/${emailId}/attachments/${attachmentId}`
    );

    return {
      id: response.id,
      name: response.name,
      contentType: response.contentType || "application/octet-stream",
      size: response.size || 0,
      data: response.contentBytes || "",
    };
  }

  async reply(id: string, params: ReplyEmailParams): Promise<{ id: string }> {
    const endpoint = params.replyAll ? `/me/messages/${id}/replyAll` : `/me/messages/${id}/reply`;

    await this.fetch(endpoint, {
      method: "POST",
      body: JSON.stringify({
        message: {
          body: {
            contentType: params.body.html ? "HTML" : "Text",
            content: params.body.html || params.body.text || "",
          },
        },
      }),
    });

    return { id: "sent" };
  }

  async forward(id: string, params: ForwardEmailParams): Promise<{ id: string }> {
    await this.fetch(`/me/messages/${id}/forward`, {
      method: "POST",
      body: JSON.stringify({
        toRecipients: params.to.map((addr) => ({
          emailAddress: {
            address: addr.address,
            name: addr.name,
          },
        })),
        comment: params.body?.html || params.body?.text || "",
      }),
    });

    return { id: "sent" };
  }

  private parseEmailListItem(data: OutlookMessageData): EmailListItem {
    const unsubscribeHeader = data.internetMessageHeaders?.find(
      (h) => h.name.toLowerCase() === "list-unsubscribe"
    );
    const unsubscribeUrl = unsubscribeHeader
      ? this.parseUnsubscribeUrl(unsubscribeHeader.value)
      : undefined;

    return {
      id: data.id,
      threadId: data.conversationId,
      subject: data.subject || "(No Subject)",
      from: {
        name: data.from?.emailAddress?.name,
        address: data.from?.emailAddress?.address || "",
      },
      snippet: data.bodyPreview || "",
      receivedAt: new Date(data.receivedDateTime),
      isRead: data.isRead || false,
      isStarred: data.flag?.flagStatus === "flagged",
      hasAttachments: data.hasAttachments || false,
      unsubscribeUrl,
    };
  }

  private parseUnsubscribeUrl(header: string): string | undefined {
    const urlMatch = header.match(/<(https?:\/\/[^>]+)>/);
    if (urlMatch) return urlMatch[1];

    const mailtoMatch = header.match(/<(mailto:[^>]+)>/);
    if (mailtoMatch) return mailtoMatch[1];

    return undefined;
  }

  private parseEmailMessage(data: OutlookMessageData): EmailMessage {
    return {
      id: data.id,
      threadId: data.conversationId,
      subject: data.subject || "(No Subject)",
      from: {
        name: data.from?.emailAddress?.name,
        address: data.from?.emailAddress?.address || "",
      },
      to:
        data.toRecipients?.map((r: OutlookRecipient) => ({
          name: r.emailAddress?.name,
          address: r.emailAddress?.address || "",
        })) || [],
      cc:
        data.ccRecipients?.map((r: OutlookRecipient) => ({
          name: r.emailAddress?.name,
          address: r.emailAddress?.address || "",
        })) || [],
      bcc:
        data.bccRecipients?.map((r: OutlookRecipient) => ({
          name: r.emailAddress?.name,
          address: r.emailAddress?.address || "",
        })) || [],
      body: {
        html: data.body?.contentType === "html" ? data.body.content : undefined,
        text: data.body?.contentType === "text" ? data.body.content : undefined,
      },
      snippet: data.bodyPreview || "",
      receivedAt: new Date(data.receivedDateTime),
      isRead: data.isRead || false,
      isStarred: data.flag?.flagStatus === "flagged",
      hasAttachments: data.hasAttachments || false,
      labels: data.parentFolderId ? [data.parentFolderId] : [],
    };
  }
}
