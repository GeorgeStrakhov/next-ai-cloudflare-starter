export const dynamic = "force-dynamic";

import { getDb, user, adminEmails } from "@/db";
import { desc } from "drizzle-orm";
import { UsersTable } from "@/components/admin/users-table";

export interface UserWithAdmin {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  createdAt: Date;
  isAdmin: boolean;
}

async function getUsers(): Promise<UserWithAdmin[]> {
  const db = await getDb();

  // Get all users
  const users = await db.select().from(user).orderBy(desc(user.createdAt));

  // Get all admin emails
  const admins = await db.select().from(adminEmails);
  const adminEmailSet = new Set(admins.map((a) => a.email.toLowerCase()));

  // Combine data
  return users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    emailVerified: u.emailVerified,
    image: u.image,
    createdAt: u.createdAt,
    isAdmin: adminEmailSet.has(u.email.toLowerCase()),
  }));
}

export default async function AdminUsersPage() {
  const users = await getUsers();
  const adminCount = users.filter((u) => u.isAdmin).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-muted-foreground">
            {users.length} total users, {adminCount} admins
          </p>
        </div>
      </div>

      <UsersTable users={users} />
    </div>
  );
}
