import Link from "next/link";
import { prisma } from "@/lib/prisma";

type Props = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export const dynamic = "force-dynamic";

const externalDatabases = [
  "PubChem",
  "HMDB",
  "KEGG",
  "CAS",
  "ChEBI",
  "InChIKey",
  "InChI",
  "SMILES",
  "PDB",
  "PathBank",
  "BioCyc",
  "PlantCyc",
  "DrugBank",
  "UniProt",
  "Other"
] as const;
const artifactFlags = ["likely_artifact", "possible_artifact", "unlikely_artifact", "unknown"] as const;

export default async function CompoundsPage({ searchParams }: Props) {
  const params = await searchParams;
  const identifierDatabase = params.identifier && isExternalDatabase(params.identifier) ? params.identifier : undefined;
  const artifactFlag = params.artifactFlag && isArtifactFlag(params.artifactFlag) ? params.artifactFlag : undefined;
  const compounds = await prisma.compound.findMany({
    where: {
      deletedAt: null,
      ...(params.cid ? { pubchemCid: Number(params.cid) } : {}),
      ...(params.q
        ? {
            OR: [
              { commonName: { contains: params.q, mode: "insensitive" } },
              { iupacName: { contains: params.q, mode: "insensitive" } },
              { names: { some: { name: { contains: params.q, mode: "insensitive" } } } }
            ]
          }
        : {}),
      ...(params.identifier
        ? {
            externalIdentifiers: {
              some: {
                OR: [
                  { identifier: { contains: params.identifier, mode: "insensitive" } },
                  ...(identifierDatabase ? [{ database: identifierDatabase }] : [])
                ]
              }
            }
          }
        : {}),
      ...(params.disease
        ? {
            OR: [
              {
                diseasePresence: {
                  some: {
                    deletedAt: null,
                    disease: { name: { contains: params.disease, mode: "insensitive" } }
                  }
                }
              },
              {
                relatedDiseases: {
                  some: {
                    deletedAt: null,
                    disease: { name: { contains: params.disease, mode: "insensitive" } }
                  }
                }
              }
            ]
          }
        : {}),
      ...(params.dataset
        ? {
            diseasePresence: {
              some: {
                deletedAt: null,
                dataset: { title: { contains: params.dataset, mode: "insensitive" } }
              }
            }
          }
        : {}),
      ...(params.pathway
        ? {
            pathways: {
              some: {
                pathway: {
                  OR: [
                    { name: { contains: params.pathway, mode: "insensitive" } },
                    { externalId: { contains: params.pathway, mode: "insensitive" } },
                    { pathwayExternalId: { contains: params.pathway, mode: "insensitive" } }
                  ]
                }
              }
            }
          }
        : {}),
      ...(params.target
        ? {
            targets: {
              some: {
                target: {
                  OR: [
                    { name: { contains: params.target, mode: "insensitive" } },
                    { geneSymbol: { contains: params.target, mode: "insensitive" } },
                    { uniprotId: { contains: params.target, mode: "insensitive" } }
                  ]
                }
              }
            }
          }
        : {}),
      ...(artifactFlag
        ? {
            artifactAssessments: {
              some: { flag: artifactFlag }
            }
          }
        : {})
    },
    include: {
      diseasePresence: {
        where: { deletedAt: null },
        include: { disease: true, dataset: true }
      },
      artifactAssessments: true,
      externalIdentifiers: true,
      pathways: { include: { pathway: true } },
      targets: { include: { target: true } }
    },
    orderBy: { updatedAt: "desc" },
    take: 200
  });

  return (
    <main className="page">
      <section className="page-header">
        <div>
          <h1>Compounds</h1>
          <p>Search by PubChem CID, names, disease, dataset, external IDs, pathways, targets, or artifact assessment.</p>
        </div>
        <div className="button-row">
          <Link className="button" href="/compounds/new">
            New compound
          </Link>
          <Link className="button secondary" href="/">
            Dashboard
          </Link>
        </div>
      </section>

      <form className="filters">
        <input name="q" placeholder="Common or IUPAC name" defaultValue={params.q ?? ""} />
        <input name="cid" placeholder="PubChem CID" defaultValue={params.cid ?? ""} />
        <input name="disease" placeholder="Disease" defaultValue={params.disease ?? ""} />
        <input name="dataset" placeholder="Dataset" defaultValue={params.dataset ?? ""} />
        <input name="identifier" placeholder="KEGG, HMDB, CAS, ChEBI..." defaultValue={params.identifier ?? ""} />
        <input name="pathway" placeholder="Pathway" defaultValue={params.pathway ?? ""} />
        <input name="target" placeholder="Target or gene" defaultValue={params.target ?? ""} />
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
            <th>External IDs</th>
            <th>Pathways</th>
            <th>Targets</th>
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
              <td>{compound.externalIdentifiers.map((identifier) => `${identifier.database}:${identifier.identifier}`).join(", ") || "None"}</td>
              <td>{compound.pathways.map((pathway) => pathway.pathway.name).join(", ") || "None"}</td>
              <td>{compound.targets.map((target) => target.target.geneSymbol ?? target.target.name).join(", ") || "None"}</td>
              <td>{compound.artifactAssessments.map((assessment) => assessment.flag).join(", ") || "None"}</td>
              <td>{compound.updatedAt.toISOString().slice(0, 10)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}

function isExternalDatabase(value: string): value is (typeof externalDatabases)[number] {
  return externalDatabases.includes(value as (typeof externalDatabases)[number]);
}

function isArtifactFlag(value: string): value is (typeof artifactFlags)[number] {
  return artifactFlags.includes(value as (typeof artifactFlags)[number]);
}
