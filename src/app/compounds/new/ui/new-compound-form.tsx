"use client";

import { useState } from "react";

type JsonObject = Record<string, unknown>;

export default function NewCompoundForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const pubchemCid = Number(formData.get("pubchemCid"));

    if (!Number.isInteger(pubchemCid) || pubchemCid <= 0) {
      setIsSubmitting(false);
      setMessage("PubChem CID must be a positive integer.");
      return;
    }

    try {
      const rawPayload = parseJsonField(formData, "rawPayload");
      const body = {
        pubchemCid,
        commonName: value(formData, "commonName"),
        iupacName: value(formData, "iupacName"),
        molecularFormula: value(formData, "molecularFormula"),
        molecularWeight: numberValue(formData, "molecularWeight"),
        annotationSummary: value(formData, "annotationSummary"),
        identity: compact({
          formula: value(formData, "identityFormula") ?? value(formData, "molecularFormula"),
          molecularWeight: numberValue(formData, "identityMolecularWeight") ?? numberValue(formData, "molecularWeight"),
          exactMass: numberValue(formData, "exactMass"),
          smiles: value(formData, "smiles"),
          canonicalSmiles: value(formData, "canonicalSmiles"),
          isomericSmiles: value(formData, "isomericSmiles"),
          inchi: value(formData, "inchi"),
          inchiKey: value(formData, "inchiKey")
        }),
        names: [
          ...parseNameLines(textValue(formData, "synonyms"), "synonym"),
          ...parseNameLines(textValue(formData, "iupacAliases"), "iupac"),
          ...parseNameLines(textValue(formData, "commonAliases"), "common"),
          ...parseNameLines(textValue(formData, "databaseAliases"), "other")
        ],
        externalIdentifiers: parseExternalIdentifiers(formData),
        classyFire: compact({
          kingdom: value(formData, "classyKingdom"),
          superclass: value(formData, "classySuperclass"),
          class: value(formData, "classyClass"),
          subclass: value(formData, "classySubclass"),
          directParent: value(formData, "classyDirectParent"),
          molecularFramework: value(formData, "classyMolecularFramework"),
          alternativeParents: lines(textValue(formData, "classyAlternativeParents"))
        }),
        diseasePresence: parseDiseasePresence(formData),
        relatedDiseases: parseRelatedDiseases(formData),
        evidenceRecords: parseEvidenceRecords(formData),
        pathways: parsePathways(formData),
        targets: parseTargets(formData),
        pdbStructures: parsePdbStructures(formData),
        references: parseReferences(formData),
        artifactAssessments: parseArtifactAssessments(formData),
        annotationConfidence: compact({
          level: value(formData, "confidenceLevel"),
          score: numberValue(formData, "confidenceScore"),
          method: value(formData, "confidenceMethod"),
          source: value(formData, "confidenceSource"),
          rationale: value(formData, "confidenceRationale"),
          notes: value(formData, "confidenceNotes")
        }),
        notes: parseNotes(formData),
        sourcePayloads: rawPayload
          ? [
              {
                sourceName: value(formData, "rawPayloadSource") ?? "Manual compound form",
                payloadType: "manual_raw_json",
                payload: rawPayload
              }
            ]
          : []
      };

      const response = await fetch("/api/compounds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const responseBody = await response.json();
      setIsSubmitting(false);

      if (!response.ok) {
        setMessage(responseBody.message ?? "Could not create compound. Sign in as editor, curator, or admin.");
        return;
      }

      window.location.href = `/compounds/${responseBody.data.compoundId}`;
    } catch (error) {
      setIsSubmitting(false);
      setMessage(error instanceof Error ? error.message : "Could not parse form values.");
    }
  }

  return (
    <form className="compound-wizard" onSubmit={submit}>
      <FormSection title="Core">
        <label>
          PubChem CID
          <input name="pubchemCid" inputMode="numeric" required />
        </label>
        <label>
          Common name
          <input name="commonName" />
        </label>
        <label>
          IUPAC name
          <input name="iupacName" />
        </label>
        <label>
          Formula
          <input name="molecularFormula" />
        </label>
        <label>
          Molecular weight
          <input name="molecularWeight" inputMode="decimal" />
        </label>
        <label className="wide">
          Annotation summary
          <textarea name="annotationSummary" rows={3} />
        </label>
      </FormSection>

      <FormSection title="Identity">
        <label>
          Identity formula
          <input name="identityFormula" />
        </label>
        <label>
          Exact mass
          <input name="exactMass" inputMode="decimal" />
        </label>
        <label>
          Identity molecular weight
          <input name="identityMolecularWeight" inputMode="decimal" />
        </label>
        <label>
          SMILES
          <input name="smiles" />
        </label>
        <label>
          Canonical SMILES
          <input name="canonicalSmiles" />
        </label>
        <label>
          Isomeric SMILES
          <input name="isomericSmiles" />
        </label>
        <label>
          InChI
          <input name="inchi" />
        </label>
        <label>
          InChIKey
          <input name="inchiKey" />
        </label>
      </FormSection>

      <FormSection title="Names">
        <TextArea name="synonyms" label="Synonyms" />
        <TextArea name="iupacAliases" label="IUPAC aliases" />
        <TextArea name="commonAliases" label="Common aliases" />
        <TextArea name="databaseAliases" label="Database aliases" />
      </FormSection>

      <FormSection title="External IDs">
        {["HMDB", "KEGG", "CAS", "ChEBI", "PDB", "PathBank", "BioCyc", "PlantCyc", "DrugBank", "UniProt"].map((database) => (
          <label key={database}>
            {database}
            <input name={`external${database}`} />
          </label>
        ))}
      </FormSection>

      <FormSection title="ClassyFire">
        <label>
          Kingdom
          <input name="classyKingdom" />
        </label>
        <label>
          Superclass
          <input name="classySuperclass" />
        </label>
        <label>
          Class
          <input name="classyClass" />
        </label>
        <label>
          Subclass
          <input name="classySubclass" />
        </label>
        <label>
          Direct parent
          <input name="classyDirectParent" />
        </label>
        <label>
          Molecular framework
          <input name="classyMolecularFramework" />
        </label>
        <TextArea name="classyAlternativeParents" label="Alternative parents" />
      </FormSection>

      <FormSection title="Dataset Presence">
        <label>
          Dataset
          <input name="presenceDataset" />
        </label>
        <label>
          Disease
          <select name="presenceDisease">
            <option value="">None</option>
            <option>Asthma</option>
            <option>Bronchiectasis</option>
            <option>COPD</option>
          </select>
        </label>
        <label>
          Observed count
          <input name="observedCount" inputMode="numeric" />
        </label>
        <label>
          Total samples
          <input name="totalSamples" inputMode="numeric" />
        </label>
        <label>
          Frequency
          <input name="frequency" inputMode="decimal" />
        </label>
        <label className="wide">
          Presence notes
          <textarea name="presenceNotes" rows={3} />
        </label>
      </FormSection>

      <FormSection title="Related Diseases">
        <TextArea name="relatedDiseases" label="Diseases" />
        <TextArea name="relatedDiseaseSource" label="Evidence/source" />
      </FormSection>

      <FormSection title="Evidence">
        <TextArea name="humanEvidence" label="Human evidence" />
        <TextArea name="nonHumanEvidence" label="Non-human evidence" />
        <TextArea name="computationalEvidence" label="Computational/database/literature" />
      </FormSection>

      <FormSection title="Pathways">
        <TextArea name="pathways" label="Pathways as database|name|externalId|context" />
      </FormSection>

      <FormSection title="Targets">
        <TextArea name="targets" label="Targets as name|gene|UniProt|organism|directness" />
      </FormSection>

      <FormSection title="PDB">
        <TextArea name="pdbStructures" label="PDB as pdbId|ligandId|chain|method|resolution" />
      </FormSection>

      <FormSection title="References">
        <TextArea name="references" label="References as DOI|PMID|URL|citation" />
      </FormSection>

      <FormSection title="Artifact And Confidence">
        <label>
          Artifact flag
          <select name="artifactFlag">
            <option value="">None</option>
            <option value="likely_artifact">Likely artifact</option>
            <option value="possible_artifact">Possible artifact</option>
            <option value="unlikely_artifact">Unlikely artifact</option>
            <option value="unknown">Unknown</option>
          </select>
        </label>
        <label>
          Artifact type
          <input name="artifactType" />
        </label>
        <label>
          Artifact confidence
          <input name="artifactConfidence" />
        </label>
        <label>
          Annotation confidence
          <select name="confidenceLevel">
            <option value="">None</option>
            <option>high</option>
            <option>medium</option>
            <option>low</option>
            <option>unknown</option>
          </select>
        </label>
        <label>
          Confidence score
          <input name="confidenceScore" inputMode="decimal" />
        </label>
        <label>
          Confidence method
          <input name="confidenceMethod" />
        </label>
        <label className="wide">
          Rationale
          <textarea name="confidenceRationale" rows={3} />
        </label>
      </FormSection>

      <FormSection title="Notes And Raw Payload">
        <TextArea name="databaseNotes" label="Database notes" />
        <TextArea name="curationNotes" label="Curation notes" />
        <label className="wide">
          Raw payload source
          <input name="rawPayloadSource" />
        </label>
        <label className="wide">
          Raw JSON payload
          <textarea name="rawPayload" rows={8} />
        </label>
      </FormSection>

      {message ? <div className="import-alert">{message}</div> : null}
      <button className="button" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Creating..." : "Create compound"}
      </button>
    </form>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="form-section">
      <legend>{title}</legend>
      {children}
    </fieldset>
  );
}

function TextArea({ name, label }: { name: string; label: string }) {
  return (
    <label className="wide">
      {label}
      <textarea name={name} rows={4} />
    </label>
  );
}

function value(formData: FormData, key: string) {
  const raw = formData.get(key);
  return typeof raw === "string" && raw.trim() ? raw.trim() : undefined;
}

function textValue(formData: FormData, key: string) {
  return value(formData, key) ?? "";
}

function numberValue(formData: FormData, key: string) {
  const raw = value(formData, key);
  if (!raw) return undefined;
  const number = Number(raw);
  return Number.isFinite(number) ? number : undefined;
}

function compact<T extends JsonObject>(object: T) {
  const result = Object.fromEntries(
    Object.entries(object).filter(([, item]) => {
      if (Array.isArray(item)) return item.length > 0;
      return item !== undefined && item !== "";
    })
  );
  return Object.keys(result).length > 0 ? result : undefined;
}

function lines(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseNameLines(text: string, nameType: "common" | "synonym" | "iupac" | "other") {
  return lines(text).map((name) => ({ name, nameType }));
}

function parseExternalIdentifiers(formData: FormData) {
  return ["HMDB", "KEGG", "CAS", "ChEBI", "PDB", "PathBank", "BioCyc", "PlantCyc", "DrugBank", "UniProt"]
    .map((database) => ({
      database,
      identifier: value(formData, `external${database}`)
    }))
    .filter((identifier): identifier is { database: string; identifier: string } => Boolean(identifier.identifier));
}

function parseDiseasePresence(formData: FormData) {
  const datasetTitle = value(formData, "presenceDataset");
  const diseaseName = value(formData, "presenceDisease");
  if (!datasetTitle || !diseaseName) return [];
  return [
    {
      datasetTitle,
      diseaseName,
      observed: (numberValue(formData, "observedCount") ?? 0) > 0,
      observedCount: numberValue(formData, "observedCount"),
      totalSamples: numberValue(formData, "totalSamples"),
      frequency: numberValue(formData, "frequency"),
      notes: value(formData, "presenceNotes"),
      evidenceLevel: "reported"
    }
  ];
}

function parseRelatedDiseases(formData: FormData) {
  const sources = lines(textValue(formData, "relatedDiseaseSource"));
  return lines(textValue(formData, "relatedDiseases")).map((diseaseName) => ({
    diseaseName,
    assertion: "reported",
    sources: sources.map((name) => ({ name, kind: "database", role: "secondary" }))
  }));
}

function parseEvidenceRecords(formData: FormData) {
  const records = [
    ...lines(textValue(formData, "humanEvidence")).map((summary) => ({
      evidenceType: "human",
      humanEvidence: true,
      biologicalContext: "human",
      summary
    })),
    ...lines(textValue(formData, "nonHumanEvidence")).map((summary) => ({
      evidenceType: "non_human",
      humanEvidence: false,
      biologicalContext: "non_human",
      summary
    })),
    ...lines(textValue(formData, "computationalEvidence")).map((summary) => ({
      evidenceType: "computational_database_literature",
      humanEvidence: false,
      summary
    }))
  ];
  return records;
}

function parsePathways(formData: FormData) {
  return lines(textValue(formData, "pathways")).map((line) => {
    const [database, name, externalId, biologicalContext] = splitPipe(line);
    return {
      database,
      name: name ?? database,
      externalId,
      source: database,
      biologicalContext: normalizeContext(biologicalContext)
    };
  });
}

function parseTargets(formData: FormData) {
  return lines(textValue(formData, "targets")).map((line) => {
    const [name, geneSymbol, uniprotId, organism, directness] = splitPipe(line);
    return {
      name,
      geneSymbol,
      uniprotId,
      organism,
      isHuman: organism?.toLowerCase().includes("homo sapiens") || organism?.toLowerCase() === "human",
      directness: ["direct", "indirect", "predicted", "unknown"].includes(directness ?? "") ? directness : "unknown"
    };
  });
}

function parsePdbStructures(formData: FormData) {
  return lines(textValue(formData, "pdbStructures")).map((line) => {
    const [pdbId, ligandId, chain, method, resolution] = splitPipe(line);
    return {
      pdbId,
      ligandId,
      chain,
      method,
      resolution: resolution ? Number(resolution) : undefined
    };
  });
}

function parseReferences(formData: FormData) {
  return lines(textValue(formData, "references")).map((line) => {
    const [doi, pmid, url, citationText] = splitPipe(line);
    return { doi, pmid, url, citationText, context: "manual" };
  });
}

function parseArtifactAssessments(formData: FormData) {
  const flag = value(formData, "artifactFlag");
  if (!flag) return [];
  return [
    {
      flag,
      artifactType: value(formData, "artifactType"),
      confidence: value(formData, "artifactConfidence"),
      rationale: value(formData, "confidenceRationale")
    }
  ];
}

function parseNotes(formData: FormData) {
  return [
    ...lines(textValue(formData, "databaseNotes")).map((note) => ({ noteType: "database_notes", note })),
    ...lines(textValue(formData, "curationNotes")).map((note) => ({ noteType: "curation_notes", note }))
  ];
}

function parseJsonField(formData: FormData, key: string) {
  const raw = value(formData, key);
  if (!raw) return undefined;
  return JSON.parse(raw) as unknown;
}

function splitPipe(line: string) {
  return line.split("|").map((item) => item.trim() || undefined);
}

function normalizeContext(value: string | undefined) {
  const allowed = ["human", "conserved", "microbial", "plant", "non_human", "environmental", "unknown"];
  return value && allowed.includes(value) ? value : "unknown";
}
