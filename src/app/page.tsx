import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function getDashboardMetrics() {
  const [compounds, datasets, diseases, pendingDuplicates] = await Promise.all([
    prisma.compound.count({ where: { deletedAt: null } }),
    prisma.dataset.count({ where: { deletedAt: null } }),
    prisma.disease.count({ where: { deletedAt: null } }),
    prisma.duplicateReview.count({ where: { status: "open" } })
  ]);

  return { compounds, datasets, diseases, pendingDuplicates };
}

async function getRecentCompounds() {
  return prisma.compound.findMany({
    where: { deletedAt: null },
    orderBy: { updatedAt: "desc" },
    take: 10
  });
}

export default async function Home() {
  const [metrics, compounds] = await Promise.all([getDashboardMetrics(), getRecentCompounds()]);

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand">VOCs Breathomics DB</div>
        <p className="tagline">Research curation and knowledge management for public or anonymized VOC datasets.</p>
        <nav className="nav" aria-label="Primary navigation">
          <a href="/compounds">Compounds</a>
          <a href="/datasets">Datasets</a>
          <a href="/diseases">Diseases</a>
          <a href="/imports">Imports</a>
          <a href="/duplicates">Duplicates</a>
          <a href="/audit">Audit</a>
          <a href="/login">Login</a>
        </nav>
      </aside>
      <section className="main">
        <div className="toolbar">
          <div>
            <h1>Compound Curation Dashboard</h1>
            <p>Presence records are dataset observations only; they are not diagnostic or causal assertions.</p>
          </div>
          <a className="button" href="/api/export/combined">
            Export JSON
          </a>
        </div>

        <section className="grid" aria-label="Completeness overview">
          <div className="metric">
            Compounds
            <strong>{metrics.compounds}</strong>
          </div>
          <div className="metric">
            Datasets
            <strong>{metrics.datasets}</strong>
          </div>
          <div className="metric">
            Diseases
            <strong>{metrics.diseases}</strong>
          </div>
          <div className="metric">
            Duplicate Reviews
            <strong>{metrics.pendingDuplicates}</strong>
          </div>
        </section>

        <table className="table">
          <thead>
            <tr>
              <th>PubChem CID</th>
              <th>Common name</th>
              <th>IUPAC name</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {compounds.map((compound) => (
              <tr key={compound.compoundId}>
                <td>{compound.pubchemCid}</td>
                <td>{compound.commonName ?? "Not curated"}</td>
                <td>{compound.iupacName ?? "Not curated"}</td>
                <td>{compound.updatedAt.toISOString().slice(0, 10)}</td>
              </tr>
            ))}
            {compounds.length === 0 ? (
              <tr>
                <td colSpan={4}>No compounds have been curated yet.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </main>
  );
}
