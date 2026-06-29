import { prisma } from "@/lib/prisma";

export async function GET() {
  const duplicates = await prisma.duplicateReview.findMany({
    include: {
      sourceCompound: true,
      targetCompound: true
    },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  return Response.json({ data: duplicates });
}
