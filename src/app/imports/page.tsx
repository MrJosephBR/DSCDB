import ImportForm from "./ui/import-form";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ImportsPage() {
  const importJobs = await prisma.importJob.findMany({
    include: {
      user: {
        select: {
          email: true,
          role: true
        }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 50
  });

  return (
    <main className="imports-page">
      <section className="imports-header">
        <div>
          <h1>JSON Imports</h1>
          <p>Upload curated compound JSON files and preserve every raw compound object for traceability.</p>
        </div>
        <a className="button secondary" href="/">
          Dashboard
        </a>
      </section>

      <ImportForm />

      <section className="section">
        <h2>Import History</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Created</th>
              <th>File</th>
              <th>Status</th>
              <th>Summary</th>
              <th>User</th>
            </tr>
          </thead>
          <tbody>
            {importJobs.map((job) => (
              <tr key={job.importJobId}>
                <td>{job.createdAt.toISOString()}</td>
                <td>{job.fileName ?? "Not recorded"}</td>
                <td>{job.status}</td>
                <td>{JSON.stringify(job.summary ?? {})}</td>
                <td>{job.user ? `${job.user.email} (${job.user.role})` : "System"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
