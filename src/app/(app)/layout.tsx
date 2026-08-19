import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { getMyPendingRequestCount } from "@/lib/rides";
import { AppHeader } from "./_components/app-header";
import { BottomNav } from "./_components/bottom-nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (!profile.is_complete) redirect("/onboarding");

  const pendingCount = await getMyPendingRequestCount();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AppHeader profile={profile} />
      <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">{children}</div>
      <BottomNav pendingCount={pendingCount} />
    </div>
  );
}
