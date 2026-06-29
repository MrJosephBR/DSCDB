import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ importJobId: string }> };
export const dynamic = "force-dynamic";

export default async function ImportDetailPage({ params }: Props) {
  const { importJobId } = await params;
  const job = await prisma.importJob.findUnique({
    where: { importJobId },
    include: { user: { select: { email: true, role: true } }, sourcePayloads: true }
  });
  if (!job) notFound();

  return (
    <main className="page">
      <section className="page-header"><div><h1>Import Job</h1><p>{job.fileName ?? "Unnamed import"} - {job.status}</p></div><a className="button secondary" href="/imports">Imports</a></section>
      <section className="detail-grid">
        <section className="detail-block"><h2>Summary</h2><pre>{JSON.stringify(job.summary ?? {}, null, 2)}</pre></section>
        <section className="detail-block"><h2>Errors</h2><pre>{JSON.stringify(job.errors ?? job.errorMessage ?? {}, null, 2)}</pre></section>
        <section className="detail-block"><h2>Payloads</h2><p>{job.sourcePayloads.length} raw payload records preserved.</p></section>
      </section>
    </main>
  );
}
