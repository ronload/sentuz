import { GmailService } from "./gmail";
import { OutlookService } from "./outlook";
import type { IEmailService } from "./types";
import { getValidAccessToken } from "@/lib/oauth/token-refresh";
import { prisma } from "@/lib/prisma";

export type Provider = "google" | "microsoft-entra-id";

interface AccountData {
  id: string;
  provider: string;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: number | null;
}

export function createEmailService(provider: Provider, accessToken: string): IEmailService {
  switch (provider) {
    case "google":
      return new GmailService(accessToken);
    case "microsoft-entra-id":
      return new OutlookService(accessToken);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

// Support both account ID (string) and account object to avoid duplicate queries
export async function createEmailServiceFromAccount(
  accountOrId: string | AccountData
): Promise<IEmailService> {
  const account =
    typeof accountOrId === "string"
      ? await prisma.account.findUnique({ where: { id: accountOrId } })
      : accountOrId;

  if (!account) {
    throw new Error("Account not found");
  }

  // Pass account object to avoid another database query
  const accessToken = await getValidAccessToken(account);
  return createEmailService(account.provider as Provider, accessToken);
}

export * from "./types";
