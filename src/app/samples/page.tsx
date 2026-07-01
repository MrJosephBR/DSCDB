import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SamplesPage() {
  const samples = await prisma.sample.findMany({
    include: { dataset: true, disease: true, _count: { select: { measurements: true } } },
    orderBy: { createdAt: "desc" },
    take: 300
  });

  return (
    <main className="page">
      <section className="page-header"><div><h1>Samples</h1><p>Anon/public sample IDs and metadata for GC-MS/EBC datasets.</p></div><Link className="button secondary" href="/">Dashboard</Link></section>
      <table className="table">
        <thead><tr><th>Sample</th><th>Dataset</th><th>Disease</th><th>Cohort</th><th>Measurements</th></tr></thead>
        <tbody>{samples.map((sample) => <tr key={sample.sampleId}><td>{sample.sampleCode}</td><td>{sample.dataset.title}</td><td>{sample.disease?.name ?? ""}</td><td>{sample.cohortLabel ?? ""}</td><td>{sample._count.measurements}</td></tr>)}</tbody>
      </table>
    </main>
  );
}
