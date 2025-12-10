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
      folders: [],
      emails: { messages: [], nextPageToken: undefined },
      defaultAccountId: undefined,
      defaultFolderId: undefined,
    });
  }

  const defaultAccount = accounts[0];

  try {
    // 2. Create email service once (with account object to avoid duplicate query)
    const emailService = await createEmailServiceFromAccount(defaultAccount);

    // 3. Fetch folders and emails in parallel
    const [folders, emailsResponse] = await Promise.all([
      emailService.listFolders(),
      emailService.listEmails({ folderId: "INBOX", maxResults: 400 }),
    ]);

    // Find the inbox folder ID
    const inboxFolder = folders.find((f) => f.type === "inbox");
    const defaultFolderId = inboxFolder?.id || "INBOX";

    // 4. Return all data in one response
    return NextResponse.json({
      accounts: accounts.map((acc) => ({
        id: acc.id,
        provider: acc.provider,
        providerAccountId: acc.providerAccountId,
        email: acc.email,
        image: acc.image,
      })),
      folders,
      emails: emailsResponse,
      defaultAccountId: defaultAccount.id,
      defaultFolderId,
    });
  } catch (error) {
    console.error("Error initializing dashboard:", error);
    return NextResponse.json({ error: "Failed to initialize dashboard" }, { status: 500 });
  }
}
