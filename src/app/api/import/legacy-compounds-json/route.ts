import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/http";
import { importCuratedCompoundsJson, parseCuratedCompoundsJson } from "@/modules/import/json-importer";
import { requireRole } from "@/modules/auth/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = requireRole(request, ["admin", "curator", "editor"]);
    const url = new URL(request.url);
    const formData = await request.formData();
    const file = formData.get("file");
    const dryRun = url.searchParams.get("dryRun") === "1" || formData.get("dryRun") === "true";

    if (!(file instanceof File)) {
      return Response.json({ error: "ValidationError", message: "A JSON file is required" }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".json")) {
      return Response.json({ error: "ValidationError", message: "Only .json files are supported" }, { status: 400 });
    }

    const payload = parseCuratedCompoundsJson(await file.text());
    const summary = dryRun
      ? await importCuratedCompoundsJson(prisma, payload, {
          dryRun: true,
          fileName: file.name,
          userId: session.userId,
          forceFormat: "legacy_dscdb_json_v1"
        })
      : await prisma.$transaction(
          async (tx) =>
            importCuratedCompoundsJson(tx, payload, {
              fileName: file.name,
              userId: session.userId,
              forceFormat: "legacy_dscdb_json_v1"
            }),
          {
            timeout: 120_000
          }
        );

    return Response.json({ data: summary }, { status: 201 });
  } catch (error) {
    return jsonError(error, 400);
  }
}
