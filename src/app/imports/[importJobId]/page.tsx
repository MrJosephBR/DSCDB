import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import AppShell from "@/app/ui/app-shell";
import JsonViewer from "@/app/ui/json-viewer";
import { KeyValueList } from "@/app/ui/scientific-values";

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
    <AppShell>
      <section className="page-header"><div><h1>Import Job</h1><p>{job.fileName ?? "Unnamed import"} - {job.status}</p></div><Link className="button secondary" href="/imports">Imports</Link></section>
      <section className="detail-grid">
        <section className="detail-block">
          <h2>Summary</h2>
          <KeyValueList entries={summaryEntries(job.summary)} />
          <JsonViewer value={job.summary ?? {}} label="Raw import summary" />
        </section>
        <section className="detail-block">
          <h2>Errors</h2>
          {job.errorMessage ? <p>{job.errorMessage}</p> : <p>No top-level import error recorded.</p>}
          <JsonViewer value={job.errors ?? {}} label="Raw import errors" />
        </section>
        <section className="detail-block"><h2>Payloads</h2><p>{job.sourcePayloads.length} raw payload records preserved.</p></section>
      </section>
    </AppShell>
  );
}

function summaryEntries(summary: unknown): [string, React.ReactNode][] {
  if (!summary || typeof summary !== "object") {
    return [["Summary", "No structured summary recorded"]];
  }

  const data = summary as Record<string, unknown>;
  return [
    ["Total", displayScalar(data.total ?? data.totalRows ?? data.totalCompounds)],
    ["Valid", displayScalar(data.valid ?? data.validRows)],
    ["Invalid", displayScalar(data.invalid ?? data.invalidRows)],
    ["Created", displayScalar(data.created ?? data.createdCompounds)],
    ["Updated", displayScalar(data.updated ?? data.updatedCompounds)],
    ["Skipped", displayScalar(data.skipped ?? data.skippedCompounds)],
    ["Dry run", data.dryRun === undefined ? undefined : String(data.dryRun)],
    ["Warnings", Array.isArray(data.validationErrors) ? data.validationErrors.length : undefined]
  ];
}

function displayScalar(value: unknown) {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return undefined;
}
