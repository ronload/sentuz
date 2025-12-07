import {
  type Configuration,
  ConfidentialClientApplication,
} from "@azure/msal-node";

const msalConfig: Configuration = {
  auth: {
    clientId: process.env.MICROSOFT_CLIENT_ID!,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
    authority: "https://login.microsoftonline.com/common",
  },
};

export const MICROSOFT_SCOPE = [
  "openid",
  "profile",
  "email",
  "offline_access",
  "Mail.ReadWrite",
  "Mail.Send",
];

export function createMicrosoftOAuthClient() {
  return new ConfidentialClientApplication(msalConfig);
}
