import { createHash } from "crypto";
import { Prisma, type AuditAction } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { CompoundSection, CreateCompoundInput, UpdateCompoundInput } from "./schemas";

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
      disease: true,
      sourceFile: true
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
  evidenceRecords: {
    include: {
      reference: true,
      sourceOrigin: true
    }
  },
  annotationConfidence: true,
  artifactAssessments: true,
  pathways: {
    include: {
      pathway: true,
      reference: true
    }
  },
  targets: {
    include: {
      target: true,
      reference: true
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
      sourceOrigin: true,
      importJob: true
    }
  },
  auditLogs: {
    orderBy: {
      createdAt: "desc"
    },
    take: 50
  }
} satisfies Prisma.CompoundInclude;

type Tx = Prisma.TransactionClient;
const externalDatabases = [
  "PubChem",
  "HMDB",
  "KEGG",
  "CAS",
  "ChEBI",
  "InChIKey",
  "InChI",
  "SMILES",
  "PDB",
  "PathBank",
  "BioCyc",
  "PlantCyc",
  "DrugBank",
  "UniProt",
  "Other"
] as const;
const artifactFlags = ["likely_artifact", "possible_artifact", "unlikely_artifact", "unknown"] as const;

export async function listCompounds(searchParams: URLSearchParams) {
  const cid = searchParams.get("cid");
  const name = searchParams.get("name");
  const disease = searchParams.get("disease");
  const dataset = searchParams.get("dataset");
  const identifier = searchParams.get("identifier");
  const pathway = searchParams.get("pathway");
  const target = searchParams.get("target");
  const artifactFlag = searchParams.get("artifactFlag");
  const identifierDatabase = identifier && isExternalDatabase(identifier) ? identifier : undefined;
  const parsedArtifactFlag = artifactFlag && isArtifactFlag(artifactFlag) ? artifactFlag : undefined;

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
      ...(identifier
        ? {
            externalIdentifiers: {
              some: {
                OR: [
                  { identifier: { contains: identifier, mode: "insensitive" } },
                  ...(identifierDatabase ? [{ database: identifierDatabase }] : [])
                ]
              }
            }
          }
        : {}),
      ...(disease
        ? {
            OR: [
              {
                diseasePresence: {
                  some: {
                    deletedAt: null,
                    disease: {
                      name: { contains: disease, mode: "insensitive" }
                    }
                  }
                }
              },
              {
                relatedDiseases: {
                  some: {
                    deletedAt: null,
                    disease: {
                      name: { contains: disease, mode: "insensitive" }
                    }
                  }
                }
              }
            ]
          }
        : {}),
      ...(dataset
        ? {
            diseasePresence: {
              some: {
                deletedAt: null,
                dataset: {
                  title: { contains: dataset, mode: "insensitive" }
                }
              }
            }
          }
        : {}),
      ...(pathway
        ? {
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
          }
        : {}),
      ...(target
        ? {
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
          }
        : {}),
      ...(parsedArtifactFlag
        ? {
            artifactAssessments: {
              some: {
                flag: parsedArtifactFlag
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
      artifactAssessments: true,
      externalIdentifiers: true,
      pathways: { include: { pathway: true } },
      targets: { include: { target: true } }
    },
    orderBy: {
      updatedAt: "desc"
    },
    take: 100
  });
}

function isExternalDatabase(value: string): value is (typeof externalDatabases)[number] {
  return externalDatabases.includes(value as (typeof externalDatabases)[number]);
}

function isArtifactFlag(value: string): value is (typeof artifactFlags)[number] {
  return artifactFlags.includes(value as (typeof artifactFlags)[number]);
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
  return prisma.$transaction(async (tx) => {
    const existing = await tx.compound.findUnique({
      where: { pubchemCid: input.pubchemCid },
      select: { compoundId: true, deletedAt: true }
    });

    if (existing) {
      throw new Error(
        `PubChem CID ${input.pubchemCid} already exists for compound ${existing.compoundId}. Use PATCH to edit it or restore it first if it is deleted.`
      );
    }

    const compound = await tx.compound.create({
      data: {
        pubchemCid: input.pubchemCid,
        commonName: input.commonName,
        iupacName: input.iupacName,
        molecularFormula: input.molecularFormula ?? input.identity?.formula,
        molecularWeight: input.molecularWeight ?? input.identity?.molecularWeight,
        annotationSummary: input.annotationSummary
      }
    });

    await persistCompoundSections(tx, compound.compoundId, input);
    const after = await findCompoundInTx(tx, compound.compoundId);
    if (!after) throw new Error("Compound was created but could not be reloaded");

    await createAudit(tx, {
      userId,
      compoundId: compound.compoundId,
      entityName: "compound",
      entityId: compound.compoundId,
      action: "create",
      after
    });

    return after;
  });
}

export async function updateCompound(compoundId: string, input: UpdateCompoundInput, userId?: string) {
  return prisma.$transaction(async (tx) => {
    const before = await findCompoundInTx(tx, compoundId);
    if (!before) {
      throw new Error("Compound not found");
    }

    if (input.pubchemCid && input.pubchemCid !== before.pubchemCid) {
      const duplicate = await tx.compound.findUnique({ where: { pubchemCid: input.pubchemCid } });
      if (duplicate) {
        throw new Error(`PubChem CID ${input.pubchemCid} is already used by compound ${duplicate.compoundId}`);
      }
    }

    await tx.compound.update({
      where: { compoundId },
      data: {
        pubchemCid: input.pubchemCid,
        commonName: input.commonName,
        iupacName: input.iupacName,
        molecularFormula: input.molecularFormula ?? input.identity?.formula,
        molecularWeight: input.molecularWeight ?? input.identity?.molecularWeight,
        annotationSummary: input.annotationSummary
      }
    });

    await persistCompoundSections(tx, compoundId, input);
    const after = await findCompoundInTx(tx, compoundId);
    if (!after) throw new Error("Compound was updated but could not be reloaded");

    await createAudit(tx, {
      userId,
      compoundId,
      entityName: "compound",
      entityId: compoundId,
      action: "update",
      before,
      after
    });

    return after;
  });
}

export async function softDeleteCompound(compoundId: string, userId?: string) {
  return prisma.$transaction(async (tx) => {
    const before = await findCompoundInTx(tx, compoundId);
    const compound = await tx.compound.update({
      where: {
        compoundId
      },
      data: {
        deletedAt: new Date()
      }
    });

    await createAudit(tx, {
      userId,
      compoundId,
      entityName: "compound",
      entityId: compoundId,
      action: "soft_delete",
      before,
      after: compound
    });

    return compound;
  });
}

export async function restoreCompound(compoundId: string, userId?: string) {
  return prisma.$transaction(async (tx) => {
    const before = await tx.compound.findUnique({ where: { compoundId } });
    const compound = await tx.compound.update({
      where: { compoundId },
      data: { deletedAt: null },
      include: compoundInclude
    });

    await createAudit(tx, {
      userId,
      compoundId,
      entityName: "compound",
      entityId: compoundId,
      action: "restore",
      before,
      after: compound
    });

    return compound;
  });
}

export async function addCompoundSection(compoundId: string, section: CompoundSection, input: unknown, userId?: string) {
  return prisma.$transaction(async (tx) => {
    const before = await findCompoundInTx(tx, compoundId);
    if (!before) throw new Error("Compound not found");
    await persistSection(tx, compoundId, section, input);
    const after = await findCompoundInTx(tx, compoundId);
    await createAudit(tx, { userId, compoundId, entityName: section, entityId: compoundId, action: "update", before, after });
    return after;
  });
}

export async function updateCompoundSection(
  compoundId: string,
  section: CompoundSection,
  entityId: string,
  input: Record<string, unknown>,
  userId?: string
) {
  return prisma.$transaction(async (tx) => {
    const before = await findCompoundInTx(tx, compoundId);
    if (!before) throw new Error("Compound not found");
    await updateSectionEntity(tx, compoundId, section, entityId, input);
    const after = await findCompoundInTx(tx, compoundId);
    await createAudit(tx, { userId, compoundId, entityName: section, entityId, action: "update", before, after });
    return after;
  });
}

export async function deleteCompoundSection(compoundId: string, section: CompoundSection, entityId: string, userId?: string) {
  return prisma.$transaction(async (tx) => {
    const before = await findCompoundInTx(tx, compoundId);
    if (!before) throw new Error("Compound not found");
    await deleteSectionEntity(tx, compoundId, section, entityId);
    const after = await findCompoundInTx(tx, compoundId);
    await createAudit(tx, { userId, compoundId, entityName: section, entityId, action: "update", before, after });
    return after;
  });
}

async function persistCompoundSections(tx: Tx, compoundId: string, input: Partial<CreateCompoundInput>) {
  if (input.identity) {
    await upsertIdentity(tx, compoundId, input.identity);
  }

  for (const name of input.names ?? []) {
    await upsertCompoundName(tx, compoundId, name);
  }

  for (const identifier of input.externalIdentifiers ?? []) {
    await upsertExternalIdentifier(tx, compoundId, identifier);
  }

  for (const classification of input.classifications ?? []) {
    await upsertClassification(tx, compoundId, classification);
  }

  if (input.classyFire) {
    await persistClassyFire(tx, compoundId, input.classyFire);
  }

  for (const compoundType of input.compoundTypes ?? []) {
    await upsertCompoundType(tx, compoundId, compoundType);
  }

  for (const presence of input.diseasePresence ?? []) {
    await upsertDiseasePresence(tx, compoundId, presence);
  }

  for (const disease of input.relatedDiseases ?? []) {
    await upsertRelatedDisease(tx, compoundId, disease);
  }

  for (const reference of input.references ?? []) {
    await upsertReference(tx, compoundId, reference);
  }

  for (const evidence of input.evidenceRecords ?? []) {
    await createEvidenceRecord(tx, compoundId, evidence);
  }

  if (input.annotationConfidence) {
    await upsertAnnotationConfidence(tx, compoundId, input.annotationConfidence);
  }

  for (const assessment of input.artifactAssessments ?? []) {
    await createArtifactAssessment(tx, compoundId, assessment);
  }

  for (const pathway of input.pathways ?? []) {
    await upsertPathway(tx, compoundId, pathway);
  }

  for (const target of input.targets ?? []) {
    await upsertTarget(tx, compoundId, target);
  }

  for (const structure of input.pdbStructures ?? []) {
    await upsertPdbStructure(tx, compoundId, structure);
  }

  for (const note of input.notes ?? []) {
    await createNote(tx, compoundId, note);
  }

  for (const payload of input.sourcePayloads ?? []) {
    await createSourcePayload(tx, compoundId, payload);
  }
}

async function persistSection(tx: Tx, compoundId: string, section: CompoundSection, input: unknown) {
  switch (section) {
    case "identity":
      if (!input) throw new Error("Identity payload is required");
      return upsertIdentity(tx, compoundId, input as NonNullable<CreateCompoundInput["identity"]>);
    case "names":
      return upsertCompoundName(tx, compoundId, input as CreateCompoundInput["names"][number]);
    case "external-identifiers":
      return upsertExternalIdentifier(tx, compoundId, input as CreateCompoundInput["externalIdentifiers"][number]);
    case "classifications":
      return upsertClassification(tx, compoundId, input as CreateCompoundInput["classifications"][number]);
    case "types":
      return upsertCompoundType(tx, compoundId, input as CreateCompoundInput["compoundTypes"][number]);
    case "disease-presence":
      return upsertDiseasePresence(tx, compoundId, input as CreateCompoundInput["diseasePresence"][number]);
    case "related-diseases":
      return upsertRelatedDisease(tx, compoundId, input as CreateCompoundInput["relatedDiseases"][number]);
    case "references":
      return upsertReference(tx, compoundId, input as CreateCompoundInput["references"][number]);
    case "evidence":
      return createEvidenceRecord(tx, compoundId, input as CreateCompoundInput["evidenceRecords"][number]);
    case "annotation-confidence":
      if (!input) throw new Error("Annotation confidence payload is required");
      return upsertAnnotationConfidence(tx, compoundId, input as NonNullable<CreateCompoundInput["annotationConfidence"]>);
    case "artifact-assessments":
      return createArtifactAssessment(tx, compoundId, input as CreateCompoundInput["artifactAssessments"][number]);
    case "pathways":
      return upsertPathway(tx, compoundId, input as CreateCompoundInput["pathways"][number]);
    case "targets":
      return upsertTarget(tx, compoundId, input as CreateCompoundInput["targets"][number]);
    case "pdb-structures":
      return upsertPdbStructure(tx, compoundId, input as CreateCompoundInput["pdbStructures"][number]);
    case "notes":
      return createNote(tx, compoundId, input as CreateCompoundInput["notes"][number]);
    case "source-payloads":
      return createSourcePayload(tx, compoundId, input as CreateCompoundInput["sourcePayloads"][number]);
  }
}

async function upsertIdentity(tx: Tx, compoundId: string, identity: NonNullable<CreateCompoundInput["identity"]>) {
  await tx.compoundIdentity.upsert({
    where: { compoundId },
    update: identity,
    create: {
      compoundId,
      ...identity
    }
  });
}

async function upsertCompoundName(tx: Tx, compoundId: string, name: CreateCompoundInput["names"][number]) {
  await tx.compoundName.upsert({
    where: {
      compoundId_name_nameType: {
        compoundId,
        name: name.name,
        nameType: name.nameType
      }
    },
    update: {
      language: name.language,
      sourceOriginId: name.sourceOriginId
    },
    create: {
      compoundId,
      name: name.name,
      nameType: name.nameType,
      language: name.language,
      sourceOriginId: name.sourceOriginId
    }
  });
}

async function upsertExternalIdentifier(
  tx: Tx,
  compoundId: string,
  identifier: CreateCompoundInput["externalIdentifiers"][number]
) {
  const existing = await tx.externalIdentifier.findUnique({
    where: {
      database_identifier: {
        database: identifier.database,
        identifier: identifier.identifier
      }
    }
  });

  if (existing && existing.compoundId !== compoundId) {
    throw new Error(`${identifier.database} identifier ${identifier.identifier} already belongs to another compound`);
  }

  if (existing) {
    await tx.externalIdentifier.update({
      where: { externalIdentifierId: existing.externalIdentifierId },
      data: {
        url: identifier.url,
        notes: identifier.notes,
        sourceOriginId: identifier.sourceOriginId
      }
    });
    return;
  }

  await tx.externalIdentifier.create({
    data: {
      compoundId,
      database: identifier.database,
      identifier: identifier.identifier,
      url: identifier.url,
      notes: identifier.notes,
      sourceOriginId: identifier.sourceOriginId
    }
  });
}

async function upsertClassification(tx: Tx, compoundId: string, input: CreateCompoundInput["classifications"][number]) {
  const classification = await tx.chemicalClassification.upsert({
    where: { name: input.name },
    update: {
      vocabulary: input.vocabulary,
      description: input.description
    },
    create: {
      name: input.name,
      vocabulary: input.vocabulary,
      description: input.description
    }
  });

  await tx.compoundClassificationLink.upsert({
    where: {
      compoundId_chemicalClassificationId: {
        compoundId,
        chemicalClassificationId: classification.chemicalClassificationId
      }
    },
    update: {
      sourceOriginId: input.sourceOriginId
    },
    create: {
      compoundId,
      chemicalClassificationId: classification.chemicalClassificationId,
      sourceOriginId: input.sourceOriginId
    }
  });
}

async function persistClassyFire(tx: Tx, compoundId: string, classyFire: NonNullable<CreateCompoundInput["classyFire"]>) {
  const levels = [
    ["kingdom", classyFire.kingdom],
    ["superclass", classyFire.superclass],
    ["class", classyFire.class],
    ["subclass", classyFire.subclass],
    ["directParent", classyFire.directParent],
    ["molecularFramework", classyFire.molecularFramework]
  ] as const;

  for (const [level, name] of levels) {
    if (name) {
      await upsertClassification(tx, compoundId, {
        name,
        vocabulary: `ClassyFire:${level}`,
        description: `ClassyFire ${level}`
      });
    }
  }

  for (const name of classyFire.alternativeParents ?? []) {
    await upsertClassification(tx, compoundId, {
      name,
      vocabulary: "ClassyFire:alternativeParent",
      description: "ClassyFire alternative parent"
    });
  }

  if (classyFire.rawJson !== undefined) {
    await createSourcePayload(tx, compoundId, {
      sourceName: "ClassyFire",
      payloadType: "classyfire_raw_json",
      payload: classyFire.rawJson,
      payloadHash: hashJson(classyFire.rawJson)
    });
  }
}

async function upsertCompoundType(tx: Tx, compoundId: string, input: CreateCompoundInput["compoundTypes"][number]) {
  const compoundType = await tx.compoundType.upsert({
    where: { name: input.name },
    update: {
      description: input.description
    },
    create: {
      name: input.name,
      description: input.description
    }
  });

  await tx.compoundTypeLink.upsert({
    where: {
      compoundId_compoundTypeId: {
        compoundId,
        compoundTypeId: compoundType.compoundTypeId
      }
    },
    update: {
      sourceOriginId: input.sourceOriginId
    },
    create: {
      compoundId,
      compoundTypeId: compoundType.compoundTypeId,
      sourceOriginId: input.sourceOriginId
    }
  });
}

async function upsertDiseasePresence(tx: Tx, compoundId: string, input: CreateCompoundInput["diseasePresence"][number]) {
  const dataset = input.datasetId
    ? await tx.dataset.findUniqueOrThrow({ where: { datasetId: input.datasetId } })
    : await findOrCreateDataset(tx, input.datasetTitle ?? "Manual compound dataset");
  const disease = input.diseaseId
    ? await tx.disease.findUniqueOrThrow({ where: { diseaseId: input.diseaseId } })
    : await tx.disease.upsert({
        where: { name: input.diseaseName ?? "Unknown disease" },
        update: {},
        create: { name: input.diseaseName ?? "Unknown disease", normalizedName: input.diseaseName?.toLowerCase() }
      });

  await tx.datasetDisease.upsert({
    where: {
      datasetId_diseaseId_cohortLabel: {
        datasetId: dataset.datasetId,
        diseaseId: disease.diseaseId,
        cohortLabel: "manual_presence"
      }
    },
    update: {},
    create: {
      datasetId: dataset.datasetId,
      diseaseId: disease.diseaseId,
      cohortLabel: "manual_presence"
    }
  });

  await tx.compoundDiseasePresence.upsert({
    where: {
      compoundId_datasetId_diseaseId: {
        compoundId,
        datasetId: dataset.datasetId,
        diseaseId: disease.diseaseId
      }
    },
    update: {
      observed: input.observed,
      observedCount: input.observedCount,
      totalSamples: input.totalSamples,
      frequency: input.frequency,
      presencePercent: input.presencePercent,
      presenceValueRaw: input.presenceValueRaw,
      sourceFileId: input.sourceFileId,
      evidenceLevel: input.evidenceLevel,
      notes: appendObservationDisclaimer(input.notes),
      deletedAt: null
    },
    create: {
      compoundId,
      datasetId: dataset.datasetId,
      diseaseId: disease.diseaseId,
      observed: input.observed,
      observedCount: input.observedCount,
      totalSamples: input.totalSamples,
      frequency: input.frequency,
      presencePercent: input.presencePercent,
      presenceValueRaw: input.presenceValueRaw,
      sourceFileId: input.sourceFileId,
      evidenceLevel: input.evidenceLevel,
      notes: appendObservationDisclaimer(input.notes)
    }
  });
}

async function upsertRelatedDisease(tx: Tx, compoundId: string, input: CreateCompoundInput["relatedDiseases"][number]) {
  const disease = input.diseaseId
    ? await tx.disease.findUniqueOrThrow({ where: { diseaseId: input.diseaseId } })
    : await tx.disease.upsert({
        where: { name: input.diseaseName ?? "Unknown disease" },
        update: {},
        create: { name: input.diseaseName ?? "Unknown disease", normalizedName: input.diseaseName?.toLowerCase() }
      });

  const related = await tx.compoundRelatedDisease.upsert({
    where: {
      compoundId_diseaseId_assertion: {
        compoundId,
        diseaseId: disease.diseaseId,
        assertion: input.assertion
      }
    },
    update: {
      originalReferenceId: input.originalReferenceId,
      notes: input.notes,
      deletedAt: null
    },
    create: {
      compoundId,
      diseaseId: disease.diseaseId,
      assertion: input.assertion,
      originalReferenceId: input.originalReferenceId,
      notes: input.notes
    }
  });

  for (const source of input.sources ?? []) {
    const sourceOriginId =
      source.sourceOriginId ??
      (
        await tx.sourceOrigin.upsert({
          where: { name_kind: { name: source.name ?? "Manual curation", kind: source.kind } },
          update: {},
          create: { name: source.name ?? "Manual curation", kind: source.kind }
        })
      ).sourceOriginId;

    await tx.relatedDiseaseSource.upsert({
      where: {
        compoundRelatedDiseaseId_sourceOriginId_role: {
          compoundRelatedDiseaseId: related.compoundRelatedDiseaseId,
          sourceOriginId,
          role: source.role
        }
      },
      update: { sourceRecordId: source.sourceRecordId },
      create: {
        compoundRelatedDiseaseId: related.compoundRelatedDiseaseId,
        sourceOriginId,
        role: source.role,
        sourceRecordId: source.sourceRecordId
      }
    });
  }
}

async function findOrCreateDataset(tx: Tx, title: string) {
  const existing = await tx.dataset.findFirst({
    where: {
      title,
      deletedAt: null
    }
  });

  if (existing) return existing;

  return tx.dataset.create({
    data: {
      title,
      name: title,
      datasetType: "manual_compound_presence",
      notes: "Manual dataset presence observations. Observation only; not diagnostic, causal, or confirmed biomarker evidence."
    }
  });
}

async function upsertReference(tx: Tx, compoundId: string, input: CreateCompoundInput["references"][number]) {
  if (!input.title && !input.doi && !input.pmid && !input.url && !input.citationText && !input.citation) {
    return;
  }

  const existing = await findReference(tx, input);
  const data = {
    title: input.title,
    authors: input.authors,
    journal: input.journal,
    year: input.year,
    doi: input.doi,
    pmid: input.pmid,
    url: input.url,
    citationText: input.citationText,
    citation: input.citation
  };
  const reference = existing
    ? await tx.reference.update({ where: { referenceId: existing.referenceId }, data })
    : await tx.reference.create({ data: { referenceType: "article", ...data } });

  await tx.compoundReference.upsert({
    where: {
      compoundId_referenceId_context: {
        compoundId,
        referenceId: reference.referenceId,
        context: input.context ?? "manual"
      }
    },
    update: {},
    create: {
      compoundId,
      referenceId: reference.referenceId,
      context: input.context ?? "manual"
    }
  });
}

async function createEvidenceRecord(tx: Tx, compoundId: string, input: CreateCompoundInput["evidenceRecords"][number]) {
  const existing = await tx.evidenceRecord.findFirst({
    where: {
      compoundId,
      evidenceType: input.evidenceType,
      source: input.source,
      summary: input.summary
    }
  });

  if (existing) {
    await tx.evidenceRecord.update({
      where: { evidenceRecordId: existing.evidenceRecordId },
      data: evidenceData(input)
    });
    return;
  }

  await tx.evidenceRecord.create({
    data: {
      compoundId,
      ...evidenceData(input)
    }
  });
}

function evidenceData(input: CreateCompoundInput["evidenceRecords"][number]) {
  return {
    sourceOriginId: input.sourceOriginId,
    referenceId: input.referenceId,
    evidenceType: input.evidenceType,
    biologicalContext: input.biologicalContext,
    species: input.species,
    humanEvidence: input.humanEvidence,
    evidenceLevel: input.evidenceLevel,
    source: input.source,
    summary: input.summary,
    notes: input.notes,
    rawJson: input.rawJson === undefined ? undefined : (input.rawJson as Prisma.InputJsonValue)
  };
}

async function upsertAnnotationConfidence(
  tx: Tx,
  compoundId: string,
  input: NonNullable<CreateCompoundInput["annotationConfidence"]>
) {
  await tx.annotationConfidence.upsert({
    where: { compoundId },
    update: input,
    create: {
      compoundId,
      ...input
    }
  });
}

async function createArtifactAssessment(tx: Tx, compoundId: string, input: CreateCompoundInput["artifactAssessments"][number]) {
  const existing = await tx.artifactAssessment.findFirst({
    where: {
      compoundId,
      flag: input.flag,
      artifactType: input.artifactType,
      rationale: input.rationale
    }
  });

  if (existing) {
    await tx.artifactAssessment.update({ where: { artifactAssessmentId: existing.artifactAssessmentId }, data: input });
    return;
  }

  await tx.artifactAssessment.create({
    data: {
      compoundId,
      ...input
    }
  });
}

async function upsertPathway(tx: Tx, compoundId: string, input: CreateCompoundInput["pathways"][number]) {
  const existing = await tx.pathway.findFirst({
    where: {
      name: input.name,
      pathwayType: input.pathwayType,
      source: input.source ?? null
    }
  });
  const pathwayData = {
    name: input.name,
    database: input.database,
    pathwayType: input.pathwayType,
    pathwayExternalId: input.pathwayExternalId,
    externalId: input.externalId,
    source: input.source,
    url: input.url,
    organism: input.organism,
    taxonId: input.taxonId,
    biologicalContext: input.biologicalContext
  };
  const pathway = existing
    ? await tx.pathway.update({ where: { pathwayId: existing.pathwayId }, data: pathwayData })
    : await tx.pathway.create({ data: pathwayData });

  await tx.compoundPathway.upsert({
    where: {
      compoundId_pathwayId: {
        compoundId,
        pathwayId: pathway.pathwayId
      }
    },
    update: {
      role: input.role,
      source: input.source,
      evidenceLevel: input.evidenceLevel,
      referenceId: input.referenceId,
      notes: input.notes
    },
    create: {
      compoundId,
      pathwayId: pathway.pathwayId,
      role: input.role,
      source: input.source,
      evidenceLevel: input.evidenceLevel,
      referenceId: input.referenceId,
      notes: input.notes
    }
  });
}

async function upsertTarget(tx: Tx, compoundId: string, input: CreateCompoundInput["targets"][number]) {
  const existing = await tx.target.findFirst({
    where: {
      name: input.name,
      organism: input.organism ?? null
    }
  });
  const targetData = {
    name: input.name,
    geneSymbol: input.geneSymbol,
    uniprotId: input.uniprotId,
    organism: input.organism,
    taxonId: input.taxonId,
    isHuman: input.isHuman,
    targetType: input.targetType,
    description: input.description,
    externalId: input.externalId
  };
  const target = existing
    ? await tx.target.update({ where: { targetId: existing.targetId }, data: targetData })
    : await tx.target.create({ data: targetData });

  await tx.compoundTarget.upsert({
    where: {
      compoundId_targetId_directness: {
        compoundId,
        targetId: target.targetId,
        directness: input.directness
      }
    },
    update: {
      interactionType: input.interactionType,
      evidenceLevel: input.evidenceLevel,
      source: input.source,
      referenceId: input.referenceId,
      sourceOriginId: input.sourceOriginId,
      notes: input.notes,
      rawJson: input.rawJson === undefined ? undefined : (input.rawJson as Prisma.InputJsonValue)
    },
    create: {
      compoundId,
      targetId: target.targetId,
      interactionType: input.interactionType,
      directness: input.directness,
      evidenceLevel: input.evidenceLevel,
      source: input.source,
      referenceId: input.referenceId,
      sourceOriginId: input.sourceOriginId,
      notes: input.notes,
      rawJson: input.rawJson === undefined ? undefined : (input.rawJson as Prisma.InputJsonValue)
    }
  });
}

async function upsertPdbStructure(tx: Tx, compoundId: string, input: CreateCompoundInput["pdbStructures"][number]) {
  const pdb = await tx.pdbStructure.upsert({
    where: { pdbId: input.pdbId.toUpperCase() },
    update: {
      title: input.title,
      method: input.method,
      resolution: input.resolution,
      organism: input.organism,
      url: input.url
    },
    create: {
      pdbId: input.pdbId.toUpperCase(),
      title: input.title,
      method: input.method,
      resolution: input.resolution,
      organism: input.organism,
      url: input.url
    }
  });

  const existing = await tx.compoundPdbStructure.findFirst({
    where: {
      compoundId,
      pdbStructureId: pdb.pdbStructureId,
      ligandId: input.ligandId ?? null,
      chain: input.chain ?? null
    }
  });

  if (existing) {
    await tx.compoundPdbStructure.update({
      where: { compoundPdbStructureId: existing.compoundPdbStructureId },
      data: { source: input.source, notes: input.notes }
    });
    return;
  }

  await tx.compoundPdbStructure.create({
    data: {
      compoundId,
      pdbStructureId: pdb.pdbStructureId,
      ligandId: input.ligandId,
      chain: input.chain,
      source: input.source,
      notes: input.notes
    }
  });
}

async function createNote(tx: Tx, compoundId: string, input: CreateCompoundInput["notes"][number]) {
  const existing = await tx.compoundNote.findFirst({
    where: {
      compoundId,
      noteType: input.noteType ?? "curation_notes",
      note: input.note
    }
  });

  if (!existing) {
    await tx.compoundNote.create({
      data: {
        compoundId,
        noteType: input.noteType,
        note: input.note,
        createdBy: input.createdBy
      }
    });
  }
}

async function createSourcePayload(tx: Tx, compoundId: string, input: CreateCompoundInput["sourcePayloads"][number]) {
  const payloadHash = input.payloadHash ?? hashJson(input.payload);
  const existing = await tx.sourcePayload.findFirst({
    where: {
      compoundId,
      payloadHash
    }
  });

  if (!existing) {
    await tx.sourcePayload.create({
      data: {
        compoundId,
        sourceOriginId: input.sourceOriginId,
        importJobId: input.importJobId,
        sourceName: input.sourceName,
        payloadType: input.payloadType,
        payload: input.payload as Prisma.InputJsonValue,
        payloadHash
      }
    });
  }
}

async function updateSectionEntity(tx: Tx, compoundId: string, section: CompoundSection, entityId: string, input: Record<string, unknown>) {
  switch (section) {
    case "identity":
      await tx.compoundIdentity.update({ where: { compoundId }, data: input });
      return;
    case "names":
      await tx.compoundName.update({ where: { compoundNameId: entityId, compoundId }, data: input });
      return;
    case "external-identifiers":
      await tx.externalIdentifier.update({ where: { externalIdentifierId: entityId, compoundId }, data: input });
      return;
    case "disease-presence":
      await updateDiseasePresence(tx, compoundId, entityId, input);
      return;
    case "related-diseases":
      await updateRelatedDisease(tx, compoundId, entityId, input);
      return;
    case "evidence":
      await tx.evidenceRecord.update({ where: { evidenceRecordId: entityId, compoundId }, data: input });
      return;
    case "annotation-confidence":
      await tx.annotationConfidence.update({ where: { compoundId }, data: input });
      return;
    case "artifact-assessments":
      await tx.artifactAssessment.update({ where: { artifactAssessmentId: entityId, compoundId }, data: input });
      return;
    case "pathways":
      await updateCompoundPathway(tx, compoundId, entityId, input);
      return;
    case "targets":
      await updateCompoundTarget(tx, compoundId, entityId, input);
      return;
    case "pdb-structures":
      await updateCompoundPdbStructure(tx, compoundId, entityId, input);
      return;
    case "notes":
      await tx.compoundNote.update({ where: { compoundNoteId: entityId, compoundId }, data: input });
      return;
    case "classifications":
    case "types":
    case "references":
    case "source-payloads":
      throw new Error(`${section} records are append/link managed; delete and add a new link if needed`);
  }
}

async function updateDiseasePresence(tx: Tx, compoundId: string, entityId: string, input: Record<string, unknown>) {
  const presence = input as Partial<CreateCompoundInput["diseasePresence"][number]>;
  const data: Prisma.CompoundDiseasePresenceUncheckedUpdateInput = {
    observed: presence.observed,
    observedCount: presence.observedCount,
    totalSamples: presence.totalSamples,
    frequency: presence.frequency,
    presencePercent: presence.presencePercent,
    presenceValueRaw: presence.presenceValueRaw,
    sourceFileId: presence.sourceFileId,
    evidenceLevel: presence.evidenceLevel,
    notes: presence.notes ? appendObservationDisclaimer(presence.notes) : undefined
  };

  if (presence.datasetId) {
    data.datasetId = presence.datasetId;
  } else if (presence.datasetTitle) {
    data.datasetId = (await findOrCreateDataset(tx, presence.datasetTitle)).datasetId;
  }

  if (presence.diseaseId) {
    data.diseaseId = presence.diseaseId;
  } else if (presence.diseaseName) {
    data.diseaseId = (
      await tx.disease.upsert({
        where: { name: presence.diseaseName },
        update: {},
        create: { name: presence.diseaseName, normalizedName: presence.diseaseName.toLowerCase() }
      })
    ).diseaseId;
  }

  await tx.compoundDiseasePresence.update({
    where: { compoundDiseasePresenceId: entityId, compoundId },
    data
  });
}

async function updateRelatedDisease(tx: Tx, compoundId: string, entityId: string, input: Record<string, unknown>) {
  const relatedDisease = input as Partial<CreateCompoundInput["relatedDiseases"][number]>;
  const data: Prisma.CompoundRelatedDiseaseUncheckedUpdateInput = {
    assertion: relatedDisease.assertion,
    originalReferenceId: relatedDisease.originalReferenceId,
    notes: relatedDisease.notes
  };

  if (relatedDisease.diseaseId) {
    data.diseaseId = relatedDisease.diseaseId;
  } else if (relatedDisease.diseaseName) {
    data.diseaseId = (
      await tx.disease.upsert({
        where: { name: relatedDisease.diseaseName },
        update: {},
        create: { name: relatedDisease.diseaseName, normalizedName: relatedDisease.diseaseName.toLowerCase() }
      })
    ).diseaseId;
  }

  const saved = await tx.compoundRelatedDisease.update({
    where: { compoundRelatedDiseaseId: entityId, compoundId },
    data
  });

  for (const source of relatedDisease.sources ?? []) {
    const sourceOriginId =
      source.sourceOriginId ??
      (
        await tx.sourceOrigin.upsert({
          where: { name_kind: { name: source.name ?? "Manual curation", kind: source.kind ?? "database" } },
          update: {},
          create: { name: source.name ?? "Manual curation", kind: source.kind ?? "database" }
        })
      ).sourceOriginId;

    await tx.relatedDiseaseSource.upsert({
      where: {
        compoundRelatedDiseaseId_sourceOriginId_role: {
          compoundRelatedDiseaseId: saved.compoundRelatedDiseaseId,
          sourceOriginId,
          role: source.role ?? "secondary"
        }
      },
      update: { sourceRecordId: source.sourceRecordId },
      create: {
        compoundRelatedDiseaseId: saved.compoundRelatedDiseaseId,
        sourceOriginId,
        role: source.role ?? "secondary",
        sourceRecordId: source.sourceRecordId
      }
    });
  }
}

async function updateCompoundPathway(tx: Tx, compoundId: string, entityId: string, input: Record<string, unknown>) {
  const pathway = input as Partial<CreateCompoundInput["pathways"][number]>;
  const link = await tx.compoundPathway.findUniqueOrThrow({
    where: { compoundPathwayId: entityId }
  });
  if (link.compoundId !== compoundId) throw new Error("Pathway link does not belong to compound");

  await tx.pathway.update({
    where: { pathwayId: link.pathwayId },
    data: {
      name: pathway.name,
      database: pathway.database,
      pathwayType: pathway.pathwayType,
      pathwayExternalId: pathway.pathwayExternalId,
      externalId: pathway.externalId,
      source: pathway.source,
      url: pathway.url,
      organism: pathway.organism,
      taxonId: pathway.taxonId,
      biologicalContext: pathway.biologicalContext
    }
  });

  await tx.compoundPathway.update({
    where: { compoundPathwayId: entityId, compoundId },
    data: {
      role: pathway.role,
      source: pathway.source,
      evidenceLevel: pathway.evidenceLevel,
      referenceId: pathway.referenceId,
      notes: pathway.notes
    }
  });
}

async function updateCompoundTarget(tx: Tx, compoundId: string, entityId: string, input: Record<string, unknown>) {
  const target = input as Partial<CreateCompoundInput["targets"][number]>;
  const link = await tx.compoundTarget.findUniqueOrThrow({
    where: { compoundTargetId: entityId }
  });
  if (link.compoundId !== compoundId) throw new Error("Target link does not belong to compound");

  await tx.target.update({
    where: { targetId: link.targetId },
    data: {
      name: target.name,
      geneSymbol: target.geneSymbol,
      uniprotId: target.uniprotId,
      organism: target.organism,
      taxonId: target.taxonId,
      isHuman: target.isHuman,
      targetType: target.targetType,
      description: target.description,
      externalId: target.externalId
    }
  });

  await tx.compoundTarget.update({
    where: { compoundTargetId: entityId, compoundId },
    data: {
      interactionType: target.interactionType,
      directness: target.directness,
      evidenceLevel: target.evidenceLevel,
      source: target.source,
      referenceId: target.referenceId,
      sourceOriginId: target.sourceOriginId,
      notes: target.notes,
      rawJson: target.rawJson === undefined ? undefined : (target.rawJson as Prisma.InputJsonValue)
    }
  });
}

async function updateCompoundPdbStructure(tx: Tx, compoundId: string, entityId: string, input: Record<string, unknown>) {
  const pdb = input as Partial<CreateCompoundInput["pdbStructures"][number]>;
  const link = await tx.compoundPdbStructure.findUniqueOrThrow({
    where: { compoundPdbStructureId: entityId }
  });
  if (link.compoundId !== compoundId) throw new Error("PDB link does not belong to compound");

  await tx.pdbStructure.update({
    where: { pdbStructureId: link.pdbStructureId },
    data: {
      pdbId: pdb.pdbId?.toUpperCase(),
      title: pdb.title,
      method: pdb.method,
      resolution: pdb.resolution,
      organism: pdb.organism,
      url: pdb.url
    }
  });

  await tx.compoundPdbStructure.update({
    where: { compoundPdbStructureId: entityId, compoundId },
    data: {
      ligandId: pdb.ligandId,
      chain: pdb.chain,
      source: pdb.source,
      notes: pdb.notes
    }
  });
}

async function deleteSectionEntity(tx: Tx, compoundId: string, section: CompoundSection, entityId: string) {
  switch (section) {
    case "names":
      await tx.compoundName.delete({ where: { compoundNameId: entityId, compoundId } });
      return;
    case "external-identifiers":
      await tx.externalIdentifier.delete({ where: { externalIdentifierId: entityId, compoundId } });
      return;
    case "classifications":
      await tx.compoundClassificationLink.delete({ where: { compoundClassificationLinkId: entityId, compoundId } });
      return;
    case "types":
      await tx.compoundTypeLink.delete({ where: { compoundTypeLinkId: entityId, compoundId } });
      return;
    case "disease-presence":
      await tx.compoundDiseasePresence.update({ where: { compoundDiseasePresenceId: entityId, compoundId }, data: { deletedAt: new Date() } });
      return;
    case "related-diseases":
      await tx.compoundRelatedDisease.update({ where: { compoundRelatedDiseaseId: entityId, compoundId }, data: { deletedAt: new Date() } });
      return;
    case "references":
      await tx.compoundReference.delete({ where: { compoundReferenceId: entityId, compoundId } });
      return;
    case "evidence":
      await tx.evidenceRecord.delete({ where: { evidenceRecordId: entityId, compoundId } });
      return;
    case "artifact-assessments":
      await tx.artifactAssessment.delete({ where: { artifactAssessmentId: entityId, compoundId } });
      return;
    case "pathways":
      await tx.compoundPathway.delete({ where: { compoundPathwayId: entityId, compoundId } });
      return;
    case "targets":
      await tx.compoundTarget.delete({ where: { compoundTargetId: entityId, compoundId } });
      return;
    case "pdb-structures":
      await tx.compoundPdbStructure.delete({ where: { compoundPdbStructureId: entityId, compoundId } });
      return;
    case "notes":
      await tx.compoundNote.delete({ where: { compoundNoteId: entityId, compoundId } });
      return;
    case "identity":
    case "annotation-confidence":
    case "source-payloads":
      throw new Error(`${section} cannot be deleted from this endpoint`);
  }
}

async function findReference(tx: Tx, reference: CreateCompoundInput["references"][number]) {
  if (reference.doi) return tx.reference.findUnique({ where: { doi: reference.doi } });
  if (reference.pmid) return tx.reference.findFirst({ where: { pmid: reference.pmid } });
  if (reference.url) return tx.reference.findFirst({ where: { url: reference.url } });
  if (reference.title) return tx.reference.findFirst({ where: { title: reference.title } });
  if (reference.citationText) return tx.reference.findFirst({ where: { citationText: reference.citationText } });
  return null;
}

function appendObservationDisclaimer(notes: string | undefined) {
  const disclaimer = "Dataset observation only; not diagnostic, causal, or confirmed biomarker evidence.";
  if (!notes) return disclaimer;
  return notes.includes(disclaimer) ? notes : `${notes} ${disclaimer}`;
}

async function findCompoundInTx(tx: Tx, compoundId: string) {
  return tx.compound.findUnique({
    where: { compoundId },
    include: compoundInclude
  });
}

async function createAudit(
  tx: Tx,
  input: {
    userId?: string;
    compoundId?: string;
    entityName: string;
    entityId: string;
    action: AuditAction;
    before?: unknown;
    after?: unknown;
    metadata?: unknown;
  }
) {
  await tx.auditLog.create({
    data: {
      userId: input.userId,
      compoundId: input.compoundId,
      entityName: input.entityName,
      entityId: input.entityId,
      action: input.action,
      before: input.before === undefined ? undefined : (input.before as Prisma.InputJsonValue),
      after: input.after === undefined ? undefined : (input.after as Prisma.InputJsonValue),
      metadata: input.metadata === undefined ? undefined : (input.metadata as Prisma.InputJsonValue)
    }
  });
}

function hashJson(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
