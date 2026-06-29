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

    expect(summary.createdCompounds).toBe(0);
    expect(summary.updatedCompounds).toBe(1);
    expect(summary.skippedCompounds).toBe(0);
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
});
