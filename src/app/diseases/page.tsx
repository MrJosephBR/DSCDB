import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DiseasesPage() {
  const diseases = await prisma.disease.findMany({
    where: { deletedAt: null },
    include: {
      compoundPresence: {
        where: { deletedAt: null },
        include: { compound: true }
      },
      _count: { select: { relatedCompounds: true, datasets: true } }
    },
    orderBy: { name: "asc" }
  });

  return (
    <main className="page">
      <section className="page-header">
        <div>
          <h1>Diseases</h1>
          <p>Diseases and linked compounds from dataset observations and related-disease assertions.</p>
        </div>
        <Link className="button secondary" href="/">
          Dashboard
        </Link>
      </section>
      <table className="table">
        <thead>
          <tr>
            <th>Disease</th>
            <th>Ontology</th>
            <th>Dataset compounds</th>
            <th>Related assertions</th>
            <th>Datasets</th>
          </tr>
        </thead>
        <tbody>
          {diseases.map((disease) => (
            <tr key={disease.diseaseId}>
              <td>{disease.name}</td>
              <td>{disease.ontologyId ?? "Not curated"}</td>
              <td>{disease.compoundPresence.map((presence) => presence.compound.commonName ?? `CID ${presence.compound.pubchemCid}`).join(", ") || "None"}</td>
              <td>{disease._count.relatedCompounds}</td>
              <td>{disease._count.datasets}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
