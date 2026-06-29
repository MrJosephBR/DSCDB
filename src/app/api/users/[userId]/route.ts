import { jsonError } from "@/lib/http";
import { requireRole } from "@/modules/auth/session";
import { updateUserSchema } from "@/modules/users/schemas";
import { softDeleteUser, updateUser } from "@/modules/users/service";

type Context = {
  params: Promise<{ userId: string }>;
};

export async function PATCH(request: Request, context: Context) {
  try {
    const session = requireRole(request, ["admin"]);
    const { userId } = await context.params;
    const input = updateUserSchema.parse(await request.json());
    const user = await updateUser(userId, input, session.userId);
    return Response.json({ data: user });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const session = requireRole(request, ["admin"]);
    const { userId } = await context.params;

    if (userId === session.userId) {
      return Response.json({ error: "ValidationError", message: "Admins cannot delete their own active session user" }, { status: 400 });
    }

    const user = await softDeleteUser(userId, session.userId);
    return Response.json({ data: user });
  } catch (error) {
    return jsonError(error);
  }
}
