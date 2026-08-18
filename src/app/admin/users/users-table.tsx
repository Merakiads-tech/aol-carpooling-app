"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { AdminUser } from "@/lib/admin";
import { GenderBadge, RoleBadge } from "@/components/badges";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Gender } from "@/lib/types";

export function UsersTable({ users }: { users: AdminUser[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      `${u.name ?? ""} ${u.email ?? ""} ${u.phone ?? ""}`
        .toLowerCase()
        .includes(q),
    );
  }, [users, query]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, email or phone…"
          className="h-10 w-full rounded-lg border bg-card pl-9 pr-3 text-sm outline-none focus:border-foreground/30"
        />
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} of {users.length} users
      </p>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[680px] text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
              <th className="px-3 py-2.5 font-medium">Name</th>
              <th className="px-3 py-2.5 font-medium">Email</th>
              <th className="px-3 py-2.5 font-medium">Phone</th>
              <th className="px-3 py-2.5 font-medium">Gender</th>
              <th className="px-3 py-2.5 font-medium">Role</th>
              <th className="px-3 py-2.5 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-10 text-center text-muted-foreground">
                  No users match.
                </td>
              </tr>
            ) : (
              filtered.map((u) => (
                <tr key={u.id} className="border-b align-middle last:border-0">
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{u.name ?? "—"}</span>
                      {!u.is_complete && (
                        <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
                          Incomplete
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    {u.email ?? "—"}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums">
                    {u.phone ? (
                      <a href={`tel:${u.phone}`} className="text-primary">
                        {u.phone}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <GenderBadge gender={u.gender as Gender | null} />
                  </td>
                  <td className="px-3 py-2.5">
                    <RoleBadge role={u.role as "teacher" | "volunteer" | "none"} />
                  </td>
                  <td className={cn("px-3 py-2.5 text-muted-foreground")}>
                    {formatDate(u.created_at.slice(0, 10))}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
