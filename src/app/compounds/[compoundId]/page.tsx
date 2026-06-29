import Link from "next/link";
import { notFound } from "next/navigation";
import { getCompound } from "@/modules/compounds/service";

type Props = {
  params: Promise<{ compoundId: string }>;
};

export const dynamic = "force-dynamic";

export default async function CompoundDetailPage({ params }: Props) {
  const { compoundId } = await params;
  const compound = await getCompound(compoundId);

  if (!compound) {
    notFound();
  }

  return (
    <main className="page">
      <section className="page-header">
        <div>
          <h1>{compound.commonName ?? `CID ${compound.pubchemCid}`}</h1>
          <p>PubChem CID {compound.pubchemCid}</p>
        </div>
        <Link className="button secondary" href="/compounds">
          Compounds
        </Link>
      </section>

      <section className="detail-grid">
        <DetailBlock title="Identifiers">
          <dl>
            <dt>IUPAC</dt>
            <dd>{compound.iupacName ?? "Not curated"}</dd>
            <dt>Formula</dt>
            <dd>{compound.molecularFormula ?? "Not curated"}</dd>
            <dt>InChIKey</dt>
            <dd>{compound.identity?.inchiKey ?? "Not curated"}</dd>
            <dt>SMILES</dt>
            <dd>{compound.identity?.smiles ?? "Not curated"}</dd>
          </dl>
        </DetailBlock>

        <DetailBlock title="Names">
          <SimpleList items={compound.names.map((name) => `${name.name} (${name.nameType})`)} />
        </DetailBlock>

        <DetailBlock title="Classifications">
          <SimpleList items={compound.classificationLinks.map((link) => link.chemicalClassification.name)} />
        </DetailBlock>

        <DetailBlock title="Compound Types">
          <SimpleList items={compound.typeLinks.map((link) => link.compoundType.name)} />
        </DetailBlock>

        <DetailBlock title="Dataset Presence">
          <SimpleList
            items={compound.diseasePresence.map(
              (presence) =>
                `${presence.disease.name} in ${presence.dataset.title}: ${presence.evidenceLevel}. Observation only; not diagnostic, causal, or confirmed biomarker evidence.`
            )}
          />
        </DetailBlock>

        <DetailBlock title="Related Diseases">
          <SimpleList
            items={compound.relatedDiseases.map(
              (related) =>
                `${related.disease.name}: ${related.assertion} (${related.sources.map((source) => source.sourceOrigin.name).join(", ")})`
            )}
          />
        </DetailBlock>

        <DetailBlock title="References">
          <SimpleList
            items={compound.references.map(
              (link) => link.reference.title ?? link.reference.doi ?? link.reference.pmid ?? link.reference.url ?? "Untitled reference"
            )}
          />
        </DetailBlock>

        <DetailBlock title="Evidence">
          <SimpleList items={compound.evidenceRecords.map((evidence) => `${evidence.evidenceType}: ${evidence.summary ?? "No summary"}`)} />
        </DetailBlock>

        <DetailBlock title="Pathways">
          <SimpleList items={compound.pathways.map((link) => `${link.pathway.name} (${link.pathway.pathwayType})`)} />
        </DetailBlock>

        <DetailBlock title="Targets">
          <SimpleList items={compound.targets.map((link) => `${link.target.name} (${link.directness}, ${link.target.organism ?? "organism unknown"})`)} />
        </DetailBlock>

        <DetailBlock title="Notes">
          <SimpleList items={compound.notes.map((note) => note.note)} />
        </DetailBlock>

        <DetailBlock title="Source Payloads">
          <SimpleList
            items={compound.sourcePayloads.map(
              (payload) => `${payload.sourceOrigin?.name ?? "Unknown source"} ${payload.payloadHash ?? "no hash"}`
            )}
          />
        </DetailBlock>

        <DetailBlock title="Audit History">
          <SimpleList items={compound.auditLogs.map((log) => `${log.action} on ${log.createdAt.toISOString()}`)} />
        </DetailBlock>
      </section>
    </main>
  );
}

function DetailBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="detail-block">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function SimpleList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return <p>None recorded.</p>;
  }

  return (
    <ul>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
