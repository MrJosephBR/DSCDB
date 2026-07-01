import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function TargetsPage() {
  const targets = await prisma.target.findMany({
    include: { _count: { select: { compounds: true } } },
    orderBy: { name: "asc" },
    take: 200
  });

  return (
    <main className="page">
      <section className="page-header"><div><h1>Targets</h1><p>Protein, gene, receptor, and predicted target records.</p></div><Link className="button secondary" href="/">Dashboard</Link></section>
      <table className="table">
        <thead><tr><th>Name</th><th>Gene</th><th>UniProt</th><th>Organism</th><th>Human</th><th>Compounds</th></tr></thead>
        <tbody>{targets.map((target) => <tr key={target.targetId}><td>{target.name}</td><td>{target.geneSymbol ?? ""}</td><td>{target.uniprotId ?? target.externalId ?? ""}</td><td>{target.organism ?? ""}</td><td>{target.isHuman === null ? "" : String(target.isHuman)}</td><td>{target._count.compounds}</td></tr>)}</tbody>
      </table>
    </main>
  );
}
