"use client";

import * as React from "react";
import type { Email } from "./use-emails";

interface RawEmailData {
  id: string;
  threadId?: string;
  subject: string;
  from: {
    name?: string;
    address: string;
  };
  snippet: string;
  receivedAt: string;
  isRead: boolean;
  isStarred: boolean;
  hasAttachments: boolean;
  unsubscribeUrl?: string;
}

interface UseEmailPollingOptions {
  accountId?: string;
  folderId?: string;
  currentEmails: Email[];
  enabled?: boolean;
  interval?: number;
  onNewEmails: (newEmails: Email[]) => void;
}

export function useEmailPolling({
  accountId,
  folderId,
  currentEmails,
  enabled = true,
  interval = 30000,
  onNewEmails,
}: UseEmailPollingOptions) {
  const [isPolling, setIsPolling] = React.useState(false);
  const lastCheckRef = React.useRef<Date | null>(null);
  const isVisibleRef = React.useRef(true);

  // Track page visibility
  React.useEffect(() => {
    const handleVisibilityChange = () => {
      isVisibleRef.current = document.visibilityState === "visible";
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Get the latest email timestamp from current emails
  const getLatestTimestamp = React.useCallback(() => {
    if (currentEmails.length === 0) return null;
    // Emails are sorted by receivedAt desc, so first one is the latest
    return currentEmails[0].receivedAt;
  }, [currentEmails]);

  // Fetch and check for new emails
  const checkForNewEmails = React.useCallback(async () => {
    if (!accountId || !folderId || !isVisibleRef.current) return;

    setIsPolling(true);
    try {
      const params = new URLSearchParams({ accountId, folderId });
      const response = await fetch(`/api/emails?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Failed to fetch emails");
      }

      const data = await response.json();
      const fetchedEmails: Email[] = data.messages.map((email: RawEmailData) => ({
        ...email,
        receivedAt: new Date(email.receivedAt),
      }));

      // Get the latest timestamp from current emails
      const latestTimestamp = getLatestTimestamp();

      if (latestTimestamp) {
        // Filter emails that are newer than the latest we have
        const newEmails = fetchedEmails.filter((email) => email.receivedAt > latestTimestamp);

        if (newEmails.length > 0) {
          // Sort by receivedAt desc (newest first)
          newEmails.sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime());
          onNewEmails(newEmails);
        }
      }

      lastCheckRef.current = new Date();
    } catch (error) {
      console.error("Email polling error:", error);
    } finally {
      setIsPolling(false);
    }
  }, [accountId, folderId, getLatestTimestamp, onNewEmails]);

  // Set up polling interval
  React.useEffect(() => {
    if (!enabled || !accountId || !folderId) {
      return;
    }

    // Set initial last check time
    if (!lastCheckRef.current) {
      lastCheckRef.current = new Date();
    }

    const intervalId = setInterval(() => {
      // Only poll if page is visible
      if (isVisibleRef.current) {
        checkForNewEmails();
      }
    }, interval);

    return () => {
      clearInterval(intervalId);
    };
  }, [enabled, accountId, folderId, interval, checkForNewEmails]);

  return {
    isPolling,
    checkNow: checkForNewEmails,
  };
}
