import Link from "next/link";
import { prisma } from "@/lib/prisma";

type Props = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export const dynamic = "force-dynamic";

export default async function CompoundsPage({ searchParams }: Props) {
  const params = await searchParams;
  const compounds = await prisma.compound.findMany({
    where: {
      deletedAt: null,
      ...(params.cid ? { pubchemCid: Number(params.cid) } : {}),
      ...(params.q
        ? {
            OR: [
              { commonName: { contains: params.q, mode: "insensitive" } },
              { iupacName: { contains: params.q, mode: "insensitive" } }
            ]
          }
        : {}),
      ...(params.disease
        ? {
            diseasePresence: {
              some: {
                deletedAt: null,
                disease: { name: { contains: params.disease, mode: "insensitive" } }
              }
            }
          }
        : {}),
      ...(params.artifactFlag
        ? {
            artifactAssessments: {
              some: { flag: params.artifactFlag as any }
            }
          }
        : {})
    },
    include: {
      diseasePresence: {
        where: { deletedAt: null },
        include: { disease: true, dataset: true }
      },
      artifactAssessments: true
    },
    orderBy: { updatedAt: "desc" },
    take: 200
  });

  return (
    <main className="page">
      <section className="page-header">
        <div>
          <h1>Compounds</h1>
          <p>Search by PubChem CID, names, disease presence, or artifact assessment.</p>
        </div>
        <Link className="button secondary" href="/">
          Dashboard
        </Link>
      </section>

      <form className="filters">
        <input name="q" placeholder="Common or IUPAC name" defaultValue={params.q ?? ""} />
        <input name="cid" placeholder="PubChem CID" defaultValue={params.cid ?? ""} />
        <input name="disease" placeholder="Disease presence" defaultValue={params.disease ?? ""} />
        <select name="artifactFlag" defaultValue={params.artifactFlag ?? ""}>
          <option value="">Any artifact flag</option>
          <option value="likely_artifact">Likely artifact</option>
          <option value="possible_artifact">Possible artifact</option>
          <option value="unlikely_artifact">Unlikely artifact</option>
          <option value="unknown">Unknown</option>
        </select>
        <button className="button" type="submit">
          Search
        </button>
      </form>

      <table className="table">
        <thead>
          <tr>
            <th>PubChem CID</th>
            <th>Common name</th>
            <th>IUPAC name</th>
            <th>Disease presence</th>
            <th>Artifact flag</th>
            <th>Updated</th>
          </tr>
        </thead>
        <tbody>
          {compounds.map((compound) => (
            <tr key={compound.compoundId}>
              <td>
                <Link href={`/compounds/${compound.compoundId}`}>{compound.pubchemCid}</Link>
              </td>
              <td>{compound.commonName ?? "Not curated"}</td>
              <td>{compound.iupacName ?? "Not curated"}</td>
              <td>{compound.diseasePresence.map((presence) => presence.disease.name).join(", ") || "None"}</td>
              <td>{compound.artifactAssessments.map((assessment) => assessment.flag).join(", ") || "None"}</td>
              <td>{compound.updatedAt.toISOString().slice(0, 10)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
