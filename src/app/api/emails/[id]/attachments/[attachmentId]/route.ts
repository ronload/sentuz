import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createEmailServiceFromAccount } from "@/lib/email";

// GET /api/emails/[id]/attachments/[attachmentId] - Download attachment
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, attachmentId } = await params;
  const accountId = request.nextUrl.searchParams.get("accountId");

  if (!accountId) {
    return NextResponse.json({ error: "accountId is required" }, { status: 400 });
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
    const attachment = await emailService.getAttachment(id, attachmentId);

    const buffer = Buffer.from(attachment.data, "base64");

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": attachment.contentType,
        "Content-Disposition": `attachment; filename="${attachment.name}"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch (error) {
    console.error("Error downloading attachment:", error);
    return NextResponse.json({ error: "Failed to download attachment" }, { status: 500 });
  }
}
