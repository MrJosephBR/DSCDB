import { ZodError } from "zod";
import { AuthError } from "@/modules/auth/session";

export function jsonError(error: unknown, status = 400) {
  if (error instanceof AuthError) {
    return Response.json({ error: error.name, message: error.message }, { status: error.status });
  }

  if (error instanceof ZodError) {
    return Response.json(
      {
        error: "ValidationError",
        issues: error.issues
      },
      { status }
    );
  }

  if (error instanceof Error) {
    return Response.json({ error: error.name, message: error.message }, { status });
  }

  return Response.json({ error: "UnknownError" }, { status });
}
