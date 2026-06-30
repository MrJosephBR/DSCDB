import { z } from "zod";

const optionalText = z.string().trim().min(1).optional();
const optionalJson = z.unknown().optional();

export const externalDatabaseSchema = z.enum([
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
]);

export const compoundCoreSchema = z.object({
  pubchemCid: z.number().int().positive(),
  commonName: optionalText,
  iupacName: optionalText,
  molecularFormula: optionalText,
  molecularWeight: z.coerce.number().positive().optional(),
  annotationSummary: z.string().trim().optional()
});

export const compoundIdentitySchema = z.object({
  formula: optionalText,
  exactMass: z.coerce.number().positive().optional(),
  molecularWeight: z.coerce.number().positive().optional(),
  smiles: optionalText,
  canonicalSmiles: optionalText,
  isomericSmiles: optionalText,
  inchi: optionalText,
  inchiKey: optionalText
});

export const compoundNameSchema = z.object({
  name: z.string().trim().min(1),
  nameType: z.enum(["common", "synonym", "iupac", "trade", "other"]).default("synonym"),
  language: optionalText,
  sourceOriginId: optionalText
});

export const externalIdentifierSchema = z.object({
  database: externalDatabaseSchema,
  identifier: z.string().trim().min(1),
  url: optionalText,
  notes: optionalText,
  sourceOriginId: optionalText
});

export const classyFireSchema = z.object({
  kingdom: optionalText,
  superclass: optionalText,
  class: optionalText,
  subclass: optionalText,
  directParent: optionalText,
  alternativeParents: z.array(z.string().trim().min(1)).default([]),
  molecularFramework: optionalText,
  rawJson: optionalJson
});

export const classificationSchema = z.object({
  name: z.string().trim().min(1),
  vocabulary: optionalText,
  description: optionalText,
  sourceOriginId: optionalText
});

export const compoundTypeSchema = z.object({
  name: z.string().trim().min(1),
  description: optionalText,
  sourceOriginId: optionalText
});

const diseasePresenceBaseSchema = z.object({
    datasetId: optionalText,
    datasetTitle: optionalText,
    diseaseId: optionalText,
    diseaseName: optionalText,
    observed: z.coerce.boolean().optional(),
    observedCount: z.coerce.number().int().nonnegative().optional(),
    totalSamples: z.coerce.number().int().nonnegative().optional(),
    frequency: z.coerce.number().min(0).optional(),
    presencePercent: z.coerce.number().min(0).optional(),
    presenceValueRaw: optionalText,
    sourceFileId: optionalText,
    evidenceLevel: z.enum(["detected", "reported", "curated", "uncertain"]).default("reported"),
    notes: optionalText
  });

export const diseasePresenceSchema = diseasePresenceBaseSchema
  .refine((value) => value.datasetId || value.datasetTitle, "datasetId or datasetTitle is required")
  .refine((value) => value.diseaseId || value.diseaseName, "diseaseId or diseaseName is required");

export const relatedDiseaseSourceSchema = z.object({
  sourceOriginId: optionalText,
  name: optionalText,
  kind: z.enum(["database", "publication", "dataset", "manual_curation", "instrument", "other"]).default("database"),
  role: z.enum(["original", "secondary"]).default("secondary"),
  sourceRecordId: optionalText
});

const relatedDiseaseBaseSchema = z.object({
    diseaseId: optionalText,
    diseaseName: optionalText,
    assertion: z.enum(["associated", "reported", "curated", "uncertain"]).default("reported"),
    originalReferenceId: optionalText,
    sources: z.array(relatedDiseaseSourceSchema).default([]),
    notes: optionalText
  });

export const relatedDiseaseSchema = relatedDiseaseBaseSchema
  .refine((value) => value.diseaseId || value.diseaseName, "diseaseId or diseaseName is required");

export const referenceSchema = z.object({
  title: optionalText,
  authors: optionalText,
  journal: optionalText,
  year: z.coerce.number().int().min(1500).max(3000).optional(),
  doi: optionalText,
  pmid: optionalText,
  url: optionalText,
  citationText: optionalText,
  citation: optionalText,
  context: optionalText
});

export const evidenceRecordSchema = z.object({
  evidenceType: z.string().trim().min(1),
  biologicalContext: optionalText,
  species: optionalText,
  humanEvidence: z.coerce.boolean().default(false),
  evidenceLevel: optionalText,
  source: optionalText,
  sourceOriginId: optionalText,
  referenceId: optionalText,
  summary: optionalText,
  notes: optionalText,
  rawJson: optionalJson
});

export const annotationConfidenceSchema = z.object({
  level: z.enum(["high", "medium", "low", "unknown"]).default("unknown"),
  score: z.coerce.number().min(0).optional(),
  method: optionalText,
  source: optionalText,
  rationale: optionalText,
  notes: optionalText
});

export const artifactAssessmentSchema = z.object({
  flag: z.enum(["likely_artifact", "possible_artifact", "unlikely_artifact", "unknown"]).default("unknown"),
  artifactType: optionalText,
  confidence: optionalText,
  rationale: optionalText,
  source: optionalText,
  notes: optionalText
});

export const pathwaySchema = z.object({
  name: z.string().trim().min(1),
  database: optionalText,
  pathwayType: z.enum(["metabolic", "signaling", "disease", "exposure", "other"]).default("other"),
  pathwayExternalId: optionalText,
  externalId: optionalText,
  source: optionalText,
  url: optionalText,
  organism: optionalText,
  taxonId: optionalText,
  biologicalContext: z
    .enum(["human", "conserved", "microbial", "plant", "non_human", "environmental", "unknown"])
    .default("unknown"),
  role: optionalText,
  evidenceLevel: optionalText,
  referenceId: optionalText,
  notes: optionalText
});

export const targetSchema = z.object({
  name: z.string().trim().min(1),
  geneSymbol: optionalText,
  uniprotId: optionalText,
  organism: optionalText,
  taxonId: optionalText,
  isHuman: z.coerce.boolean().optional(),
  targetType: optionalText,
  description: optionalText,
  externalId: optionalText,
  interactionType: optionalText,
  directness: z.enum(["direct", "indirect", "predicted", "unknown"]).default("unknown"),
  evidenceLevel: optionalText,
  source: optionalText,
  referenceId: optionalText,
  sourceOriginId: optionalText,
  notes: optionalText,
  rawJson: optionalJson
});

export const pdbSchema = z.object({
  pdbId: z.string().trim().min(4),
  title: optionalText,
  method: optionalText,
  resolution: z.coerce.number().positive().optional(),
  organism: optionalText,
  url: optionalText,
  ligandId: optionalText,
  chain: optionalText,
  source: optionalText,
  notes: optionalText
});

export const noteSchema = z.object({
  noteType: optionalText,
  note: z.string().trim().min(1),
  createdBy: optionalText
});

export const sourcePayloadSchema = z.object({
  sourceName: optionalText,
  payloadType: optionalText,
  payload: z.unknown(),
  payloadHash: optionalText,
  sourceOriginId: optionalText,
  importJobId: optionalText
});

export const createCompoundSchema = compoundCoreSchema.extend({
  identity: compoundIdentitySchema.optional(),
  names: z.array(compoundNameSchema).default([]),
  externalIdentifiers: z.array(externalIdentifierSchema).default([]),
  classifications: z.array(classificationSchema).default([]),
  classyFire: classyFireSchema.optional(),
  compoundTypes: z.array(compoundTypeSchema).default([]),
  diseasePresence: z.array(diseasePresenceSchema).default([]),
  relatedDiseases: z.array(relatedDiseaseSchema).default([]),
  references: z.array(referenceSchema).default([]),
  evidenceRecords: z.array(evidenceRecordSchema).default([]),
  annotationConfidence: annotationConfidenceSchema.optional(),
  artifactAssessments: z.array(artifactAssessmentSchema).default([]),
  pathways: z.array(pathwaySchema).default([]),
  targets: z.array(targetSchema).default([]),
  pdbStructures: z.array(pdbSchema).default([]),
  notes: z.array(noteSchema).default([]),
  sourcePayloads: z.array(sourcePayloadSchema).default([])
});

export const updateCompoundSchema = createCompoundSchema.partial().extend({
  pubchemCid: z.number().int().positive().optional()
});

export const sectionSchemas = {
  identity: compoundIdentitySchema,
  names: compoundNameSchema,
  "external-identifiers": externalIdentifierSchema,
  classifications: classificationSchema,
  types: compoundTypeSchema,
  "disease-presence": diseasePresenceSchema,
  "related-diseases": relatedDiseaseSchema,
  references: referenceSchema,
  evidence: evidenceRecordSchema,
  "annotation-confidence": annotationConfidenceSchema,
  "artifact-assessments": artifactAssessmentSchema,
  pathways: pathwaySchema,
  targets: targetSchema,
  "pdb-structures": pdbSchema,
  notes: noteSchema,
  "source-payloads": sourcePayloadSchema
} as const;

export const sectionUpdateSchemas = {
  identity: compoundIdentitySchema.partial(),
  names: compoundNameSchema.partial(),
  "external-identifiers": externalIdentifierSchema.partial(),
  classifications: classificationSchema.partial(),
  types: compoundTypeSchema.partial(),
  "disease-presence": diseasePresenceBaseSchema.partial(),
  "related-diseases": relatedDiseaseBaseSchema.partial(),
  references: referenceSchema.partial(),
  evidence: evidenceRecordSchema.partial(),
  "annotation-confidence": annotationConfidenceSchema.partial(),
  "artifact-assessments": artifactAssessmentSchema.partial(),
  pathways: pathwaySchema.partial(),
  targets: targetSchema.partial(),
  "pdb-structures": pdbSchema.partial(),
  notes: noteSchema.partial()
} as const;

export type CompoundSection = keyof typeof sectionSchemas;
export type CreateCompoundInput = z.infer<typeof createCompoundSchema>;
export type UpdateCompoundInput = z.infer<typeof updateCompoundSchema>;
