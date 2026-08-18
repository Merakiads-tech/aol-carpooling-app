import { getAdminUsers } from "@/lib/admin";
import { UsersTable } from "./users-table";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const users = await getAdminUsers();
  return <UsersTable users={users} />;
}
