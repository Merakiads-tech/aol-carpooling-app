import { getAdminUsers } from "@/lib/admin";
import { GenderBadge, RoleBadge } from "@/components/badges";
import { formatDate } from "@/lib/format";
import type { Gender } from "@/lib/types";

export default async function AdminUsersPage() {
  const users = await getAdminUsers();

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-medium text-muted-foreground">
        {users.length} {users.length === 1 ? "user" : "users"}
      </h2>
      <ul className="space-y-2">
        {users.map((u) => (
          <li
            key={u.id}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border bg-card p-3"
          >
            <span className="font-medium">{u.name ?? "—"}</span>
            <GenderBadge gender={u.gender as Gender | null} />
            <RoleBadge role={u.role as "teacher" | "volunteer" | "none"} />
            {!u.is_complete && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
                Incomplete
              </span>
            )}
            <span className="ml-auto text-sm text-muted-foreground">
              {u.phone ?? "no phone"}
            </span>
            <span className="w-full text-xs text-muted-foreground">
              {u.email} · joined {formatDate(u.created_at.slice(0, 10))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
