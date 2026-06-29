import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ datasetId: string }> };
export const dynamic = "force-dynamic";

export default async function DatasetDetailPage({ params }: Props) {
  const { datasetId } = await params;
  const dataset = await prisma.dataset.findUnique({
    where: { datasetId },
    include: {
      diseases: { include: { disease: true } },
      files: true,
      samples: { include: { disease: true }, take: 100 },
      presence: { include: { compound: true, disease: true }, take: 100 }
    }
  });
  if (!dataset) notFound();

  return (
    <main className="page">
      <section className="page-header"><div><h1>{dataset.title}</h1><p>{dataset.description ?? "Dataset detail"}</p></div><a className="button secondary" href="/datasets">Datasets</a></section>
      <section className="detail-grid">
        <section className="detail-block"><h2>Metadata</h2><dl><dt>Technology</dt><dd>{dataset.technology ?? dataset.analyticalPlatform ?? ""}</dd><dt>Matrix</dt><dd>{dataset.sampleMatrix ?? ""}</dd><dt>DOI</dt><dd>{dataset.doi ?? ""}</dd></dl></section>
        <section className="detail-block"><h2>Diseases</h2><SimpleList items={dataset.diseases.map((item) => item.disease.name)} /></section>
        <section className="detail-block"><h2>Files</h2><SimpleList items={dataset.files.map((file) => `${file.fileName} (${file.fileRole ?? file.fileKind})`)} /></section>
        <section className="detail-block"><h2>Samples</h2><SimpleList items={dataset.samples.map((sample) => `${sample.sampleCode} ${sample.disease?.name ?? ""}`)} /></section>
        <section className="detail-block"><h2>Detected Compounds</h2><SimpleList items={dataset.presence.map((presence) => `${presence.compound.commonName ?? `CID ${presence.compound.pubchemCid}`} - ${presence.disease.name}`)} /></section>
      </section>
    </main>
  );
}

function SimpleList({ items }: { items: string[] }) {
  return items.length ? <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul> : <p>None recorded.</p>;
}
