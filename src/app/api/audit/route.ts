import { prisma } from "@/lib/prisma";

export async function GET() {
  const auditLogs = await prisma.auditLog.findMany({
    include: {
      user: {
        select: {
          email: true,
          role: true
        }
      },
      compound: {
        select: {
          pubchemCid: true,
          commonName: true
        }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 200
  });

  return Response.json({ data: auditLogs });
}
