import { createHash } from "crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import { z } from "zod";

const presenceDiseaseMap = {
  asthma: "Asthma",
  bronchiectasis: "Bronchiectasis",
  copd: "COPD"
} as const;

type PresenceKey = keyof typeof presenceDiseaseMap;
type Db = PrismaClient | Prisma.TransactionClient;

const identifiersSchema = z
  .object({
    pubchem_cid: z.union([z.string(), z.number()]).optional(),
    common_name: z.string().optional(),
    iupac_name: z.string().optional(),
    formula: z.string().optional(),
    molecular_formula: z.string().optional(),
    exact_mass: z.union([z.string(), z.number()]).optional(),
    molecular_weight: z.union([z.string(), z.number()]).optional(),
    inchi: z.string().optional(),
    inchikey: z.string().optional(),
    smiles: z.string().optional(),
    canonical_smiles: z.string().optional(),
    isomeric_smiles: z.string().optional(),
    hmdb_id: z.string().optional(),
    kegg_id: z.string().optional(),
    cas: z.string().optional(),
    chebi: z.string().optional(),
    pdb_id: z.string().optional(),
    pathbank_id: z.string().optional(),
    biocyc_id: z.string().optional(),
    plantcyc_id: z.string().optional(),
    drugbank_id: z.string().optional(),
    uniprot_id: z.string().optional(),
    synonyms: z.union([z.string(), z.array(z.string())]).optional()
  })
  .passthrough();

const curatedCompoundSchema = z
  .object({
    identifiers: identifiersSchema.optional(),
    identifier_links: z.unknown().optional(),
    classifications: z.unknown().optional(),
    metabolites: z.unknown().optional(),
    interactions: z.unknown().optional(),
    reactions_pathways: z.unknown().optional(),
    literature_evidence: z.unknown().optional(),
    respiratory_relevance: z.unknown().optional(),
    exposure_artifact_assessment: z.unknown().optional(),
    structures: z.unknown().optional(),
    references: z.array(z.unknown()).optional(),
    database_notes: z.array(z.unknown()).optional(),
    peaktable_presence: z.record(z.union([z.number(), z.string(), z.boolean(), z.null()])).optional(),
    related_diseases: z.unknown().optional(),
    similarity: z.unknown().optional(),
    simcomp: z.unknown().optional()
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

export type ValidationError = {
  index: number;
  pubchemCid?: number;
  message: string;
};

export type CuratedCompoundImportItem = {
  index: number;
  pubchemCid: number;
  commonName?: string;
  iupacName?: string;
  formula?: string;
  molecularWeight?: number;
  exactMass?: number;
  inchikey?: string;
  inchi?: string;
  smiles?: string;
  canonicalSmiles?: string;
  isomericSmiles?: string;
  hmdbId?: string;
  keggId?: string;
  cas?: string;
  chebi?: string;
  pdbId?: string;
  pathbankId?: string;
  biocycId?: string;
  plantcycId?: string;
  drugbankId?: string;
  uniprotId?: string;
  names: string[];
  raw: CuratedJsonCompound;
  rawHash: string;
  notes: string[];
  artifactNote?: string;
  artifactFlag: "likely_artifact" | "possible_artifact" | "unlikely_artifact" | "unknown";
  annotationConfidence?: {
    level: "high" | "medium" | "low" | "unknown";
    method?: string;
    rationale?: string;
  };
  classifications: string[];
  compoundTypes: string[];
  references: NormalizedReference[];
  evidenceRecords: NormalizedEvidence[];
  pathways: NormalizedPathway[];
  targets: NormalizedTarget[];
  pdbStructures: NormalizedPdbStructure[];
  relatedDiseases: NormalizedRelatedDisease[];
  presence: Array<{
    key: PresenceKey;
    diseaseName: string;
    value: number;
  }>;
};

export type NormalizedReference = {
  title?: string;
  doi?: string;
  pmid?: string;
  url?: string;
  citation?: string;
  year?: number;
};

export type NormalizedEvidence = {
  evidenceType: string;
  humanEvidence: boolean;
  summary?: string;
};

export type NormalizedPathway = {
  name: string;
  pathwayType: "metabolic" | "signaling" | "disease" | "exposure" | "other";
  externalId?: string;
  source?: string;
};

export type NormalizedTarget = {
  name: string;
  organism?: string;
  externalId?: string;
  directness: "direct" | "indirect" | "predicted" | "unknown";
};

export type NormalizedPdbStructure = {
  pdbId: string;
  title?: string;
  method?: string;
  resolution?: number;
  organism?: string;
  url?: string;
  ligandId?: string;
  chain?: string;
  source?: string;
  notes?: string;
};

export type NormalizedRelatedDisease = {
  name: string;
  assertion: "associated" | "reported" | "curated" | "uncertain";
  sourceName: string;
  sourceRole: "original" | "secondary";
  sourceRecordId?: string;
  notes?: string;
};

export type CuratedCompoundImportPlan = {
  totalCompounds: number;
  validCompounds: number;
  invalidCompounds: number;
  items: CuratedCompoundImportItem[];
  validationErrors: ValidationError[];
};

export type CuratedCompoundImportSummary = {
  total: number;
  valid: number;
  invalid: number;
  created: number;
  updated: number;
  skipped: number;
  dryRun: boolean;
  validationErrors: ValidationError[];
  totalCompounds: number;
  createdCompounds: number;
  updatedCompounds: number;
  skippedCompounds: number;
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
  const validationErrors: ValidationError[] = [];
  const items: CuratedCompoundImportItem[] = [];
  const seenCids = new Map<number, number>();

  file.compounds.forEach((compound, index) => {
    const identifiers = compound.identifiers ?? {};
    const pubchemCid = normalizePubChemCid(identifiers.pubchem_cid);

    if (!pubchemCid) {
      validationErrors.push({ index, message: "Missing or invalid identifiers.pubchem_cid" });
      return;
    }

    if (seenCids.has(pubchemCid)) {
      validationErrors.push({
        index,
        pubchemCid,
        message: `Duplicate PubChem CID ${pubchemCid} inside uploaded file; first occurrence is compounds[${seenCids.get(pubchemCid)}]`
      });
      return;
    }

    seenCids.set(pubchemCid, index);

    const notes = normalizeNotes(compound);
    const artifactAssessment = normalizeArtifactAssessment(compound.exposure_artifact_assessment);
    const annotationConfidence = normalizeAnnotationConfidence(compound);

    items.push({
      index,
      pubchemCid,
      commonName: cleanString(identifiers.common_name),
      iupacName: cleanString(identifiers.iupac_name),
      formula: cleanString(identifiers.formula) ?? cleanString(identifiers.molecular_formula),
      molecularWeight: normalizeNumber(identifiers.molecular_weight),
      exactMass: normalizeNumber(identifiers.exact_mass),
      inchi: cleanString(identifiers.inchi),
      inchikey: cleanString(identifiers.inchikey),
      smiles: cleanString(identifiers.smiles),
      canonicalSmiles: cleanString(identifiers.canonical_smiles),
      isomericSmiles: cleanString(identifiers.isomeric_smiles),
      hmdbId: cleanString(identifiers.hmdb_id),
      keggId: cleanString(identifiers.kegg_id),
      cas: cleanString(identifiers.cas),
      chebi: normalizeChebi(cleanString(identifiers.chebi)),
      pdbId: cleanString(identifiers.pdb_id),
      pathbankId: cleanString(identifiers.pathbank_id),
      biocycId: cleanString(identifiers.biocyc_id),
      plantcycId: cleanString(identifiers.plantcyc_id),
      drugbankId: cleanString(identifiers.drugbank_id),
      uniprotId: cleanString(identifiers.uniprot_id),
      names: normalizeSynonyms(identifiers.synonyms),
      raw: compound,
      rawHash: stablePayloadHash(compound),
      notes,
      artifactNote: artifactAssessment.rationale,
      artifactFlag: artifactAssessment.flag,
      annotationConfidence,
      classifications: normalizeClassifications(compound.classifications),
      compoundTypes: normalizeCompoundTypes(compound),
      references: normalizeReferences(compound.references),
      evidenceRecords: normalizeEvidence(compound),
      pathways: normalizePathways(compound.reactions_pathways),
      targets: normalizeTargets(compound.interactions),
      pdbStructures: normalizePdbStructures(compound.structures),
      relatedDiseases: normalizeRelatedDiseases(compound),
      presence: normalizePeaktablePresence(compound.peaktable_presence)
    });
  });

  return {
    totalCompounds: file.compounds.length,
    validCompounds: items.length,
    invalidCompounds: validationErrors.length,
    items,
    validationErrors
  };
}

export function summarizeImportPlanWithExistingCids(
  plan: CuratedCompoundImportPlan,
  existingPubChemCids: Set<number>,
  dryRun = true
): CuratedCompoundImportSummary {
  const created = plan.items.filter((item) => !existingPubChemCids.has(item.pubchemCid)).length;
  const updated = plan.items.filter((item) => existingPubChemCids.has(item.pubchemCid)).length;

  return makeSummary({
    total: plan.totalCompounds,
    valid: plan.validCompounds,
    invalid: plan.invalidCompounds,
    created,
    updated,
    skipped: plan.invalidCompounds,
    dryRun,
    validationErrors: plan.validationErrors
  });
}

export async function getDryRunSummary(db: Db, payload: unknown) {
  const plan = buildCuratedCompoundImportPlan(payload);
  const existing = await db.compound.findMany({
    where: {
      pubchemCid: { in: plan.items.map((item) => item.pubchemCid) }
    },
    select: {
      pubchemCid: true
    }
  });

  return summarizeImportPlanWithExistingCids(plan, new Set(existing.map((compound) => compound.pubchemCid)), true);
}

export async function importCuratedCompoundsJson(
  db: Db,
  payload: unknown,
  options: { fileName?: string; userId?: string; dryRun?: boolean } = {}
): Promise<CuratedCompoundImportSummary> {
  if (options.dryRun) {
    return getDryRunSummary(db, payload);
  }

  const plan = buildCuratedCompoundImportPlan(payload);
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

  const summary = makeSummary({
    total: plan.totalCompounds,
    valid: plan.validCompounds,
    invalid: plan.invalidCompounds,
    created: 0,
    updated: 0,
    skipped: plan.invalidCompounds,
    dryRun: false,
    validationErrors: [...plan.validationErrors]
  });

  for (const item of plan.items) {
    try {
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
          molecularWeight: item.molecularWeight,
          deletedAt: null
        },
        create: {
          pubchemCid: item.pubchemCid,
          commonName: item.commonName,
          iupacName: item.iupacName,
          molecularFormula: item.formula,
          molecularWeight: item.molecularWeight
        }
      });

      if (existing) {
        summary.updated += 1;
        summary.updatedCompounds += 1;
      } else {
        summary.created += 1;
        summary.createdCompounds += 1;
      }

      await persistCompoundDetails(db, item, compound.compoundId, sourceOrigin.sourceOriginId, importJob.importJobId);
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
    } catch (error) {
      summary.skipped += 1;
      summary.skippedCompounds += 1;
      summary.validationErrors.push({
        index: item.index,
        pubchemCid: item.pubchemCid,
        message: error instanceof Error ? error.message : "Unknown compound import error"
      });
    }
  }

  await db.importJob.update({
    where: { importJobId: importJob.importJobId },
    data: {
      status: summary.validationErrors.length > plan.validationErrors.length ? "failed" : "completed",
      completedAt: new Date(),
      summary: summary as unknown as Prisma.InputJsonValue,
      errorMessage: summary.validationErrors.length > plan.validationErrors.length ? "One or more compounds failed to import" : undefined
    }
  });

  return summary;
}

async function persistCompoundDetails(
  db: Db,
  item: CuratedCompoundImportItem,
  compoundId: string,
  sourceOriginId: string,
  importJobId: string
) {
  await db.compoundIdentity.upsert({
    where: { compoundId },
    update: {
      formula: item.formula,
      exactMass: item.exactMass,
      molecularWeight: item.molecularWeight,
      inchi: item.inchi,
      inchiKey: item.inchikey,
      smiles: item.smiles,
      canonicalSmiles: item.canonicalSmiles,
      isomericSmiles: item.isomericSmiles
    },
    create: {
      compoundId,
      formula: item.formula,
      exactMass: item.exactMass,
      molecularWeight: item.molecularWeight,
      inchi: item.inchi,
      inchiKey: item.inchikey,
      smiles: item.smiles,
      canonicalSmiles: item.canonicalSmiles,
      isomericSmiles: item.isomericSmiles
    }
  });

  await upsertExternalIdentifier(db, compoundId, "PubChem", String(item.pubchemCid), sourceOriginId);
  await upsertExternalIdentifier(db, compoundId, "InChI", item.inchi, sourceOriginId);
  await upsertExternalIdentifier(db, compoundId, "InChIKey", item.inchikey, sourceOriginId);
  await upsertExternalIdentifier(db, compoundId, "SMILES", item.smiles, sourceOriginId);
  await upsertExternalIdentifier(db, compoundId, "HMDB", item.hmdbId, sourceOriginId);
  await upsertExternalIdentifier(db, compoundId, "KEGG", item.keggId, sourceOriginId);
  await upsertExternalIdentifier(db, compoundId, "CAS", item.cas, sourceOriginId);
  await upsertExternalIdentifier(db, compoundId, "ChEBI", item.chebi, sourceOriginId);
  await upsertExternalIdentifier(db, compoundId, "PDB", item.pdbId, sourceOriginId);
  await upsertExternalIdentifier(db, compoundId, "PathBank", item.pathbankId, sourceOriginId);
  await upsertExternalIdentifier(db, compoundId, "BioCyc", item.biocycId, sourceOriginId);
  await upsertExternalIdentifier(db, compoundId, "PlantCyc", item.plantcycId, sourceOriginId);
  await upsertExternalIdentifier(db, compoundId, "DrugBank", item.drugbankId, sourceOriginId);
  await upsertExternalIdentifier(db, compoundId, "UniProt", item.uniprotId, sourceOriginId);

  await db.sourcePayload.create({
    data: {
      compoundId,
      sourceOriginId,
      importJobId,
      sourceName: "Curated JSON import",
      payloadType: "compound_json",
      payload: item.raw as Prisma.InputJsonValue,
      payloadHash: item.rawHash
    }
  });

  for (const name of [item.commonName, item.iupacName].filter(Boolean) as string[]) {
    await upsertCompoundName(db, compoundId, name, name === item.iupacName ? "iupac" : "common", sourceOriginId);
  }

  for (const name of item.names) {
    await upsertCompoundName(db, compoundId, name, "synonym", sourceOriginId);
  }

  for (const classificationName of item.classifications) {
    const classification = await db.chemicalClassification.upsert({
      where: { name: classificationName },
      update: {},
      create: {
        name: classificationName,
        vocabulary: "ClassyFire/curated-json"
      }
    });

    await db.compoundClassificationLink.upsert({
      where: {
        compoundId_chemicalClassificationId: {
          compoundId,
          chemicalClassificationId: classification.chemicalClassificationId
        }
      },
      update: { sourceOriginId },
      create: {
        compoundId,
        chemicalClassificationId: classification.chemicalClassificationId,
        sourceOriginId
      }
    });
  }

  for (const typeName of item.compoundTypes) {
    const compoundType = await db.compoundType.upsert({
      where: { name: typeName },
      update: {},
      create: {
        name: typeName
      }
    });

    await db.compoundTypeLink.upsert({
      where: {
        compoundId_compoundTypeId: {
          compoundId,
          compoundTypeId: compoundType.compoundTypeId
        }
      },
      update: { sourceOriginId },
      create: {
        compoundId,
        compoundTypeId: compoundType.compoundTypeId,
        sourceOriginId
      }
    });
  }

  for (const note of item.notes) {
    await createNoteIfMissing(db, compoundId, note);
  }

  if (item.artifactNote) {
    await createArtifactAssessmentIfMissing(db, compoundId, item.artifactFlag, item.artifactNote);
  }

  if (item.annotationConfidence) {
    await db.annotationConfidence.upsert({
      where: { compoundId },
      update: item.annotationConfidence,
      create: {
        compoundId,
        ...item.annotationConfidence
      }
    });
  }

  for (const reference of item.references) {
    await upsertReference(db, compoundId, reference);
  }

  for (const evidence of item.evidenceRecords) {
    await createEvidenceIfMissing(db, compoundId, evidence, sourceOriginId);
  }

  for (const pathway of item.pathways) {
    await upsertPathway(db, compoundId, pathway);
  }

  for (const target of item.targets) {
    await upsertTarget(db, compoundId, target);
  }

  for (const pdbStructure of item.pdbStructures) {
    await upsertPdbStructure(db, compoundId, pdbStructure);
  }

  for (const relatedDisease of item.relatedDiseases) {
    await upsertRelatedDisease(db, compoundId, relatedDisease);
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

function normalizeNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function cleanString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function normalizeChebi(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  return value.startsWith("CHEBI:") ? value : `CHEBI:${value}`;
}

function normalizeSynonyms(value: unknown) {
  if (typeof value === "string") {
    return uniqueStrings(value.split(/[;\n|]/));
  }

  if (Array.isArray(value)) {
    return uniqueStrings(value.filter((item): item is string => typeof item === "string"));
  }

  return [];
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

  for (const [label, value] of [
    ["respiratory_relevance", compound.respiratory_relevance],
    ["pdb_structures", compound.structures],
    ["similarity", compound.similarity ?? compound.simcomp]
  ] as const) {
    const note = normalizeUnknownBlock(label, value);
    if (note) {
      notes.push(note);
    }
  }

  return uniqueStrings(notes.filter(Boolean));
}

function normalizeArtifactAssessment(value: unknown): {
  flag: "likely_artifact" | "possible_artifact" | "unlikely_artifact" | "unknown";
  rationale?: string;
} {
  const text = typeof value === "string" ? value : JSON.stringify(value ?? "");
  const lower = text.toLowerCase();

  let flag: "likely_artifact" | "possible_artifact" | "unlikely_artifact" | "unknown" = "unknown";
  if (lower.includes("likely") && (lower.includes("artifact") || lower.includes("contaminant"))) {
    flag = "likely_artifact";
  } else if (lower.includes("possible") || lower.includes("suspect")) {
    flag = "possible_artifact";
  } else if (lower.includes("unlikely") || lower.includes("not artifact")) {
    flag = "unlikely_artifact";
  }

  return {
    flag,
    rationale: normalizeUnknownBlock("exposure_artifact_assessment", value)
  };
}

function normalizeAnnotationConfidence(compound: CuratedJsonCompound) {
  const text = JSON.stringify(compound).toLowerCase();
  const confidenceBlock = findFirstRecordByKey(compound, "confidence") ?? findFirstRecordByKey(compound, "annotation_confidence");
  const confidenceText = JSON.stringify(confidenceBlock ?? text).toLowerCase();

  let level: "high" | "medium" | "low" | "unknown" = "unknown";
  if (confidenceText.includes("high")) level = "high";
  else if (confidenceText.includes("medium") || confidenceText.includes("moderate")) level = "medium";
  else if (confidenceText.includes("low")) level = "low";

  if (level === "unknown" && !confidenceBlock) {
    return undefined;
  }

  return {
    level,
    method: isRecord(confidenceBlock) ? cleanString(confidenceBlock.method) : undefined,
    rationale: normalizeUnknownBlock("annotation_confidence", confidenceBlock ?? text)
  };
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

function normalizeClassifications(value: unknown) {
  const strings = collectStrings(value);
  return uniqueStrings(strings.map((item) => item.trim()).filter(Boolean));
}

function normalizeCompoundTypes(compound: CuratedJsonCompound) {
  const raw = `${JSON.stringify(compound.metabolites ?? {})} ${JSON.stringify(compound.exposure_artifact_assessment ?? {})} ${JSON.stringify(compound.classifications ?? {})}`.toLowerCase();
  const types = new Set<string>();

  for (const type of ["endogenous", "exogenous", "microbial", "unknown"]) {
    if (raw.includes(type)) {
      types.add(type);
    }
  }

  if (raw.includes("artifact") || raw.includes("contaminant")) {
    types.add("artifact/contaminant");
  }

  if (types.size === 0) {
    types.add("unknown");
  }

  return [...types];
}

function normalizeReferences(value: unknown) {
  const references = Array.isArray(value) ? value : [];

  return references
    .map((reference): NormalizedReference | null => {
      if (typeof reference === "string") {
        return { citation: reference };
      }

      if (!isRecord(reference)) {
        return null;
      }

      return {
        title: cleanString(reference.title),
        doi: cleanString(reference.doi),
        pmid: cleanString(reference.pmid) ?? cleanString(reference.pubmed_id),
        url: cleanString(reference.url) ?? cleanString(reference.link),
        citation: cleanString(reference.citation) ?? cleanString(reference.reference),
        year: normalizeNumber(reference.year)
      };
    })
    .filter((reference): reference is NormalizedReference => Boolean(reference));
}

function normalizeEvidence(compound: CuratedJsonCompound) {
  const evidence: NormalizedEvidence[] = [];

  for (const [type, value] of [
    ["literature_evidence", compound.literature_evidence],
    ["respiratory_relevance", compound.respiratory_relevance]
  ] as const) {
    const summary = normalizeUnknownBlock(type, value);
    if (summary) {
      evidence.push({
        evidenceType: type,
        humanEvidence: JSON.stringify(value ?? "").toLowerCase().includes("human"),
        summary
      });
    }
  }

  return evidence;
}

function normalizePathways(value: unknown) {
  const records = collectRecords(value);

  return records
    .map((record): NormalizedPathway | null => {
      const name = cleanString(record.name) ?? cleanString(record.pathway) ?? cleanString(record.title);
      if (!name) {
        return null;
      }

      return {
        name,
        pathwayType: normalizePathwayType(cleanString(record.type) ?? cleanString(record.pathway_type) ?? JSON.stringify(record)),
        externalId: cleanString(record.external_id) ?? cleanString(record.id) ?? cleanString(record.kegg_id),
        source: cleanString(record.source) ?? cleanString(record.database) ?? cleanString(record.resource)
      };
    })
    .filter((pathway): pathway is NormalizedPathway => Boolean(pathway));
}

function normalizeTargets(value: unknown) {
  const records = collectRecords(value);

  return records
    .map((record): NormalizedTarget | null => {
      const name = cleanString(record.name) ?? cleanString(record.target) ?? cleanString(record.protein);
      if (!name) {
        return null;
      }

      return {
        name,
        organism: cleanString(record.organism) ?? cleanString(record.species),
        externalId: cleanString(record.external_id) ?? cleanString(record.id) ?? cleanString(record.uniprot),
        directness: normalizeDirectness(cleanString(record.directness) ?? cleanString(record.relationship) ?? JSON.stringify(record))
      };
    })
    .filter((target): target is NormalizedTarget => Boolean(target));
}

function normalizePdbStructures(value: unknown) {
  const records = collectRecords(value);

  return records
    .map((record): NormalizedPdbStructure | null => {
      const pdbId = cleanString(record.pdb_id) ?? cleanString(record.pdbId) ?? cleanString(record.id);
      if (!pdbId) {
        return null;
      }

      return {
        pdbId: pdbId.toUpperCase(),
        title: cleanString(record.title) ?? cleanString(record.name),
        method: cleanString(record.method),
        resolution: normalizeNumber(record.resolution),
        organism: cleanString(record.organism) ?? cleanString(record.species),
        url: cleanString(record.url),
        ligandId: cleanString(record.ligand_id) ?? cleanString(record.ligand),
        chain: cleanString(record.chain),
        source: cleanString(record.source) ?? "Curated JSON import",
        notes: normalizeUnknownBlock("pdb_structure", record)
      };
    })
    .filter((structure): structure is NormalizedPdbStructure => Boolean(structure));
}

function normalizeRelatedDiseases(compound: CuratedJsonCompound) {
  const values = Array.isArray(compound.related_diseases) ? compound.related_diseases : collectRecords(compound.related_diseases);

  return values
    .map((record): NormalizedRelatedDisease | null => {
      if (typeof record === "string") {
        return {
          name: record,
          assertion: "reported",
          sourceName: "Curated JSON import",
          sourceRole: "secondary",
          notes: "Imported as related disease from curated JSON; not dataset presence."
        };
      }

      if (!isRecord(record)) {
        return null;
      }

      const name = cleanString(record.name) ?? cleanString(record.disease) ?? cleanString(record.label);
      if (!name) {
        return null;
      }

      const sourceName = cleanString(record.source) ?? cleanString(record.database) ?? "Curated JSON import";
      return {
        name,
        assertion: "reported",
        sourceName,
        sourceRole: sourceName === "Curated JSON import" ? "secondary" : "original",
        sourceRecordId: cleanString(record.source_record_id) ?? cleanString(record.id),
        notes: cleanString(record.notes) ?? normalizeUnknownBlock("related_disease", record)
      };
    })
    .filter((disease): disease is NormalizedRelatedDisease => Boolean(disease));
}

function normalizePathwayType(value: string | undefined): NormalizedPathway["pathwayType"] {
  const lower = (value ?? "").toLowerCase();

  if (lower.includes("metabolic") || lower.includes("metabolism")) return "metabolic";
  if (lower.includes("signaling")) return "signaling";
  if (lower.includes("disease")) return "disease";
  if (lower.includes("exposure")) return "exposure";
  return "other";
}

function normalizeDirectness(value: string | undefined): NormalizedTarget["directness"] {
  const lower = (value ?? "").toLowerCase();

  if (lower.includes("direct")) return "direct";
  if (lower.includes("indirect")) return "indirect";
  if (lower.includes("predict")) return "predicted";
  return "unknown";
}

function collectRecords(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) {
    return value.flatMap(collectRecords);
  }

  if (isRecord(value)) {
    const nested = Object.values(value).flatMap(collectRecords);
    return nested.length > 0 ? nested : [value];
  }

  return [];
}

function collectStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(collectStrings);
  if (isRecord(value)) return Object.values(value).flatMap(collectStrings);
  return [];
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function findFirstRecordByKey(value: unknown, needle: string): Record<string, unknown> | undefined {
  if (!isRecord(value)) return undefined;

  for (const [key, child] of Object.entries(value)) {
    if (key.toLowerCase().includes(needle) && isRecord(child)) {
      return child;
    }

    const nested = findFirstRecordByKey(child, needle);
    if (nested) {
      return nested;
    }
  }

  return undefined;
}

function makeSummary(input: Omit<CuratedCompoundImportSummary, "totalCompounds" | "createdCompounds" | "updatedCompounds" | "skippedCompounds">): CuratedCompoundImportSummary {
  return {
    ...input,
    totalCompounds: input.total,
    createdCompounds: input.created,
    updatedCompounds: input.updated,
    skippedCompounds: input.skipped
  };
}

async function upsertExternalIdentifier(
  db: Db,
  compoundId: string,
  database:
    | "PubChem"
    | "InChI"
    | "InChIKey"
    | "SMILES"
    | "HMDB"
    | "KEGG"
    | "CAS"
    | "ChEBI"
    | "PDB"
    | "PathBank"
    | "BioCyc"
    | "PlantCyc"
    | "DrugBank"
    | "UniProt",
  identifier: string | undefined,
  sourceOriginId: string
) {
  if (!identifier) return;

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

async function upsertPdbStructure(db: Db, compoundId: string, pdbStructure: NormalizedPdbStructure) {
  const saved = await db.pdbStructure.upsert({
    where: { pdbId: pdbStructure.pdbId },
    update: {
      title: pdbStructure.title,
      method: pdbStructure.method,
      resolution: pdbStructure.resolution,
      organism: pdbStructure.organism,
      url: pdbStructure.url
    },
    create: {
      pdbId: pdbStructure.pdbId,
      title: pdbStructure.title,
      method: pdbStructure.method,
      resolution: pdbStructure.resolution,
      organism: pdbStructure.organism,
      url: pdbStructure.url
    }
  });

  const existing = await db.compoundPdbStructure.findFirst({
    where: {
      compoundId,
      pdbStructureId: saved.pdbStructureId,
      ligandId: pdbStructure.ligandId ?? null,
      chain: pdbStructure.chain ?? null
    },
    select: { compoundPdbStructureId: true }
  });

  if (existing) {
    await db.compoundPdbStructure.update({
      where: { compoundPdbStructureId: existing.compoundPdbStructureId },
      data: {
        source: pdbStructure.source,
        notes: pdbStructure.notes
      }
    });
    return;
  }

  await db.compoundPdbStructure.create({
    data: {
      compoundId,
      pdbStructureId: saved.pdbStructureId,
      ligandId: pdbStructure.ligandId,
      chain: pdbStructure.chain,
      source: pdbStructure.source,
      notes: pdbStructure.notes
    }
  });
}

async function upsertCompoundName(db: Db, compoundId: string, name: string, nameType: "common" | "iupac" | "synonym", sourceOriginId: string) {
  await db.compoundName.upsert({
    where: {
      compoundId_name_nameType: {
        compoundId,
        name,
        nameType
      }
    },
    update: { sourceOriginId },
    create: {
      compoundId,
      name,
      nameType,
      sourceOriginId
    }
  });
}

async function createArtifactAssessmentIfMissing(
  db: Db,
  compoundId: string,
  flag: "likely_artifact" | "possible_artifact" | "unlikely_artifact" | "unknown",
  rationale: string
) {
  const existing = await db.artifactAssessment.findFirst({
    where: { compoundId, rationale },
    select: { artifactAssessmentId: true }
  });

  if (!existing) {
    await db.artifactAssessment.create({
      data: {
        compoundId,
        flag,
        rationale
      }
    });
  }
}

async function createNoteIfMissing(db: Db, compoundId: string, note: string) {
  const existing = await db.compoundNote.findFirst({
    where: { compoundId, note },
    select: { compoundNoteId: true }
  });

  if (!existing) {
    await db.compoundNote.create({ data: { compoundId, note } });
  }
}

async function upsertReference(db: Db, compoundId: string, reference: NormalizedReference) {
  const existing = await findReference(db, reference);
  const saved = existing
    ? await db.reference.update({
        where: { referenceId: existing.referenceId },
        data: reference
      })
    : await db.reference.create({
        data: {
          referenceType: "article",
          ...reference
        }
      });

  await db.compoundReference.upsert({
    where: {
      compoundId_referenceId_context: {
        compoundId,
        referenceId: saved.referenceId,
        context: "curated-json"
      }
    },
    update: {},
    create: {
      compoundId,
      referenceId: saved.referenceId,
      context: "curated-json"
    }
  });
}

async function findReference(db: Db, reference: NormalizedReference) {
  if (reference.doi) {
    return db.reference.findUnique({ where: { doi: reference.doi } });
  }

  if (reference.pmid) {
    return db.reference.findFirst({ where: { pmid: reference.pmid } });
  }

  if (reference.url) {
    return db.reference.findFirst({ where: { url: reference.url } });
  }

  if (reference.title) {
    return db.reference.findFirst({ where: { title: reference.title } });
  }

  return null;
}

async function createEvidenceIfMissing(db: Db, compoundId: string, evidence: NormalizedEvidence, sourceOriginId: string) {
  const existing = await db.evidenceRecord.findFirst({
    where: {
      compoundId,
      evidenceType: evidence.evidenceType,
      summary: evidence.summary
    },
    select: {
      evidenceRecordId: true
    }
  });

  if (!existing) {
    await db.evidenceRecord.create({
      data: {
        compoundId,
        sourceOriginId,
        evidenceType: evidence.evidenceType,
        humanEvidence: evidence.humanEvidence,
        summary: evidence.summary
      }
    });
  }
}

async function upsertPathway(db: Db, compoundId: string, pathway: NormalizedPathway) {
  const existing = await db.pathway.findFirst({
    where: {
      name: pathway.name,
      pathwayType: pathway.pathwayType,
      source: pathway.source ?? null
    }
  });
  const saved = existing
    ? await db.pathway.update({
        where: { pathwayId: existing.pathwayId },
        data: { externalId: pathway.externalId }
      })
    : await db.pathway.create({ data: pathway });

  await db.compoundPathway.upsert({
    where: {
      compoundId_pathwayId: {
        compoundId,
        pathwayId: saved.pathwayId
      }
    },
    update: {},
    create: {
      compoundId,
      pathwayId: saved.pathwayId
    }
  });
}

async function upsertTarget(db: Db, compoundId: string, target: NormalizedTarget) {
  const existing = await db.target.findFirst({
    where: {
      name: target.name,
      organism: target.organism ?? null
    }
  });
  const saved = existing
    ? await db.target.update({
        where: { targetId: existing.targetId },
        data: { externalId: target.externalId }
      })
    : await db.target.create({
        data: {
          name: target.name,
          organism: target.organism,
          externalId: target.externalId
        }
      });

  await db.compoundTarget.upsert({
    where: {
      compoundId_targetId_directness: {
        compoundId,
        targetId: saved.targetId,
        directness: target.directness
      }
    },
    update: {},
    create: {
      compoundId,
      targetId: saved.targetId,
      directness: target.directness
    }
  });
}

async function upsertRelatedDisease(db: Db, compoundId: string, relatedDisease: NormalizedRelatedDisease) {
  const disease = await db.disease.upsert({
    where: { name: relatedDisease.name },
    update: {},
    create: { name: relatedDisease.name }
  });
  const sourceOrigin = await db.sourceOrigin.upsert({
    where: {
      name_kind: {
        name: relatedDisease.sourceName,
        kind: "database"
      }
    },
    update: {},
    create: {
      name: relatedDisease.sourceName,
      kind: "database"
    }
  });

  const saved = await db.compoundRelatedDisease.upsert({
    where: {
      compoundId_diseaseId_assertion: {
        compoundId,
        diseaseId: disease.diseaseId,
        assertion: relatedDisease.assertion
      }
    },
    update: {
      notes: relatedDisease.notes,
      deletedAt: null
    },
    create: {
      compoundId,
      diseaseId: disease.diseaseId,
      assertion: relatedDisease.assertion,
      notes: relatedDisease.notes
    }
  });

  await db.relatedDiseaseSource.upsert({
    where: {
      compoundRelatedDiseaseId_sourceOriginId_role: {
        compoundRelatedDiseaseId: saved.compoundRelatedDiseaseId,
        sourceOriginId: sourceOrigin.sourceOriginId,
        role: relatedDisease.sourceRole
      }
    },
    update: {
      sourceRecordId: relatedDisease.sourceRecordId
    },
    create: {
      compoundRelatedDiseaseId: saved.compoundRelatedDiseaseId,
      sourceOriginId: sourceOrigin.sourceOriginId,
      role: relatedDisease.sourceRole,
      sourceRecordId: relatedDisease.sourceRecordId
    }
  });
}

async function importPresenceRecords(db: Db, compoundId: string, presence: CuratedCompoundImportItem["presence"]) {
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
        description:
          "Dataset-level observations imported from curated JSON peaktable_presence fields. Values are not diagnostic, causal, or confirmed biomarker assertions.",
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
