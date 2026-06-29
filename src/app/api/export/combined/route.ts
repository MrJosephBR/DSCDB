import { prisma } from "@/lib/prisma";
import { serializeCombinedExport } from "@/modules/export/compound-exporter";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const disease = url.searchParams.get("disease");
  const dataset = url.searchParams.get("dataset");
  const cidMin = url.searchParams.get("cidMin");
  const cidMax = url.searchParams.get("cidMax");
  const artifactFlag = url.searchParams.get("artifactFlag");

  const compounds = await prisma.compound.findMany({
    where: {
      deletedAt: null,
      ...(cidMin || cidMax
        ? {
            pubchemCid: {
              ...(cidMin ? { gte: Number(cidMin) } : {}),
              ...(cidMax ? { lte: Number(cidMax) } : {})
            }
          }
        : {}),
      ...(disease || dataset
        ? {
            diseasePresence: {
              some: {
                deletedAt: null,
                ...(disease
                  ? {
                      disease: {
                        name: { contains: disease, mode: "insensitive" }
                      }
                    }
                  : {}),
                ...(dataset
                  ? {
                      dataset: {
                        title: { contains: dataset, mode: "insensitive" }
                      }
                    }
                  : {})
              }
            }
          }
        : {}),
      ...(artifactFlag
        ? {
            artifactAssessments: {
              some: {
                flag: artifactFlag as any
              }
            }
          }
        : {})
    },
    include: {
      identity: true,
      names: true,
      externalIdentifiers: true,
      classificationLinks: {
        include: {
          chemicalClassification: true
        }
      },
      typeLinks: {
        include: {
          compoundType: true
        }
      },
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
      },
      references: {
        include: {
          reference: true
        }
      },
      evidenceRecords: true,
      annotationConfidence: true,
      artifactAssessments: true,
      pathways: {
        include: {
          pathway: true
        }
      },
      targets: {
        include: {
          target: true
        }
      },
      notes: true,
      sourcePayloads: {
        include: {
          sourceOrigin: true
        }
      }
    },
    orderBy: {
      pubchemCid: "asc"
    }
  });

  return Response.json(
    serializeCombinedExport(compounds, {
      disease,
      dataset,
      cidMin,
      cidMax,
      artifactFlag
    })
  );
}
