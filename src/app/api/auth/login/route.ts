import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSessionToken, sessionCookieName } from "@/modules/auth/session";

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; password?: string };

  if (!body.email || !body.password) {
    return Response.json({ error: "ValidationError", message: "Email and password are required" }, { status: 400 });
  }

  const user = await prisma.user.findFirst({
    where: {
      email: body.email,
      deletedAt: null
    }
  });

  if (!user?.passwordHash || !(await bcrypt.compare(body.password, user.passwordHash))) {
    return Response.json({ error: "Unauthorized", message: "Invalid credentials" }, { status: 401 });
  }

  const token = createSessionToken({
    userId: user.userId,
    email: user.email,
    role: user.role
  });

  return Response.json(
    {
      data: {
        userId: user.userId,
        email: user.email,
        role: user.role
      }
    },
    {
      headers: {
        "Set-Cookie": `${sessionCookieName}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800`
      }
    }
  );
}
