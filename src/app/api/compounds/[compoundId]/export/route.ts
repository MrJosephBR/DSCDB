import { getCompound } from "@/modules/compounds/service";
import { serializeCompoundForExport, serializeCompoundForLegacyExport } from "@/modules/export/compound-exporter";

type Context = {
  params: Promise<{ compoundId: string }>;
};

export async function GET(request: Request, context: Context) {
  const { compoundId } = await context.params;
  const url = new URL(request.url);
  const compound = await getCompound(compoundId);

  if (!compound) {
    return Response.json({ error: "NotFound" }, { status: 404 });
  }

  return Response.json(url.searchParams.get("format") === "legacy" ? serializeCompoundForLegacyExport(compound) : serializeCompoundForExport(compound));
}
