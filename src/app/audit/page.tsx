import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const auditLogs = await prisma.auditLog.findMany({
    include: {
      user: { select: { email: true, role: true } },
      compound: { select: { pubchemCid: true, commonName: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 200
  });

  return (
    <main className="page">
      <section className="page-header">
        <div>
          <h1>Audit</h1>
          <p>Recent changes, imports, exports, and soft deletes.</p>
        </div>
        <Link className="button secondary" href="/">
          Dashboard
        </Link>
      </section>
      <table className="table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Action</th>
            <th>Entity</th>
            <th>Compound</th>
            <th>User</th>
          </tr>
        </thead>
        <tbody>
          {auditLogs.map((log) => (
            <tr key={log.auditLogId}>
              <td>{log.createdAt.toISOString()}</td>
              <td>{log.action}</td>
              <td>{log.entityName}</td>
              <td>{log.compound ? `${log.compound.commonName ?? "Compound"} (${log.compound.pubchemCid})` : "None"}</td>
              <td>{log.user ? `${log.user.email} (${log.user.role})` : "System"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
