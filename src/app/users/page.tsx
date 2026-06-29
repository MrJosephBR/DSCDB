import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionFromCookieHeader } from "@/modules/auth/session";
import CreateUserForm from "./ui/create-user-form";
import UserActions from "./ui/user-actions";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const session = getSessionFromCookieHeader((await cookies()).toString());

  if (session?.role !== "admin") {
    redirect("/login");
  }

  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    orderBy: [{ role: "asc" }, { email: "asc" }],
    select: {
      userId: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      updatedAt: true
    }
  });

  return (
    <main className="page">
      <section className="page-header">
        <div>
          <h1>Users</h1>
          <p>Admin-only user management for curation, imports, edits, exports, and read-only access.</p>
        </div>
        <Link className="button secondary" href="/">
          Dashboard
        </Link>
      </section>

      <CreateUserForm />

      <section className="section">
        <h2>Active Users</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Name</th>
              <th>Role</th>
              <th>Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.userId}>
                <td>{user.email}</td>
                <td>{user.name ?? "Not set"}</td>
                <td>{user.role}</td>
                <td>{user.updatedAt.toISOString().slice(0, 10)}</td>
                <td>
                  <UserActions userId={user.userId} currentRole={user.role} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
