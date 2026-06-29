import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/modules/audit/service";
import type { CreateCompoundInput, UpdateCompoundInput } from "./schemas";

const compoundInclude = {
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
    where: {
      deletedAt: null
    },
    include: {
      dataset: true,
      disease: true
    }
  },
  relatedDiseases: {
    where: {
      deletedAt: null
    },
    include: {
      disease: true,
      sources: {
        include: {
          sourceOrigin: true
        }
      },
      originalReference: true
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
  },
  auditLogs: {
    orderBy: {
      createdAt: "desc"
    },
    take: 50
  }
} satisfies Prisma.CompoundInclude;

export async function listCompounds(searchParams: URLSearchParams) {
  const cid = searchParams.get("cid");
  const name = searchParams.get("name");
  const disease = searchParams.get("disease");
  const artifactFlag = searchParams.get("artifactFlag");

  return prisma.compound.findMany({
    where: {
      deletedAt: null,
      ...(cid ? { pubchemCid: Number(cid) } : {}),
      ...(name
        ? {
            OR: [
              { commonName: { contains: name, mode: "insensitive" } },
              { iupacName: { contains: name, mode: "insensitive" } },
              {
                names: {
                  some: {
                    name: { contains: name, mode: "insensitive" }
                  }
                }
              }
            ]
          }
        : {}),
      ...(disease
        ? {
            diseasePresence: {
              some: {
                deletedAt: null,
                disease: {
                  name: { contains: disease, mode: "insensitive" }
                }
              }
            }
          }
        : {}),
      ...(artifactFlag
        ? {
            artifactAssessments: {
              some: {
                flag: artifactFlag as Prisma.EnumArtifactFlagFilter["equals"]
              }
            }
          }
        : {})
    },
    include: {
      diseasePresence: {
        where: { deletedAt: null },
        include: { disease: true, dataset: true }
      },
      artifactAssessments: true
    },
    orderBy: {
      updatedAt: "desc"
    },
    take: 100
  });
}

export async function getCompound(compoundId: string) {
  return prisma.compound.findFirst({
    where: {
      compoundId,
      deletedAt: null
    },
    include: compoundInclude
  });
}

export async function createCompound(input: CreateCompoundInput, userId?: string) {
  const compound = await prisma.compound.create({
    data: {
      pubchemCid: input.pubchemCid,
      commonName: input.commonName,
      iupacName: input.iupacName,
      molecularFormula: input.molecularFormula,
      molecularWeight: input.molecularWeight,
      annotationSummary: input.annotationSummary,
      names: {
        create: input.names.map((name) => ({
          name: name.name,
          nameType: name.nameType
        }))
      }
    },
    include: compoundInclude
  });

  await recordAuditLog({
    userId,
    compoundId: compound.compoundId,
    entityName: "compound",
    entityId: compound.compoundId,
    action: "create",
    after: compound as unknown as Prisma.InputJsonValue
  });

  return compound;
}

export async function updateCompound(compoundId: string, input: UpdateCompoundInput, userId?: string) {
  const before = await prisma.compound.findUnique({ where: { compoundId } });

  const compound = await prisma.compound.update({
    where: {
      compoundId
    },
    data: {
      pubchemCid: input.pubchemCid,
      commonName: input.commonName,
      iupacName: input.iupacName,
      molecularFormula: input.molecularFormula,
      molecularWeight: input.molecularWeight,
      annotationSummary: input.annotationSummary
    },
    include: compoundInclude
  });

  await recordAuditLog({
    userId,
    compoundId,
    entityName: "compound",
    entityId: compoundId,
    action: "update",
    before: before as unknown as Prisma.InputJsonValue,
    after: compound as unknown as Prisma.InputJsonValue
  });

  return compound;
}

export async function softDeleteCompound(compoundId: string, userId?: string) {
  const before = await prisma.compound.findUnique({ where: { compoundId } });
  const compound = await prisma.compound.update({
    where: {
      compoundId
    },
    data: {
      deletedAt: new Date()
    }
  });

  await recordAuditLog({
    userId,
    compoundId,
    entityName: "compound",
    entityId: compoundId,
    action: "soft_delete",
    before: before as unknown as Prisma.InputJsonValue,
    after: compound as unknown as Prisma.InputJsonValue
  });

  return compound;
}
