import { jsonError } from "@/lib/http";
import { getCompound, softDeleteCompound, updateCompound } from "@/modules/compounds/service";
import { updateCompoundSchema } from "@/modules/compounds/schemas";

type Context = {
  params: Promise<{ compoundId: string }>;
};

export async function GET(_request: Request, context: Context) {
  const { compoundId } = await context.params;
  const compound = await getCompound(compoundId);

  if (!compound) {
    return Response.json({ error: "NotFound" }, { status: 404 });
  }

  return Response.json({ data: compound });
}

export async function PATCH(request: Request, context: Context) {
  try {
    const { compoundId } = await context.params;
    const body = await request.json();
    const input = updateCompoundSchema.parse(body);
    const compound = await updateCompound(compoundId, input);
    return Response.json({ data: compound });
  } catch (error) {
    return jsonError(error, 400);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const { compoundId } = await context.params;
    const compound = await softDeleteCompound(compoundId);
    return Response.json({ data: compound });
  } catch (error) {
    return jsonError(error, 400);
  }
}
