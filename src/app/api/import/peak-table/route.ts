import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/http";
import { requireRole } from "@/modules/auth/session";
import { importPeakTableCsv } from "@/modules/import/peaktable-importer";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = requireRole(request, ["admin", "curator", "editor"]);
    const url = new URL(request.url);
    const formData = await request.formData();
    const file = formData.get("file");
    const dryRun = url.searchParams.get("dryRun") === "1" || formData.get("dryRun") === "true";
    const datasetTitle = String(formData.get("datasetTitle") || "A Clinical Breathomics Dataset");
    const diseaseName = String(formData.get("diseaseName") || "unknown");

    if (!(file instanceof File)) {
      return Response.json({ error: "ValidationError", message: "A CSV file is required" }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      return Response.json({ error: "ValidationError", message: "Only .csv peak tables are supported in this first importer" }, { status: 400 });
    }

    const text = await file.text();
    const summary = dryRun
      ? await importPeakTableCsv(prisma, text, { fileName: file.name, datasetTitle, diseaseName, userId: session.userId, dryRun: true })
      : await prisma.$transaction(
          (tx) => importPeakTableCsv(tx, text, { fileName: file.name, datasetTitle, diseaseName, userId: session.userId }),
          { timeout: 120_000 }
        );

    return Response.json({ data: summary }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
