import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createEmailServiceFromAccount } from "@/lib/email";

// GET /api/init - Returns all initial data in one request for faster loading
export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1. Get all accounts with full data needed for email service
  const accounts = await prisma.account.findMany({
    where: { userId: session.user.id },
  });

  if (accounts.length === 0) {
    return NextResponse.json({
      accounts: [],
      accountDataMap: {},
      defaultAccountId: undefined,
    });
  }

  const defaultAccount = accounts[0];

  try {
    // 2. Parallel fetch folders and emails for ALL accounts
    const accountDataPromises = accounts.map(async (account) => {
      try {
        const emailService = await createEmailServiceFromAccount(account);
        const [folders, emailsResponse] = await Promise.all([
          emailService.listFolders(),
          emailService.listEmails({ folderId: "INBOX", maxResults: 200 }),
        ]);
        const inboxFolder = folders.find((f) => f.type === "inbox");
        return {
          accountId: account.id,
          folders,
          emails: emailsResponse,
          defaultFolderId: inboxFolder?.id || "INBOX",
        };
      } catch (error) {
        console.error(`Error fetching data for account ${account.id}:`, error);
        return {
          accountId: account.id,
          folders: [],
          emails: { messages: [], nextPageToken: undefined },
          defaultFolderId: "INBOX",
        };
      }
    });

    const accountDataArray = await Promise.all(accountDataPromises);

    // 3. Convert array to map for easy lookup
    const accountDataMap: Record<
      string,
      {
        folders: (typeof accountDataArray)[number]["folders"];
        emails: (typeof accountDataArray)[number]["emails"];
        defaultFolderId: string;
      }
    > = {};

    for (const data of accountDataArray) {
      accountDataMap[data.accountId] = {
        folders: data.folders,
        emails: data.emails,
        defaultFolderId: data.defaultFolderId,
      };
    }

    // 4. Return all data in one response
    return NextResponse.json({
      accounts: accounts.map((acc) => ({
        id: acc.id,
        provider: acc.provider,
        providerAccountId: acc.providerAccountId,
        email: acc.email,
        image: acc.image,
      })),
      accountDataMap,
      defaultAccountId: defaultAccount.id,
    });
  } catch (error) {
    console.error("Error initializing dashboard:", error);
    return NextResponse.json({ error: "Failed to initialize dashboard" }, { status: 500 });
  }
}
