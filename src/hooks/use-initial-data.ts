"use client";

import * as React from "react";
import type { Email, Folder, Account } from "./use-emails";

interface AccountDataResponse {
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
  defaultFolderId: string;
}

interface InitialDataResponse {
  accounts: Account[];
  accountDataMap: Record<string, AccountDataResponse>;
  defaultAccountId?: string;
}

export interface AccountData {
  folders: Folder[];
  emails: Email[];
  defaultFolderId: string;
  nextPageToken?: string;
}

interface UseInitialDataReturn {
  accounts: Account[];
  accountDataMap: Map<string, AccountData>;
  defaultAccountId?: string;
  isLoading: boolean;
  error: Error | null;
  // Methods for updating state after initial load
  setAccounts: React.Dispatch<React.SetStateAction<Account[]>>;
  getAccountData: (accountId: string) => AccountData | undefined;
  updateAccountEmail: (accountId: string, emailId: string, updates: Partial<Email>) => void;
  removeAccountEmail: (accountId: string, emailId: string) => void;
  restoreAccountEmail: (accountId: string, email: Email, index?: number) => void;
  prependAccountEmails: (accountId: string, newEmails: Email[]) => void;
}

export function useInitialData(): UseInitialDataReturn {
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [accountDataMap, setAccountDataMap] = React.useState<Map<string, AccountData>>(new Map());
  const [defaultAccountId, setDefaultAccountId] = React.useState<string>();
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
        setDefaultAccountId(data.defaultAccountId);

        // Convert accountDataMap to Map with parsed emails
        const parsedMap = new Map<string, AccountData>();
        for (const [accountId, accountData] of Object.entries(data.accountDataMap)) {
          parsedMap.set(accountId, {
            folders: accountData.folders,
            emails: accountData.emails.messages.map((email) => ({
              ...email,
              receivedAt: new Date(email.receivedAt),
            })),
            defaultFolderId: accountData.defaultFolderId,
            nextPageToken: accountData.emails.nextPageToken,
          });
        }
        setAccountDataMap(parsedMap);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Unknown error"));
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  // Get account data by ID
  const getAccountData = React.useCallback(
    (accountId: string) => {
      return accountDataMap.get(accountId);
    },
    [accountDataMap]
  );

  // Optimistic update helper for specific account
  const updateAccountEmail = React.useCallback(
    (accountId: string, emailId: string, updates: Partial<Email>) => {
      setAccountDataMap((prev) => {
        const newMap = new Map(prev);
        const accountData = newMap.get(accountId);
        if (accountData) {
          newMap.set(accountId, {
            ...accountData,
            emails: accountData.emails.map((e) => (e.id === emailId ? { ...e, ...updates } : e)),
          });
        }
        return newMap;
      });
    },
    []
  );

  // Remove email from specific account's list
  const removeAccountEmail = React.useCallback((accountId: string, emailId: string) => {
    setAccountDataMap((prev) => {
      const newMap = new Map(prev);
      const accountData = newMap.get(accountId);
      if (accountData) {
        newMap.set(accountId, {
          ...accountData,
          emails: accountData.emails.filter((e) => e.id !== emailId),
        });
      }
      return newMap;
    });
  }, []);

  // Restore a previously removed email to specific account
  const restoreAccountEmail = React.useCallback(
    (accountId: string, email: Email, index?: number) => {
      setAccountDataMap((prev) => {
        const newMap = new Map(prev);
        const accountData = newMap.get(accountId);
        if (accountData) {
          const newEmails = [...accountData.emails];
          if (index !== undefined && index >= 0 && index <= newEmails.length) {
            newEmails.splice(index, 0, email);
          } else {
            newEmails.unshift(email);
          }
          newMap.set(accountId, {
            ...accountData,
            emails: newEmails,
          });
        }
        return newMap;
      });
    },
    []
  );

  // Prepend new emails to specific account's list (for polling)
  const prependAccountEmails = React.useCallback((accountId: string, newEmails: Email[]) => {
    setAccountDataMap((prev) => {
      const newMap = new Map(prev);
      const accountData = newMap.get(accountId);
      if (accountData) {
        const existingIds = new Set(accountData.emails.map((e) => e.id));
        const uniqueNewEmails = newEmails.filter((e) => !existingIds.has(e.id));
        newMap.set(accountId, {
          ...accountData,
          emails: [...uniqueNewEmails, ...accountData.emails],
        });
      }
      return newMap;
    });
  }, []);

  return {
    accounts,
    accountDataMap,
    defaultAccountId,
    isLoading,
    error,
    setAccounts,
    getAccountData,
    updateAccountEmail,
    removeAccountEmail,
    restoreAccountEmail,
    prependAccountEmails,
  };
}
