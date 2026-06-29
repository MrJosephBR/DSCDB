import { jsonError } from "@/lib/http";
import { createCompound, listCompounds } from "@/modules/compounds/service";
import { createCompoundSchema } from "@/modules/compounds/schemas";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const compounds = await listCompounds(url.searchParams);
  return Response.json({ data: compounds });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = createCompoundSchema.parse(body);
    const compound = await createCompound(input);
    return Response.json({ data: compound }, { status: 201 });
  } catch (error) {
    return jsonError(error, 400);
  }
}
