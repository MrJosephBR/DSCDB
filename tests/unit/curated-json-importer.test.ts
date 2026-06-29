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
});
