import { inflateRawSync } from "zlib";
import { Prisma, type PrismaClient } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

export type PeakTableSummary = {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  sampleCount: number;
  createdCompounds: number;
  createdSamples: number;
  createdMeasurements: number;
  validationErrors: string[];
  dryRun: boolean;
  importJobId?: string;
};

export function parsePeakTableCsv(text: string) {
  const rows = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(parseCsvLine);

  return parsePeakTableRows(rows);
}

export function parsePeakTableXlsx(buffer: Buffer | ArrayBuffer) {
  const bytes = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  const entries = readZipEntries(bytes);
  const sheetEntryName =
    [...entries.keys()].find((name) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(name)) ?? "xl/worksheets/sheet1.xml";
  const sheetXml = entries.get(sheetEntryName);

  if (!sheetXml) {
    throw new Error("XLSX file does not contain a worksheet");
  }

  const sharedStrings = parseSharedStrings(entries.get("xl/sharedStrings.xml")?.toString("utf8") ?? "");
  const rows = parseWorksheetRows(sheetXml.toString("utf8"), sharedStrings);
  return parsePeakTableRows(rows);
}

export function peakTableXlsxToCsv(buffer: Buffer | ArrayBuffer) {
  const parsed = parsePeakTableXlsx(buffer);
  return [parsed.headers, ...parsed.rows].map((row) => row.map(csvEscape).join(",")).join("\n");
}

function parsePeakTableRows(rows: string[][]) {
  if (rows.length < 2) {
    throw new Error("Peak table must include a header row and at least one data row");
  }

  const headers = rows[0].map((header) => header.trim());
  const emptyHeaderIndexes = headers
    .map((header, index) => ({ header, index }))
    .filter((item) => item.header.length === 0)
    .map((item) => item.index + 1);

  if (emptyHeaderIndexes.length > 0) {
    throw new Error(`Peak table has empty header columns: ${emptyHeaderIndexes.join(", ")}`);
  }

  const cidIndex = headers.findIndex((header) => /pubchem|cid/i.test(header));

  if (cidIndex === -1) {
    throw new Error("Peak table must include a PubChem CID column");
  }

  const sampleIndexes = headers
    .map((header, index) => ({ header, index }))
    .filter((item) => item.index !== cidIndex && item.header.length > 0);

  if (sampleIndexes.length === 0) {
    throw new Error("Peak table must include at least one sample column");
  }

  return {
    headers,
    cidIndex,
    sampleColumns: sampleIndexes,
    rows: rows.slice(1)
  };
}

export function summarizePeakTableCsv(text: string, dryRun = true): PeakTableSummary {
  const parsed = parsePeakTableCsv(text);
  const seen = new Set<number>();
  const validationErrors: string[] = [];

  parsed.rows.forEach((row, rowIndex) => {
    const cid = normalizeCid(row[parsed.cidIndex]);
    if (!cid) {
      validationErrors.push(`row ${rowIndex + 2}: invalid PubChem CID`);
      return;
    }
    if (seen.has(cid)) {
      validationErrors.push(`row ${rowIndex + 2}: duplicate PubChem CID ${cid}`);
    }
    seen.add(cid);

    parsed.sampleColumns.forEach((column) => {
      const value = row[column.index];
      if (value === undefined) {
        validationErrors.push(`row ${rowIndex + 2}: missing value for sample column ${column.header}`);
      }
    });
  });

  return {
    totalRows: parsed.rows.length,
    validRows: parsed.rows.length - validationErrors.filter((error) => error.includes("invalid PubChem CID")).length,
    invalidRows: validationErrors.length,
    sampleCount: parsed.sampleColumns.length,
    createdCompounds: 0,
    createdSamples: 0,
    createdMeasurements: 0,
    validationErrors,
    dryRun
  };
}

export async function importPeakTableCsv(
  db: Db,
  text: string,
  options: { fileName?: string; datasetTitle: string; diseaseName: string; userId?: string; dryRun?: boolean }
): Promise<PeakTableSummary> {
  const drySummary = summarizePeakTableCsv(text, Boolean(options.dryRun));
  if (options.dryRun) return drySummary;
  if (drySummary.validationErrors.length > 0) {
    throw new Error(`Peak table validation failed: ${drySummary.validationErrors.join("; ")}`);
  }

  const parsed = parsePeakTableCsv(text);
  const importJob = await db.importJob.create({
    data: {
      userId: options.userId,
      status: "running",
      fileName: options.fileName,
      fileType: "peak_table_csv",
      dryRun: false,
      startedAt: new Date()
    }
  });
  const disease = await db.disease.upsert({
    where: { name: options.diseaseName },
    update: { normalizedName: options.diseaseName.toLowerCase() },
    create: { name: options.diseaseName, normalizedName: options.diseaseName.toLowerCase() }
  });
  const dataset =
    (await db.dataset.findFirst({ where: { title: options.datasetTitle, deletedAt: null } })) ??
    (await db.dataset.create({
      data: {
        title: options.datasetTitle,
        name: options.datasetTitle,
        datasetType: "peaktable",
        technology: "GC-MS",
        analyticalPlatform: "GC-MS",
        sampleMatrix: "exhaled breath",
        isPublic: true,
        isAnonymized: true
      }
    }));
  const datasetFile = await db.datasetFile.create({
    data: {
      datasetId: dataset.datasetId,
      diseaseId: disease.diseaseId,
      fileName: options.fileName ?? "uploaded-peaktable.csv",
      fileKind: options.fileName?.toLowerCase().endsWith(".xlsx") ? "other" : "csv",
      fileType: options.fileName?.toLowerCase().endsWith(".xlsx")
        ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        : "text/csv",
      fileRole: "peaktable",
      rowCount: parsed.rows.length,
      columnCount: parsed.headers.length,
      uploadedBy: options.userId
    }
  });

  let createdCompounds = 0;
  let createdSamples = 0;
  let createdMeasurements = 0;

  const samples = new Map<string, string>();
  for (const column of parsed.sampleColumns) {
    const sample = await db.sample.upsert({
      where: { datasetId_sampleCode: { datasetId: dataset.datasetId, sampleCode: column.header } },
      update: {
        diseaseId: disease.diseaseId,
        cohortLabel: disease.name,
        metadata: {
          sourceFileName: options.fileName,
          sourceColumnIndex: column.index,
          importJobId: importJob.importJobId
        }
      },
      create: {
        datasetId: dataset.datasetId,
        diseaseId: disease.diseaseId,
        sampleCode: column.header,
        cohortLabel: disease.name,
        metadata: {
          sourceFileName: options.fileName,
          sourceColumnIndex: column.index,
          importJobId: importJob.importJobId
        }
      }
    });
    samples.set(column.header, sample.sampleId);
    createdSamples += 1;
  }

  for (const row of parsed.rows) {
    const cid = normalizeCid(row[parsed.cidIndex]);
    if (!cid) continue;

    const existing = await db.compound.findUnique({ where: { pubchemCid: cid }, select: { compoundId: true } });
    const compound = await db.compound.upsert({
      where: { pubchemCid: cid },
      update: {},
      create: { pubchemCid: cid, commonName: `CID ${cid}` }
    });
    if (!existing) createdCompounds += 1;

    let observedCount = 0;
    for (const column of parsed.sampleColumns) {
      const sampleId = samples.get(column.header);
      if (!sampleId) continue;
      const rawNumber = normalizeNumericValue(row[column.index]);
      const value = rawNumber === null ? null : new Prisma.Decimal(rawNumber);
      const isDetected = rawNumber !== null && rawNumber > 0;
      if (isDetected) observedCount += 1;

      await db.compoundMeasurement.upsert({
        where: {
          sampleId_compoundId_sourceFileId: {
            sampleId,
            compoundId: compound.compoundId,
            sourceFileId: datasetFile.datasetFileId
          }
        },
        update: { rawIntensity: value, isDetected },
        create: {
          sampleId,
          compoundId: compound.compoundId,
          sourceFileId: datasetFile.datasetFileId,
          rawIntensity: value,
          isDetected,
          missingReason: isDetected ? null : "zero_or_missing"
        }
      });
      createdMeasurements += 1;
    }

    await db.compoundDiseasePresence.upsert({
      where: {
        compoundId_datasetId_diseaseId: {
          compoundId: compound.compoundId,
          datasetId: dataset.datasetId,
          diseaseId: disease.diseaseId
        }
      },
      update: {
        observed: observedCount > 0,
        observedCount,
        totalSamples: parsed.sampleColumns.length,
        frequency: parsed.sampleColumns.length ? new Prisma.Decimal(observedCount / parsed.sampleColumns.length) : null,
        sourceFileId: datasetFile.datasetFileId,
        notes: "Aggregated from uploaded peak table. Dataset observation only; not diagnostic, causal, or confirmed biomarker evidence."
      },
      create: {
        compoundId: compound.compoundId,
        datasetId: dataset.datasetId,
        diseaseId: disease.diseaseId,
        observed: observedCount > 0,
        observedCount,
        totalSamples: parsed.sampleColumns.length,
        frequency: parsed.sampleColumns.length ? new Prisma.Decimal(observedCount / parsed.sampleColumns.length) : null,
        sourceFileId: datasetFile.datasetFileId,
        evidenceLevel: "reported",
        notes: "Aggregated from uploaded peak table. Dataset observation only; not diagnostic, causal, or confirmed biomarker evidence."
      }
    });

    await db.auditLog.create({
      data: {
        userId: options.userId,
        compoundId: compound.compoundId,
        entityName: "compound",
        entityId: compound.compoundId,
        action: "import",
        metadata: {
          importJobId: importJob.importJobId,
          source: "peak_table_csv",
          fileName: options.fileName,
          datasetTitle: dataset.title,
          diseaseName: disease.name
        }
      }
    });
  }

  const summary = {
    ...drySummary,
    dryRun: false,
    createdCompounds,
    createdSamples,
    createdMeasurements,
    importJobId: importJob.importJobId
  };

  await db.importJob.update({
    where: { importJobId: importJob.importJobId },
    data: {
      status: "completed",
      completedAt: new Date(),
      summary: summary as unknown as Prisma.InputJsonValue
    }
  });

  return summary;
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current);
  return values.map((value) => value.trim().replace(/^"|"$/g, ""));
}

function readZipEntries(bytes: Buffer) {
  const entries = new Map<string, Buffer>();
  const endOffset = findEndOfCentralDirectory(bytes);
  const totalEntries = bytes.readUInt16LE(endOffset + 10);
  let offset = bytes.readUInt32LE(endOffset + 16);

  for (let index = 0; index < totalEntries; index += 1) {
    if (bytes.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error("Invalid XLSX central directory");
    }

    const compressionMethod = bytes.readUInt16LE(offset + 10);
    const compressedSize = bytes.readUInt32LE(offset + 20);
    const fileNameLength = bytes.readUInt16LE(offset + 28);
    const extraLength = bytes.readUInt16LE(offset + 30);
    const commentLength = bytes.readUInt16LE(offset + 32);
    const localHeaderOffset = bytes.readUInt32LE(offset + 42);
    const name = bytes.subarray(offset + 46, offset + 46 + fileNameLength).toString("utf8");

    const localNameLength = bytes.readUInt16LE(localHeaderOffset + 26);
    const localExtraLength = bytes.readUInt16LE(localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength;
    const compressed = bytes.subarray(dataStart, dataStart + compressedSize);

    if (compressionMethod === 0) {
      entries.set(name, compressed);
    } else if (compressionMethod === 8) {
      entries.set(name, inflateRawSync(compressed));
    } else {
      throw new Error(`Unsupported XLSX compression method ${compressionMethod}`);
    }

    offset += 46 + fileNameLength + extraLength + commentLength;
  }

  return entries;
}

function findEndOfCentralDirectory(bytes: Buffer) {
  for (let offset = bytes.length - 22; offset >= 0; offset -= 1) {
    if (bytes.readUInt32LE(offset) === 0x06054b50) {
      return offset;
    }
  }

  throw new Error("Invalid XLSX file");
}

function parseSharedStrings(xml: string) {
  const sharedStrings: string[] = [];
  for (const match of xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)) {
    const text = [...match[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((part) => decodeXml(part[1])).join("");
    sharedStrings.push(text);
  }
  return sharedStrings;
}

function parseWorksheetRows(xml: string, sharedStrings: string[]) {
  const rows: string[][] = [];

  for (const rowMatch of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const row: string[] = [];

    for (const cellMatch of rowMatch[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
      const attrs = cellMatch[1];
      const body = cellMatch[2];
      const ref = attrs.match(/\br="([A-Z]+)\d+"/)?.[1];
      const index = ref ? columnNameToIndex(ref) : row.length;
      const type = attrs.match(/\bt="([^"]+)"/)?.[1];
      const rawValue = body.match(/<v>([\s\S]*?)<\/v>/)?.[1];
      const inlineValue = body.match(/<t\b[^>]*>([\s\S]*?)<\/t>/)?.[1];

      if (type === "s" && rawValue !== undefined) {
        row[index] = sharedStrings[Number(rawValue)] ?? "";
      } else if (type === "inlineStr" && inlineValue !== undefined) {
        row[index] = decodeXml(inlineValue);
      } else {
        row[index] = decodeXml(rawValue ?? "");
      }
    }

    rows.push(row.map((value) => value ?? ""));
  }

  return rows.filter((row) => row.some((value) => value.trim().length > 0));
}

function columnNameToIndex(name: string) {
  return name.split("").reduce((total, char) => total * 26 + char.charCodeAt(0) - 64, 0) - 1;
}

function decodeXml(value: string) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function csvEscape(value: string) {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function normalizeCid(value: string | undefined) {
  const cid = Number(value);
  return Number.isInteger(cid) && cid > 0 ? cid : null;
}

function normalizeNumber(value: string | undefined) {
  const number = normalizeNumericValue(value);
  return number === null ? null : new Prisma.Decimal(number);
}

function normalizeNumericValue(value: string | undefined) {
  if (value === undefined || value.trim() === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
