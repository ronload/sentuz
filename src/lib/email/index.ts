import { GmailService } from "./gmail";
import { OutlookService } from "./outlook";
import type { IEmailService } from "./types";
import { getValidAccessToken } from "@/lib/oauth/token-refresh";
import { prisma } from "@/lib/prisma";

export type Provider = "google" | "microsoft-entra-id";

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

export async function createEmailServiceFromAccount(accountId: string): Promise<IEmailService> {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
  });

  if (!account) {
    throw new Error("Account not found");
  }

  const accessToken = await getValidAccessToken(accountId);
  return createEmailService(account.provider as Provider, accessToken);
}

export * from "./types";
