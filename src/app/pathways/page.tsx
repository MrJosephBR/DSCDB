import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PathwaysPage() {
  const pathways = await prisma.pathway.findMany({
    include: { _count: { select: { compounds: true } } },
    orderBy: { name: "asc" },
    take: 200
  });

  return (
    <main className="page">
      <section className="page-header"><div><h1>Pathways</h1><p>Human, conserved, microbial, plant, and external pathway records.</p></div><Link className="button secondary" href="/">Dashboard</Link></section>
      <table className="table">
        <thead><tr><th>Name</th><th>Type</th><th>Database</th><th>Organism</th><th>Compounds</th></tr></thead>
        <tbody>{pathways.map((pathway) => <tr key={pathway.pathwayId}><td>{pathway.name}</td><td>{pathway.pathwayType}</td><td>{pathway.database ?? pathway.source ?? ""}</td><td>{pathway.organism ?? ""}</td><td>{pathway._count.compounds}</td></tr>)}</tbody>
      </table>
    </main>
  );
}
