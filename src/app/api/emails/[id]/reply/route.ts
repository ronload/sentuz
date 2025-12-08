import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createEmailServiceFromAccount } from "@/lib/email";

// POST /api/emails/[id]/reply - Reply to email
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { accountId, content, contentType, replyAll } = body;

  if (!accountId) {
    return NextResponse.json(
      { error: "accountId is required" },
      { status: 400 }
    );
  }

  if (!content) {
    return NextResponse.json(
      { error: "content is required" },
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

    const result = await emailService.reply(id, {
      body:
        contentType === "html" ? { html: content } : { text: content },
      replyAll: replyAll || false,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error replying to email:", error);
    return NextResponse.json(
      { error: "Failed to reply to email" },
      { status: 500 }
    );
  }
}
