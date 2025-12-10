"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Mail, ArrowLeft, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { LanguageToggle } from "@/components/layout/language-toggle";
import { useI18n } from "@/lib/i18n";

interface LinkAccountClientProps {
  user: {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export function LinkAccountClient({ user }: LinkAccountClientProps) {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // Check for error in URL params
  React.useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam === "already_linked") {
      setError(t.auth.linkAccount.alreadyLinked);
    }
  }, [searchParams, t.auth.linkAccount.alreadyLinked]);

  const handleLinkAccount = async (provider: string) => {
    setIsLoading(provider);
    setError(null);

    try {
      // First, set the linking cookie
      const response = await fetch("/api/accounts/link", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to initiate account linking");
      }

      // Then trigger OAuth flow
      await signIn(provider, {
        callbackUrl: "/",
        redirect: true,
      });
    } catch (err) {
      console.error("Link account error:", err);
      setError(t.auth.linkAccount.error);
      setIsLoading(null);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between p-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/")} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          {t.auth.linkAccount.back}
        </Button>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="bg-primary mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
              <Mail className="text-primary-foreground h-6 w-6" />
            </div>
            <CardTitle className="text-2xl">{t.auth.linkAccount.title}</CardTitle>
            <CardDescription>{t.auth.linkAccount.description}</CardDescription>
            {user.email && <p className="text-muted-foreground mt-2 text-sm">{user.email}</p>}
          </CardHeader>

          <CardContent className="space-y-4">
            {error && (
              <div className="bg-destructive/10 text-destructive flex items-start gap-3 rounded-lg p-4 text-sm">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-medium">{t.common.error}</p>
                  <p className="mt-1">{error}</p>
                </div>
              </div>
            )}

            <Button
              variant="outline"
              className="w-full justify-start gap-3"
              onClick={() => handleLinkAccount("google")}
              disabled={isLoading !== null}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              {isLoading === "google" ? t.common.loading : t.auth.linkAccount.linkGoogle}
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start gap-3"
              onClick={() => handleLinkAccount("microsoft-entra-id")}
              disabled={isLoading !== null}
            >
              <svg className="h-5 w-5" viewBox="0 0 21 21">
                <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
              </svg>
              {isLoading === "microsoft-entra-id"
                ? t.common.loading
                : t.auth.linkAccount.linkMicrosoft}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
