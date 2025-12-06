import { redirect } from "next/navigation";
import { createGoogleOAuthClient } from "@/lib/oauth/google";

export async function GET() {
  const oauth2Client = createGoogleOAuthClient();
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/gmail.modify",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
  });

  redirect(authUrl);
}
