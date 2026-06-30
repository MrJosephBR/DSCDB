import { describe, expect, it } from "vitest";
import {
  buildCuratedCompoundImportPlan,
  parseCuratedCompoundsJson,
  summarizeImportPlanWithExistingCids,
  validateCuratedCompoundsFile
} from "@/modules/import/json-importer";

const validPayload = {
  compounds: [
    {
      identifiers: {
        pubchem_cid: "460",
        common_name: "Guaiacol",
        iupac_name: "2-methoxyphenol",
        formula: "C7H8O2",
        inchikey: "LHGVFZTZFXWLCP-UHFFFAOYSA-N",
        smiles: "COC1=CC=CC=C1O",
        hmdb_id: "HMDB0000001",
        kegg_id: "C01513"
      },
      database_notes: ["Curated manually"],
      respiratory_relevance: {
        summary: "Reported in respiratory VOC literature"
      },
      exposure_artifact_assessment: {
        artifact_flag: "possible"
      },
      peaktable_presence: {
        asthma: 1,
        bronchiectasis: 0,
        COPD: 0
      }
    }
  ]
};

describe("curated compound JSON importer", () => {
  it("accepts a valid JSON import payload", () => {
    const plan = buildCuratedCompoundImportPlan(validPayload);

    expect(plan.totalCompounds).toBe(1);
    expect(plan.items[0]).toMatchObject({
      pubchemCid: 460,
      commonName: "Guaiacol",
      formula: "C7H8O2",
      hmdbId: "HMDB0000001",
      keggId: "C01513"
    });
  });

  it("rejects invalid JSON text", () => {
    expect(() => parseCuratedCompoundsJson("{ compounds: [")).toThrow("Invalid JSON file");
  });

  it("rejects files without a compounds array", () => {
    expect(() => validateCuratedCompoundsFile({ rows: [] })).toThrow("Import file must contain a compounds array");
  });

  it("summarizes PubChem CID upsert behavior", () => {
    const plan = buildCuratedCompoundImportPlan(validPayload);
    const summary = summarizeImportPlanWithExistingCids(plan, new Set([460]));

    expect(summary.created).toBe(0);
    expect(summary.updated).toBe(1);
    expect(summary.skipped).toBe(0);
    expect(summary.dryRun).toBe(true);
  });

  it("preserves raw compound payload with a stable hash", () => {
    const plan = buildCuratedCompoundImportPlan(validPayload);

    expect(plan.items[0].raw).toEqual(validPayload.compounds[0]);
    expect(plan.items[0].rawHash).toHaveLength(64);
  });

  it("does not create biomarker claims from peaktable presence", () => {
    const plan = buildCuratedCompoundImportPlan(validPayload);

    expect(plan.items[0].presence).toEqual([
      {
        key: "asthma",
        diseaseName: "Asthma",
        value: 1
      }
    ]);
    expect(plan.items[0].presence).not.toContainEqual(expect.objectContaining({ diseaseName: "COPD", value: 0 }));
    expect(JSON.stringify(plan.items[0].presence).toLowerCase()).not.toContain("biomarker");
    expect(JSON.stringify(plan.items[0].presence).toLowerCase()).not.toContain("diagnostic");
  });

  it("rejects records without a valid PubChem CID without rejecting the whole file", () => {
    const plan = buildCuratedCompoundImportPlan({
      compounds: [
        { identifiers: { pubchem_cid: "not-a-number" } },
        { identifiers: { pubchem_cid: "461", common_name: "Valid" } }
      ]
    });

    expect(plan.totalCompounds).toBe(2);
    expect(plan.validCompounds).toBe(1);
    expect(plan.invalidCompounds).toBe(1);
    expect(plan.validationErrors[0].message).toContain("Missing or invalid");
  });

  it("detects duplicate PubChem CIDs inside the same upload", () => {
    const plan = buildCuratedCompoundImportPlan({
      compounds: [
        { identifiers: { pubchem_cid: "460" } },
        { identifiers: { pubchem_cid: 460 } }
      ]
    });

    expect(plan.validCompounds).toBe(1);
    expect(plan.invalidCompounds).toBe(1);
    expect(plan.validationErrors[0].message).toContain("Duplicate PubChem CID 460");
  });

  it("normalizes richer viewer JSON fields without losing raw payload", () => {
    const payload = {
      compounds: [
        {
          identifiers: {
            pubchem_cid: "999",
            common_name: "Example VOC",
            exact_mass: "123.044",
            molecular_weight: "123.45",
            cas: "50-00-0",
            chebi: "16842",
            drugbank_id: "DB0001",
            synonyms: ["Example synonym"]
          },
          classifications: {
            classyfire: {
              kingdom: "Organic compounds",
              superclass: "Phenols",
              class: "Methoxyphenols"
            }
          },
          metabolites: {
            type: "endogenous microbial"
          },
          reactions_pathways: {
            pathbank: [{ name: "Human pathway", source: "PathBank", external_id: "PW0001", type: "metabolic" }],
            biocyc: [{ pathway: "BioCyc oxidation", database: "BioCyc", id: "BIO-1" }]
          },
          interactions: {
            targets: [{ target: "CYP2E1", organism: "Homo sapiens", directness: "predicted" }]
          },
          related_diseases: ["Respiratory disease"],
          exposure_artifact_assessment: {
            artifact_flag: "possible artifact"
          },
          annotation_confidence: {
            level: "high",
            method: "curated"
          },
          peaktable_presence: {
            asthma: 1,
            copd: 0
          }
        }
      ]
    };

    const plan = buildCuratedCompoundImportPlan(payload);
    const item = plan.items[0];

    expect(item.molecularWeight).toBe(123.45);
    expect(item.exactMass).toBe(123.044);
    expect(item.cas).toBe("50-00-0");
    expect(item.chebi).toBe("CHEBI:16842");
    expect(item.drugbankId).toBe("DB0001");
    expect(item.names).toContain("Example synonym");
    expect(item.classifications).toContain("Methoxyphenols");
    expect(item.compoundTypes).toEqual(expect.arrayContaining(["endogenous", "microbial"]));
    expect(item.pathways.map((pathway) => pathway.source)).toEqual(expect.arrayContaining(["PathBank", "BioCyc"]));
    expect(item.targets[0]).toMatchObject({ name: "CYP2E1", organism: "Homo sapiens", directness: "predicted" });
    expect(item.relatedDiseases[0]).toMatchObject({ name: "Respiratory disease", sourceRole: "secondary" });
    expect(item.artifactFlag).toBe("possible_artifact");
    expect(item.annotationConfidence?.level).toBe("high");
    expect(item.raw).toEqual(payload.compounds[0]);
  });
});
