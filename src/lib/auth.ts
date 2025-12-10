import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

interface ProfileWithPicture {
  picture?: string;
  image?: string;
}

const LINK_USER_ID_COOKIE = "linkUserId";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/gmail.modify",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
    MicrosoftEntraID({
      clientId: process.env.MICROSOFT_CLIENT_ID!,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid profile email offline_access Mail.ReadWrite Mail.Send",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ account }) {
      // Check if this is account linking mode
      const cookieStore = await cookies();
      const linkUserId = cookieStore.get(LINK_USER_ID_COOKIE)?.value;

      if (linkUserId && account) {
        // Account linking mode
        // Find the account that was just created/linked
        const existingAccount = await prisma.account.findUnique({
          where: {
            provider_providerAccountId: {
              provider: account.provider,
              providerAccountId: account.providerAccountId,
            },
          },
        });

        if (existingAccount) {
          // Account exists - check if it belongs to a different user
          if (existingAccount.userId !== linkUserId) {
            // Check if this account was just created for a new user
            const accountOwner = await prisma.user.findUnique({
              where: { id: existingAccount.userId },
              include: { accounts: true },
            });

            // If the account owner only has this one account, it's a newly created user
            // We can safely move the account to the linking user
            if (accountOwner && accountOwner.accounts.length === 1) {
              // Move account to the linking user
              await prisma.account.update({
                where: { id: existingAccount.id },
                data: { userId: linkUserId },
              });

              // Delete the orphaned new user
              await prisma.user.delete({
                where: { id: existingAccount.userId },
              });
            } else {
              // Account belongs to an existing user with other accounts
              // Clear cookie and reject
              cookieStore.delete(LINK_USER_ID_COOKIE);
              return "/link-account?error=already_linked";
            }
          }
          // Account already belongs to the linking user - allow
        }

        // Clear the linking cookie
        cookieStore.delete(LINK_USER_ID_COOKIE);
      }

      return true;
    },
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  events: {
    async linkAccount({ account, profile }) {
      const updateData: { email?: string; image?: string } = {};

      if (profile?.email) {
        updateData.email = profile.email;
      }

      // Get profile picture from Google or Microsoft
      const profilePicture =
        (profile as ProfileWithPicture)?.picture || (profile as ProfileWithPicture)?.image;
      if (profilePicture) {
        updateData.image = profilePicture;
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.account.update({
          where: {
            provider_providerAccountId: {
              provider: account.provider,
              providerAccountId: account.providerAccountId,
            },
          },
          data: updateData,
        });
      }
    },
  },
  pages: {
    signIn: "/login",
  },
});
