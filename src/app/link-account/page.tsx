import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LinkAccountClient } from "./link-account-client";

export default async function LinkAccountPage() {
  const session = await auth();

  // Must be logged in to link accounts
  if (!session?.user) {
    redirect("/login");
  }

  return <LinkAccountClient user={session.user} />;
}
