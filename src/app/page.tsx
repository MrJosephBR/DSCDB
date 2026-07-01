import Link from "next/link";
import { prisma } from "@/lib/prisma";
import AppShell from "./ui/app-shell";
import Badge from "./ui/badge";
import DataTable from "./ui/data-table";
import EmptyState from "./ui/empty-state";
import SectionCard from "./ui/section-card";
import { EmptyValue } from "./ui/scientific-values";

export const dynamic = "force-dynamic";

async function getDashboardMetrics() {
  const [
    compounds,
    datasets,
    diseases,
    compoundsWithPresence,
    pendingDuplicates,
    compoundsWithPathways,
    compoundsWithTargets,
    artifactCandidates,
    recentImports,
    recentAuditActivity
  ] = await Promise.all([
    prisma.compound.count({ where: { deletedAt: null } }),
    prisma.dataset.count({ where: { deletedAt: null } }),
    prisma.disease.count({ where: { deletedAt: null } }),
    prisma.compound.count({ where: { deletedAt: null, diseasePresence: { some: { deletedAt: null } } } }),
    prisma.duplicateReview.count({ where: { status: "open" } }),
    prisma.compound.count({ where: { deletedAt: null, pathways: { some: {} } } }),
    prisma.compound.count({ where: { deletedAt: null, targets: { some: {} } } }),
    prisma.compound.count({
      where: {
        deletedAt: null,
        artifactAssessments: { some: { flag: { in: ["possible_artifact", "likely_artifact"] } } }
      }
    }),
    prisma.importJob.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 5 })
  ]);

  return {
    compounds,
    datasets,
    diseases,
    compoundsWithPresence,
    pendingDuplicates,
    compoundsWithPathways,
    compoundsWithTargets,
    artifactCandidates,
    recentImports,
    recentAuditActivity
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
        <Metric label="With dataset presence" value={metrics.compoundsWithPresence} />
        <Metric label="Possible/Likely artifacts" value={metrics.artifactCandidates} />
        <Metric label="Compounds with pathways" value={metrics.compoundsWithPathways} />
        <Metric label="Compounds with targets/interactions" value={metrics.compoundsWithTargets} />
        <Metric label="Pending duplicate reviews" value={metrics.pendingDuplicates} />
      </section>

      <section className="quick-action-grid" aria-label="Quick actions">
        <QuickAction href="/imports" title="Import curated JSON" description="Load structured compound identity, evidence, references, pathways, and audit payloads." />
        <QuickAction href="/imports" title="Import peak table CSV" description="Create datasets, samples, measurements, and disease presence from GC-MS peak tables." />
        <QuickAction href="/compounds" title="Browse compounds" description="Search by name, synonym, CID, InChIKey, HMDB, KEGG, SMILES, pathway, or target." />
        <QuickAction href="/duplicates" title="Review duplicates" description="Resolve possible duplicate compounds without automatic destructive merges." />
      </section>

      <SectionCard title="Research guardrails" description="Interpretation boundaries shown across DSCDB.">
        <div className="guardrail-list">
          <div><strong>Dataset observations are not diagnostic claims.</strong><span>Presence in asthma, bronchiectasis, or COPD datasets is stored as observation only.</span></div>
          <div><strong>External disease links are separate.</strong><span>Related diseases from databases or literature are not equal to detection in a dataset.</span></div>
          <div><strong>Model importance is candidate evidence.</strong><span>SHAP or model-derived importance is not a confirmed biomarker by itself.</span></div>
        </div>
      </SectionCard>

      <section className="dashboard-two-column">
        <SectionCard title="Recent imports" description="Latest data-loading activity.">
          <DataTable headers={["File", "Status", "Created"]}>
            {metrics.recentImports.map((job) => (
              <tr key={job.importJobId}>
                <td><Link href={`/imports/${job.importJobId}`}>{job.fileName ?? "Unnamed import"}</Link></td>
                <td><Badge variant={job.status === "completed" ? "success" : job.status === "failed" ? "danger" : "neutral"}>{job.status}</Badge></td>
                <td>{formatDate(job.createdAt)}</td>
              </tr>
            ))}
            {metrics.recentImports.length === 0 ? (
              <tr><td colSpan={3}><EmptyState title="No imports recorded yet." /></td></tr>
            ) : null}
          </DataTable>
        </SectionCard>

        <SectionCard title="Recent audit activity" description="Latest curation events.">
          <DataTable headers={["Action", "Entity", "Date"]}>
            {metrics.recentAuditActivity.map((log) => (
              <tr key={log.auditLogId}>
                <td><Badge variant="neutral">{labelize(log.action)}</Badge></td>
                <td>{log.entityName}</td>
                <td>{formatDate(log.createdAt)}</td>
              </tr>
            ))}
            {metrics.recentAuditActivity.length === 0 ? (
              <tr><td colSpan={3}><EmptyState title="No audit activity recorded yet." /></td></tr>
            ) : null}
          </DataTable>
        </SectionCard>
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
                    <span className="primary-text">{compound.commonName ?? `CID ${compound.pubchemCid}`}</span>
                    <br />
                    <span className="muted">{compound.iupacName ?? <EmptyValue />}</span>
                  </Link>
                </td>
                <td>
                  <Link className="row-link" href={href}>
                    {compound.molecularFormula ?? compound.identity?.formula ?? <EmptyValue />}
                  </Link>
                </td>
                <td>
                  <Link className="row-link" href={href}>
                    <ChipList
                      items={compound.diseasePresence.map((presence) => presence.disease.name)}
                      empty="—"
                      variant="info"
                    />
                  </Link>
                </td>
                <td>
                  <Link className="row-link" href={href}>
                    <ChipList
                      items={compound.artifactAssessments.map((assessment) => labelize(assessment.flag))}
                      empty="—"
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
                      <EmptyValue />
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

function QuickAction({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link className="quick-action" href={href}>
      <strong>{title}</strong>
      <span>{description}</span>
    </Link>
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
