import { getCompound } from "@/modules/compounds/service";
import { serializeCompoundForExport } from "@/modules/export/compound-exporter";

type Context = {
  params: Promise<{ compoundId: string }>;
};

export async function GET(_request: Request, context: Context) {
  const { compoundId } = await context.params;
  const compound = await getCompound(compoundId);

  if (!compound) {
    return Response.json({ error: "NotFound" }, { status: 404 });
  }

  return Response.json(serializeCompoundForExport(compound));
}
