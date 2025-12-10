export const dynamic = "force-dynamic";

import { getDb, user, adminEmails } from "@/db";
import { count, gte } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IconUsers, IconShield, IconUserPlus } from "@tabler/icons-react";

async function getStats() {
  const db = await getDb();

  // Get total users
  const [totalUsersResult] = await db.select({ count: count() }).from(user);
  const totalUsers = totalUsersResult?.count ?? 0;

  // Get admin count
  const [adminCountResult] = await db.select({ count: count() }).from(adminEmails);
  const adminCount = adminCountResult?.count ?? 0;

  // Get users created in last 7 days
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const [newUsersResult] = await db
    .select({ count: count() })
    .from(user)
    .where(gte(user.createdAt, weekAgo));
  const newUsersThisWeek = newUsersResult?.count ?? 0;

  return { totalUsers, adminCount, newUsersThisWeek };
}

export default async function AdminDashboardPage() {
  const { totalUsers, adminCount, newUsersThisWeek } = await getStats();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="text-muted-foreground">
          Admin dashboard overview and statistics.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <IconUsers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              Registered accounts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admin Users</CardTitle>
            <IconShield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adminCount}</div>
            <p className="text-xs text-muted-foreground">
              Users with admin access
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New This Week</CardTitle>
            <IconUserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{newUsersThisWeek}</div>
            <p className="text-xs text-muted-foreground">
              Users joined in last 7 days
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
