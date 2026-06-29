import type { CreateCompoundInput } from "./schemas";

export type CompoundDraft = Pick<
  CreateCompoundInput,
  "pubchemCid" | "commonName" | "iupacName" | "molecularFormula" | "annotationSummary"
> & {
  deletedAt?: Date | null;
};

export type PresenceRecord = {
  compoundId: string;
  datasetId: string;
  diseaseId: string;
  evidenceLevel: "detected" | "reported" | "curated" | "uncertain";
  notes?: string;
};

export type RelatedDiseaseDraft = {
  compoundId: string;
  diseaseId: string;
  assertion: "associated" | "reported" | "curated" | "uncertain";
  sources: Array<{
    sourceOriginId: string;
    role: "original" | "secondary";
  }>;
};

export function assertPubChemCidIsAvailable(pubchemCid: number, existingCids: Set<number>) {
  if (existingCids.has(pubchemCid)) {
    throw new Error(`PubChem CID ${pubchemCid} already exists`);
  }
}

export function createCompoundDraft(input: CreateCompoundInput, existingCids = new Set<number>()) {
  assertPubChemCidIsAvailable(input.pubchemCid, existingCids);

  return {
    pubchemCid: input.pubchemCid,
    commonName: input.commonName,
    iupacName: input.iupacName,
    molecularFormula: input.molecularFormula,
    annotationSummary: input.annotationSummary,
    deletedAt: null
  } satisfies CompoundDraft;
}

export function softDeleteEntity<T extends { deletedAt?: Date | null }>(
  entity: T,
  now = new Date()
): Omit<T, "deletedAt"> & { deletedAt: Date } {
  const { deletedAt: _deletedAt, ...rest } = entity;

  return {
    ...rest,
    deletedAt: now
  } as Omit<T, "deletedAt"> & { deletedAt: Date };
}

export function createPresenceRecord(input: PresenceRecord) {
  return {
    compoundId: input.compoundId,
    datasetId: input.datasetId,
    diseaseId: input.diseaseId,
    evidenceLevel: input.evidenceLevel,
    notes: input.notes
  };
}

export function createRelatedDiseaseDraft(input: RelatedDiseaseDraft) {
  if (input.sources.length === 0) {
    throw new Error("Related disease requires at least one original or secondary source");
  }

  return input;
}
