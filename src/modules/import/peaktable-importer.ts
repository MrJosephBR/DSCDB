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
};

export function parsePeakTableCsv(text: string) {
  const rows = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(parseCsvLine);

  if (rows.length < 2) {
    throw new Error("Peak table CSV must include a header row and at least one data row");
  }

  const headers = rows[0].map((header) => header.trim());
  const cidIndex = headers.findIndex((header) => /pubchem|cid/i.test(header));

  if (cidIndex === -1) {
    throw new Error("Peak table CSV must include a PubChem CID column");
  }

  const sampleIndexes = headers
    .map((header, index) => ({ header, index }))
    .filter((item) => item.index !== cidIndex && item.header.length > 0);

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

  const parsed = parsePeakTableCsv(text);
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
      fileKind: "csv",
      fileType: "text/csv",
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
      update: { diseaseId: disease.diseaseId, cohortLabel: disease.name },
      create: {
        datasetId: dataset.datasetId,
        diseaseId: disease.diseaseId,
        sampleCode: column.header,
        cohortLabel: disease.name
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
  }

  return {
    ...drySummary,
    dryRun: false,
    createdCompounds,
    createdSamples,
    createdMeasurements
  };
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
