import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";

const LINK_USER_ID_COOKIE = "linkUserId";

// POST /api/accounts/link - Set linking mode cookie
export async function POST() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Set the linkUserId cookie
  const cookieStore = await cookies();
  cookieStore.set(LINK_USER_ID_COOKIE, session.user.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10, // 10 minutes
    path: "/",
  });

  return NextResponse.json({ success: true });
}

// DELETE /api/accounts/link - Clear linking mode cookie
export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(LINK_USER_ID_COOKIE);

  return NextResponse.json({ success: true });
}
