import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/http";
import { importCuratedCompoundsJson, parseCuratedCompoundsJson } from "@/modules/import/json-importer";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return Response.json({ error: "ValidationError", message: "A JSON file is required" }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".json")) {
      return Response.json({ error: "ValidationError", message: "Only .json files are supported" }, { status: 400 });
    }

    const payload = parseCuratedCompoundsJson(await file.text());
    const summary = await prisma.$transaction(
      async (tx) =>
        importCuratedCompoundsJson(tx, payload, {
          fileName: file.name
        }),
      {
        timeout: 60_000
      }
    );

    return Response.json({ data: summary }, { status: 201 });
  } catch (error) {
    return jsonError(error, 400);
  }
}
