import { prisma } from "@/lib/prisma";

export async function GET() {
  const diseases = await prisma.disease.findMany({
    where: { deletedAt: null },
    include: {
      _count: {
        select: {
          compoundPresence: true,
          relatedCompounds: true,
          datasets: true
        }
      }
    },
    orderBy: { name: "asc" }
  });

  return Response.json({ data: diseases });
}
