import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ReferencesPage() {
  const references = await prisma.reference.findMany({
    where: { deletedAt: null },
    orderBy: [{ year: "desc" }, { title: "asc" }],
    take: 200
  });

  return (
    <main className="page">
      <section className="page-header">
        <div>
          <h1>References</h1>
          <p>Bibliography and external literature records.</p>
        </div>
        <Link className="button secondary" href="/">Dashboard</Link>
      </section>
      <table className="table">
        <thead><tr><th>Title</th><th>Year</th><th>DOI</th><th>PMID</th><th>URL</th></tr></thead>
        <tbody>
          {references.map((reference) => (
            <tr key={reference.referenceId}>
              <td>{reference.title ?? reference.citation ?? "Untitled"}</td>
              <td>{reference.year ?? ""}</td>
              <td>{reference.doi ?? ""}</td>
              <td>{reference.pmid ?? ""}</td>
              <td>{reference.url ? <a href={reference.url}>{reference.url}</a> : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
