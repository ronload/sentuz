import { google } from "googleapis";
import { upsertGmailAccount } from "@/services/account";
import { createGoogleOAuthClient } from "@/lib/oauth/google";
import { redirect } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  // TODO: Should prevent CSRF
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.json(
      { error: "Missing verification code" },
      { status: 400 },
    );
  }

  try {
    const oauth2Client = createGoogleOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({
      version: "v2",
      auth: oauth2Client,
    });
    const { data: userInfo } = await oauth2.userinfo.get();
    if (!userInfo.email) {
      return NextResponse.json(
        { error: "Failed to get email" },
        { status: 400 },
      );
    }

    await upsertGmailAccount({
      email: userInfo.email,
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token!,
      expiresAt: new Date(tokens.expiry_date!),
    });
  } catch (error) {
    console.error(`Gmail OAuth error: ${error}`);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 },
    );
  }
  redirect("/");
}
