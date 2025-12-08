import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <DashboardClient
      user={{
        id: session.user.id!,
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      }}
    />
  );
}
