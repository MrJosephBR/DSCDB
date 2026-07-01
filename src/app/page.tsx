import Link from "next/link";
import { prisma } from "@/lib/prisma";
import AppShell from "./ui/app-shell";
import Badge from "./ui/badge";
import DataTable from "./ui/data-table";
import EmptyState from "./ui/empty-state";
import SectionCard from "./ui/section-card";

export const dynamic = "force-dynamic";

async function getDashboardMetrics() {
  const [
    compounds,
    datasets,
    diseases,
    pendingDuplicates,
    compoundsWithPathways,
    compoundsWithTargets,
    artifactCandidates
  ] = await Promise.all([
    prisma.compound.count({ where: { deletedAt: null } }),
    prisma.dataset.count({ where: { deletedAt: null } }),
    prisma.disease.count({ where: { deletedAt: null } }),
    prisma.duplicateReview.count({ where: { status: "open" } }),
    prisma.compound.count({ where: { deletedAt: null, pathways: { some: {} } } }),
    prisma.compound.count({ where: { deletedAt: null, targets: { some: {} } } }),
    prisma.compound.count({
      where: {
        deletedAt: null,
        artifactAssessments: { some: { flag: { in: ["possible_artifact", "likely_artifact"] } } }
      }
    })
  ]);

  return {
    compounds,
    datasets,
    diseases,
    pendingDuplicates,
    compoundsWithPathways,
    compoundsWithTargets,
    artifactCandidates
  };
}

async function getRecentCompounds() {
  return prisma.compound.findMany({
    where: { deletedAt: null },
    include: {
      identity: true,
      diseasePresence: {
        where: { deletedAt: null },
        include: { disease: true, dataset: true }
      },
      artifactAssessments: true,
      evidenceRecords: true,
      annotationConfidence: true
    },
    orderBy: { updatedAt: "desc" },
    take: 10
  });
}

export default async function Home() {
  const [metrics, compounds] = await Promise.all([getDashboardMetrics(), getRecentCompounds()]);

  return (
    <AppShell>
      <section className="page-header">
        <div className="page-title-block">
          <h1>Compound Curation Dashboard</h1>
          <p>Dataset observations are not diagnostic, causal, or confirmed biomarker assertions.</p>
        </div>
        <a className="button" href="/api/export/combined">
          Export JSON
        </a>
      </section>

      <section className="metric-grid" aria-label="Completeness overview">
        <Metric label="Compounds" value={metrics.compounds} />
        <Metric label="Datasets" value={metrics.datasets} />
        <Metric label="Diseases" value={metrics.diseases} />
        <Metric label="Pending duplicate reviews" value={metrics.pendingDuplicates} />
        <Metric label="Compounds with pathways" value={metrics.compoundsWithPathways} />
        <Metric label="Compounds with targets/interactions" value={metrics.compoundsWithTargets} />
        <Metric label="Possible/Likely artifacts" value={metrics.artifactCandidates} />
      </section>

      <SectionCard
        title="Recently updated compounds"
        description="Latest curation changes across identity, dataset presence, evidence, and artifact review."
      >
        <DataTable headers={["CID", "Compound", "Formula", "Dataset presence", "Artifact", "Evidence", "Updated"]}>
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
                    {compound.molecularFormula ?? compound.identity?.formula ?? "Not curated"}
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
                      items={compound.artifactAssessments.map((assessment) => labelize(assessment.flag))}
                      empty="None recorded"
                      variant={artifactVariant(compound.artifactAssessments[0]?.flag)}
                    />
                  </Link>
                </td>
                <td>
                  <Link className="row-link" href={href}>
                    {compound.annotationConfidence ? (
                      <Badge variant={confidenceVariant(compound.annotationConfidence.level)}>
                        {labelize(compound.annotationConfidence.level)}
                      </Badge>
                    ) : compound.evidenceRecords.length > 0 ? (
                      <Badge variant="neutral">{compound.evidenceRecords.length} records</Badge>
                    ) : (
                      <span className="muted">None recorded</span>
                    )}
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
              <td colSpan={7}>
                <EmptyState title="No compounds have been curated yet." />
              </td>
            </tr>
          ) : null}
        </DataTable>
      </SectionCard>
    </AppShell>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="metric">
      <span className="metric-label">{label}</span>
      <strong>{value.toLocaleString()}</strong>
    </div>
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

function artifactVariant(flag: string | undefined) {
  if (flag === "likely_artifact") return "danger";
  if (flag === "possible_artifact") return "warning";
  if (flag === "unlikely_artifact") return "success";
  return "neutral";
}

function confidenceVariant(level: string) {
  if (level === "high") return "success";
  if (level === "medium") return "info";
  if (level === "low") return "warning";
  return "neutral";
}
