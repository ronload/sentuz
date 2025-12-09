import { prisma } from "@/lib/prisma";

interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  token_type: string;
}

async function refreshGoogleToken(refreshToken: string): Promise<TokenResponse> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh Google token: ${error}`);
  }

  return response.json();
}

async function refreshMicrosoftToken(refreshToken: string): Promise<TokenResponse> {
  const response = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID!,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
      scope: "openid profile email offline_access Mail.ReadWrite Mail.Send",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh Microsoft token: ${error}`);
  }

  return response.json();
}

export async function getValidAccessToken(accountId: string): Promise<string> {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
  });

  if (!account) {
    throw new Error("Account not found");
  }

  if (!account.access_token) {
    throw new Error("No access token found for account");
  }

  const now = Math.floor(Date.now() / 1000);
  const expiresAt = account.expires_at ?? 0;
  const bufferSeconds = 300; // 5 minutes buffer

  // Check if token is still valid (with buffer)
  if (expiresAt > now + bufferSeconds) {
    return account.access_token;
  }

  // Token expired or about to expire, refresh it
  if (!account.refresh_token) {
    throw new Error("No refresh token found for account");
  }

  let tokenResponse: TokenResponse;

  if (account.provider === "google") {
    tokenResponse = await refreshGoogleToken(account.refresh_token);
  } else if (account.provider === "microsoft-entra-id" || account.provider === "azure-ad") {
    tokenResponse = await refreshMicrosoftToken(account.refresh_token);
  } else {
    throw new Error(`Unknown provider: ${account.provider}`);
  }

  // Update the database with new tokens
  const updatedAccount = await prisma.account.update({
    where: { id: accountId },
    data: {
      access_token: tokenResponse.access_token,
      expires_at: Math.floor(Date.now() / 1000) + tokenResponse.expires_in,
      // Update refresh token if a new one is provided
      ...(tokenResponse.refresh_token && {
        refresh_token: tokenResponse.refresh_token,
      }),
    },
  });

  return updatedAccount.access_token!;
}
