import { describe, expect, it } from "vitest";
import { createCompoundSchema } from "@/modules/compounds/schemas";
import { validateCompoundJsonImport, validateCuratedCompoundsFile } from "@/modules/import/json-importer";

describe("API input contracts", () => {
  it("requires a positive PubChem CID when creating compounds", () => {
    expect(() => createCompoundSchema.parse({ commonName: "Missing CID" })).toThrow();
    expect(createCompoundSchema.parse({ pubchemCid: 123, commonName: "Valid" }).pubchemCid).toBe(123);
  });

  it("validates basic import JSON shape", () => {
    const parsed = validateCompoundJsonImport({
      pubchem_cid: 123,
      common_name: "Acetone",
      related_diseases: [],
      dataset_presence: []
    });

    expect(parsed.pubchem_cid).toBe(123);
    expect(parsed.related_diseases).toEqual([]);
    expect(parsed.dataset_presence).toEqual([]);
  });

  it("validates curated compound file shape", () => {
    const parsed = validateCuratedCompoundsFile({
      compounds: [
        {
          identifiers: {
            pubchem_cid: "123"
          }
        }
      ]
    });

    expect(parsed.compounds).toHaveLength(1);
  });
});
