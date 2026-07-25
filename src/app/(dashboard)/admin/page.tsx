import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/dal"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default async function AdminPage() {
  await requireAdmin()

  const [userCount, projectCount, applicationCount, recentUsers] = await Promise.all([
    prisma.user.count(),
    prisma.project.count(),
    prisma.application.count(),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    }),
  ])

  return (
    <div className="space-y-6 [animation:entrance_0.5s_ease-out_both]">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-primary">Admin Dashboard</h1>
        <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-outline">Platform overview and management</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="transition-[transform,box-shadow] duration-160 ease-out hover:scale-[1.02] active:scale-[0.98] hover:shadow-md" style={{ animation: "entrance 0.5s ease-out 0s both" }}>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{userCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{projectCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{applicationCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Users</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.name ?? "—"}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.role}</TableCell>
                  <TableCell>{user.createdAt.toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
