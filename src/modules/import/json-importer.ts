import { createHash } from "crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import { z } from "zod";

const presenceDiseaseMap = {
  asthma: "Asthma",
  bronchiectasis: "Bronchiectasis",
  copd: "COPD"
} as const;

type PresenceKey = keyof typeof presenceDiseaseMap;

const identifiersSchema = z
  .object({
    pubchem_cid: z.union([z.string(), z.number()]).optional(),
    common_name: z.string().optional(),
    iupac_name: z.string().optional(),
    formula: z.string().optional(),
    inchikey: z.string().optional(),
    smiles: z.string().optional(),
    hmdb_id: z.string().optional(),
    kegg_id: z.string().optional()
  })
  .passthrough();

const curatedCompoundSchema = z
  .object({
    identifiers: identifiersSchema.optional(),
    database_notes: z.array(z.unknown()).optional(),
    peaktable_presence: z.record(z.union([z.number(), z.string(), z.boolean(), z.null()])).optional(),
    respiratory_relevance: z.unknown().optional(),
    exposure_artifact_assessment: z.unknown().optional()
  })
  .passthrough();

const curatedCompoundFileSchema = z.object({
  compounds: z.array(curatedCompoundSchema)
});

export const compoundJsonImportSchema = z.object({
  pubchem_cid: z.number().int().positive(),
  common_name: z.string().optional(),
  iupac_name: z.string().optional(),
  molecular_formula: z.string().optional(),
  molecular_weight: z.number().optional(),
  names: z.array(z.string()).default([]),
  related_diseases: z.array(z.unknown()).default([]),
  dataset_presence: z.array(z.unknown()).default([]),
  external_identifiers: z.record(z.string()).optional(),
  pathways: z.array(z.unknown()).default([]),
  targets: z.array(z.unknown()).default([])
});

export type CompoundJsonImport = z.infer<typeof compoundJsonImportSchema>;

export type CuratedJsonCompound = z.infer<typeof curatedCompoundSchema>;

export type CuratedCompoundImportItem = {
  index: number;
  pubchemCid: number;
  commonName?: string;
  iupacName?: string;
  formula?: string;
  inchikey?: string;
  smiles?: string;
  hmdbId?: string;
  keggId?: string;
  raw: CuratedJsonCompound;
  rawHash: string;
  notes: string[];
  artifactNote?: string;
  presence: Array<{
    key: PresenceKey;
    diseaseName: string;
    value: number;
  }>;
};

export type CuratedCompoundImportPlan = {
  totalCompounds: number;
  items: CuratedCompoundImportItem[];
  validationErrors: string[];
};

export type CuratedCompoundImportSummary = {
  totalCompounds: number;
  createdCompounds: number;
  updatedCompounds: number;
  skippedCompounds: number;
  validationErrors: string[];
};

export function validateCompoundJsonImport(payload: unknown) {
  return compoundJsonImportSchema.parse(payload);
}

export function parseCuratedCompoundsJson(text: string) {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error("Invalid JSON file");
  }
}

export function validateCuratedCompoundsFile(payload: unknown) {
  const parsed = curatedCompoundFileSchema.safeParse(payload);

  if (!parsed.success) {
    throw new Error("Import file must contain a compounds array");
  }

  return parsed.data;
}

export function buildCuratedCompoundImportPlan(payload: unknown): CuratedCompoundImportPlan {
  const file = validateCuratedCompoundsFile(payload);
  const validationErrors: string[] = [];
  const items: CuratedCompoundImportItem[] = [];

  file.compounds.forEach((compound, index) => {
    const identifiers = compound.identifiers ?? {};
    const pubchemCid = normalizePubChemCid(identifiers.pubchem_cid);

    if (!pubchemCid) {
      validationErrors.push(`compounds[${index}] is missing a valid identifiers.pubchem_cid`);
      return;
    }

    const notes = normalizeNotes(compound);
    const artifactNote = normalizeUnknownBlock("exposure_artifact_assessment", compound.exposure_artifact_assessment);

    items.push({
      index,
      pubchemCid,
      commonName: cleanString(identifiers.common_name),
      iupacName: cleanString(identifiers.iupac_name),
      formula: cleanString(identifiers.formula),
      inchikey: cleanString(identifiers.inchikey),
      smiles: cleanString(identifiers.smiles),
      hmdbId: cleanString(identifiers.hmdb_id),
      keggId: cleanString(identifiers.kegg_id),
      raw: compound,
      rawHash: stablePayloadHash(compound),
      notes,
      artifactNote,
      presence: normalizePeaktablePresence(compound.peaktable_presence)
    });
  });

  return {
    totalCompounds: file.compounds.length,
    items,
    validationErrors
  };
}

export function summarizeImportPlanWithExistingCids(
  plan: CuratedCompoundImportPlan,
  existingPubChemCids: Set<number>
): CuratedCompoundImportSummary {
  return {
    totalCompounds: plan.totalCompounds,
    createdCompounds: plan.items.filter((item) => !existingPubChemCids.has(item.pubchemCid)).length,
    updatedCompounds: plan.items.filter((item) => existingPubChemCids.has(item.pubchemCid)).length,
    skippedCompounds: plan.validationErrors.length,
    validationErrors: [...plan.validationErrors]
  };
}

export async function importCuratedCompoundsJson(
  db: PrismaClient | Prisma.TransactionClient,
  payload: unknown,
  options: { fileName?: string; userId?: string } = {}
): Promise<CuratedCompoundImportSummary> {
  const plan = buildCuratedCompoundImportPlan(payload);
  const summary: CuratedCompoundImportSummary = {
    totalCompounds: plan.totalCompounds,
    createdCompounds: 0,
    updatedCompounds: 0,
    skippedCompounds: plan.validationErrors.length,
    validationErrors: [...plan.validationErrors]
  };

  const sourceOrigin = await db.sourceOrigin.upsert({
    where: {
      name_kind: {
        name: "Curated JSON import",
        kind: "manual_curation"
      }
    },
    update: {},
    create: {
      name: "Curated JSON import",
      kind: "manual_curation",
      description: "Uploaded curated compound JSON file"
    }
  });

  const importJob = await db.importJob.create({
    data: {
      userId: options.userId,
      status: "running",
      fileName: options.fileName,
      startedAt: new Date()
    }
  });

  try {
    for (const item of plan.items) {
      const existing = await db.compound.findUnique({
        where: { pubchemCid: item.pubchemCid },
        select: { compoundId: true }
      });

      const compound = await db.compound.upsert({
        where: { pubchemCid: item.pubchemCid },
        update: {
          commonName: item.commonName,
          iupacName: item.iupacName,
          molecularFormula: item.formula,
          deletedAt: null
        },
        create: {
          pubchemCid: item.pubchemCid,
          commonName: item.commonName,
          iupacName: item.iupacName,
          molecularFormula: item.formula
        }
      });

      if (existing) {
        summary.updatedCompounds += 1;
      } else {
        summary.createdCompounds += 1;
      }

      await db.compoundIdentity.upsert({
        where: { compoundId: compound.compoundId },
        update: {
          inchiKey: item.inchikey,
          smiles: item.smiles
        },
        create: {
          compoundId: compound.compoundId,
          inchiKey: item.inchikey,
          smiles: item.smiles
        }
      });

      await upsertExternalIdentifier(db, compound.compoundId, "PubChem", String(item.pubchemCid), sourceOrigin.sourceOriginId);
      await upsertExternalIdentifier(db, compound.compoundId, "InChIKey", item.inchikey, sourceOrigin.sourceOriginId);
      await upsertExternalIdentifier(db, compound.compoundId, "HMDB", item.hmdbId, sourceOrigin.sourceOriginId);
      await upsertExternalIdentifier(db, compound.compoundId, "KEGG", item.keggId, sourceOrigin.sourceOriginId);

      await db.sourcePayload.create({
        data: {
          compoundId: compound.compoundId,
          sourceOriginId: sourceOrigin.sourceOriginId,
          importJobId: importJob.importJobId,
          payload: item.raw as Prisma.InputJsonValue,
          payloadHash: item.rawHash
        }
      });

      for (const note of item.notes) {
        await createNoteIfMissing(db, compound.compoundId, note);
      }

      if (item.artifactNote) {
        await createArtifactAssessmentIfMissing(db, compound.compoundId, item.artifactNote);
      }

      await importPresenceRecords(db, compound.compoundId, item.presence);

      await db.auditLog.create({
        data: {
          userId: options.userId,
          compoundId: compound.compoundId,
          entityName: "compound",
          entityId: compound.compoundId,
          action: "import",
          metadata: {
            importJobId: importJob.importJobId,
            source: "curated_compounds_json",
            fileName: options.fileName,
            compoundIndex: item.index
          }
        }
      });
    }

    await db.importJob.update({
      where: { importJobId: importJob.importJobId },
      data: {
        status: "completed",
        completedAt: new Date(),
        summary: summary as unknown as Prisma.InputJsonValue
      }
    });

    return summary;
  } catch (error) {
    await db.importJob.update({
      where: { importJobId: importJob.importJobId },
      data: {
        status: "failed",
        completedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : "Unknown import error",
        summary: summary as unknown as Prisma.InputJsonValue
      }
    });

    throw error;
  }
}

function normalizePubChemCid(value: unknown) {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.trim());
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
}

function cleanString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function stablePayloadHash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function normalizeUnknownBlock(label: string, value: unknown) {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === "string") {
    return `[${label}] ${value}`;
  }

  return `[${label}] ${JSON.stringify(value)}`;
}

function normalizeNotes(compound: CuratedJsonCompound) {
  const notes: string[] = [];

  for (const note of compound.database_notes ?? []) {
    notes.push(normalizeUnknownBlock("database_notes", note) ?? "");
  }

  const respiratoryRelevance = normalizeUnknownBlock("respiratory_relevance", compound.respiratory_relevance);
  if (respiratoryRelevance) {
    notes.push(respiratoryRelevance);
  }

  return notes.filter(Boolean);
}

function normalizePeaktablePresence(peaktablePresence: CuratedJsonCompound["peaktable_presence"]) {
  const presence: CuratedCompoundImportItem["presence"] = [];
  const normalizedEntries = new Map<string, unknown>();

  for (const [key, value] of Object.entries(peaktablePresence ?? {})) {
    normalizedEntries.set(key.toLowerCase(), value);
  }

  for (const key of Object.keys(presenceDiseaseMap) as PresenceKey[]) {
    const value = normalizedEntries.get(key);
    const numericValue = typeof value === "number" ? value : typeof value === "string" ? Number(value) : null;

    if (numericValue !== null && Number.isFinite(numericValue) && numericValue > 0) {
      presence.push({
        key,
        diseaseName: presenceDiseaseMap[key],
        value: numericValue
      });
    }
  }

  return presence;
}

async function createArtifactAssessmentIfMissing(
  db: PrismaClient | Prisma.TransactionClient,
  compoundId: string,
  rationale: string
) {
  const existing = await db.artifactAssessment.findFirst({
    where: {
      compoundId,
      rationale
    },
    select: {
      artifactAssessmentId: true
    }
  });

  if (!existing) {
    await db.artifactAssessment.create({
      data: {
        compoundId,
        flag: "unknown",
        rationale
      }
    });
  }
}

async function upsertExternalIdentifier(
  db: PrismaClient | Prisma.TransactionClient,
  compoundId: string,
  database: "PubChem" | "InChIKey" | "HMDB" | "KEGG",
  identifier: string | undefined,
  sourceOriginId: string
) {
  if (!identifier) {
    return;
  }

  await db.externalIdentifier.upsert({
    where: {
      database_identifier: {
        database,
        identifier
      }
    },
    update: {
      compoundId,
      sourceOriginId
    },
    create: {
      compoundId,
      database,
      identifier,
      sourceOriginId
    }
  });
}

async function createNoteIfMissing(db: PrismaClient | Prisma.TransactionClient, compoundId: string, note: string) {
  const existing = await db.compoundNote.findFirst({
    where: {
      compoundId,
      note
    },
    select: {
      compoundNoteId: true
    }
  });

  if (!existing) {
    await db.compoundNote.create({
      data: {
        compoundId,
        note
      }
    });
  }
}

async function importPresenceRecords(
  db: PrismaClient | Prisma.TransactionClient,
  compoundId: string,
  presence: CuratedCompoundImportItem["presence"]
) {
  if (presence.length === 0) {
    return;
  }

  const dataset =
    (await db.dataset.findFirst({
      where: {
        title: "Curated JSON peaktable_presence",
        deletedAt: null
      }
    })) ??
    (await db.dataset.create({
      data: {
      title: "Curated JSON peaktable_presence",
      description: "Dataset-level observations imported from curated JSON peaktable_presence fields. Values are not diagnostic, causal, or confirmed biomarker assertions.",
      analyticalPlatform: "curated-json"
      }
    }));

  for (const record of presence) {
    const disease = await db.disease.upsert({
      where: { name: record.diseaseName },
      update: {},
      create: { name: record.diseaseName }
    });

    await db.datasetDisease.upsert({
      where: {
        datasetId_diseaseId_cohortLabel: {
          datasetId: dataset.datasetId,
          diseaseId: disease.diseaseId,
          cohortLabel: "peaktable_presence"
        }
      },
      update: {},
      create: {
        datasetId: dataset.datasetId,
        diseaseId: disease.diseaseId,
        cohortLabel: "peaktable_presence"
      }
    });

    await db.compoundDiseasePresence.upsert({
      where: {
        compoundId_datasetId_diseaseId: {
          compoundId,
          datasetId: dataset.datasetId,
          diseaseId: disease.diseaseId
        }
      },
      update: {
        evidenceLevel: "reported",
        notes: `Imported peaktable_presence.${record.key}=${record.value}. Dataset observation only; not diagnostic, causal, or a confirmed biomarker assertion.`,
        deletedAt: null
      },
      create: {
        compoundId,
        datasetId: dataset.datasetId,
        diseaseId: disease.diseaseId,
        evidenceLevel: "reported",
        notes: `Imported peaktable_presence.${record.key}=${record.value}. Dataset observation only; not diagnostic, causal, or a confirmed biomarker assertion.`
      }
    });
  }
}
