import { jsonError } from "@/lib/http";
import { requireRole } from "@/modules/auth/session";
import { createUserSchema } from "@/modules/users/schemas";
import { createUser, listUsers } from "@/modules/users/service";

export async function GET(request: Request) {
  try {
    requireRole(request, ["admin"]);
    const users = await listUsers();
    return Response.json({ data: users });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = requireRole(request, ["admin"]);
    const input = createUserSchema.parse(await request.json());
    const user = await createUser(input, session.userId);
    return Response.json({ data: user }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
