import { describe, expect, it } from "vitest";
import { serializeCombinedExport, serializeCompoundForExport } from "@/modules/export/compound-exporter";

const compound = {
  compoundId: "compound-1",
  pubchemCid: 460,
  commonName: "Guaiacol",
  iupacName: "2-methoxyphenol",
  molecularFormula: "C7H8O2",
  molecularWeight: "124.137",
  annotationSummary: null,
  identity: {
    inchi: null,
    inchiKey: "LHGVFZTZFXWLCP-UHFFFAOYSA-N",
    smiles: "COC1=CC=CC=C1O",
    canonicalSmiles: null
  },
  names: [],
  externalIdentifiers: [],
  classificationLinks: [],
  typeLinks: [],
  diseasePresence: [
    {
      dataset: { datasetId: "dataset-1", title: "Curated JSON peaktable_presence", analyticalPlatform: "curated-json" },
      disease: { diseaseId: "disease-1", name: "Asthma", ontologyId: null },
      evidenceLevel: "reported",
      frequency: null,
      presencePercent: null,
      notes: "Dataset observation only"
    }
  ],
  relatedDiseases: [
    {
      disease: { diseaseId: "disease-2", name: "Lung disease", ontologyId: null },
      assertion: "reported",
      notes: null,
      originalReference: null,
      sources: [
        {
          role: "secondary",
          sourceRecordId: null,
          sourceOrigin: { sourceOriginId: "source-1", name: "PubChem", kind: "database", url: null }
        }
      ]
    }
  ],
  references: [],
  evidenceRecords: [],
  annotationConfidence: null,
  artifactAssessments: [],
  pathways: [],
  targets: [],
  notes: [],
  sourcePayloads: []
};

describe("compound JSON exporter", () => {
  it("keeps dataset presence separate from related diseases", () => {
    const exported = serializeCompoundForExport(compound);

    expect(exported.dataset_presence).toHaveLength(1);
    expect(exported.related_diseases).toHaveLength(1);
    expect(exported.dataset_presence[0].disease.name).toBe("Asthma");
    expect(exported.related_diseases[0].disease.name).toBe("Lung disease");
  });

  it("exports combined viewer-compatible metadata", () => {
    const exported = serializeCombinedExport([compound], { disease: "Asthma" });

    expect(exported.schema_version).toBe("DSCDB_COMPOUND_V2");
    expect(exported.exported_at).toBeTruthy();
    expect(exported.filters).toEqual({ disease: "Asthma" });
    expect(exported.compounds[0].identity.pubchem_cid).toBe(460);
  });

  it("can export legacy viewer-compatible metadata", () => {
    const exported = serializeCombinedExport([compound], { disease: "Asthma" }, "legacy");

    expect(exported.schema_version).toBe("dscdb.viewer.v1");
    expect(exported.compounds[0].identifiers.pubchem_cid).toBe("460");
  });
});
