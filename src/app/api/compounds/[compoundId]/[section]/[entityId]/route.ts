import { jsonError } from "@/lib/http";
import { requireRole } from "@/modules/auth/session";
import { deleteCompoundSection, updateCompoundSection } from "@/modules/compounds/service";
import { sectionUpdateSchemas, type CompoundSection } from "@/modules/compounds/schemas";

type Context = {
  params: Promise<{ compoundId: string; section: string; entityId: string }>;
};

export async function PATCH(request: Request, context: Context) {
  try {
    const session = requireRole(request, ["admin", "curator", "editor"]);
    const { compoundId, section, entityId } = await context.params;

    if (!isUpdateableSection(section)) {
      return Response.json({ error: "NotFound" }, { status: 404 });
    }

    const body = await request.json();
    const input = sectionUpdateSchemas[section].parse(body);
    const compound = await updateCompoundSection(compoundId, section, entityId, input, session.userId);
    return Response.json({ data: compound });
  } catch (error) {
    return jsonError(error, 400);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const session = requireRole(request, ["admin", "curator", "editor"]);
    const { compoundId, section, entityId } = await context.params;

    if (!isUpdateableSection(section)) {
      return Response.json({ error: "NotFound" }, { status: 404 });
    }

    const compound = await deleteCompoundSection(compoundId, section, entityId, session.userId);
    return Response.json({ data: compound });
  } catch (error) {
    return jsonError(error, 400);
  }
}

function isUpdateableSection(section: string): section is CompoundSection & keyof typeof sectionUpdateSchemas {
  return section in sectionUpdateSchemas;
}
