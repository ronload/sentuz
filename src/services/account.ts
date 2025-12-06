import { prisma } from "@/lib/prisma";
import { Account } from "@/generated/prisma";

interface UpsertGmailAccountProps {
  email: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export async function upsertGmailAccount({
  email,
  accessToken,
  refreshToken,
  expiresAt,
}: UpsertGmailAccountProps): Promise<Account> {
  return prisma.account.upsert({
    where: {
      provider_email: {
        provider: "gmail",
        email,
      },
    },
    update: {
      accessToken,
      refreshToken,
      expiresAt,
    },
    create: {
      provider: "gmail",
      email,
      accessToken,
      refreshToken,
      expiresAt,
      userId: "temp-user-id", // TODO: need to handle this later
    },
  });
}
