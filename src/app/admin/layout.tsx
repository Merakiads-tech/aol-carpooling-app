import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { APP_CONFIG } from "@/config/app";
import { ThemeToggle } from "@/components/theme-toggle";
import { requireAdmin } from "@/lib/admin";
import { AdminNav } from "./_components/admin-nav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-4xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{APP_CONFIG.name}</span>
            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-4" /> App
            </Link>
          </div>
        </div>
      </header>
      <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">
        <AdminNav />
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}
