import { prisma } from "@/lib/prisma";
import { Account } from "@prisma/client";

interface UpsertAccountProps {
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
}: UpsertAccountProps): Promise<Account> {
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

export async function upsertOutlookAccount({
  email,
  accessToken,
  refreshToken,
  expiresAt,
}: UpsertAccountProps): Promise<Account> {
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email },
  });

  return prisma.account.upsert({
    where: {
      provider_email: {
        provider: "outlook",
        email,
      },
    },
    update: {
      accessToken,
      refreshToken,
      expiresAt,
    },
    create: {
      provider: "outlook",
      email,
      accessToken,
      refreshToken,
      expiresAt,
      userId: user.id,
    },
  });
}
