import ImportForm from "./ui/import-form";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import PeakTableForm from "./ui/peak-table-form";
import AppShell from "@/app/ui/app-shell";
import Badge from "@/app/ui/badge";
import DataTable from "@/app/ui/data-table";
import { EmptyValue } from "@/app/ui/scientific-values";

export const dynamic = "force-dynamic";

export default async function ImportsPage() {
  const importJobs = await prisma.importJob.findMany({
    include: {
      user: {
        select: {
          email: true,
          role: true
        }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 50
  });

  return (
    <AppShell>
      <section className="page-header">
        <div>
          <h1>Imports</h1>
          <p>Upload curated compound JSON and GC-MS peak tables. Raw payloads are preserved for audit, not shown as primary content.</p>
        </div>
        <Link className="button secondary" href="/">
          Dashboard
        </Link>
      </section>

      <ImportForm />
      <PeakTableForm />

      <section className="section">
        <h2>Import History</h2>
        <DataTable headers={["Created", "File", "Status", "Summary", "User"]}>
          {importJobs.map((job) => (
            <tr key={job.importJobId}>
              <td>{job.createdAt.toISOString().slice(0, 16).replace("T", " ")}</td>
              <td><a href={`/imports/${job.importJobId}`}>{job.fileName ?? <EmptyValue />}</a></td>
              <td><Badge variant={job.status === "completed" ? "success" : job.status === "failed" ? "danger" : "neutral"}>{job.status}</Badge></td>
              <td><ImportSummary summary={job.summary} /></td>
              <td>{job.user ? `${job.user.email} (${job.user.role})` : "System"}</td>
            </tr>
          ))}
        </DataTable>
      </section>
    </AppShell>
  );
}

function ImportSummary({ summary }: { summary: unknown }) {
  if (!summary || typeof summary !== "object") {
    return <EmptyValue />;
  }

  const data = summary as Record<string, unknown>;
  const fields: [string, string][] = [
    ["format", displayScalar(data.detected_format)],
    ["total", displayScalar(data.total ?? data.totalRows ?? data.totalCompounds)],
    ["valid", displayScalar(data.valid ?? data.validRows)],
    ["created", displayScalar(data.created ?? data.createdCompounds)],
    ["updated", displayScalar(data.updated ?? data.updatedCompounds)],
    ["skipped", displayScalar(data.skipped ?? data.skippedCompounds)],
    ["warnings", displayScalar(Array.isArray(data.validationErrors) ? data.validationErrors.length : data.invalid ?? data.invalidRows)]
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));

  if (fields.length === 0) {
    return <EmptyValue />;
  }

  return (
    <span className="chip-list">
      {fields.map(([label, value]) => (
        <Badge key={label} variant={label === "warnings" && Number(value) > 0 ? "warning" : "neutral"}>
          {label}: {String(value)}
        </Badge>
      ))}
    </span>
  );
}

function displayScalar(value: unknown) {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return undefined;
}
