import { prisma } from "@/lib/prisma";
import { serializeCombinedExport } from "@/modules/export/compound-exporter";
import type { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q");
  const cid = url.searchParams.get("cid");
  const disease = url.searchParams.get("disease");
  const dataset = url.searchParams.get("dataset");
  const cidMin = url.searchParams.get("cidMin");
  const cidMax = url.searchParams.get("cidMax");
  const artifactFlag = url.searchParams.get("artifactFlag");
  const pathway = url.searchParams.get("pathway");
  const target = url.searchParams.get("target");
  const identifier = url.searchParams.get("identifier");
  const identifierDatabase = url.searchParams.get("identifierDatabase");
  const annotationConfidence = url.searchParams.get("annotationConfidence");
  const hasPathway = url.searchParams.get("hasPathway");
  const hasTarget = url.searchParams.get("hasTarget");
  const hasPdb = url.searchParams.get("hasPdb");
  const and: Prisma.CompoundWhereInput[] = [];

  if (cid && Number.isFinite(Number(cid))) {
    and.push({ pubchemCid: Number(cid) });
  }

  if (cidMin || cidMax) {
    and.push({
      pubchemCid: {
        ...(cidMin ? { gte: Number(cidMin) } : {}),
        ...(cidMax ? { lte: Number(cidMax) } : {})
      }
    });
  }

  if (q) {
    and.push({
      OR: [
        { commonName: { contains: q, mode: "insensitive" } },
        { iupacName: { contains: q, mode: "insensitive" } },
        { pubchemCid: Number.isFinite(Number(q)) ? Number(q) : -1 },
        { names: { some: { name: { contains: q, mode: "insensitive" } } } },
        { identity: { is: { inchiKey: { contains: q, mode: "insensitive" } } } },
        { externalIdentifiers: { some: { identifier: { contains: q, mode: "insensitive" } } } }
      ]
    });
  }

  if (identifier || identifierDatabase) {
    and.push({
      externalIdentifiers: {
        some: {
          ...(identifier ? { identifier: { contains: identifier, mode: "insensitive" } } : {}),
          ...(identifierDatabase ? { database: identifierDatabase as any } : {})
        }
      }
    });
  }

  if (disease) {
    and.push({
      OR: [
        {
          diseasePresence: {
            some: {
              deletedAt: null,
              disease: { name: { contains: disease, mode: "insensitive" } }
            }
          }
        },
        {
          relatedDiseases: {
            some: {
              deletedAt: null,
              disease: { name: { contains: disease, mode: "insensitive" } }
            }
          }
        }
      ]
    });
  }

  if (dataset) {
    and.push({
      diseasePresence: {
        some: {
          deletedAt: null,
          dataset: { title: { contains: dataset, mode: "insensitive" } }
        }
      }
    });
  }

  if (pathway) {
    and.push({
      pathways: {
        some: {
          pathway: {
            OR: [
              { name: { contains: pathway, mode: "insensitive" } },
              { externalId: { contains: pathway, mode: "insensitive" } },
              { pathwayExternalId: { contains: pathway, mode: "insensitive" } }
            ]
          }
        }
      }
    });
  }

  if (target) {
    and.push({
      targets: {
        some: {
          target: {
            OR: [
              { name: { contains: target, mode: "insensitive" } },
              { geneSymbol: { contains: target, mode: "insensitive" } },
              { uniprotId: { contains: target, mode: "insensitive" } }
            ]
          }
        }
      }
    });
  }

  if (artifactFlag) and.push({ artifactAssessments: { some: { flag: artifactFlag as any } } });
  if (annotationConfidence) and.push({ annotationConfidence: { is: { level: annotationConfidence as any } } });
  if (hasPathway === "true") and.push({ pathways: { some: {} } });
  if (hasPathway === "false") and.push({ pathways: { none: {} } });
  if (hasTarget === "true") and.push({ targets: { some: {} } });
  if (hasTarget === "false") and.push({ targets: { none: {} } });
  if (hasPdb === "true") and.push({ pdbStructures: { some: {} } });
  if (hasPdb === "false") and.push({ pdbStructures: { none: {} } });

  const compounds = await prisma.compound.findMany({
    where: {
      deletedAt: null,
      ...(and.length ? { AND: and } : {})
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
      pdbStructures: {
        include: {
          pdbStructure: true
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
      artifactFlag,
      q,
      cid,
      pathway,
      target,
      identifier,
      identifierDatabase,
      annotationConfidence,
      hasPathway,
      hasTarget,
      hasPdb
    })
  );
}
