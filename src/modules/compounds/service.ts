import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/modules/audit/service";
import type { CreateCompoundInput, UpdateCompoundInput } from "./schemas";

const compoundInclude = {
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
  annotationConfidence: true,
  artifactAssessments: true,
  sourcePayloads: true
} satisfies Prisma.CompoundInclude;

export async function listCompounds(searchParams: URLSearchParams) {
  const cid = searchParams.get("cid");
  const name = searchParams.get("name");

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
        : {})
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
