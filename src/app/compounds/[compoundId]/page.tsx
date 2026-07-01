import Link from "next/link";
import { notFound } from "next/navigation";
import AppShell from "@/app/ui/app-shell";
import Badge from "@/app/ui/badge";
import DataTable from "@/app/ui/data-table";
import EmptyState from "@/app/ui/empty-state";
import JsonViewer from "@/app/ui/json-viewer";
import SectionCard from "@/app/ui/section-card";
import { getCompound } from "@/modules/compounds/service";
import CompoundSectionActions from "./ui/compound-section-actions";

type Props = {
  params: Promise<{ compoundId: string }>;
};

type CompoundDetail = NonNullable<Awaited<ReturnType<typeof getCompound>>>;
type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "neutral";

export const dynamic = "force-dynamic";

const sections = [
  ["overview", "Overview"],
  ["chemical-identity", "Chemical Identity"],
  ["dataset-presence", "Dataset Presence"],
  ["related-diseases", "Related Diseases"],
  ["pathways", "Pathways"],
  ["targets", "Targets / Interactions"],
  ["pdb-structures", "PDB Structures"],
  ["evidence-references", "Evidence & References"],
  ["artifact-assessment", "Artifact Assessment"],
  ["notes", "Notes"],
  ["source-payloads", "Source Payloads"],
  ["audit-log", "Audit Log"]
] as const;

export default async function CompoundDetailPage({ params }: Props) {
  const { compoundId } = await params;
  const compound = await getCompound(compoundId);

  if (!compound) {
    notFound();
  }

  const title = compound.commonName ?? `CID ${compound.pubchemCid}`;

  return (
    <AppShell>
      <section className="page-header">
        <div className="page-title-block">
          <h1>{title}</h1>
          <p>
            PubChem CID {compound.pubchemCid}
            {compound.iupacName ? ` · ${compound.iupacName}` : ""}
          </p>
          <div className="chip-list" style={{ marginTop: 12 }}>
            {compound.diseasePresence.slice(0, 6).map((presence) => (
              <Badge key={presence.compoundDiseasePresenceId} variant="info">
                {presence.disease.name}
              </Badge>
            ))}
            {compound.artifactAssessments.slice(0, 4).map((assessment) => (
              <Badge key={assessment.artifactAssessmentId} variant={artifactVariant(assessment.flag)}>
                {labelize(assessment.flag)}
              </Badge>
            ))}
            {compound.annotationConfidence ? (
              <Badge variant={confidenceVariant(compound.annotationConfidence.level)}>
                {labelize(compound.annotationConfidence.level)} confidence
              </Badge>
            ) : null}
            <Badge variant="warning">Dataset observation only</Badge>
            <Badge variant="danger">Not diagnostic/causal</Badge>
          </div>
        </div>
        <div className="button-row">
          <Link className="button secondary" href="/compounds">
            Back to compounds
          </Link>
          <a className="button secondary" href="#curate-compound">
            Edit
          </a>
          <a className="button" href={`/api/compounds/${compound.compoundId}/export`}>
            Export JSON
          </a>
        </div>
      </section>

      <div className="compound-layout">
        <div className="compound-main">
          <nav className="anchor-nav" aria-label="Compound detail sections">
            {sections.map(([id, label]) => (
              <a href={`#${id}`} key={id}>
                {label}
              </a>
            ))}
          </nav>

          <OverviewSection compound={compound} />
          <ChemicalIdentitySection compound={compound} />
          <DatasetPresenceSection compound={compound} />
          <RelatedDiseasesSection compound={compound} />
          <PathwaysSection compound={compound} />
          <TargetsSection compound={compound} />
          <PdbSection compound={compound} />
          <EvidenceReferencesSection compound={compound} />
          <ArtifactSection compound={compound} />
          <NotesSection compound={compound} />
          <SourcePayloadsSection compound={compound} />
          <AuditLogSection compound={compound} />

          <div id="curate-compound" className="section">
            <CompoundSectionActions
              compoundId={compound.compoundId}
              rawPayloads={compound.sourcePayloads.map((payload) => ({
                sourceName: payload.sourceName,
                payloadType: payload.payloadType,
                payloadHash: payload.payloadHash,
                payload: payload.payload,
                createdAt: payload.createdAt.toISOString()
              }))}
            />
          </div>
        </div>

        <SummaryPanel compound={compound} />
      </div>
    </AppShell>
  );
}

function SummaryPanel({ compound }: { compound: CompoundDetail }) {
  const identifiers = identifierMap(compound);
  return (
    <aside className="summary-panel" aria-label="Compound summary">
      <h2>Key identifiers</h2>
      <div className="key-value">
        {[
          ["PubChem CID", String(compound.pubchemCid)],
          ["InChIKey", compound.identity?.inchiKey ?? identifiers.InChIKey],
          ["SMILES", compound.identity?.smiles ?? identifiers.SMILES],
          ["HMDB", identifiers.HMDB],
          ["KEGG", identifiers.KEGG],
          ["CAS", identifiers.CAS],
          ["ChEBI", identifiers.ChEBI],
          ["DrugBank", identifiers.DrugBank],
          ["UniProt", identifiers.UniProt],
          ["PathBank", identifiers.PathBank],
          ["BioCyc", identifiers.BioCyc],
          ["PlantCyc", identifiers.PlantCyc]
        ].map(([label, value]) => (
          <div className="key-value-row" key={label}>
            <dt>{label}</dt>
            <dd>{value || "Not recorded"}</dd>
          </div>
        ))}
      </div>

      <div className="summary-group">
        <h2>Annotation</h2>
        <DetailList
          entries={[
            ["Confidence", compound.annotationConfidence?.level ? labelize(compound.annotationConfidence.level) : "Not recorded"],
            ["Score", formatValue(compound.annotationConfidence?.score)],
            ["Method", compound.annotationConfidence?.method ?? "Not recorded"],
            ["Source", compound.annotationConfidence?.source ?? "Not recorded"]
          ]}
        />
      </div>

      <div className="summary-group">
        <h2>Counts</h2>
        <DetailList
          entries={[
            ["Names", compound.names.length],
            ["External IDs", compound.externalIdentifiers.length],
            ["Disease presence", compound.diseasePresence.length],
            ["Related diseases", compound.relatedDiseases.length],
            ["Pathways", compound.pathways.length],
            ["Targets", compound.targets.length],
            ["References", compound.references.length],
            ["Evidence records", compound.evidenceRecords.length],
            ["PDB structures", compound.pdbStructures.length]
          ]}
        />
      </div>
    </aside>
  );
}

function OverviewSection({ compound }: { compound: CompoundDetail }) {
  return (
    <SectionCard id="overview" title="Overview" description="Scientific context and high-level interpretation guardrails.">
      <div className="warning-box">
        <strong>Interpretation warnings</strong>
        <span>Presence records represent dataset observations only.</span>
        <span>Related disease records may come from external databases/literature and are not equivalent to detection in this dataset.</span>
        <span>SHAP/model importance, if present, should be interpreted as candidate biomarker evidence only.</span>
      </div>
      <DetailList
        entries={[
          ["Common name", compound.commonName ?? "Not curated"],
          ["IUPAC", compound.iupacName ?? "Not curated"],
          ["Molecular formula", compound.molecularFormula ?? compound.identity?.formula ?? "Not curated"],
          ["Molecular weight", formatValue(compound.molecularWeight ?? compound.identity?.molecularWeight)],
          ["Exact mass", formatValue(compound.identity?.exactMass)],
          ["Annotation summary", compound.annotationSummary ?? "Not recorded"],
          ["Classification summary", joinOrNone(compound.classificationLinks.map((link) => link.chemicalClassification.name))],
          ["Compound types", joinOrNone(compound.typeLinks.map((link) => link.compoundType.name))]
        ]}
      />
    </SectionCard>
  );
}

function ChemicalIdentitySection({ compound }: { compound: CompoundDetail }) {
  return (
    <SectionCard id="chemical-identity" title="Chemical Identity" description="Curated structural identifiers, names, external IDs, classes, and compound types.">
      <div className="subsection">
        <h3>Identity</h3>
        <DetailList
          entries={[
            ["Formula", compound.identity?.formula ?? compound.molecularFormula ?? "Not curated"],
            ["Exact mass", formatValue(compound.identity?.exactMass)],
            ["Molecular weight", formatValue(compound.identity?.molecularWeight ?? compound.molecularWeight)],
            ["SMILES", compound.identity?.smiles ?? "Not recorded"],
            ["Canonical SMILES", compound.identity?.canonicalSmiles ?? "Not recorded"],
            ["Isomeric SMILES", compound.identity?.isomericSmiles ?? "Not recorded"],
            ["InChI", compound.identity?.inchi ?? "Not recorded"],
            ["InChIKey", compound.identity?.inchiKey ?? "Not recorded"]
          ]}
        />
      </div>

      <div className="subsection">
        <h3>Names</h3>
        <DataTable headers={["Name", "Type", "Language", "Source"]}>
          {compound.names.map((name) => (
            <tr key={name.compoundNameId}>
              <td>{name.name}</td>
              <td><Badge variant="neutral">{labelize(name.nameType)}</Badge></td>
              <td>{name.language ?? "Not recorded"}</td>
              <td>{name.sourceOrigin?.name ?? name.sourceOriginId ?? "Not recorded"}</td>
            </tr>
          ))}
          {emptyRow(compound.names.length, 4)}
        </DataTable>
      </div>

      <div className="subsection">
        <h3>External identifiers</h3>
        <DataTable headers={["Database", "Identifier", "URL", "Notes", "Source"]}>
          {compound.externalIdentifiers.map((identifier) => (
            <tr key={identifier.externalIdentifierId}>
              <td><Badge variant="info">{identifier.database}</Badge></td>
              <td className="mono">{identifier.identifier}</td>
              <td>{identifier.url ? <a href={identifier.url}>{identifier.url}</a> : "Not recorded"}</td>
              <td>{identifier.notes ?? "Not recorded"}</td>
              <td>{identifier.sourceOrigin?.name ?? identifier.sourceOriginId ?? "Not recorded"}</td>
            </tr>
          ))}
          {emptyRow(compound.externalIdentifiers.length, 5)}
        </DataTable>
      </div>

      <div className="subsection">
        <h3>Classifications</h3>
        <DataTable headers={["Vocabulary", "Name", "Description", "Source"]}>
          {compound.classificationLinks.map((link) => (
            <tr key={link.compoundClassificationLinkId}>
              <td>{link.chemicalClassification.vocabulary ?? "Not recorded"}</td>
              <td>{link.chemicalClassification.name}</td>
              <td>{link.chemicalClassification.description ?? "Not recorded"}</td>
              <td>{link.sourceOrigin?.name ?? link.sourceOriginId ?? "Not recorded"}</td>
            </tr>
          ))}
          {emptyRow(compound.classificationLinks.length, 4)}
        </DataTable>
      </div>

      <div className="subsection">
        <h3>Compound types</h3>
        <DataTable headers={["Type", "Description", "Source"]}>
          {compound.typeLinks.map((link) => (
            <tr key={link.compoundTypeLinkId}>
              <td>{link.compoundType.name}</td>
              <td>{link.compoundType.description ?? "Not recorded"}</td>
              <td>{link.sourceOrigin?.name ?? link.sourceOriginId ?? "Not recorded"}</td>
            </tr>
          ))}
          {emptyRow(compound.typeLinks.length, 3)}
        </DataTable>
      </div>
    </SectionCard>
  );
}

function DatasetPresenceSection({ compound }: { compound: CompoundDetail }) {
  return (
    <SectionCard id="dataset-presence" title="Dataset Presence" description="Observed or reported compound presence in specific datasets.">
      <div className="warning-box">
        <strong>Observation only</strong>
        <span>Not diagnostic, causal, or confirmed biomarker evidence.</span>
      </div>
      <DataTable headers={["Disease", "Dataset", "Observed", "Observed count", "Total samples", "Frequency", "Presence %", "Evidence level", "Source file", "Notes"]}>
        {compound.diseasePresence.map((presence) => (
          <tr key={presence.compoundDiseasePresenceId}>
            <td>{presence.disease.name}</td>
            <td>{presence.dataset.title}</td>
            <td><Badge variant={presence.observed ? "success" : "neutral"}>{presence.observed === null ? "unknown" : String(presence.observed)}</Badge></td>
            <td>{formatValue(presence.observedCount)}</td>
            <td>{formatValue(presence.totalSamples)}</td>
            <td>{formatValue(presence.frequency)}</td>
            <td>{formatValue(presence.presencePercent)}</td>
            <td><Badge variant="info">{labelize(presence.evidenceLevel)}</Badge></td>
            <td>{presence.sourceFile?.fileName ?? "Not recorded"}</td>
            <td>{presence.notes ?? "Not recorded"}</td>
          </tr>
        ))}
        {emptyRow(compound.diseasePresence.length, 10)}
      </DataTable>
    </SectionCard>
  );
}

function RelatedDiseasesSection({ compound }: { compound: CompoundDetail }) {
  return (
    <SectionCard id="related-diseases" title="Related Diseases" description="External or curated disease associations, distinct from dataset observations.">
      <DataTable headers={["Disease", "Assertion", "Sources", "Original reference", "Notes"]}>
        {compound.relatedDiseases.map((related) => (
          <tr key={related.compoundRelatedDiseaseId}>
            <td>{related.disease.name}</td>
            <td><Badge variant="neutral">{labelize(related.assertion)}</Badge></td>
            <td>
              {joinOrNone(
                related.sources.map((source) =>
                  [source.sourceOrigin.name, labelize(source.role), source.sourceRecordId].filter(Boolean).join(" · ")
                )
              )}
            </td>
            <td>{referenceLabel(related.originalReference)}</td>
            <td>{related.notes ?? "Not recorded"}</td>
          </tr>
        ))}
        {emptyRow(compound.relatedDiseases.length, 5)}
      </DataTable>
    </SectionCard>
  );
}

function PathwaysSection({ compound }: { compound: CompoundDetail }) {
  return (
    <SectionCard id="pathways" title="Pathways" description="Pathway links separated by biological context and evidence level.">
      <DataTable headers={["Pathway name", "Database", "External ID", "Type", "Biological context", "Organism", "Role", "Evidence level", "Reference", "URL", "Notes"]}>
        {compound.pathways.map((link) => (
          <tr key={link.compoundPathwayId}>
            <td>{link.pathway.name}</td>
            <td>{link.pathway.database ?? "Not recorded"}</td>
            <td>{link.pathway.externalId ?? link.pathway.pathwayExternalId ?? "Not recorded"}</td>
            <td>{labelize(link.pathway.pathwayType)}</td>
            <td><Badge variant={biologicalContextVariant(link.pathway.biologicalContext)}>{labelize(link.pathway.biologicalContext ?? "unknown")}</Badge></td>
            <td>{link.pathway.organism ?? "Not recorded"}</td>
            <td>{link.role ?? "Not recorded"}</td>
            <td>{link.evidenceLevel ? <Badge variant="info">{link.evidenceLevel}</Badge> : "Not recorded"}</td>
            <td>{referenceLabel(link.reference)}</td>
            <td>{link.pathway.url ? <a href={link.pathway.url}>{link.pathway.url}</a> : "Not recorded"}</td>
            <td>{link.notes ?? "Not recorded"}</td>
          </tr>
        ))}
        {emptyRow(compound.pathways.length, 11)}
      </DataTable>
    </SectionCard>
  );
}

function TargetsSection({ compound }: { compound: CompoundDetail }) {
  return (
    <SectionCard id="targets" title="Targets / Molecular Interactions" description="Direct, indirect, predicted, or unknown target and interaction records.">
      <DataTable headers={["Target name", "Gene symbol", "UniProt ID", "Organism", "Is human", "Target type", "Interaction type", "Directness", "Evidence level", "Source", "Reference", "Notes"]}>
        {compound.targets.map((link) => (
          <tr key={link.compoundTargetId}>
            <td>{link.target.name}</td>
            <td>{link.target.geneSymbol ?? "Not recorded"}</td>
            <td>{link.target.uniprotId ?? "Not recorded"}</td>
            <td>{link.target.organism ?? "Not recorded"}</td>
            <td><Badge variant={link.target.isHuman ? "success" : "neutral"}>{link.target.isHuman ? "human" : "non-human"}</Badge></td>
            <td>{link.target.targetType ?? "Not recorded"}</td>
            <td>{link.interactionType ?? "Not recorded"}</td>
            <td><Badge variant={directnessVariant(link.directness)}>{labelize(link.directness)}</Badge></td>
            <td>{link.evidenceLevel ? <Badge variant="info">{link.evidenceLevel}</Badge> : "Not recorded"}</td>
            <td>{link.source ?? link.sourceOriginId ?? "Not recorded"}</td>
            <td>{referenceLabel(link.reference)}</td>
            <td>{link.notes ?? "Not recorded"}</td>
          </tr>
        ))}
        {emptyRow(compound.targets.length, 12)}
      </DataTable>
    </SectionCard>
  );
}

function PdbSection({ compound }: { compound: CompoundDetail }) {
  return (
    <SectionCard id="pdb-structures" title="PDB Structures" description="Protein structure records linked to the compound or ligand.">
      <DataTable headers={["PDB ID", "Title", "Method", "Resolution", "Organism", "Ligand ID", "Chain", "Source", "URL", "Notes"]}>
        {compound.pdbStructures.map((link) => (
          <tr key={link.compoundPdbStructureId}>
            <td className="mono">{link.pdbStructure.pdbId}</td>
            <td>{link.pdbStructure.title ?? "Not recorded"}</td>
            <td>{link.pdbStructure.method ?? "Not recorded"}</td>
            <td>{formatValue(link.pdbStructure.resolution)}</td>
            <td>{link.pdbStructure.organism ?? "Not recorded"}</td>
            <td>{link.ligandId ?? "Not recorded"}</td>
            <td>{link.chain ?? "Not recorded"}</td>
            <td>{link.source ?? "Not recorded"}</td>
            <td>{link.pdbStructure.url ? <a href={link.pdbStructure.url}>{link.pdbStructure.url}</a> : "Not recorded"}</td>
            <td>{link.notes ?? "Not recorded"}</td>
          </tr>
        ))}
        {emptyRow(compound.pdbStructures.length, 10)}
      </DataTable>
    </SectionCard>
  );
}

function EvidenceReferencesSection({ compound }: { compound: CompoundDetail }) {
  return (
    <SectionCard id="evidence-references" title="Evidence & References" description="Evidence records and source references used during curation.">
      <div className="subsection">
        <h3>Evidence records</h3>
        <DataTable headers={["Evidence type", "Biological context", "Species", "Human evidence", "Evidence level", "Source", "Reference", "Summary", "Notes"]}>
          {compound.evidenceRecords.map((evidence) => (
            <tr key={evidence.evidenceRecordId}>
              <td>{evidence.evidenceType}</td>
              <td>{evidence.biologicalContext ?? "Not recorded"}</td>
              <td>{evidence.species ?? "Not recorded"}</td>
              <td><Badge variant={evidence.humanEvidence ? "success" : "neutral"}>{evidence.humanEvidence ? "human" : "non-human"}</Badge></td>
              <td>{evidence.evidenceLevel ? <Badge variant="info">{evidence.evidenceLevel}</Badge> : "Not recorded"}</td>
              <td>{evidence.source ?? evidence.sourceOrigin?.name ?? "Not recorded"}</td>
              <td>{referenceLabel(evidence.reference)}</td>
              <td>{evidence.summary ?? "Not recorded"}</td>
              <td>
                {evidence.notes ?? "Not recorded"}
                {evidence.rawJson ? <JsonViewer value={evidence.rawJson} label="Evidence raw JSON" /> : null}
              </td>
            </tr>
          ))}
          {emptyRow(compound.evidenceRecords.length, 9)}
        </DataTable>
      </div>

      <div className="subsection">
        <h3>References</h3>
        <DataTable headers={["Title", "Authors", "Journal", "Year", "DOI", "PMID", "URL", "Context"]}>
          {compound.references.map((link) => (
            <tr key={link.compoundReferenceId}>
              <td>{link.reference.title ?? link.reference.citationText ?? "Untitled reference"}</td>
              <td>{link.reference.authors ?? "Not recorded"}</td>
              <td>{link.reference.journal ?? "Not recorded"}</td>
              <td>{link.reference.year ?? "Not recorded"}</td>
              <td>{link.reference.doi ?? "Not recorded"}</td>
              <td>{link.reference.pmid ?? "Not recorded"}</td>
              <td>{link.reference.url ? <a href={link.reference.url}>{link.reference.url}</a> : "Not recorded"}</td>
              <td>{link.context ?? "Not recorded"}</td>
            </tr>
          ))}
          {emptyRow(compound.references.length, 8)}
        </DataTable>
      </div>
    </SectionCard>
  );
}

function ArtifactSection({ compound }: { compound: CompoundDetail }) {
  return (
    <SectionCard id="artifact-assessment" title="Artifact Assessment" description="Analytical artifact, contaminant, column bleed, xenobiotic, and related review records.">
      <DataTable headers={["Flag", "Artifact type", "Confidence", "Rationale", "Source", "Notes"]}>
        {compound.artifactAssessments.map((assessment) => (
          <tr key={assessment.artifactAssessmentId}>
            <td><Badge variant={artifactVariant(assessment.flag)}>{labelize(assessment.flag)}</Badge></td>
            <td>{assessment.artifactType ?? "Not recorded"}</td>
            <td>{assessment.confidence ?? "Not recorded"}</td>
            <td>{assessment.rationale ?? "Not recorded"}</td>
            <td>{assessment.source ?? "Not recorded"}</td>
            <td>{assessment.notes ?? "Not recorded"}</td>
          </tr>
        ))}
        {emptyRow(compound.artifactAssessments.length, 6)}
      </DataTable>
    </SectionCard>
  );
}

function NotesSection({ compound }: { compound: CompoundDetail }) {
  return (
    <SectionCard id="notes" title="Notes" description="Curator notes and free-text scientific annotations.">
      <DataTable headers={["Note type", "Note", "Created by", "Created at"]}>
        {compound.notes.map((note) => (
          <tr key={note.compoundNoteId}>
            <td>{note.noteType ?? "curation_notes"}</td>
            <td>{note.note}</td>
            <td>{note.createdBy ?? "Not recorded"}</td>
            <td>{formatDateTime(note.createdAt)}</td>
          </tr>
        ))}
        {emptyRow(compound.notes.length, 4)}
      </DataTable>
    </SectionCard>
  );
}

function SourcePayloadsSection({ compound }: { compound: CompoundDetail }) {
  return (
    <SectionCard id="source-payloads" title="Source Payloads" description="Raw source payloads preserved for traceability.">
      {compound.sourcePayloads.length === 0 ? (
        <EmptyState />
      ) : (
        compound.sourcePayloads.map((payload) => (
          <div className="subsection" key={payload.sourcePayloadId}>
            <DetailList
              entries={[
                ["Source origin", payload.sourceOrigin?.name ?? payload.sourceName ?? "Not recorded"],
                ["Payload type", payload.payloadType ?? "Not recorded"],
                ["Hash", payload.payloadHash ?? "Not recorded"],
                ["Import job", payload.importJob?.fileName ?? payload.importJobId ?? "Not recorded"],
                ["Created at", formatDateTime(payload.createdAt)]
              ]}
            />
            <JsonViewer value={payload.payload} label="Raw source JSON" />
          </div>
        ))
      )}
    </SectionCard>
  );
}

function AuditLogSection({ compound }: { compound: CompoundDetail }) {
  return (
    <SectionCard id="audit-log" title="Audit Log" description="Recent curation actions, including before/after payloads when stored.">
      <DataTable headers={["Action", "Entity name", "Entity ID", "User", "Date", "Before / after"]}>
        {compound.auditLogs.map((log) => (
          <tr key={log.auditLogId}>
            <td><Badge variant="neutral">{labelize(log.action)}</Badge></td>
            <td>{log.entityName}</td>
            <td className="mono">{log.entityId}</td>
            <td>{log.user ? `${log.user.email} (${log.user.role})` : log.userId ?? "System"}</td>
            <td>{formatDateTime(log.createdAt)}</td>
            <td>
              {log.before ? <JsonViewer value={log.before} label="Before" /> : null}
              {log.after ? <JsonViewer value={log.after} label="After" /> : null}
              {!log.before && !log.after ? "Not recorded" : null}
            </td>
          </tr>
        ))}
        {emptyRow(compound.auditLogs.length, 6)}
      </DataTable>
    </SectionCard>
  );
}

function DetailList({ entries }: { entries: [string, React.ReactNode][] }) {
  return (
    <dl className="key-value">
      {entries.map(([label, value]) => (
        <div className="key-value-row" key={label}>
          <dt>{label}</dt>
          <dd>{value ?? "Not recorded"}</dd>
        </div>
      ))}
    </dl>
  );
}

function emptyRow(length: number, colSpan: number) {
  if (length > 0) return null;

  return (
    <tr>
      <td colSpan={colSpan}>
        <EmptyState />
      </td>
    </tr>
  );
}

function identifierMap(compound: CompoundDetail) {
  return compound.externalIdentifiers.reduce<Record<string, string>>((acc, identifier) => {
    acc[identifier.database] = acc[identifier.database]
      ? `${acc[identifier.database]}, ${identifier.identifier}`
      : identifier.identifier;
    return acc;
  }, {});
}

function formatValue(value: unknown) {
  if (value === null || value === undefined) return "Not recorded";
  if (value instanceof Date) return formatDateTime(value);
  if (typeof value === "object" && "toString" in value) return String(value);
  return String(value);
}

function formatDateTime(value: Date) {
  return value.toISOString().replace("T", " ").slice(0, 16);
}

function referenceLabel(reference: { title?: string | null; doi?: string | null; pmid?: string | null; url?: string | null } | null) {
  if (!reference) return "Not recorded";
  return reference.title ?? reference.doi ?? reference.pmid ?? reference.url ?? "Untitled reference";
}

function joinOrNone(values: string[]) {
  const filtered = values.filter(Boolean);
  return filtered.length ? filtered.join(", ") : "Not recorded";
}

function labelize(value: string) {
  return value.replace(/_/g, " ");
}

function artifactVariant(flag: string): BadgeVariant {
  if (flag === "likely_artifact") return "danger";
  if (flag === "possible_artifact") return "warning";
  if (flag === "unlikely_artifact") return "success";
  return "neutral";
}

function confidenceVariant(level: string): BadgeVariant {
  if (level === "high") return "success";
  if (level === "medium") return "info";
  if (level === "low") return "warning";
  return "neutral";
}

function biologicalContextVariant(context: string | null): BadgeVariant {
  if (context === "human") return "success";
  if (context === "conserved") return "info";
  if (context === "microbial" || context === "plant" || context === "non_human" || context === "environmental") return "warning";
  return "neutral";
}

function directnessVariant(directness: string): BadgeVariant {
  if (directness === "direct") return "success";
  if (directness === "indirect") return "info";
  if (directness === "predicted") return "warning";
  return "neutral";
}
