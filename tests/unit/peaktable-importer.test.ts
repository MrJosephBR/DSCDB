import { describe, expect, it } from "vitest";
import { parsePeakTableCsv, parsePeakTableXlsx, summarizePeakTableCsv } from "@/modules/import/peaktable-importer";

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

  it("rejects empty headers and files without sample columns", () => {
    expect(() => parsePeakTableCsv("pubchem_cid,\n460,1")).toThrow("empty header columns");
    expect(() => parsePeakTableCsv("pubchem_cid\n460")).toThrow("at least one sample column");
  });

  it("reports dry-run summaries without created database counts", () => {
    const summary = summarizePeakTableCsv("pubchem_cid,S1,S2\n460,10,0", true);

    expect(summary.dryRun).toBe(true);
    expect(summary.createdCompounds).toBe(0);
    expect(summary.createdSamples).toBe(0);
    expect(summary.createdMeasurements).toBe(0);
  });

  it("parses a minimal XLSX worksheet", () => {
    const workbook = makeStoredZip({
      "xl/worksheets/sheet1.xml": `<?xml version="1.0" encoding="UTF-8"?>
        <worksheet><sheetData>
          <row r="1"><c r="A1" t="inlineStr"><is><t>pubchem_cid</t></is></c><c r="B1" t="inlineStr"><is><t>S1</t></is></c></row>
          <row r="2"><c r="A2"><v>460</v></c><c r="B2"><v>12.5</v></c></row>
        </sheetData></worksheet>`
    });

    const parsed = parsePeakTableXlsx(workbook);

    expect(parsed.headers).toEqual(["pubchem_cid", "S1"]);
    expect(parsed.rows).toEqual([["460", "12.5"]]);
  });
});

function makeStoredZip(entries: Record<string, string>) {
  const fileRecords: Array<{ name: string; data: Buffer; localOffset: number }> = [];
  const localParts: Buffer[] = [];
  let offset = 0;

  for (const [name, xml] of Object.entries(entries)) {
    const nameBytes = Buffer.from(name);
    const data = Buffer.from(xml);
    const local = Buffer.alloc(30 + nameBytes.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 8);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    nameBytes.copy(local, 30);
    localParts.push(local, data);
    fileRecords.push({ name, data, localOffset: offset });
    offset += local.length + data.length;
  }

  const centralParts: Buffer[] = [];
  const centralOffset = offset;

  for (const record of fileRecords) {
    const nameBytes = Buffer.from(record.name);
    const central = Buffer.alloc(46 + nameBytes.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 10);
    central.writeUInt32LE(record.data.length, 20);
    central.writeUInt32LE(record.data.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt32LE(record.localOffset, 42);
    nameBytes.copy(central, 46);
    centralParts.push(central);
    offset += central.length;
  }

  const centralSize = offset - centralOffset;
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(fileRecords.length, 8);
  end.writeUInt16LE(fileRecords.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(centralOffset, 16);

  return Buffer.concat([...localParts, ...centralParts, end]);
}
