import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createEmailServiceFromAccount } from "@/lib/email";

// GET /api/emails - List emails
export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const accountId = searchParams.get("accountId");
  const folderId = searchParams.get("folderId") || undefined;
  const maxResults = parseInt(searchParams.get("maxResults") || "20");
  const pageToken = searchParams.get("pageToken") || undefined;
  const query = searchParams.get("query") || undefined;

  if (!accountId) {
    return NextResponse.json(
      { error: "accountId is required" },
      { status: 400 }
    );
  }

  const account = await prisma.account.findFirst({
    where: {
      id: accountId,
      userId: session.user.id,
    },
  });

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  try {
    const emailService = await createEmailServiceFromAccount(accountId);

    const result = await emailService.listEmails({
      folderId,
      maxResults,
      pageToken,
      query,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error listing emails:", error);
    return NextResponse.json(
      { error: "Failed to list emails" },
      { status: 500 }
    );
  }
}

// POST /api/emails - Send email
export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { accountId, to, cc, bcc, subject, content, contentType } = body;

  if (!accountId) {
    return NextResponse.json(
      { error: "accountId is required" },
      { status: 400 }
    );
  }

  if (!to || !Array.isArray(to) || to.length === 0) {
    return NextResponse.json(
      { error: "At least one recipient is required" },
      { status: 400 }
    );
  }

  if (!subject) {
    return NextResponse.json({ error: "Subject is required" }, { status: 400 });
  }

  const account = await prisma.account.findFirst({
    where: {
      id: accountId,
      userId: session.user.id,
    },
  });

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  try {
    const emailService = await createEmailServiceFromAccount(accountId);

    const result = await emailService.sendEmail({
      to: to.map((addr: string | { address: string; name?: string }) =>
        typeof addr === "string" ? { address: addr } : addr
      ),
      cc: cc?.map((addr: string | { address: string; name?: string }) =>
        typeof addr === "string" ? { address: addr } : addr
      ),
      bcc: bcc?.map((addr: string | { address: string; name?: string }) =>
        typeof addr === "string" ? { address: addr } : addr
      ),
      subject,
      body:
        contentType === "html"
          ? { html: content }
          : { text: content },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error sending email:", error);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}
