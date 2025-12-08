export interface EmailAddress {
  name?: string;
  address: string;
}

export interface EmailMessage {
  id: string;
  threadId?: string;
  subject: string;
  from: EmailAddress;
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  body: {
    text?: string;
    html?: string;
  };
  snippet: string;
  receivedAt: Date;
  isRead: boolean;
  isStarred: boolean;
  hasAttachments: boolean;
  labels: string[];
}

export interface EmailListItem {
  id: string;
  threadId?: string;
  subject: string;
  from: EmailAddress;
  snippet: string;
  receivedAt: Date;
  isRead: boolean;
  isStarred: boolean;
  hasAttachments: boolean;
}

export interface EmailFolder {
  id: string;
  name: string;
  type: "inbox" | "sent" | "drafts" | "trash" | "spam" | "custom";
  unreadCount?: number;
  totalCount?: number;
}

export interface SendEmailParams {
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  subject: string;
  body: {
    text?: string;
    html?: string;
  };
}

export interface ListEmailsParams {
  folderId?: string;
  maxResults?: number;
  pageToken?: string;
  query?: string;
}

export interface ListEmailsResponse {
  messages: EmailListItem[];
  nextPageToken?: string;
}

export interface Attachment {
  id: string;
  name: string;
  contentType: string;
  size: number;
}

export interface AttachmentContent extends Attachment {
  data: string; // base64 encoded
}

export interface ReplyEmailParams {
  body: {
    text?: string;
    html?: string;
  };
  replyAll?: boolean;
}

export interface ForwardEmailParams {
  to: EmailAddress[];
  body?: {
    text?: string;
    html?: string;
  };
}

export interface IEmailService {
  listEmails(params: ListEmailsParams): Promise<ListEmailsResponse>;
  getEmail(id: string): Promise<EmailMessage>;
  getThread(threadId: string): Promise<EmailMessage[]>;
  sendEmail(params: SendEmailParams): Promise<{ id: string }>;
  deleteEmail(id: string): Promise<void>;
  markAsRead(id: string): Promise<void>;
  markAsUnread(id: string): Promise<void>;
  star(id: string): Promise<void>;
  unstar(id: string): Promise<void>;
  listFolders(): Promise<EmailFolder[]>;
  moveToFolder(id: string, folderId: string): Promise<void>;
  listAttachments(id: string): Promise<Attachment[]>;
  getAttachment(emailId: string, attachmentId: string): Promise<AttachmentContent>;
  reply(id: string, params: ReplyEmailParams): Promise<{ id: string }>;
  forward(id: string, params: ForwardEmailParams): Promise<{ id: string }>;
}
