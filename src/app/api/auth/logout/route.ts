import { sessionCookieName } from "@/modules/auth/session";

export async function POST() {
  return Response.json(
    { ok: true },
    {
      headers: {
        "Set-Cookie": `${sessionCookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
      }
    }
  );
}
