import { NextRequest, NextResponse } from "next/server";
import { createEmailServiceFromAccount } from "@/lib/email";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const { threadId } = await params;
  const accountId = request.nextUrl.searchParams.get("accountId");

  if (!accountId) {
    return NextResponse.json({ error: "accountId is required" }, { status: 400 });
  }

  try {
    const emailService = await createEmailServiceFromAccount(accountId);
    const messages = await emailService.getThread(threadId);

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Failed to fetch thread:", error);
    return NextResponse.json({ error: "Failed to fetch thread" }, { status: 500 });
  }
}
