import { describe, expect, it } from "vitest";
import {
  annotationConfidenceSchema,
  artifactAssessmentSchema,
  createCompoundSchema,
  diseasePresenceSchema,
  externalIdentifierSchema,
  pathwaySchema,
  targetSchema
} from "@/modules/compounds/schemas";

describe("compound CRUD schemas", () => {
  it("accepts a basic manually created compound", () => {
    const parsed = createCompoundSchema.parse({
      pubchemCid: 460,
      commonName: "Guaiacol"
    });

    expect(parsed.pubchemCid).toBe(460);
    expect(parsed.names).toEqual([]);
    expect(parsed.externalIdentifiers).toEqual([]);
  });

  it("accepts a complete scientific compound payload", () => {
    const parsed = createCompoundSchema.parse({
      pubchemCid: 460,
      commonName: "Guaiacol",
      iupacName: "2-methoxyphenol",
      molecularFormula: "C7H8O2",
      molecularWeight: "124.14",
      annotationSummary: "Curated VOC",
      identity: {
        formula: "C7H8O2",
        exactMass: "124.0524",
        smiles: "COC1=CC=CC=C1O",
        canonicalSmiles: "COC1=CC=CC=C1O",
        isomericSmiles: "COC1=CC=CC=C1O",
        inchi: "InChI=1S/C7H8O2/c1-9-7-5-3-2-4-6(7)8/h2-5,8H,1H3",
        inchiKey: "LHGVFZTZFXWLCP-UHFFFAOYSA-N"
      },
      names: [{ name: "2-methoxyphenol", nameType: "iupac", language: "en" }],
      externalIdentifiers: [{ database: "HMDB", identifier: "HMDB0000001" }],
      classyFire: {
        kingdom: "Organic compounds",
        superclass: "Benzenoids",
        class: "Phenols",
        subclass: "Methoxyphenols",
        directParent: "Guaiacols",
        alternativeParents: ["Phenol ethers"],
        molecularFramework: "Aromatic homomonocyclic compounds",
        rawJson: { source: "ClassyFire" }
      },
      diseasePresence: [
        {
          datasetTitle: "Asthma peak table",
          diseaseName: "Asthma",
          observed: true,
          observedCount: 3,
          totalSamples: 20,
          frequency: 0.15,
          evidenceLevel: "reported",
          notes: "Observed in dataset only"
        }
      ],
      relatedDiseases: [
        {
          diseaseName: "Respiratory disease",
          assertion: "reported",
          sources: [{ name: "PubChem", role: "secondary" }]
        }
      ],
      references: [{ doi: "10.1000/example", citationText: "Example citation", context: "manual" }],
      evidenceRecords: [{ evidenceType: "literature", humanEvidence: true, summary: "Reported in humans" }],
      annotationConfidence: { level: "high", score: 0.95, method: "manual curation" },
      artifactAssessments: [{ flag: "possible_artifact", artifactType: "contaminant", rationale: "Also reported in blanks" }],
      pathways: [{ name: "Phenol metabolism", database: "KEGG", biologicalContext: "human" }],
      targets: [{ name: "CYP2E1", geneSymbol: "CYP2E1", organism: "Homo sapiens", directness: "predicted" }],
      pdbStructures: [{ pdbId: "1ABC", ligandId: "GUA", chain: "A" }],
      notes: [{ noteType: "curation_notes", note: "Manual review" }],
      sourcePayloads: [{ sourceName: "original_json", payloadType: "curated", payload: { ok: true } }]
    });

    expect(parsed.identity?.exactMass).toBe(124.0524);
    expect(parsed.classyFire?.alternativeParents).toContain("Phenol ethers");
    expect(parsed.pathways[0].biologicalContext).toBe("human");
    expect(parsed.targets[0].directness).toBe("predicted");
  });

  it("validates external identifier database names", () => {
    expect(externalIdentifierSchema.parse({ database: "KEGG", identifier: "C01513" })).toMatchObject({
      database: "KEGG",
      identifier: "C01513"
    });
    expect(() => externalIdentifierSchema.parse({ database: "NotADB", identifier: "x" })).toThrow();
  });

  it("requires dataset and disease identity for disease presence", () => {
    expect(() => diseasePresenceSchema.parse({ datasetTitle: "Dataset only" })).toThrow();
    expect(diseasePresenceSchema.parse({ datasetTitle: "Dataset", diseaseName: "COPD" })).toMatchObject({
      evidenceLevel: "reported"
    });
  });

  it("keeps pathway contexts and target directness constrained", () => {
    expect(pathwaySchema.parse({ name: "PathBank pathway", biologicalContext: "microbial" }).biologicalContext).toBe("microbial");
    expect(() => pathwaySchema.parse({ name: "Bad pathway", biologicalContext: "ambiguous" })).toThrow();
    expect(targetSchema.parse({ name: "Target", directness: "direct" }).directness).toBe("direct");
    expect(() => targetSchema.parse({ name: "Target", directness: "direct_human" })).toThrow();
  });

  it("accepts artifact and annotation confidence blocks", () => {
    expect(artifactAssessmentSchema.parse({ flag: "unlikely_artifact" }).flag).toBe("unlikely_artifact");
    expect(annotationConfidenceSchema.parse({ level: "medium", score: "0.75" }).score).toBe(0.75);
  });
});
