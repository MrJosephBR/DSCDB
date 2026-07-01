import { createHash } from "crypto";

export const DSCDB_JSON_V2_SCHEMA_VERSION = "DSCDB_COMPOUND_V2";

export type DscdbJsonFormat = "dscdb_json_v2" | "legacy_dscdb_json_v1";

export type NormalizedCompoundV2Dto = {
  index: number;
  detected_format: DscdbJsonFormat;
  identity: {
    pubchem_cid: number;
    common_name?: string;
    iupac_name?: string;
    formula?: string;
    molecular_formula?: string;
    molecular_weight?: number;
    exact_mass?: number;
    inchi?: string;
    inchikey?: string;
    smiles?: string;
    canonical_smiles?: string;
    isomeric_smiles?: string;
  };
  names: Array<{ name: string; name_type: "common" | "iupac" | "synonym" | "trade" | "other"; language?: string }>;
  external_identifiers: NormalizedExternalIdentifierDto[];
  classifications: Array<{ name: string; vocabulary?: string; description?: string }>;
  compound_types: Array<{ name: string; description?: string }>;
  dataset_presence: NormalizedDatasetPresenceDto[];
  related_diseases: NormalizedRelatedDiseaseDto[];
  pathways: NormalizedPathwayDto[];
  targets: NormalizedTargetDto[];
  pdb_structures: NormalizedPdbStructureDto[];
  evidence_records: NormalizedEvidenceDto[];
  references: NormalizedReferenceDto[];
  artifact_assessment?: NormalizedArtifactAssessmentDto;
  annotation_confidence?: NormalizedAnnotationConfidenceDto;
  curator_notes: Array<{ note_type?: string; note: string }>;
  source_payloads: Array<{ source_name: string; payload_type: string; payload: unknown; payload_hash: string }>;
  raw: unknown;
  raw_hash: string;
};

export type NormalizedExternalIdentifierDto = {
  database:
    | "PubChem"
    | "HMDB"
    | "KEGG"
    | "CAS"
    | "ChEBI"
    | "InChIKey"
    | "InChI"
    | "SMILES"
    | "PDB"
    | "PathBank"
    | "BioCyc"
    | "PlantCyc"
    | "DrugBank"
    | "UniProt"
    | "Other";
  identifier: string;
  url?: string;
  notes?: string;
};

export type NormalizedReferenceDto = {
  title?: string;
  authors?: string;
  journal?: string;
  doi?: string;
  pmid?: string;
  url?: string;
  citation?: string;
  citationText?: string;
  year?: number;
  context?: string;
};

export type NormalizedEvidenceDto = {
  evidenceType: string;
  humanEvidence: boolean;
  biologicalContext?: string;
  species?: string;
  evidenceLevel?: string;
  source?: string;
  summary?: string;
  notes?: string;
};

export type NormalizedPathwayDto = {
  name: string;
  database?: string;
  pathwayType: "metabolic" | "signaling" | "disease" | "exposure" | "other";
  pathwayExternalId?: string;
  externalId?: string;
  source?: string;
  url?: string;
  organism?: string;
  taxonId?: string;
  biologicalContext?: "human" | "conserved" | "microbial" | "plant" | "non_human" | "environmental" | "unknown";
  role?: string;
  evidenceLevel?: string;
  notes?: string;
};

export type NormalizedTargetDto = {
  name: string;
  geneSymbol?: string;
  uniprotId?: string;
  organism?: string;
  taxonId?: string;
  isHuman?: boolean;
  targetType?: string;
  description?: string;
  externalId?: string;
  interactionType?: string;
  directness: "direct" | "indirect" | "predicted" | "unknown";
  evidenceLevel?: string;
  source?: string;
  notes?: string;
};

export type NormalizedPdbStructureDto = {
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

export type NormalizedRelatedDiseaseDto = {
  name: string;
  assertion: "associated" | "reported" | "curated" | "uncertain";
  sourceName: string;
  sourceRole: "original" | "secondary";
  sourceRecordId?: string;
  notes?: string;
};

export type NormalizedDatasetPresenceDto = {
  datasetTitle: string;
  diseaseName: string;
  evidenceLevel: "detected" | "reported" | "curated" | "uncertain";
  observed?: boolean;
  observedCount?: number;
  totalSamples?: number;
  frequency?: number;
  presencePercent?: number;
  presenceValueRaw?: string;
  notes?: string;
};

export type NormalizedArtifactAssessmentDto = {
  flag: "likely_artifact" | "possible_artifact" | "unlikely_artifact" | "unknown";
  artifactType?: string;
  confidence?: string;
  rationale?: string;
  source?: string;
  notes?: string;
};

export type NormalizedAnnotationConfidenceDto = {
  level: "high" | "medium" | "low" | "unknown";
  score?: number;
  method?: string;
  source?: string;
  rationale?: string;
  notes?: string;
};

const presenceDiseaseMap = {
  asthma: "Asthma",
  bronchiectasis: "Bronchiectasis",
  copd: "COPD"
} as const;

const legacyCompoundKeys = [
  "identifiers",
  "identifier_links",
  "classifications",
  "metabolites",
  "interactions",
  "reactions_pathways",
  "literature_evidence",
  "respiratory_relevance",
  "exposure_artifact_assessment",
  "structures",
  "references",
  "database_notes",
  "peaktable_presence"
];

export function detectDscdbJsonFormat(payload: unknown): DscdbJsonFormat {
  if (!isRecord(payload)) {
    throw new Error("Import file must contain a compounds array");
  }

  if (payload.schema_version === DSCDB_JSON_V2_SCHEMA_VERSION) {
    return "dscdb_json_v2";
  }

  const compounds = Array.isArray(payload.compounds) ? payload.compounds : [];
  const looksLegacy = compounds.some(
    (compound) =>
      isRecord(compound) &&
      isRecord(compound.identifiers) &&
      (isRecord(compound.reactions_pathways) || isRecord(compound.interactions) || legacyCompoundKeys.some((key) => key in compound))
  );

  if (looksLegacy) {
    return "legacy_dscdb_json_v1";
  }

  throw new Error("Unsupported JSON format. Expected DSCDB_COMPOUND_V2 or legacy DSCDB viewer JSON.");
}

export function normalizeDscdbJsonPayload(payload: unknown, options: { forceFormat?: DscdbJsonFormat } = {}) {
  if (!isRecord(payload) || !Array.isArray(payload.compounds)) {
    throw new Error("Import file must contain a compounds array");
  }

  const detectedFormat = options.forceFormat ?? detectDscdbJsonFormat(payload);
  if (options.forceFormat === "legacy_dscdb_json_v1" && payload.schema_version === DSCDB_JSON_V2_SCHEMA_VERSION) {
    throw new Error("Forced legacy import received DSCDB_COMPOUND_V2 payload");
  }

  return {
    detected_format: detectedFormat,
    compounds: payload.compounds.map((compound, index) =>
      detectedFormat === "dscdb_json_v2"
        ? normalizeV2Compound(compound, index, detectedFormat)
        : normalizeLegacyCompound(compound, index, detectedFormat)
    )
  };
}

function normalizeLegacyCompound(compound: unknown, index: number, detectedFormat: DscdbJsonFormat): NormalizedCompoundV2Dto {
  const record = asRecord(compound);
  const identifiers = asRecord(record.identifiers);
  const identifierLinks = asRecord(record.identifier_links);
  const pubchemCid = normalizePubChemCid(identifiers.pubchem_cid);
  const commonName = cleanString(identifiers.common_name);
  const iupacName = cleanString(identifiers.iupac_name);
  const rawHash = stablePayloadHash(record);
  const externalIdentifiers = normalizeLegacyExternalIdentifiers(identifiers, identifierLinks);
  const namesInput: NormalizedCompoundV2Dto["names"] = [];
  if (commonName) namesInput.push({ name: commonName, name_type: "common" });
  if (iupacName) namesInput.push({ name: iupacName, name_type: "iupac" });
  for (const synonym of normalizeSynonyms(identifiers.synonyms)) {
    namesInput.push({ name: synonym, name_type: "synonym" });
  }
  const names = uniqueBy(namesInput, (name) => `${name.name_type}:${name.name.toLowerCase()}`);

  const artifactAssessment = normalizeArtifactAssessment(record.exposure_artifact_assessment);
  const curatorNotes = normalizeLegacyCuratorNotes(record);

  return {
    index,
    detected_format: detectedFormat,
    identity: {
      pubchem_cid: pubchemCid ?? 0,
      common_name: commonName,
      iupac_name: iupacName,
      formula: cleanString(identifiers.formula) ?? cleanString(identifiers.molecular_formula),
      molecular_formula: cleanString(identifiers.molecular_formula) ?? cleanString(identifiers.formula),
      molecular_weight: normalizeNumber(identifiers.molecular_weight),
      exact_mass: normalizeNumber(identifiers.exact_mass),
      inchi: cleanString(identifiers.inchi),
      inchikey: cleanString(identifiers.inchikey),
      smiles: cleanString(identifiers.smiles),
      canonical_smiles: cleanString(identifiers.canonical_smiles),
      isomeric_smiles: cleanString(identifiers.isomeric_smiles)
    },
    names,
    external_identifiers: externalIdentifiers,
    classifications: normalizeClassifications(record.classifications),
    compound_types: normalizeCompoundTypes(record),
    dataset_presence: normalizePeaktablePresence(record.peaktable_presence),
    related_diseases: normalizeLegacyRelatedDiseases(record),
    pathways: normalizeLegacyPathways(record.reactions_pathways),
    targets: normalizeLegacyTargets(record.interactions),
    pdb_structures: normalizeLegacyPdbStructures(record.structures),
    evidence_records: [
      ...normalizeMetaboliteEvidence(record.metabolites),
      ...normalizeLiteratureEvidence(record.literature_evidence),
      ...normalizeRespiratoryEvidence(record.respiratory_relevance)
    ],
    references: normalizeReferences(record.references),
    artifact_assessment: artifactAssessment,
    annotation_confidence: normalizeAnnotationConfidence(record, artifactAssessment),
    curator_notes: curatorNotes,
    source_payloads: [
      {
        source_name: "Legacy curated JSON import",
        payload_type: "legacy_compound_json_v1",
        payload: record,
        payload_hash: rawHash
      }
    ],
    raw: record,
    raw_hash: rawHash
  };
}

function normalizeV2Compound(compound: unknown, index: number, detectedFormat: DscdbJsonFormat): NormalizedCompoundV2Dto {
  const record = asRecord(compound);
  const identity = asRecord(record.identity);
  const pubchemCid = normalizePubChemCid(identity.pubchem_cid ?? identity.pubchemCid);
  const rawHash = stablePayloadHash(record);
  const sourcePayloads = arrayOfRecords(record.source_payloads).map((payload) => ({
    source_name: cleanString(payload.source_name) ?? cleanString(payload.sourceName) ?? "DSCDB v2 JSON import",
    payload_type: cleanString(payload.payload_type) ?? cleanString(payload.payloadType) ?? "compound_json_v2",
    payload: payload.payload ?? record,
    payload_hash: cleanString(payload.payload_hash) ?? cleanString(payload.payloadHash) ?? stablePayloadHash(payload.payload ?? record)
  }));

  return {
    index,
    detected_format: detectedFormat,
    identity: {
      pubchem_cid: pubchemCid ?? 0,
      common_name: cleanString(identity.common_name) ?? cleanString(identity.commonName),
      iupac_name: cleanString(identity.iupac_name) ?? cleanString(identity.iupacName),
      formula: cleanString(identity.formula) ?? cleanString(identity.molecular_formula),
      molecular_formula: cleanString(identity.molecular_formula) ?? cleanString(identity.formula),
      molecular_weight: normalizeNumber(identity.molecular_weight ?? identity.molecularWeight),
      exact_mass: normalizeNumber(identity.exact_mass ?? identity.exactMass),
      inchi: cleanString(identity.inchi),
      inchikey: cleanString(identity.inchikey) ?? cleanString(identity.inchiKey),
      smiles: cleanString(identity.smiles),
      canonical_smiles: cleanString(identity.canonical_smiles) ?? cleanString(identity.canonicalSmiles),
      isomeric_smiles: cleanString(identity.isomeric_smiles) ?? cleanString(identity.isomericSmiles)
    },
    names: arrayOfRecords(record.names).flatMap(normalizeV2Name),
    external_identifiers: arrayOfRecords(record.external_identifiers).flatMap(normalizeV2ExternalIdentifier),
    classifications: arrayOfRecords(record.classifications).flatMap(normalizeV2Classification),
    compound_types: arrayOfRecords(record.compound_types).flatMap(normalizeV2CompoundType),
    dataset_presence: arrayOfRecords(record.dataset_presence).flatMap(normalizeV2DatasetPresence),
    related_diseases: arrayOfRecords(record.related_diseases).flatMap(normalizeV2RelatedDisease),
    pathways: arrayOfRecords(record.pathways).flatMap(normalizeV2Pathway),
    targets: arrayOfRecords(record.targets).flatMap(normalizeV2Target),
    pdb_structures: arrayOfRecords(record.pdb_structures).flatMap(normalizeV2PdbStructure),
    evidence_records: arrayOfRecords(record.evidence_records).flatMap((evidence) => normalizeV2Evidence(evidence, "evidence")),
    references: arrayOfRecords(record.references).flatMap(normalizeV2Reference),
    artifact_assessment: normalizeV2Artifact(record.artifact_assessment),
    annotation_confidence: normalizeV2AnnotationConfidence(record.annotation_confidence),
    curator_notes: arrayOfRecords(record.curator_notes).flatMap(normalizeV2Note),
    source_payloads:
      sourcePayloads.length > 0
        ? sourcePayloads
        : [
            {
              source_name: "DSCDB v2 JSON import",
              payload_type: "compound_json_v2",
              payload: record,
              payload_hash: rawHash
            }
          ],
    raw: record,
    raw_hash: rawHash
  };
}

function normalizeLegacyExternalIdentifiers(
  identifiers: Record<string, unknown>,
  identifierLinks: Record<string, unknown>
): NormalizedExternalIdentifierDto[] {
  const candidates: Array<[NormalizedExternalIdentifierDto["database"], unknown, string[]]> = [
    ["PubChem", identifiers.pubchem_cid, ["pubchem", "pubchem_cid", "pubchem_url"]],
    ["InChI", identifiers.inchi, ["inchi", "inchi_url"]],
    ["InChIKey", identifiers.inchikey, ["inchikey", "inchikey_url"]],
    ["SMILES", identifiers.smiles, ["smiles", "smiles_url"]],
    ["HMDB", identifiers.hmdb_id, ["hmdb", "hmdb_id", "hmdb_url"]],
    ["KEGG", identifiers.kegg_id, ["kegg", "kegg_id", "kegg_url"]],
    ["CAS", identifiers.cas, ["cas", "cas_url"]],
    ["ChEBI", normalizeChebi(cleanString(identifiers.chebi)), ["chebi", "chebi_url"]],
    ["PDB", identifiers.pdb_id, ["pdb", "pdb_id", "pdb_url"]],
    ["PathBank", identifiers.pathbank_id, ["pathbank", "pathbank_id", "pathbank_url"]],
    ["BioCyc", identifiers.biocyc_id, ["biocyc", "biocyc_id", "biocyc_url"]],
    ["PlantCyc", identifiers.plantcyc_id, ["plantcyc", "plantcyc_id", "plantcyc_url"]],
    ["DrugBank", identifiers.drugbank_id, ["drugbank", "drugbank_id", "drugbank_url"]],
    ["UniProt", identifiers.uniprot_id, ["uniprot", "uniprot_id", "uniprot_url"]]
  ];

  const externalIdentifiers: NormalizedExternalIdentifierDto[] = [];
  for (const [database, value, urlKeys] of candidates) {
    const identifier = cleanString(value) ?? (typeof value === "number" ? String(value) : undefined);
    if (!identifier) continue;
    externalIdentifiers.push({
      database,
      identifier,
      url: findUrl(identifierLinks, urlKeys)
    });
  }

  return uniqueBy(externalIdentifiers, (identifier) => `${identifier.database}:${identifier.identifier}`);
}

function normalizeClassifications(value: unknown): NormalizedCompoundV2Dto["classifications"] {
  const out: NormalizedCompoundV2Dto["classifications"] = [];
  const classifications = asRecord(value);
  const levels = [
    ["superclass", "ClassyFire:superclass"],
    ["class", "ClassyFire:class"],
    ["subclass", "ClassyFire:subclass"],
    ["direct_parent", "ClassyFire:direct_parent"],
    ["molecular_framework", "ClassyFire:molecular_framework"]
  ] as const;

  for (const [field, vocabulary] of levels) {
    const name = cleanString(classifications[field]);
    if (name) out.push({ name, vocabulary });
  }

  const keggBrite = cleanString(classifications.kegg_brite_classification);
  if (keggBrite) {
    out.push({ name: keggBrite, vocabulary: "KEGG BRITE", description: "Legacy KEGG BRITE classification" });
  }

  for (const nested of collectLeafRecords(value)) {
    for (const text of collectStrings(nested.record)) {
      if (text && !out.some((classification) => classification.name === text)) {
        out.push({ name: text, vocabulary: nested.path.includes("kegg") ? "KEGG BRITE" : "legacy-json" });
      }
    }
  }

  return uniqueBy(out, (classification) => `${classification.vocabulary}:${classification.name}`);
}

function normalizeCompoundTypes(compound: Record<string, unknown>) {
  const raw = `${JSON.stringify(compound.metabolites ?? {})} ${JSON.stringify(compound.exposure_artifact_assessment ?? {})} ${JSON.stringify(
    compound.classifications ?? {}
  )}`.toLowerCase();
  const types = new Set<string>();

  for (const type of ["endogenous", "exogenous", "microbial", "fungal", "dietary", "environmental"]) {
    if (raw.includes(type)) types.add(type);
  }
  if (raw.includes("artifact") || raw.includes("contaminant")) types.add("artifact/contaminant");
  if (types.size === 0) types.add("unknown");

  return [...types].map((name) => ({ name }));
}

function normalizePeaktablePresence(value: unknown): NormalizedDatasetPresenceDto[] {
  const record = asRecord(value);
  const presence: NormalizedDatasetPresenceDto[] = [];
  const normalizedEntries = new Map(Object.entries(record).map(([key, entry]) => [key.toLowerCase(), entry]));

  for (const key of Object.keys(presenceDiseaseMap) as Array<keyof typeof presenceDiseaseMap>) {
    const rawValue = normalizedEntries.get(key);
    const numericValue = typeof rawValue === "number" ? rawValue : typeof rawValue === "string" ? Number(rawValue) : null;

    if (numericValue !== null && Number.isFinite(numericValue) && numericValue > 0) {
      presence.push({
        datasetTitle: "Legacy curated JSON import",
        diseaseName: presenceDiseaseMap[key],
        evidenceLevel: "reported",
        observed: true,
        presenceValueRaw: String(rawValue),
        notes: `Imported peaktable_presence.${key}=${rawValue}. Dataset observation only; not diagnostic, causal, or a confirmed biomarker assertion.`
      });
    }
  }

  return presence;
}

function normalizeLegacyRelatedDiseases(compound: Record<string, unknown>): NormalizedRelatedDiseaseDto[] {
  const diseases: NormalizedRelatedDiseaseDto[] = [];
  const metabolites = asRecord(compound.metabolites);

  for (const item of arrayOfRecords(metabolites.secondary_disease_associations)) {
    const name = cleanString(item.disease) ?? cleanString(item.name) ?? cleanString(item.disease_context);
    if (!name) continue;
    const sourceName = cleanString(item.source) ?? cleanString(item.database) ?? "Legacy curated JSON import";
    diseases.push({
      name,
      assertion: "reported",
      sourceName,
      sourceRole: sourceName === "Legacy curated JSON import" ? "secondary" : "original",
      sourceRecordId: cleanString(item.source_record_id) ?? cleanString(item.id),
      notes: readableRecord("secondary_disease_association", item)
    });
  }

  const summary = readableScalar(metabolites.disease_summary);
  if (summary) {
    for (const disease of extractDiseaseNames(summary)) {
      diseases.push({
        name: disease,
        assertion: "reported",
        sourceName: "Legacy curated JSON import",
        sourceRole: "secondary",
        notes: `Metabolite disease summary: ${summary}`
      });
    }
  }

  for (const item of Array.isArray(compound.related_diseases) ? compound.related_diseases : arrayOfRecords(compound.related_diseases)) {
    if (typeof item === "string" && item.trim()) {
      diseases.push({
        name: item.trim(),
        assertion: "reported",
        sourceName: "Legacy curated JSON import",
        sourceRole: "secondary",
        notes: "Imported as related disease from legacy JSON; not dataset presence."
      });
      continue;
    }

    if (isRecord(item)) {
      const name = cleanString(item.name) ?? cleanString(item.disease) ?? cleanString(item.label);
      if (!name) continue;
      const sourceName = cleanString(item.source) ?? cleanString(item.database) ?? "Legacy curated JSON import";
      diseases.push({
        name,
        assertion: "reported",
        sourceName,
        sourceRole: sourceName === "Legacy curated JSON import" ? "secondary" : "original",
        sourceRecordId: cleanString(item.source_record_id) ?? cleanString(item.id),
        notes: readableRecord("related_disease", item)
      });
    }
  }

  return uniqueBy(diseases, (disease) => `${disease.name}:${disease.sourceName}:${disease.sourceRecordId ?? ""}`);
}

function normalizeMetaboliteEvidence(value: unknown): NormalizedEvidenceDto[] {
  const evidence: NormalizedEvidenceDto[] = [];
  const metabolites = asRecord(value);
  const diseaseSummary = readableScalar(metabolites.disease_summary);
  if (diseaseSummary) {
    evidence.push({
      evidenceType: "metabolite_disease_summary",
      humanEvidence: diseaseSummary.toLowerCase().includes("human"),
      summary: diseaseSummary,
      source: "Legacy curated JSON import",
      notes: "Disease association evidence imported from legacy metabolites.disease_summary; not dataset presence."
    });
  }

  for (const item of arrayOfRecords(metabolites.secondary_disease_associations)) {
    evidence.push(normalizeEvidenceRecord(item, "secondary_disease_association", "secondary disease association"));
  }

  return evidence;
}

function normalizeLegacyTargets(value: unknown): NormalizedTargetDto[] {
  const targets: NormalizedTargetDto[] = [];
  for (const { record, path } of collectLeafRecords(value)) {
    const lowerPath = path.toLowerCase();
    const name =
      cleanString(record.target_name) ??
      cleanString(record.target) ??
      cleanString(record.name) ??
      cleanString(record.protein_name) ??
      cleanString(record.protein) ??
      cleanString(record.gene_name) ??
      cleanString(record.gene_symbol);
    const geneSymbol = cleanString(record.gene_name) ?? cleanString(record.gene_symbol) ?? cleanString(record.gene);
    const geneId = cleanString(record.gene_id) ?? cleanString(record.geneid) ?? cleanString(record.ncbi_gene_id);
    const uniprotId = cleanString(record.uniprot) ?? cleanString(record.uniprot_id);

    if (!name && !geneId && !uniprotId) continue;

    const evidenceContext = lowerPath.includes("secondary_or_mixture") ? "secondary/mixed-source" : cleanString(record.evidence_context);
    targets.push({
      name: name ?? geneSymbol ?? geneId ?? uniprotId ?? "Unknown target",
      geneSymbol,
      uniprotId,
      organism: cleanString(record.organism) ?? cleanString(record.species),
      taxonId: cleanString(record.taxon_id),
      isHuman: normalizeBoolean(record.is_human) ?? lowerPath.includes("human"),
      targetType: cleanString(record.target_type) ?? cleanString(record.type),
      externalId: uniprotId ?? geneId ?? cleanString(record.external_id) ?? cleanString(record.id),
      interactionType: cleanString(record.action) ?? cleanString(record.interaction_type),
      directness: evidenceContext === "secondary/mixed-source" ? "unknown" : normalizeDirectness(cleanString(record.directness) ?? lowerPath),
      evidenceLevel: cleanString(record.evidence_level) ?? cleanString(record.confidence),
      source: cleanString(record.source) ?? cleanString(record.database),
      notes: compactReadableLines([
        evidenceContext ? `Evidence context: ${evidenceContext}` : undefined,
        geneId ? `Gene ID: ${geneId}` : undefined,
        readableReference(record.reference),
        readableLinks(record.links ?? record.link ?? record.url),
        readableRecord("target_interaction", record)
      ])
    });
  }

  return uniqueBy(targets, (target) => `${target.name}:${target.organism ?? ""}:${target.directness}:${target.externalId ?? ""}`);
}

function normalizeLegacyPathways(value: unknown): NormalizedPathwayDto[] {
  const pathways: NormalizedPathwayDto[] = [];
  for (const { record, path } of collectLeafRecords(value)) {
    const lowerPath = path.toLowerCase();
    const id = cleanString(record.external_id) ?? cleanString(record.id) ?? cleanString(record.kegg_id) ?? cleanString(record.pathway_id);
    const name = cleanString(record.name) ?? cleanString(record.pathway) ?? cleanString(record.title) ?? id;
    if (!name) continue;

    const role = inferPathwayRole(lowerPath);
    const database = cleanString(record.database) ?? cleanString(record.source) ?? inferDatabaseFromId(id, lowerPath);
    pathways.push({
      name,
      database,
      pathwayType: normalizePathwayType(`${cleanString(record.type) ?? ""} ${role} ${lowerPath}`),
      pathwayExternalId: id,
      externalId: id,
      source: cleanString(record.source) ?? database,
      url: cleanString(record.url) ?? cleanString(record.link),
      organism: cleanString(record.organism) ?? cleanString(record.species),
      taxonId: cleanString(record.taxon_id),
      biologicalContext: inferBiologicalContext(lowerPath, record),
      role,
      evidenceLevel: cleanString(record.evidence_level) ?? cleanString(record.confidence),
      notes: compactReadableLines([
        readableReference(record.reference),
        readableLinks(record.links ?? record.link ?? record.url),
        lowerPath.includes("related_or_similar_compounds") ? "Related or similar compound record from legacy reactions_pathways." : undefined,
        readableRecord(role, record)
      ])
    });
  }

  return uniqueBy(pathways, (pathway) => `${pathway.name}:${pathway.role ?? ""}:${pathway.source ?? ""}:${pathway.externalId ?? ""}`);
}

function normalizeLegacyPdbStructures(value: unknown): NormalizedPdbStructureDto[] {
  const structures: NormalizedPdbStructureDto[] = [];

  for (const { record, path } of collectLeafRecords(value)) {
    const rawPdbId = cleanString(record.pdb_id) ?? cleanString(record.pdbId) ?? cleanString(record.id);
    const pdbId = normalizePdbId(rawPdbId);
    if (!pdbId) continue;

    structures.push({
      pdbId,
      title: cleanString(record.title) ?? cleanString(record.name),
      method: cleanString(record.experiment_method) ?? cleanString(record.method),
      resolution: normalizeNumber(record.resolution),
      organism: cleanString(record.organism) ?? cleanString(record.species),
      url: cleanString(record.url) ?? cleanString(record.link) ?? `https://www.rcsb.org/structure/${pdbId}`,
      ligandId: cleanString(record.ligand_id) ?? cleanString(record.ligand),
      chain: cleanString(record.chain),
      source: cleanString(record.source) ?? "PDB",
      notes: compactReadableLines([
        path.toLowerCase().includes("human") ? "Human protein structure record." : undefined,
        readableReference(record.reference),
        readableLinks(record.links ?? record.link ?? record.url),
        readableRecord("pdb_structure", record)
      ])
    });
  }

  return uniqueBy(structures, (structure) => `${structure.pdbId}:${structure.ligandId ?? ""}:${structure.chain ?? ""}`);
}

function normalizeLiteratureEvidence(value: unknown): NormalizedEvidenceDto[] {
  const evidence: NormalizedEvidenceDto[] = [];
  for (const { record, path } of collectLeafRecords(value)) {
    const category = path.toLowerCase().includes("evidence_gaps") ? "evidence_gap" : path.split(".").pop() ?? "literature_evidence";
    evidence.push(normalizeEvidenceRecord(record, category, path));
  }

  const fallback = normalizeUnknownBlock("literature_evidence", value);
  if (evidence.length === 0 && fallback) {
    evidence.push({ evidenceType: "literature_evidence", humanEvidence: fallback.toLowerCase().includes("human"), summary: fallback });
  }

  return evidence;
}

function normalizeRespiratoryEvidence(value: unknown): NormalizedEvidenceDto[] {
  const record = asRecord(value);
  const evidence: NormalizedEvidenceDto[] = [];

  for (const [key, disease] of Object.entries(presenceDiseaseMap)) {
    const diseaseBlock = record[key] ?? record[disease.toLowerCase()];
    if (!diseaseBlock) continue;
    const diseaseRecord = asRecord(diseaseBlock);
    const summary = cleanString(diseaseRecord.summary) ?? readableScalar(diseaseBlock);
    evidence.push({
      evidenceType: "respiratory_interpretation",
      biologicalContext: disease,
      humanEvidence: readableText(diseaseBlock).toLowerCase().includes("human"),
      evidenceLevel: cleanString(diseaseRecord.evidence_level) ?? cleanString(diseaseRecord.confidence),
      source: cleanString(diseaseRecord.source) ?? "Legacy curated JSON import",
      summary,
      notes: compactReadableLines([
        `Disease: ${disease}`,
        "Interpretation only; not a causal, diagnostic, or validated biomarker claim.",
        cleanString(diseaseRecord.likely_interpretation)
          ? `Likely interpretation: ${cleanString(diseaseRecord.likely_interpretation)}`
          : undefined,
        readableReference(diseaseRecord.references ?? diseaseRecord.reference),
        readableLinks(diseaseRecord.links)
      ])
    });
  }

  const fallback = normalizeUnknownBlock("respiratory_relevance", value);
  if (evidence.length === 0 && fallback) {
    evidence.push({
      evidenceType: "respiratory_relevance",
      humanEvidence: fallback.toLowerCase().includes("human"),
      summary: fallback,
      notes: "Interpretation only; not a causal, diagnostic, or validated biomarker claim."
    });
  }

  return evidence;
}

function normalizeEvidenceRecord(record: Record<string, unknown>, category: string, label: string): NormalizedEvidenceDto {
  const mechanism = cleanString(record.mechanism);
  const keyFinding = cleanString(record.key_finding) ?? cleanString(record.finding) ?? cleanString(record.summary);
  const diseaseContext = cleanString(record.disease_context) ?? cleanString(record.disease) ?? cleanString(record.context);
  const summary = keyFinding ?? readableRecord(label, record);

  return {
    evidenceType: cleanString(record.evidence_type) ?? cleanString(record.type) ?? category,
    biologicalContext: diseaseContext ?? mechanism,
    species: cleanString(record.organism) ?? cleanString(record.species),
    humanEvidence: normalizeBoolean(record.is_human) ?? recordIncludesHumanEvidence(record),
    evidenceLevel: cleanString(record.confidence) ?? cleanString(record.evidence_level),
    source: cleanString(record.source) ?? cleanString(record.database) ?? cleanString(record.title),
    summary,
    notes: compactReadableLines([
      mechanism ? `Mechanism: ${mechanism}` : undefined,
      readableReference(record.reference),
      readableLinks(record.links ?? record.link ?? record.url),
      cleanString(record.notes),
      summary === keyFinding ? readableRecord(label, record) : undefined
    ])
  };
}

function normalizeArtifactAssessment(value: unknown): NormalizedArtifactAssessmentDto | undefined {
  if (value === undefined || value === null) return undefined;
  const record = asRecord(value);
  const text = readableText(value).toLowerCase();
  let flag: NormalizedArtifactAssessmentDto["flag"] = "unknown";
  if (text.includes("likely") && (text.includes("artifact") || text.includes("contaminant"))) flag = "likely_artifact";
  else if (text.includes("possible") || text.includes("suspect")) flag = "possible_artifact";
  else if (text.includes("unlikely") || text.includes("not artifact")) flag = "unlikely_artifact";

  const overall = cleanString(record.overall_interpretation);
  return {
    flag,
    artifactType: cleanString(record.artifact_type),
    confidence: cleanString(record.confidence),
    rationale: overall ?? normalizeUnknownBlock("exposure_artifact_assessment", value),
    source: cleanString(record.source),
    notes: compactReadableLines([
      ...[
        "endogenous",
        "microbial",
        "fungal",
        "dietary",
        "smoking_related",
        "pollution_related",
        "medication_related",
        "environmental",
        "analytical_artifact"
      ].map((key) => (record[key] === undefined ? undefined : `${humanizeLabel(key)}: ${readableScalar(record[key])}`)),
      cleanString(record.notes)
    ])
  };
}

function normalizeAnnotationConfidence(
  compound: Record<string, unknown>,
  artifactAssessment: NormalizedArtifactAssessmentDto | undefined
): NormalizedAnnotationConfidenceDto | undefined {
  const confidenceBlock = findFirstRecordByKey(compound, "annotation_confidence") ?? findFirstRecordByKey(compound, "confidence");
  const text = readableText(confidenceBlock ?? compound).toLowerCase();
  let level: NormalizedAnnotationConfidenceDto["level"] = "unknown";
  if (text.includes("high")) level = "high";
  else if (text.includes("medium") || text.includes("moderate")) level = "medium";
  else if (text.includes("low")) level = "low";

  if (!confidenceBlock && !artifactAssessment && level === "unknown") return undefined;
  const record = asRecord(confidenceBlock);
  return {
    level,
    score: normalizeNumber(record.score),
    method: cleanString(record.method),
    source: cleanString(record.source),
    rationale: cleanString(record.rationale) ?? normalizeUnknownBlock("annotation_confidence", confidenceBlock),
    notes: cleanString(record.notes)
  };
}

function normalizeLegacyCuratorNotes(compound: Record<string, unknown>) {
  const notes: Array<{ note_type?: string; note: string }> = [];

  for (const note of Array.isArray(compound.database_notes) ? compound.database_notes : []) {
    const readable = normalizeUnknownBlock("database_notes", note);
    if (readable) notes.push({ note_type: "database_notes", note: readable });
  }

  const keggBrite = cleanString(asRecord(compound.classifications).kegg_brite_classification);
  if (keggBrite) {
    notes.push({ note_type: "classification", note: `KEGG BRITE classification: ${keggBrite}` });
  }

  const relatedCompounds = normalizeUnknownBlock("related_or_similar_compounds", asRecord(compound.reactions_pathways).related_or_similar_compounds);
  if (relatedCompounds) {
    notes.push({ note_type: "related_compounds", note: relatedCompounds });
  }

  const similarity = normalizeUnknownBlock("similarity", compound.similarity ?? compound.simcomp);
  if (similarity) notes.push({ note_type: "similarity", note: similarity });

  return uniqueBy(notes, (note) => `${note.note_type ?? ""}:${note.note}`);
}

function normalizeReferences(value: unknown): NormalizedReferenceDto[] {
  const references = Array.isArray(value) ? value : [];
  return references
    .map((reference): NormalizedReferenceDto | null => {
      if (typeof reference === "string") return { citation: reference, citationText: reference };
      if (!isRecord(reference)) return null;
      return normalizeV2Reference(reference)[0] ?? null;
    })
    .filter((reference): reference is NormalizedReferenceDto => Boolean(reference));
}

function normalizeV2Name(record: Record<string, unknown>) {
  const name = cleanString(record.name);
  if (!name) return [];
  return [
    {
      name,
      name_type: normalizeNameType(cleanString(record.name_type) ?? cleanString(record.nameType)),
      language: cleanString(record.language)
    }
  ];
}

function normalizeV2ExternalIdentifier(record: Record<string, unknown>): NormalizedExternalIdentifierDto[] {
  const database = normalizeExternalDatabase(cleanString(record.database));
  const identifier = cleanString(record.identifier);
  if (!database || !identifier) return [];
  return [{ database, identifier, url: cleanString(record.url), notes: cleanString(record.notes) }];
}

function normalizeV2Classification(record: Record<string, unknown>) {
  const name = cleanString(record.name);
  if (!name) return [];
  return [{ name, vocabulary: cleanString(record.vocabulary), description: cleanString(record.description) }];
}

function normalizeV2CompoundType(record: Record<string, unknown>) {
  const name = cleanString(record.name);
  if (!name) return [];
  return [{ name, description: cleanString(record.description) }];
}

function normalizeV2DatasetPresence(record: Record<string, unknown>): NormalizedDatasetPresenceDto[] {
  const disease = asRecord(record.disease);
  const dataset = asRecord(record.dataset);
  const diseaseName = cleanString(record.disease_name) ?? cleanString(record.diseaseName) ?? cleanString(disease.name);
  const datasetTitle = cleanString(record.dataset_title) ?? cleanString(record.datasetTitle) ?? cleanString(dataset.title);
  if (!diseaseName || !datasetTitle) return [];
  return [
    {
      datasetTitle,
      diseaseName,
      evidenceLevel: normalizePresenceEvidenceLevel(cleanString(record.evidence_level) ?? cleanString(record.evidenceLevel)),
      observed: normalizeBoolean(record.observed),
      observedCount: normalizeInteger(record.observed_count ?? record.observedCount),
      totalSamples: normalizeInteger(record.total_samples ?? record.totalSamples),
      frequency: normalizeNumber(record.frequency),
      presencePercent: normalizeNumber(record.presence_percent ?? record.presencePercent),
      presenceValueRaw: cleanString(record.presence_value_raw) ?? cleanString(record.presenceValueRaw),
      notes: cleanString(record.notes)
    }
  ];
}

function normalizeV2RelatedDisease(record: Record<string, unknown>): NormalizedRelatedDiseaseDto[] {
  const disease = asRecord(record.disease);
  const diseaseName = cleanString(record.disease_name) ?? cleanString(record.diseaseName) ?? cleanString(disease.name);
  if (!diseaseName) return [];
  const source = arrayOfRecords(record.sources)[0] ?? {};
  const sourceOrigin = asRecord(source.source_origin ?? source.sourceOrigin);
  return [
    {
      name: diseaseName,
      assertion: normalizeRelationAssertion(cleanString(record.assertion)),
      sourceName: cleanString(source.name) ?? cleanString(sourceOrigin.name) ?? cleanString(record.source) ?? "DSCDB v2 JSON import",
      sourceRole: normalizeSourceRole(cleanString(source.role)),
      sourceRecordId: cleanString(source.source_record_id) ?? cleanString(source.sourceRecordId),
      notes: cleanString(record.notes)
    }
  ];
}

function normalizeV2Pathway(record: Record<string, unknown>): NormalizedPathwayDto[] {
  const name = cleanString(record.name);
  if (!name) return [];
  return [
    {
      name,
      database: cleanString(record.database),
      pathwayType: normalizePathwayType(cleanString(record.pathway_type) ?? cleanString(record.pathwayType)),
      pathwayExternalId: cleanString(record.pathway_external_id) ?? cleanString(record.pathwayExternalId),
      externalId: cleanString(record.external_id) ?? cleanString(record.externalId),
      source: cleanString(record.source),
      url: cleanString(record.url),
      organism: cleanString(record.organism),
      taxonId: cleanString(record.taxon_id) ?? cleanString(record.taxonId),
      biologicalContext: normalizeBiologicalContext(cleanString(record.biological_context) ?? cleanString(record.biologicalContext)),
      role: cleanString(record.role),
      evidenceLevel: cleanString(record.evidence_level) ?? cleanString(record.evidenceLevel),
      notes: cleanString(record.notes)
    }
  ];
}

function normalizeV2Target(record: Record<string, unknown>): NormalizedTargetDto[] {
  const name = cleanString(record.name) ?? cleanString(record.target_name);
  if (!name) return [];
  return [
    {
      name,
      geneSymbol: cleanString(record.gene_symbol) ?? cleanString(record.geneSymbol) ?? cleanString(record.gene_name),
      uniprotId: cleanString(record.uniprot_id) ?? cleanString(record.uniprotId) ?? cleanString(record.uniprot),
      organism: cleanString(record.organism),
      taxonId: cleanString(record.taxon_id) ?? cleanString(record.taxonId),
      isHuman: normalizeBoolean(record.is_human ?? record.isHuman),
      targetType: cleanString(record.target_type) ?? cleanString(record.targetType),
      description: cleanString(record.description),
      externalId: cleanString(record.external_id) ?? cleanString(record.externalId),
      interactionType: cleanString(record.interaction_type) ?? cleanString(record.interactionType) ?? cleanString(record.action),
      directness: normalizeDirectness(cleanString(record.directness)),
      evidenceLevel: cleanString(record.evidence_level) ?? cleanString(record.evidenceLevel),
      source: cleanString(record.source),
      notes: cleanString(record.notes) ?? cleanString(record.evidence_context)
    }
  ];
}

function normalizeV2PdbStructure(record: Record<string, unknown>): NormalizedPdbStructureDto[] {
  const pdbId = normalizePdbId(cleanString(record.pdb_id) ?? cleanString(record.pdbId));
  if (!pdbId) return [];
  return [
    {
      pdbId,
      title: cleanString(record.title),
      method: cleanString(record.method) ?? cleanString(record.experiment_method),
      resolution: normalizeNumber(record.resolution),
      organism: cleanString(record.organism),
      url: cleanString(record.url),
      ligandId: cleanString(record.ligand_id) ?? cleanString(record.ligandId),
      chain: cleanString(record.chain),
      source: cleanString(record.source),
      notes: cleanString(record.notes)
    }
  ];
}

function normalizeV2Evidence(record: Record<string, unknown>, label: string): NormalizedEvidenceDto[] {
  const evidenceType = cleanString(record.evidence_type) ?? cleanString(record.evidenceType);
  if (!evidenceType) return [];
  return [
    {
      evidenceType,
      biologicalContext: cleanString(record.biological_context) ?? cleanString(record.biologicalContext),
      species: cleanString(record.species),
      humanEvidence: normalizeBoolean(record.human_evidence ?? record.humanEvidence) ?? false,
      evidenceLevel: cleanString(record.evidence_level) ?? cleanString(record.evidenceLevel),
      source: cleanString(record.source),
      summary: cleanString(record.summary) ?? readableRecord(label, record),
      notes: cleanString(record.notes)
    }
  ];
}

function normalizeV2Reference(record: Record<string, unknown>): NormalizedReferenceDto[] {
  const reference = {
    title: cleanString(record.title),
    authors: cleanString(record.authors),
    journal: cleanString(record.journal),
    doi: cleanString(record.doi),
    pmid: cleanString(record.pmid) ?? cleanString(record.pubmed_id),
    url: cleanString(record.url) ?? cleanString(record.link),
    citation: cleanString(record.citation) ?? cleanString(record.reference),
    citationText: cleanString(record.citation_text) ?? cleanString(record.citationText),
    year: normalizeInteger(record.year),
    context: cleanString(record.context)
  };
  return Object.values(reference).some(Boolean) ? [reference] : [];
}

function normalizeV2Artifact(value: unknown): NormalizedArtifactAssessmentDto | undefined {
  if (!value) return undefined;
  const record = asRecord(value);
  return {
    flag: normalizeArtifactFlag(cleanString(record.flag)),
    artifactType: cleanString(record.artifact_type) ?? cleanString(record.artifactType),
    confidence: cleanString(record.confidence),
    rationale: cleanString(record.rationale) ?? cleanString(record.overall_interpretation),
    source: cleanString(record.source),
    notes: cleanString(record.notes)
  };
}

function normalizeV2AnnotationConfidence(value: unknown): NormalizedAnnotationConfidenceDto | undefined {
  if (!value) return undefined;
  const record = asRecord(value);
  return {
    level: normalizeConfidenceLevel(cleanString(record.level)),
    score: normalizeNumber(record.score),
    method: cleanString(record.method),
    source: cleanString(record.source),
    rationale: cleanString(record.rationale),
    notes: cleanString(record.notes)
  };
}

function normalizeV2Note(record: Record<string, unknown>) {
  const note = cleanString(record.note);
  if (!note) return [];
  return [{ note_type: cleanString(record.note_type) ?? cleanString(record.noteType), note }];
}

function collectLeafRecords(value: unknown, path = ""): Array<{ record: Record<string, unknown>; path: string }> {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => collectLeafRecords(entry, path));
  }

  if (!isRecord(value)) return [];

  const children = Object.entries(value).flatMap(([key, child]) => collectLeafRecords(child, path ? `${path}.${key}` : key));
  const scalarish = Object.values(value).some((child) => typeof child !== "object" || child === null);
  return children.length > 0 && !scalarish ? children : [{ record: value, path }];
}

function arrayOfRecords(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) return value.filter(isRecord);
  if (isRecord(value)) return [value];
  return [];
}

function asRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cleanString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function normalizePubChemCid(value: unknown) {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) return value;
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    if (Number.isInteger(parsed) && parsed > 0) return parsed;
  }
  return null;
}

function normalizeNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.trim().replace(/[^\d.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function normalizeInteger(value: unknown) {
  const number = normalizeNumber(value);
  return number === undefined ? undefined : Math.trunc(number);
}

function normalizeBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const lower = value.toLowerCase();
    if (["true", "yes", "1", "human"].includes(lower)) return true;
    if (["false", "no", "0", "nonhuman", "non-human"].includes(lower)) return false;
  }
  return undefined;
}

function normalizeChebi(value: string | undefined) {
  if (!value) return undefined;
  return value.startsWith("CHEBI:") ? value : `CHEBI:${value}`;
}

function normalizeSynonyms(value: unknown) {
  if (typeof value === "string") return uniqueStrings(value.split(/[;\n|]/));
  if (Array.isArray(value)) return uniqueStrings(value.filter((item): item is string => typeof item === "string"));
  return [];
}

function stablePayloadHash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function findUrl(record: Record<string, unknown>, keys: string[]) {
  for (const [key, value] of Object.entries(record)) {
    const lowerKey = key.toLowerCase();
    if (keys.some((candidate) => lowerKey.includes(candidate)) && cleanString(value)) return cleanString(value);
  }
  return undefined;
}

function inferPathwayRole(path: string) {
  if (path.includes("reaction")) return "reaction";
  if (path.includes("enzyme")) return "enzyme";
  if (path.includes("related_or_similar_compounds")) return "related_compound";
  return "pathway";
}

function inferDatabaseFromId(id: string | undefined, path: string) {
  const value = `${id ?? ""} ${path}`.toLowerCase();
  if (/(\bmap\d+|\bc\d+|\br\d+)/i.test(id ?? "") || value.includes("kegg")) return "KEGG";
  if ((id ?? "").toUpperCase().startsWith("SMP") || value.includes("pathbank")) return "PathBank";
  if (value.includes("biocyc")) return "BioCyc";
  if (value.includes("plantcyc")) return "PlantCyc";
  if (/^ec[:\s]?\d+\./i.test(id ?? "") || value.includes("enzyme")) return "Enzyme/Expasy";
  return undefined;
}

function inferBiologicalContext(path: string, record: Record<string, unknown>): NormalizedPathwayDto["biologicalContext"] {
  const text = `${path} ${readableText(record)}`.toLowerCase();
  if (text.includes("human")) return "human";
  if (text.includes("conserved")) return "conserved";
  if (text.includes("microbial") || text.includes("fungal")) return "microbial";
  if (text.includes("plant")) return "plant";
  if (text.includes("environment")) return "environmental";
  if (text.includes("nonhuman") || text.includes("non-human")) return "non_human";
  return "unknown";
}

function normalizePdbId(value: string | undefined) {
  if (!value) return undefined;
  return value.replace(/^PDB:/i, "").trim().toUpperCase();
}

function normalizePathwayType(value: string | undefined): NormalizedPathwayDto["pathwayType"] {
  const lower = (value ?? "").toLowerCase();
  if (lower.includes("metabolic") || lower.includes("metabolism") || lower.includes("reaction") || lower.includes("enzyme")) return "metabolic";
  if (lower.includes("signaling")) return "signaling";
  if (lower.includes("disease")) return "disease";
  if (lower.includes("exposure")) return "exposure";
  return "other";
}

function normalizeDirectness(value: string | undefined): NormalizedTargetDto["directness"] {
  const lower = (value ?? "").toLowerCase();
  if (lower.includes("direct")) return "direct";
  if (lower.includes("indirect")) return "indirect";
  if (lower.includes("predict")) return "predicted";
  return "unknown";
}

function normalizeNameType(value: string | undefined): NormalizedCompoundV2Dto["names"][number]["name_type"] {
  if (value === "common" || value === "iupac" || value === "synonym" || value === "trade" || value === "other") return value;
  return "synonym";
}

function normalizeExternalDatabase(value: string | undefined): NormalizedExternalIdentifierDto["database"] | undefined {
  const allowed = [
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
  return allowed.find((database) => database.toLowerCase() === value?.toLowerCase());
}

function normalizePresenceEvidenceLevel(value: string | undefined): NormalizedDatasetPresenceDto["evidenceLevel"] {
  if (value === "detected" || value === "reported" || value === "curated" || value === "uncertain") return value;
  return "reported";
}

function normalizeRelationAssertion(value: string | undefined): NormalizedRelatedDiseaseDto["assertion"] {
  if (value === "associated" || value === "reported" || value === "curated" || value === "uncertain") return value;
  return "reported";
}

function normalizeSourceRole(value: string | undefined): NormalizedRelatedDiseaseDto["sourceRole"] {
  return value === "original" ? "original" : "secondary";
}

function normalizeBiologicalContext(value: string | undefined): NormalizedPathwayDto["biologicalContext"] {
  if (value === "human" || value === "conserved" || value === "microbial" || value === "plant" || value === "non_human" || value === "environmental") {
    return value;
  }
  return "unknown";
}

function normalizeArtifactFlag(value: string | undefined): NormalizedArtifactAssessmentDto["flag"] {
  if (value === "likely_artifact" || value === "possible_artifact" || value === "unlikely_artifact" || value === "unknown") return value;
  return "unknown";
}

function normalizeConfidenceLevel(value: string | undefined): NormalizedAnnotationConfidenceDto["level"] {
  if (value === "high" || value === "medium" || value === "low" || value === "unknown") return value;
  return "unknown";
}

function readableRecord(label: string, record: Record<string, unknown>) {
  const preferredFields = [
    ["Title", record.title ?? record.name],
    ["Source", record.source ?? record.database ?? record.resource],
    ["Type", record.type ?? record.evidence_type],
    ["Disease context", record.disease_context ?? record.disease ?? record.context],
    ["Mechanism", record.mechanism],
    ["Key finding", record.key_finding ?? record.finding ?? record.summary],
    ["Action", record.action ?? record.interaction_type],
    ["Organism", record.organism ?? record.species],
    ["Confidence", record.confidence ?? record.evidence_level],
    ["URL", record.url ?? record.link],
    ["DOI", record.doi],
    ["PMID", record.pmid ?? record.pubmed_id]
  ] as const;
  const lines = preferredFields
    .map(([field, value]) => {
      const readable = readableScalar(value);
      return readable ? `${field}: ${readable}` : undefined;
    })
    .filter(Boolean);

  if (lines.length > 0) return [`${humanizeLabel(label)}:`, ...lines].join("\n");
  const fallback = uniqueStrings(collectStrings(record)).slice(0, 8).join("; ");
  return fallback ? `${humanizeLabel(label)}: ${fallback}` : undefined;
}

function normalizeUnknownBlock(label: string, value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string") return `${humanizeLabel(label)}: ${value.trim()}`;
  if (Array.isArray(value)) {
    return uniqueStrings(value.map((entry) => normalizeUnknownBlock(label, entry)).filter((entry): entry is string => Boolean(entry))).join("\n");
  }
  if (isRecord(value)) return readableRecord(label, value);
  return `${humanizeLabel(label)}: ${String(value)}`;
}

function readableScalar(value: unknown): string | undefined {
  if (typeof value === "string") return value.trim() || undefined;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return uniqueStrings(value.map(readableScalar).filter((item): item is string => Boolean(item))).join("; ") || undefined;
  if (isRecord(value)) return uniqueStrings(collectStrings(value)).slice(0, 6).join("; ") || undefined;
  return undefined;
}

function readableText(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(readableText).join(" ");
  if (isRecord(value)) return Object.values(value).map(readableText).join(" ");
  if (value === null || value === undefined) return "";
  return String(value);
}

function readableReference(value: unknown) {
  const readable = readableScalar(value);
  return readable ? `Reference: ${readable}` : undefined;
}

function readableLinks(value: unknown) {
  const readable = readableScalar(value);
  return readable ? `Links: ${readable}` : undefined;
}

function recordIncludesHumanEvidence(record: Record<string, unknown>) {
  const text = readableText(record).toLowerCase();
  return text.includes("human") || text.includes("clinical") || text.includes("patient") || text.includes("patients");
}

function collectStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(collectStrings);
  if (isRecord(value)) return Object.values(value).flatMap(collectStrings);
  return [];
}

function extractDiseaseNames(summary: string) {
  const found: string[] = [];
  for (const disease of Object.values(presenceDiseaseMap)) {
    if (summary.toLowerCase().includes(disease.toLowerCase())) found.push(disease);
  }
  return found;
}

function findFirstRecordByKey(value: unknown, needle: string): Record<string, unknown> | undefined {
  if (!isRecord(value)) return undefined;
  for (const [key, child] of Object.entries(value)) {
    if (key.toLowerCase().includes(needle) && isRecord(child)) return child;
    const nested = findFirstRecordByKey(child, needle);
    if (nested) return nested;
  }
  return undefined;
}

function compactReadableLines(values: Array<string | undefined>) {
  return uniqueStrings(values.filter((value): value is string => Boolean(value))).join("\n") || undefined;
}

function humanizeLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function uniqueBy<T>(values: T[], getKey: (value: T) => string) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = getKey(value);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
