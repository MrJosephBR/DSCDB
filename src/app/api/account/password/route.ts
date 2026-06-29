import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/http";
import { requireRole } from "@/modules/auth/session";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8)
});

export async function POST(request: Request) {
  try {
    const session = requireRole(request, ["admin", "curator", "editor", "researcher", "viewer", "analyst"]);
    const input = changePasswordSchema.parse(await request.json());
    const user = await prisma.user.findUnique({ where: { userId: session.userId } });

    if (!user?.passwordHash || !(await bcrypt.compare(input.currentPassword, user.passwordHash))) {
      return Response.json({ error: "Unauthorized", message: "Current password is incorrect" }, { status: 401 });
    }

    await prisma.user.update({
      where: { userId: session.userId },
      data: { passwordHash: await bcrypt.hash(input.newPassword, 10) }
    });
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        entityName: "user",
        entityId: session.userId,
        action: "update",
        metadata: { change: "password" }
      }
    });

    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
