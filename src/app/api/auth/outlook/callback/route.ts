import {
  createMicrosoftOAuthClient,
  MICROSOFT_SCOPE,
} from "@/lib/oauth/microsoft";
import { NextRequest, NextResponse } from "next/server";
import { upsertOutlookAccount } from "@/services/account";
import { redirect } from "next/navigation";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.json(
      { error: "Missing verificaition code" },
      { status: 400 },
    );
  }
  try {
    const msalClient = createMicrosoftOAuthClient();

    const tokenResponse = await msalClient.acquireTokenByCode({
      code,
      scopes: MICROSOFT_SCOPE,
      redirectUri: process.env.MICROSOFT_REDIRECT_URI!,
    });

    if (!tokenResponse.account?.username) {
      return NextResponse.json(
        { error: "Failed to get email" },
        { status: 400 },
      );
    }

    await upsertOutlookAccount({
      email: tokenResponse.account.username,
      accessToken: tokenResponse.accessToken,
      refreshToken: "", // MSAL handles this internally
      expiresAt: tokenResponse.expiresOn || new Date(),
    });
  } catch (error) {
    console.error(`Outlook OAuth error: ${error}`);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 },
    );
  }

  redirect("/");
}
