import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function MeasurementsPage() {
  const measurements = await prisma.compoundMeasurement.findMany({
    include: { sample: { include: { dataset: true, disease: true } }, compound: true, sourceFile: true },
    orderBy: { createdAt: "desc" },
    take: 300
  });

  return (
    <main className="page">
      <section className="page-header"><div><h1>Measurements</h1><p>Sample x compound GC-MS intensities and detection state.</p></div><a className="button secondary" href="/">Dashboard</a></section>
      <table className="table">
        <thead><tr><th>Sample</th><th>Compound</th><th>Disease</th><th>Raw</th><th>Detected</th><th>Source file</th></tr></thead>
        <tbody>{measurements.map((measurement) => <tr key={measurement.compoundMeasurementId}><td>{measurement.sample.sampleCode}</td><td>{measurement.compound.commonName ?? `CID ${measurement.compound.pubchemCid}`}</td><td>{measurement.sample.disease?.name ?? ""}</td><td>{measurement.rawIntensity?.toString() ?? ""}</td><td>{String(measurement.isDetected)}</td><td>{measurement.sourceFile?.fileName ?? ""}</td></tr>)}</tbody>
      </table>
    </main>
  );
}
