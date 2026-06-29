import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DatasetsPage() {
  const datasets = await prisma.dataset.findMany({
    where: { deletedAt: null },
    include: {
      diseases: { include: { disease: true } },
      _count: { select: { presence: true, files: true } }
    },
    orderBy: { updatedAt: "desc" }
  });

  return (
    <main className="page">
      <section className="page-header">
        <div>
          <h1>Datasets</h1>
          <p>Dataset records and linked disease cohorts.</p>
        </div>
        <Link className="button secondary" href="/">
          Dashboard
        </Link>
      </section>
      <table className="table">
        <thead>
          <tr>
            <th>Dataset</th>
            <th>Platform</th>
            <th>Diseases</th>
            <th>Presence rows</th>
            <th>Files</th>
          </tr>
        </thead>
        <tbody>
          {datasets.map((dataset) => (
            <tr key={dataset.datasetId}>
              <td>{dataset.title}</td>
              <td>{dataset.analyticalPlatform ?? "Not specified"}</td>
              <td>{dataset.diseases.map((link) => link.disease.name).join(", ") || "None"}</td>
              <td>{dataset._count.presence}</td>
              <td>{dataset._count.files}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
