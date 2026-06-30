import { jsonError } from "@/lib/http";
import { requireRole } from "@/modules/auth/session";
import { restoreCompound } from "@/modules/compounds/service";

type Context = {
  params: Promise<{ compoundId: string }>;
};

export async function POST(request: Request, context: Context) {
  try {
    const session = requireRole(request, ["admin", "curator", "editor"]);
    const { compoundId } = await context.params;
    const compound = await restoreCompound(compoundId, session.userId);
    return Response.json({ data: compound });
  } catch (error) {
    return jsonError(error, 400);
  }
}
