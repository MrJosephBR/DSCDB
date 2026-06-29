import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { CreateUserInput, UpdateUserInput } from "./schemas";

export async function listUsers() {
  return prisma.user.findMany({
    where: { deletedAt: null },
    orderBy: [{ role: "asc" }, { email: "asc" }],
    select: {
      userId: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      updatedAt: true
    }
  });
}

export async function createUser(input: CreateUserInput, actorUserId: string) {
  const user = await prisma.user.create({
    data: {
      email: input.email,
      name: input.name,
      role: input.role,
      passwordHash: input.password ? await bcrypt.hash(input.password, 10) : undefined
    },
    select: safeUserSelect
  });

  await prisma.auditLog.create({
    data: {
      userId: actorUserId,
      entityName: "user",
      entityId: user.userId,
      action: "create",
      after: user as unknown as Prisma.InputJsonValue
    }
  });

  return user;
}

export async function updateUser(userId: string, input: UpdateUserInput, actorUserId: string) {
  const before = await prisma.user.findUnique({
    where: { userId },
    select: safeUserSelect
  });

  const user = await prisma.user.update({
    where: { userId },
    data: {
      email: input.email,
      name: input.name,
      role: input.role,
      passwordHash: input.password ? await bcrypt.hash(input.password, 10) : undefined
    },
    select: safeUserSelect
  });

  await prisma.auditLog.create({
    data: {
      userId: actorUserId,
      entityName: "user",
      entityId: user.userId,
      action: "update",
      before: before as unknown as Prisma.InputJsonValue,
      after: user as unknown as Prisma.InputJsonValue
    }
  });

  return user;
}

export async function softDeleteUser(userId: string, actorUserId: string) {
  const before = await prisma.user.findUnique({
    where: { userId },
    select: safeUserSelect
  });

  const user = await prisma.user.update({
    where: { userId },
    data: { deletedAt: new Date() },
    select: safeUserSelect
  });

  await prisma.auditLog.create({
    data: {
      userId: actorUserId,
      entityName: "user",
      entityId: user.userId,
      action: "soft_delete",
      before: before as unknown as Prisma.InputJsonValue,
      after: user as unknown as Prisma.InputJsonValue
    }
  });

  return user;
}

const safeUserSelect = {
  userId: true,
  email: true,
  name: true,
  role: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true
} satisfies Prisma.UserSelect;
