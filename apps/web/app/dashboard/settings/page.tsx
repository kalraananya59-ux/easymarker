import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { ApiKeyGenerator } from "./ApiKeyGenerator";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user.workspaceId) {
    redirect("/signin");
  }

  return (
    <main>
      <h1>Settings</h1>
      <ApiKeyGenerator />
    </main>
  );
}
