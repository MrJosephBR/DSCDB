import { jsonError } from "@/lib/http";
import { requireRole } from "@/modules/auth/session";
import { addCompoundSection, getCompound } from "@/modules/compounds/service";
import { sectionSchemas, sectionUpdateSchemas, type CompoundSection } from "@/modules/compounds/schemas";

type Context = {
  params: Promise<{ compoundId: string; section: string }>;
};

export async function GET(_request: Request, context: Context) {
  const { compoundId, section } = await context.params;

  if (section !== "source-payloads") {
    return Response.json({ error: "NotFound" }, { status: 404 });
  }

  const compound = await getCompound(compoundId);
  if (!compound) {
    return Response.json({ error: "NotFound" }, { status: 404 });
  }

  return Response.json({ data: compound.sourcePayloads });
}

export async function POST(request: Request, context: Context) {
  try {
    const session = requireRole(request, ["admin", "curator", "editor"]);
    const { compoundId, section } = await context.params;

    if (!isCompoundSection(section)) {
      return Response.json({ error: "NotFound" }, { status: 404 });
    }

    const body = await request.json();
    const input = sectionSchemas[section].parse(body);
    const compound = await addCompoundSection(compoundId, section, input, session.userId);
    return Response.json({ data: compound }, { status: 201 });
  } catch (error) {
    return jsonError(error, 400);
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const session = requireRole(request, ["admin", "curator", "editor"]);
    const { compoundId, section } = await context.params;

    if (section !== "identity" && section !== "annotation-confidence") {
      return Response.json({ error: "NotFound" }, { status: 404 });
    }

    const body = await request.json();
    const input = sectionUpdateSchemas[section].parse(body);
    const compound = await addCompoundSection(compoundId, section, input, session.userId);
    return Response.json({ data: compound });
  } catch (error) {
    return jsonError(error, 400);
  }
}

function isCompoundSection(section: string): section is CompoundSection {
  return section in sectionSchemas;
}
