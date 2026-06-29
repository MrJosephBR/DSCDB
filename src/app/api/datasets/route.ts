import { prisma } from "@/lib/prisma";

export async function GET() {
  const datasets = await prisma.dataset.findMany({
    where: { deletedAt: null },
    include: {
      diseases: {
        include: {
          disease: true
        }
      },
      _count: {
        select: {
          presence: true,
          files: true
        }
      }
    },
    orderBy: { updatedAt: "desc" }
  });

  return Response.json({ data: datasets });
}
