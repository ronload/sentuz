"use client";

import * as React from "react";

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
}

export interface EmailDetail extends Email {
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
  labels: string[];
}

export interface Folder {
  id: string;
  name: string;
  type: "inbox" | "sent" | "drafts" | "trash" | "spam" | "custom";
  unreadCount?: number;
  totalCount?: number;
}

export interface Account {
  id: string;
  provider: string;
  providerAccountId: string;
  email?: string | null;
  image?: string | null;
}

type EmailCategory = "all" | "transaction" | "updates" | "promotions";

interface UseEmailsOptions {
  accountId?: string;
  folderId?: string;
  query?: string;
  category?: EmailCategory;
}

function buildCategoryQuery(category: EmailCategory): string | undefined {
  switch (category) {
    case "transaction":
      // Search for transaction-related emails using keywords
      return "{order receipt invoice payment confirmation shipping delivery transaction}";
    case "updates":
      return "category:updates";
    case "promotions":
      return "category:promotions";
    case "all":
    default:
      return undefined;
  }
}

export function useAccounts() {
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  const fetchAccounts = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/accounts");
      if (!response.ok) {
        throw new Error("Failed to fetch accounts");
      }
      const data = await response.json();
      setAccounts(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const deleteAccount = React.useCallback(async (accountId: string) => {
    const response = await fetch(`/api/accounts/${accountId}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      throw new Error("Failed to delete account");
    }
    setAccounts((prev) => prev.filter((acc) => acc.id !== accountId));
  }, []);

  return { accounts, isLoading, error, refetch: fetchAccounts, deleteAccount };
}

export function useFolders(accountId?: string) {
  const [folders, setFolders] = React.useState<Folder[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const fetchFolders = React.useCallback(async () => {
    if (!accountId) {
      setFolders([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/folders?accountId=${accountId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch folders");
      }
      const data = await response.json();
      setFolders(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  }, [accountId]);

  React.useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  return { folders, isLoading, error, refetch: fetchFolders };
}

export function useEmails({ accountId, folderId, query, category = "all" }: UseEmailsOptions) {
  const [emails, setEmails] = React.useState<Email[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);
  const [nextPageToken, setNextPageToken] = React.useState<string | null>(null);

  const fetchEmails = React.useCallback(
    async (pageToken?: string) => {
      if (!accountId) {
        setEmails([]);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ accountId });
        if (folderId) params.set("folderId", folderId);

        // Combine user query with category query
        const categoryQuery = buildCategoryQuery(category);
        const combinedQuery = [query, categoryQuery].filter(Boolean).join(" ");
        if (combinedQuery) params.set("query", combinedQuery);

        if (pageToken) params.set("pageToken", pageToken);

        const response = await fetch(`/api/emails?${params.toString()}`);
        if (!response.ok) {
          throw new Error("Failed to fetch emails");
        }
        const data = await response.json();

        const parsedEmails = data.messages.map((email: any) => ({
          ...email,
          receivedAt: new Date(email.receivedAt),
        }));

        if (pageToken) {
          // Deduplicate emails when loading more
          setEmails((prev) => {
            const existingIds = new Set(prev.map((e) => e.id));
            const newEmails = parsedEmails.filter((e: Email) => !existingIds.has(e.id));
            return [...prev, ...newEmails];
          });
        } else {
          setEmails(parsedEmails);
        }
        setNextPageToken(data.nextPageToken || null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Unknown error"));
      } finally {
        setIsLoading(false);
      }
    },
    [accountId, folderId, query, category]
  );

  React.useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  const loadMore = React.useCallback(() => {
    if (nextPageToken && !isLoading) {
      fetchEmails(nextPageToken);
    }
  }, [nextPageToken, isLoading, fetchEmails]);

  return {
    emails,
    isLoading,
    error,
    hasMore: !!nextPageToken,
    loadMore,
    refetch: () => fetchEmails(),
  };
}

export function useEmail(accountId?: string, emailId?: string) {
  const [email, setEmail] = React.useState<EmailDetail | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (!accountId || !emailId) {
      setEmail(null);
      return;
    }

    const fetchEmail = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/emails/${emailId}?accountId=${accountId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch email");
        }
        const data = await response.json();
        setEmail({
          ...data,
          receivedAt: new Date(data.receivedAt),
        });
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Unknown error"));
      } finally {
        setIsLoading(false);
      }
    };

    fetchEmail();
  }, [accountId, emailId]);

  return { email, isLoading, error };
}

export function useEmailThread(accountId?: string, threadId?: string) {
  const [messages, setMessages] = React.useState<EmailDetail[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (!accountId || !threadId) {
      setMessages([]);
      return;
    }

    const fetchThread = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/emails/thread/${threadId}?accountId=${accountId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch thread");
        }
        const data = await response.json();
        setMessages(
          data.messages.map((msg: any) => ({
            ...msg,
            receivedAt: new Date(msg.receivedAt),
          }))
        );
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Unknown error"));
      } finally {
        setIsLoading(false);
      }
    };

    fetchThread();
  }, [accountId, threadId]);

  return { messages, isLoading, error };
}

export function useEmailActions(accountId?: string) {
  const markAsRead = React.useCallback(
    async (emailId: string) => {
      if (!accountId) return;
      await fetch(`/api/emails/${emailId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, isRead: true }),
      });
    },
    [accountId]
  );

  const markAsUnread = React.useCallback(
    async (emailId: string) => {
      if (!accountId) return;
      await fetch(`/api/emails/${emailId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, isRead: false }),
      });
    },
    [accountId]
  );

  const star = React.useCallback(
    async (emailId: string) => {
      if (!accountId) return;
      await fetch(`/api/emails/${emailId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, isStarred: true }),
      });
    },
    [accountId]
  );

  const unstar = React.useCallback(
    async (emailId: string) => {
      if (!accountId) return;
      await fetch(`/api/emails/${emailId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, isStarred: false }),
      });
    },
    [accountId]
  );

  const deleteEmail = React.useCallback(
    async (emailId: string) => {
      if (!accountId) return;
      await fetch(`/api/emails/${emailId}?accountId=${accountId}`, {
        method: "DELETE",
      });
    },
    [accountId]
  );

  const sendEmail = React.useCallback(
    async (data: {
      to: string[];
      cc?: string[];
      bcc?: string[];
      subject: string;
      content: string;
    }) => {
      if (!accountId) throw new Error("No account selected");
      const response = await fetch("/api/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          to: data.to,
          cc: data.cc,
          bcc: data.bcc,
          subject: data.subject,
          content: data.content,
          contentType: "text",
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to send email");
      }
      return response.json();
    },
    [accountId]
  );

  const reply = React.useCallback(
    async (emailId: string, content: string, replyAll?: boolean) => {
      if (!accountId) throw new Error("No account selected");
      const response = await fetch(`/api/emails/${emailId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          content,
          contentType: "text",
          replyAll,
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to reply");
      }
      return response.json();
    },
    [accountId]
  );

  const forward = React.useCallback(
    async (emailId: string, to: string[], content?: string) => {
      if (!accountId) throw new Error("No account selected");
      const response = await fetch(`/api/emails/${emailId}/forward`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          to,
          content,
          contentType: "text",
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to forward");
      }
      return response.json();
    },
    [accountId]
  );

  return {
    markAsRead,
    markAsUnread,
    star,
    unstar,
    deleteEmail,
    sendEmail,
    reply,
    forward,
  };
}
