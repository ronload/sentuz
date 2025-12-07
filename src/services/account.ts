import { prisma } from "@/lib/prisma";
import { Account } from "@prisma/client";

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
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email },
  });

  return prisma.account.upsert({
    where: {
      provider_email: {
        provider: "gmail",
        email,
      },
    },
    update: {
      accessToken,
      expiresAt,
    },
    create: {
      provider: "gmail",
      email,
      accessToken,
      refreshToken,
      expiresAt,
      userId: user.id,
    },
  });
}
