import { describe, expect, it } from "vitest";
import {
  canWrite,
  createSessionToken,
  getSessionFromCookieHeader,
  sessionCookieName,
  verifySessionToken
} from "@/modules/auth/session";

describe("auth session", () => {
  it("creates and verifies signed session tokens", () => {
    const token = createSessionToken({
      userId: "user-1",
      email: "admin@example.local",
      role: "admin"
    });

    const session = verifySessionToken(token);

    expect(session).toMatchObject({
      userId: "user-1",
      email: "admin@example.local",
      role: "admin"
    });
  });

  it("rejects tampered session tokens", () => {
    const token = createSessionToken({
      userId: "user-1",
      email: "admin@example.local",
      role: "admin"
    });

    expect(verifySessionToken(`${token}tampered`)).toBeNull();
  });

  it("reads session from cookie header", () => {
    const token = createSessionToken({
      userId: "user-1",
      email: "editor@example.local",
      role: "editor"
    });

    const session = getSessionFromCookieHeader(`theme=light; ${sessionCookieName}=${token}`);

    expect(session?.role).toBe("editor");
  });

  it("allows editor and above to write", () => {
    expect(canWrite("viewer")).toBe(false);
    expect(canWrite("researcher")).toBe(false);
    expect(canWrite("editor")).toBe(true);
    expect(canWrite("curator")).toBe(true);
    expect(canWrite("admin")).toBe(true);
  });
});
