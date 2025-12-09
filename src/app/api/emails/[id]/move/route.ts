import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createEmailServiceFromAccount } from "@/lib/email";

// POST /api/emails/[id]/move - Move email to folder
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { accountId, folderId } = body;

  if (!accountId) {
    return NextResponse.json({ error: "accountId is required" }, { status: 400 });
  }

  if (!folderId) {
    return NextResponse.json({ error: "folderId is required" }, { status: 400 });
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
    await emailService.moveToFolder(id, folderId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error moving email:", error);
    return NextResponse.json({ error: "Failed to move email" }, { status: 500 });
  }
}
