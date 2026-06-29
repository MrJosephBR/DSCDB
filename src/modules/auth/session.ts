import { createHmac, timingSafeEqual } from "crypto";
import type { UserRole } from "@prisma/client";

export type AuthSession = {
  userId: string;
  email: string;
  role: UserRole;
  exp: number;
};

export const sessionCookieName = "dscdb_session";

const roleRank: Record<UserRole, number> = {
  viewer: 0,
  researcher: 1,
  analyst: 1,
  editor: 2,
  curator: 3,
  admin: 4
};

export function createSessionToken(session: Omit<AuthSession, "exp">, maxAgeSeconds = 60 * 60 * 8) {
  const payload: AuthSession = {
    ...session,
    exp: Math.floor(Date.now() / 1000) + maxAgeSeconds
  };
  const encodedPayload = base64url(JSON.stringify(payload));
  const signature = sign(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function verifySessionToken(token: string | undefined | null): AuthSession | null {
  if (!token) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) {
    return null;
  }

  const expected = sign(encodedPayload);
  if (!safeEqual(signature, expected)) {
    return null;
  }

  try {
    const session = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as AuthSession;
    if (!session.exp || session.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

export function getSessionFromRequest(request: Request) {
  return getSessionFromCookieHeader(request.headers.get("cookie") ?? "");
}

export function getSessionFromCookieHeader(cookieHeader: string) {
  const token = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${sessionCookieName}=`))
    ?.slice(sessionCookieName.length + 1);

  return verifySessionToken(token);
}

export function requireRole(request: Request, allowedRoles: UserRole[]) {
  const session = getSessionFromRequest(request);

  if (!session) {
    throw new AuthError("Authentication required", 401);
  }

  if (!allowedRoles.includes(session.role)) {
    throw new AuthError("Insufficient role", 403);
  }

  return session;
}

export function canWrite(role: UserRole) {
  return roleRank[role] >= roleRank.editor;
}

export class AuthError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

function sign(payload: string) {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

function getSecret() {
  return process.env.JWT_SECRET || "change_this_secret";
}

function base64url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);

  return left.length === right.length && timingSafeEqual(left, right);
}
