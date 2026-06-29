import { prisma } from "@/lib/prisma";
import { serializeCompoundForExport } from "@/modules/export/compound-exporter";

export async function GET() {
  const compounds = await prisma.compound.findMany({
    where: {
      deletedAt: null
    },
    include: {
      names: true,
      externalIdentifiers: true,
      diseasePresence: {
        where: { deletedAt: null },
        include: {
          dataset: true,
          disease: true
        }
      },
      relatedDiseases: {
        where: { deletedAt: null },
        include: {
          disease: true,
          originalReference: true,
          sources: {
            include: {
              sourceOrigin: true
            }
          }
        }
      }
    },
    orderBy: {
      pubchemCid: "asc"
    }
  });

  return Response.json({
    exported_at: new Date().toISOString(),
    compounds: compounds.map(serializeCompoundForExport)
  });
}
