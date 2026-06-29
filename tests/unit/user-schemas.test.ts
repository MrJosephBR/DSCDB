import { describe, expect, it } from "vitest";
import { createUserSchema, updateUserSchema } from "@/modules/users/schemas";

describe("user schemas", () => {
  it("validates new users", () => {
    const parsed = createUserSchema.parse({
      email: "curator@example.local",
      role: "curator",
      password: "temporary-password"
    });

    expect(parsed.role).toBe("curator");
  });

  it("rejects weak passwords", () => {
    expect(() =>
      updateUserSchema.parse({
        password: "short"
      })
    ).toThrow();
  });
});
