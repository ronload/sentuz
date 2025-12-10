"use client";

import * as React from "react";
import type { Email, Folder, Account } from "./use-emails";

interface InitialDataResponse {
  accounts: Account[];
  folders: Folder[];
  emails: {
    messages: Array<{
      id: string;
      threadId?: string;
      subject: string;
      from: { name?: string; address: string };
      snippet: string;
      receivedAt: string;
      isRead: boolean;
      isStarred: boolean;
      hasAttachments: boolean;
      unsubscribeUrl?: string;
    }>;
    nextPageToken?: string;
  };
  defaultAccountId?: string;
  defaultFolderId?: string;
}

interface UseInitialDataReturn {
  accounts: Account[];
  folders: Folder[];
  emails: Email[];
  defaultAccountId?: string;
  defaultFolderId?: string;
  isLoading: boolean;
  error: Error | null;
  nextPageToken?: string;
  // Methods for updating state after initial load
  setAccounts: React.Dispatch<React.SetStateAction<Account[]>>;
  setFolders: React.Dispatch<React.SetStateAction<Folder[]>>;
  setEmails: React.Dispatch<React.SetStateAction<Email[]>>;
  updateEmail: (emailId: string, updates: Partial<Email>) => void;
  removeEmail: (emailId: string) => void;
  restoreEmail: (email: Email, index?: number) => void;
  prependEmails: (newEmails: Email[]) => void;
}

export function useInitialData(): UseInitialDataReturn {
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [folders, setFolders] = React.useState<Folder[]>([]);
  const [emails, setEmails] = React.useState<Email[]>([]);
  const [defaultAccountId, setDefaultAccountId] = React.useState<string>();
  const [defaultFolderId, setDefaultFolderId] = React.useState<string>();
  const [nextPageToken, setNextPageToken] = React.useState<string>();
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const response = await fetch("/api/init");
        if (!response.ok) {
          throw new Error("Failed to fetch initial data");
        }
        const data: InitialDataResponse = await response.json();

        setAccounts(data.accounts);
        setFolders(data.folders);
        setEmails(
          data.emails.messages.map((email) => ({
            ...email,
            receivedAt: new Date(email.receivedAt),
          }))
        );
        setDefaultAccountId(data.defaultAccountId);
        setDefaultFolderId(data.defaultFolderId);
        setNextPageToken(data.emails.nextPageToken);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Unknown error"));
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  // Optimistic update helper
  const updateEmail = React.useCallback((emailId: string, updates: Partial<Email>) => {
    setEmails((prev) => prev.map((e) => (e.id === emailId ? { ...e, ...updates } : e)));
  }, []);

  // Remove email from list
  const removeEmail = React.useCallback((emailId: string) => {
    setEmails((prev) => prev.filter((e) => e.id !== emailId));
  }, []);

  // Restore a previously removed email
  const restoreEmail = React.useCallback((email: Email, index?: number) => {
    setEmails((prev) => {
      if (index !== undefined && index >= 0 && index <= prev.length) {
        const newEmails = [...prev];
        newEmails.splice(index, 0, email);
        return newEmails;
      }
      return [email, ...prev];
    });
  }, []);

  // Prepend new emails to the list (for polling)
  const prependEmails = React.useCallback((newEmails: Email[]) => {
    setEmails((prev) => {
      const existingIds = new Set(prev.map((e) => e.id));
      const uniqueNewEmails = newEmails.filter((e) => !existingIds.has(e.id));
      return [...uniqueNewEmails, ...prev];
    });
  }, []);

  return {
    accounts,
    folders,
    emails,
    defaultAccountId,
    defaultFolderId,
    isLoading,
    error,
    nextPageToken,
    setAccounts,
    setFolders,
    setEmails,
    updateEmail,
    removeEmail,
    restoreEmail,
    prependEmails,
  };
}
