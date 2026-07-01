import Link from "next/link";
import { Prisma } from "@prisma/client";
import AppShell from "@/app/ui/app-shell";
import Badge from "@/app/ui/badge";
import DataTable from "@/app/ui/data-table";
import EmptyState from "@/app/ui/empty-state";
import SectionCard from "@/app/ui/section-card";
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
const confidenceLevels = ["high", "medium", "low", "unknown"] as const;

export default async function CompoundsPage({ searchParams }: Props) {
  const params = await searchParams;
  const where = buildWhere(params);
  const queryString = new URLSearchParams(
    Object.entries(params).filter((entry): entry is [string, string] => Boolean(entry[1]))
  ).toString();

  const compounds = await prisma.compound.findMany({
    where,
    include: {
      identity: true,
      diseasePresence: {
        where: { deletedAt: null },
        include: { disease: true, dataset: true }
      },
      relatedDiseases: {
        where: { deletedAt: null },
        include: { disease: true }
      },
      artifactAssessments: true,
      externalIdentifiers: true,
      annotationConfidence: true,
      pathways: { include: { pathway: true } },
      targets: { include: { target: true } },
      pdbStructures: true
    },
    orderBy: { updatedAt: "desc" },
    take: 200
  });

  return (
    <AppShell>
      <section className="page-header">
        <div className="page-title-block">
          <h1>Compounds</h1>
          <p>Search, review, and curate VOC compounds detected in public/anonymized datasets.</p>
        </div>
        <div className="button-row">
          <Link className="button" href="/compounds/new">
            New compound
          </Link>
          <a className="button secondary" href={`/api/export/combined${queryString ? `?${queryString}` : ""}`}>
            Export filtered JSON
          </a>
          <Link className="button secondary" href="/">
            Dashboard
          </Link>
        </div>
      </section>

      <form className="filters">
        <label>
          <span>Search</span>
          <input name="q" placeholder="Name, synonym, CID, InChIKey" defaultValue={params.q ?? ""} />
        </label>
        <label>
          <span>CID</span>
          <input name="cid" placeholder="PubChem CID" defaultValue={params.cid ?? ""} />
        </label>
        <label>
          <span>Disease</span>
          <input name="disease" placeholder="Dataset or related disease" defaultValue={params.disease ?? ""} />
        </label>
        <label>
          <span>Dataset</span>
          <input name="dataset" placeholder="Dataset title" defaultValue={params.dataset ?? ""} />
        </label>
        <label>
          <span>Artifact flag</span>
          <select name="artifactFlag" defaultValue={params.artifactFlag ?? ""}>
            <option value="">Any artifact flag</option>
            {artifactFlags.map((flag) => (
              <option key={flag} value={flag}>
                {labelize(flag)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Pathway</span>
          <input name="pathway" placeholder="Pathway name or ID" defaultValue={params.pathway ?? ""} />
        </label>
        <label>
          <span>Target</span>
          <input name="target" placeholder="Target, gene, UniProt" defaultValue={params.target ?? ""} />
        </label>
        <label>
          <span>Identifier</span>
          <input name="identifier" placeholder="Identifier value" defaultValue={params.identifier ?? ""} />
        </label>
        <label>
          <span>Database</span>
          <select name="identifierDatabase" defaultValue={params.identifierDatabase ?? ""}>
            <option value="">Any database</option>
            {externalDatabases.map((database) => (
              <option key={database} value={database}>
                {database}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Confidence</span>
          <select name="annotationConfidence" defaultValue={params.annotationConfidence ?? ""}>
            <option value="">Any confidence</option>
            {confidenceLevels.map((level) => (
              <option key={level} value={level}>
                {labelize(level)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Has pathway</span>
          <select name="hasPathway" defaultValue={params.hasPathway ?? ""}>
            <option value="">Any</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </label>
        <label>
          <span>Has target</span>
          <select name="hasTarget" defaultValue={params.hasTarget ?? ""}>
            <option value="">Any</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </label>
        <label>
          <span>Has PDB</span>
          <select name="hasPdb" defaultValue={params.hasPdb ?? ""}>
            <option value="">Any</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </label>
        <div className="filter-actions">
          <button className="button" type="submit">
            Search
          </button>
          <Link className="button secondary" href="/compounds">
            Reset
          </Link>
        </div>
      </form>

      <SectionCard title="Curated compounds" description={`${compounds.length} records shown. Rows link to the full scientific ficha.`}>
        <DataTable
          headers={[
            "CID",
            "Compound",
            "Identifiers",
            "Dataset presence",
            "Related diseases",
            "Pathways",
            "Targets / interactions",
            "Artifact",
            "Updated"
          ]}
        >
          {compounds.map((compound) => {
            const href = `/compounds/${compound.compoundId}`;
            return (
              <tr className="clickable-row" key={compound.compoundId}>
                <td>
                  <Link className="row-link mono" href={href}>
                    {compound.pubchemCid}
                  </Link>
                </td>
                <td>
                  <Link className="row-link" href={href}>
                    <span className="primary-text">{compound.commonName ?? "Not curated"}</span>
                    <br />
                    <span className="muted">{compound.iupacName ?? "IUPAC name not curated"}</span>
                  </Link>
                </td>
                <td>
                  <Link className="row-link" href={href}>
                    <IdentifierChips identifiers={compound.externalIdentifiers} inchiKey={compound.identity?.inchiKey} />
                  </Link>
                </td>
                <td>
                  <Link className="row-link" href={href}>
                    <ChipList
                      items={compound.diseasePresence.map((presence) => presence.disease.name)}
                      empty="None recorded"
                      variant="info"
                    />
                  </Link>
                </td>
                <td>
                  <Link className="row-link" href={href}>
                    <ChipList
                      items={compound.relatedDiseases.map((related) => `${related.disease.name}: ${labelize(related.assertion)}`)}
                      empty="None recorded"
                      variant="neutral"
                    />
                  </Link>
                </td>
                <td>
                  <Link className="row-link" href={href}>
                    <CountPreview count={compound.pathways.length} names={compound.pathways.map((link) => link.pathway.name)} />
                  </Link>
                </td>
                <td>
                  <Link className="row-link" href={href}>
                    <CountPreview
                      count={compound.targets.length}
                      names={compound.targets.map((link) => link.target.geneSymbol ?? link.target.name)}
                    />
                  </Link>
                </td>
                <td>
                  <Link className="row-link" href={href}>
                    <ChipList
                      items={compound.artifactAssessments.map((assessment) => labelize(assessment.flag))}
                      empty="None recorded"
                      variant={artifactVariant(compound.artifactAssessments[0]?.flag)}
                    />
                  </Link>
                </td>
                <td>
                  <Link className="row-link" href={href}>
                    {formatDate(compound.updatedAt)}
                  </Link>
                </td>
              </tr>
            );
          })}
          {compounds.length === 0 ? (
            <tr>
              <td colSpan={9}>
                <EmptyState title="No compounds match the current filters." description="Try removing one or more filters." />
              </td>
            </tr>
          ) : null}
        </DataTable>
      </SectionCard>
    </AppShell>
  );
}

function buildWhere(params: Record<string, string | undefined>): Prisma.CompoundWhereInput {
  const q = params.q?.trim();
  const cid = params.cid && Number.isFinite(Number(params.cid)) ? Number(params.cid) : undefined;
  const identifierDatabase =
    params.identifierDatabase && isExternalDatabase(params.identifierDatabase) ? params.identifierDatabase : undefined;
  const artifactFlag = params.artifactFlag && isArtifactFlag(params.artifactFlag) ? params.artifactFlag : undefined;
  const annotationConfidence =
    params.annotationConfidence && isConfidenceLevel(params.annotationConfidence) ? params.annotationConfidence : undefined;
  const and: Prisma.CompoundWhereInput[] = [];

  if (cid) and.push({ pubchemCid: cid });
  if (q) {
    and.push({
      OR: [
        { commonName: { contains: q, mode: "insensitive" } },
        { iupacName: { contains: q, mode: "insensitive" } },
        { pubchemCid: Number.isFinite(Number(q)) ? Number(q) : -1 },
        { names: { some: { name: { contains: q, mode: "insensitive" } } } },
        { identity: { is: { inchiKey: { contains: q, mode: "insensitive" } } } },
        { externalIdentifiers: { some: { identifier: { contains: q, mode: "insensitive" } } } }
      ]
    });
  }
  if (params.identifier || identifierDatabase) {
    and.push({
      externalIdentifiers: {
        some: {
          ...(params.identifier ? { identifier: { contains: params.identifier, mode: "insensitive" } } : {}),
          ...(identifierDatabase ? { database: identifierDatabase } : {})
        }
      }
    });
  }
  if (params.disease) {
    and.push({
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
    });
  }
  if (params.dataset) {
    and.push({
      diseasePresence: {
        some: {
          deletedAt: null,
          dataset: { title: { contains: params.dataset, mode: "insensitive" } }
        }
      }
    });
  }
  if (params.pathway) {
    and.push({
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
    });
  }
  if (params.target) {
    and.push({
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
    });
  }
  if (artifactFlag) and.push({ artifactAssessments: { some: { flag: artifactFlag } } });
  if (annotationConfidence) and.push({ annotationConfidence: { is: { level: annotationConfidence } } });
  if (params.hasPathway === "true") and.push({ pathways: { some: {} } });
  if (params.hasPathway === "false") and.push({ pathways: { none: {} } });
  if (params.hasTarget === "true") and.push({ targets: { some: {} } });
  if (params.hasTarget === "false") and.push({ targets: { none: {} } });
  if (params.hasPdb === "true") and.push({ pdbStructures: { some: {} } });
  if (params.hasPdb === "false") and.push({ pdbStructures: { none: {} } });

  return {
    deletedAt: null,
    ...(and.length ? { AND: and } : {})
  };
}

function IdentifierChips({
  identifiers,
  inchiKey
}: {
  identifiers: { database: string; identifier: string }[];
  inchiKey?: string | null;
}) {
  const preferred = ["HMDB", "KEGG", "CAS", "InChIKey"];
  const chips = identifiers
    .filter((identifier) => preferred.includes(identifier.database))
    .map((identifier) => `${identifier.database}: ${identifier.identifier}`);

  if (inchiKey && !chips.some((chip) => chip.startsWith("InChIKey:"))) {
    chips.push(`InChIKey: ${inchiKey}`);
  }

  return <ChipList items={chips} empty="None recorded" variant="neutral" />;
}

function CountPreview({ count, names }: { count: number; names: string[] }) {
  if (count === 0) {
    return <span className="muted">None recorded</span>;
  }

  const preview = names.slice(0, 2).join(", ");
  return (
    <span>
      <Badge variant="info">{count}</Badge>
      <br />
      <span className="muted">{preview}</span>
    </span>
  );
}

function ChipList({
  items,
  empty,
  variant
}: {
  items: string[];
  empty: string;
  variant: "default" | "success" | "warning" | "danger" | "info" | "neutral";
}) {
  const unique = [...new Set(items.filter(Boolean))].slice(0, 4);

  if (unique.length === 0) {
    return <span className="muted">{empty}</span>;
  }

  return (
    <span className="chip-list">
      {unique.map((item) => (
        <Badge key={item} variant={variant}>
          {item}
        </Badge>
      ))}
    </span>
  );
}

function formatDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function labelize(value: string) {
  return value.replace(/_/g, " ");
}

function artifactVariant(flag: string | undefined): "success" | "warning" | "danger" | "neutral" {
  if (flag === "likely_artifact") return "danger";
  if (flag === "possible_artifact") return "warning";
  if (flag === "unlikely_artifact") return "success";
  return "neutral";
}

function isExternalDatabase(value: string): value is (typeof externalDatabases)[number] {
  return externalDatabases.includes(value as (typeof externalDatabases)[number]);
}

function isArtifactFlag(value: string): value is (typeof artifactFlags)[number] {
  return artifactFlags.includes(value as (typeof artifactFlags)[number]);
}

function isConfidenceLevel(value: string): value is (typeof confidenceLevels)[number] {
  return confidenceLevels.includes(value as (typeof confidenceLevels)[number]);
}
