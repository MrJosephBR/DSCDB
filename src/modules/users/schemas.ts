import { z } from "zod";

export const userRoleSchema = z.enum(["admin", "curator", "editor", "researcher", "viewer", "analyst"]);

export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().trim().min(1).optional(),
  role: userRoleSchema.default("viewer"),
  password: z.string().min(8).optional()
});

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().trim().min(1).nullable().optional(),
  role: userRoleSchema.optional(),
  password: z.string().min(8).optional()
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
