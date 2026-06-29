import { describe, expect, it } from "vitest";
import { parsePeakTableCsv, summarizePeakTableCsv } from "@/modules/import/peaktable-importer";

describe("peak table importer", () => {
  it("parses a simple PubChem CID x sample CSV", () => {
    const parsed = parsePeakTableCsv("pubchem_cid,S1,S2\n460,10,0\n702,0,3");

    expect(parsed.sampleColumns.map((column) => column.header)).toEqual(["S1", "S2"]);
    expect(parsed.rows).toHaveLength(2);
  });

  it("rejects CSV files without PubChem CID column", () => {
    expect(() => parsePeakTableCsv("compound,S1\nfoo,1")).toThrow("PubChem CID");
  });

  it("detects invalid and duplicate PubChem CIDs", () => {
    const summary = summarizePeakTableCsv("pubchem_cid,S1\nabc,1\n460,2\n460,3");

    expect(summary.totalRows).toBe(3);
    expect(summary.validationErrors).toEqual(
      expect.arrayContaining(["row 2: invalid PubChem CID", "row 4: duplicate PubChem CID 460"])
    );
  });
});
