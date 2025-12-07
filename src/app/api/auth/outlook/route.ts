import { redirect } from "next/navigation";
import {
  createMicrosoftOAuthClient,
  MICROSOFT_SCOPE,
} from "@/lib/oauth/microsoft";

export async function GET() {
  const msalClient = createMicrosoftOAuthClient();

  const authUrl = await msalClient.getAuthCodeUrl({
    scopes: MICROSOFT_SCOPE,
    redirectUri: process.env.MICROSOFT_REDIRECT_URI!,
  });

  redirect(authUrl);
}
