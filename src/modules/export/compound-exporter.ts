type AnyCompound = {
  compoundId: string;
  pubchemCid: number;
  commonName: string | null;
  iupacName: string | null;
  molecularFormula: string | null;
  molecularWeight: unknown;
  annotationSummary: string | null;
  updatedAt?: Date | string;
  identity?: {
    inchi?: string | null;
    inchiKey?: string | null;
    smiles?: string | null;
    canonicalSmiles?: string | null;
  } | null;
  names?: Array<{ name: string; nameType: string }>;
  externalIdentifiers?: Array<{ database: string; identifier: string; url: string | null }>;
  classificationLinks?: Array<{
    chemicalClassification: { name: string; vocabulary: string | null; description: string | null };
  }>;
  typeLinks?: Array<{
    compoundType: { name: string; description: string | null };
  }>;
  diseasePresence?: Array<{
    dataset: { datasetId: string; title: string; analyticalPlatform: string | null };
    disease: { diseaseId: string; name: string; ontologyId: string | null };
    evidenceLevel: string;
    frequency: unknown;
    presencePercent: unknown;
    notes: string | null;
  }>;
  relatedDiseases?: Array<{
    disease: { diseaseId: string; name: string; ontologyId: string | null };
    assertion: string;
    notes: string | null;
    originalReference: { referenceId: string; title: string | null; doi: string | null; pmid?: string | null; url: string | null } | null;
    sources: Array<{
      role: string;
      sourceRecordId?: string | null;
      sourceOrigin: { sourceOriginId: string; name: string; kind: string; url: string | null };
    }>;
  }>;
  references?: Array<{
    context: string | null;
    reference: {
      referenceId: string;
      title: string | null;
      doi: string | null;
      pmid: string | null;
      url: string | null;
      citation: string | null;
      year: number | null;
    };
  }>;
  evidenceRecords?: Array<{
    evidenceType: string;
    humanEvidence: boolean;
    summary: string | null;
  }>;
  annotationConfidence?: {
    level: string;
    method: string | null;
    rationale: string | null;
  } | null;
  artifactAssessments?: Array<{
    flag: string;
    rationale: string | null;
  }>;
  pathways?: Array<{
    pathway: {
      name: string;
      pathwayType: string;
      externalId: string | null;
      source: string | null;
    };
  }>;
  targets?: Array<{
    directness: string;
    target: {
      name: string;
      organism: string | null;
      externalId: string | null;
    };
  }>;
  pdbStructures?: Array<{
    ligandId: string | null;
    chain: string | null;
    source: string | null;
    notes: string | null;
    pdbStructure: {
      pdbId: string;
      title: string | null;
      method: string | null;
      resolution: unknown;
      organism: string | null;
      url: string | null;
    };
  }>;
  notes?: Array<{
    note: string;
    createdAt: Date | string;
  }>;
  sourcePayloads?: Array<{
    sourcePayloadId: string;
    payloadHash: string | null;
    createdAt: Date | string;
    sourceOrigin?: { name: string; kind: string } | null;
  }>;
};

export const exportSchemaVersion = "dscdb.viewer.v1";
export const v2ExportSchemaVersion = "DSCDB_COMPOUND_V2";

export function serializeCompoundForLegacyExport(compound: AnyCompound) {
  const externalIdentifiers = compound.externalIdentifiers ?? [];
  const identifierMap = new Map(externalIdentifiers.map((identifier) => [identifier.database, identifier.identifier]));

  return {
    identifiers: {
      pubchem_cid: String(compound.pubchemCid),
      common_name: compound.commonName,
      iupac_name: compound.iupacName,
      formula: compound.molecularFormula,
      molecular_weight: compound.molecularWeight,
      inchikey: compound.identity?.inchiKey ?? identifierMap.get("InChIKey") ?? null,
      smiles: compound.identity?.smiles ?? null,
      canonical_smiles: compound.identity?.canonicalSmiles ?? null,
      inchi: compound.identity?.inchi ?? null,
      hmdb_id: identifierMap.get("HMDB") ?? null,
      kegg_id: identifierMap.get("KEGG") ?? null,
      cas: identifierMap.get("CAS") ?? null,
      chebi: identifierMap.get("ChEBI") ?? null
    },
    compound: {
      compound_id: compound.compoundId,
      pubchem_cid: compound.pubchemCid,
      common_name: compound.commonName,
      iupac_name: compound.iupacName,
      molecular_formula: compound.molecularFormula,
      molecular_weight: compound.molecularWeight,
      annotation_summary: compound.annotationSummary,
      updated_at: toIso(compound.updatedAt)
    },
    names: (compound.names ?? []).map((name) => ({
      name: name.name,
      name_type: name.nameType
    })),
    external_identifiers: externalIdentifiers.map((identifier) => ({
      database: identifier.database,
      identifier: identifier.identifier,
      url: identifier.url
    })),
    classifications: (compound.classificationLinks ?? []).map((link) => ({
      name: link.chemicalClassification.name,
      vocabulary: link.chemicalClassification.vocabulary,
      description: link.chemicalClassification.description
    })),
    compound_types: (compound.typeLinks ?? []).map((link) => ({
      name: link.compoundType.name,
      description: link.compoundType.description
    })),
    dataset_presence: (compound.diseasePresence ?? []).map((presence) => ({
      dataset: {
        dataset_id: presence.dataset.datasetId,
        title: presence.dataset.title,
        analytical_platform: presence.dataset.analyticalPlatform
      },
      disease: {
        disease_id: presence.disease.diseaseId,
        name: presence.disease.name,
        ontology_id: presence.disease.ontologyId
      },
      evidence_level: presence.evidenceLevel,
      frequency: presence.frequency,
      presence_percent: presence.presencePercent,
      notes: presence.notes,
      interpretation: "dataset_observation_only_not_diagnostic_not_causal_not_confirmed_biomarker"
    })),
    related_diseases: (compound.relatedDiseases ?? []).map((relatedDisease) => ({
      disease: {
        disease_id: relatedDisease.disease.diseaseId,
        name: relatedDisease.disease.name,
        ontology_id: relatedDisease.disease.ontologyId
      },
      assertion: relatedDisease.assertion,
      notes: relatedDisease.notes,
      original_reference: relatedDisease.originalReference
        ? {
            reference_id: relatedDisease.originalReference.referenceId,
            title: relatedDisease.originalReference.title,
            doi: relatedDisease.originalReference.doi,
            pmid: relatedDisease.originalReference.pmid ?? null,
            url: relatedDisease.originalReference.url
          }
        : null,
      sources: relatedDisease.sources.map((source) => ({
        role: source.role,
        source_record_id: source.sourceRecordId ?? null,
        source_origin: {
          source_origin_id: source.sourceOrigin.sourceOriginId,
          name: source.sourceOrigin.name,
          kind: source.sourceOrigin.kind,
          url: source.sourceOrigin.url
        }
      }))
    })),
    references: (compound.references ?? []).map((link) => ({
      context: link.context,
      reference_id: link.reference.referenceId,
      title: link.reference.title,
      doi: link.reference.doi,
      pmid: link.reference.pmid,
      url: link.reference.url,
      citation: link.reference.citation,
      year: link.reference.year
    })),
    evidence_records: (compound.evidenceRecords ?? []).map((evidence) => ({
      evidence_type: evidence.evidenceType,
      human_evidence: evidence.humanEvidence,
      summary: evidence.summary
    })),
    annotation_confidence: compound.annotationConfidence
      ? {
          level: compound.annotationConfidence.level,
          method: compound.annotationConfidence.method,
          rationale: compound.annotationConfidence.rationale
        }
      : null,
    artifact_assessments: (compound.artifactAssessments ?? []).map((assessment) => ({
      flag: assessment.flag,
      rationale: assessment.rationale
    })),
    pathways: (compound.pathways ?? []).map((link) => ({
      name: link.pathway.name,
      type: link.pathway.pathwayType,
      external_id: link.pathway.externalId,
      source: link.pathway.source
    })),
    targets: (compound.targets ?? []).map((link) => ({
      name: link.target.name,
      organism: link.target.organism,
      external_id: link.target.externalId,
      directness: link.directness
    })),
    pdb_structures: (compound.pdbStructures ?? []).map((link) => ({
      pdb_id: link.pdbStructure.pdbId,
      title: link.pdbStructure.title,
      method: link.pdbStructure.method,
      resolution: link.pdbStructure.resolution,
      organism: link.pdbStructure.organism,
      url: link.pdbStructure.url,
      ligand_id: link.ligandId,
      chain: link.chain,
      source: link.source,
      notes: link.notes
    })),
    database_notes: (compound.notes ?? []).map((note) => ({
      note: note.note,
      created_at: toIso(note.createdAt)
    })),
    source_payloads: (compound.sourcePayloads ?? []).map((payload) => ({
      source_payload_id: payload.sourcePayloadId,
      payload_hash: payload.payloadHash,
      created_at: toIso(payload.createdAt),
      source: payload.sourceOrigin
        ? {
            name: payload.sourceOrigin.name,
            kind: payload.sourceOrigin.kind
          }
        : null
    }))
  };
}

export function serializeCompoundForExport(compound: AnyCompound) {
  const legacy = serializeCompoundForLegacyExport(compound);

  return {
    identity: {
      pubchem_cid: compound.pubchemCid,
      common_name: compound.commonName,
      iupac_name: compound.iupacName,
      molecular_formula: compound.molecularFormula,
      molecular_weight: compound.molecularWeight,
      inchi: compound.identity?.inchi ?? null,
      inchikey: compound.identity?.inchiKey ?? null,
      smiles: compound.identity?.smiles ?? null,
      canonical_smiles: compound.identity?.canonicalSmiles ?? null
    },
    names: (compound.names ?? []).map((name) => ({
      name: name.name,
      name_type: name.nameType
    })),
    external_identifiers: legacy.external_identifiers,
    classifications: legacy.classifications,
    compound_types: legacy.compound_types,
    dataset_presence: legacy.dataset_presence,
    related_diseases: legacy.related_diseases,
    pathways: legacy.pathways,
    targets: legacy.targets,
    pdb_structures: legacy.pdb_structures,
    evidence_records: legacy.evidence_records,
    references: legacy.references,
    artifact_assessment: legacy.artifact_assessments[0] ?? null,
    annotation_confidence: legacy.annotation_confidence,
    curator_notes: legacy.database_notes.map((note) => ({
      note_type: "curation_notes",
      note: note.note,
      created_at: note.created_at
    })),
    source_payloads: legacy.source_payloads
  };
}

export function serializeCombinedExport(
  compounds: AnyCompound[],
  filters?: Record<string, unknown>,
  format?: "v2"
): {
  schema_version: typeof v2ExportSchemaVersion;
  exported_at: string;
  filters: Record<string, unknown>;
  compounds: Array<ReturnType<typeof serializeCompoundForExport>>;
};
export function serializeCombinedExport(
  compounds: AnyCompound[],
  filters: Record<string, unknown>,
  format: "legacy"
): {
  schema_version: typeof exportSchemaVersion;
  exported_at: string;
  filters: Record<string, unknown>;
  compounds: Array<ReturnType<typeof serializeCompoundForLegacyExport>>;
};
export function serializeCombinedExport(compounds: AnyCompound[], filters: Record<string, unknown> = {}, format: "v2" | "legacy" = "v2") {
  if (format === "legacy") {
    return {
      schema_version: exportSchemaVersion,
      exported_at: new Date().toISOString(),
      filters,
      compounds: compounds.map(serializeCompoundForLegacyExport)
    };
  }

  return {
    schema_version: v2ExportSchemaVersion,
    exported_at: new Date().toISOString(),
    filters,
    compounds: compounds.map(serializeCompoundForExport)
  };
}

function toIso(value: Date | string | undefined) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : value;
}
