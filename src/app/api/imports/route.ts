import { prisma } from "@/lib/prisma";

export async function GET() {
  const imports = await prisma.importJob.findMany({
    include: {
      user: {
        select: {
          email: true,
          role: true
        }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  return Response.json({ data: imports });
}
