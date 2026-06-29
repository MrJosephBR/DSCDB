type ExportableCompound = {
  compoundId: string;
  pubchemCid: number;
  commonName: string | null;
  iupacName: string | null;
  molecularFormula: string | null;
  molecularWeight: unknown;
  annotationSummary: string | null;
  names?: Array<{ name: string; nameType: string }>;
  externalIdentifiers?: Array<{ database: string; identifier: string; url: string | null }>;
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
    originalReference: { referenceId: string; title: string | null; doi: string | null; url: string | null } | null;
    sources: Array<{
      role: string;
      sourceOrigin: { sourceOriginId: string; name: string; kind: string; url: string | null };
    }>;
  }>;
};

export function serializeCompoundForExport(compound: ExportableCompound) {
  return {
    compound: {
      compound_id: compound.compoundId,
      pubchem_cid: compound.pubchemCid,
      common_name: compound.commonName,
      iupac_name: compound.iupacName,
      molecular_formula: compound.molecularFormula,
      molecular_weight: compound.molecularWeight,
      annotation_summary: compound.annotationSummary
    },
    names: (compound.names ?? []).map((name) => ({
      name: name.name,
      name_type: name.nameType
    })),
    external_identifiers: (compound.externalIdentifiers ?? []).map((identifier) => ({
      database: identifier.database,
      identifier: identifier.identifier,
      url: identifier.url
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
      notes: presence.notes
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
            url: relatedDisease.originalReference.url
          }
        : null,
      sources: relatedDisease.sources.map((source) => ({
        role: source.role,
        source_origin: {
          source_origin_id: source.sourceOrigin.sourceOriginId,
          name: source.sourceOrigin.name,
          kind: source.sourceOrigin.kind,
          url: source.sourceOrigin.url
        }
      }))
    }))
  };
}
