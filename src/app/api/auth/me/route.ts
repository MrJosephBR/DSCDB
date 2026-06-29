import { getSessionFromRequest } from "@/modules/auth/session";

export async function GET(request: Request) {
  const session = getSessionFromRequest(request);

  return Response.json({
    data: session
      ? {
          userId: session.userId,
          email: session.email,
          role: session.role,
          exp: session.exp
        }
      : null
  });
}
