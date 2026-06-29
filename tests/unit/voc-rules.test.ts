import { describe, expect, it } from "vitest";
import {
  assertPubChemCidIsAvailable,
  createCompoundDraft,
  createPresenceRecord,
  createRelatedDiseaseDraft,
  softDeleteEntity
} from "@/modules/compounds/domain";
import { serializeCompoundForExport } from "@/modules/export/compound-exporter";

describe("VOC domain rules", () => {
  it("rejects duplicate PubChem CID values", () => {
    expect(() => assertPubChemCidIsAvailable(702, new Set([702]))).toThrow("PubChem CID 702 already exists");
  });

  it("creates a compound draft with PubChem CID as required scientific identifier", () => {
    const draft = createCompoundDraft(
      {
        pubchemCid: 702,
        commonName: "Ethanol",
        names: []
      },
      new Set()
    );

    expect(draft).toMatchObject({
      pubchemCid: 702,
      commonName: "Ethanol",
      deletedAt: null
    });
  });

  it("uses soft delete instead of physical deletion", () => {
    const deletedAt = new Date("2026-06-29T00:00:00.000Z");
    const entity = softDeleteEntity({ compoundId: "compound-1", deletedAt: null }, deletedAt);

    expect(entity.deletedAt).toBe(deletedAt);
  });

  it("records disease presence without causal or biomarker assertions", () => {
    const presence = createPresenceRecord({
      compoundId: "compound-1",
      datasetId: "dataset-1",
      diseaseId: "disease-1",
      evidenceLevel: "reported",
      notes: "Reported in a public dataset"
    });

    expect(presence).toEqual({
      compoundId: "compound-1",
      datasetId: "dataset-1",
      diseaseId: "disease-1",
      evidenceLevel: "reported",
      notes: "Reported in a public dataset"
    });
    expect(presence).not.toHaveProperty("causal");
    expect(presence).not.toHaveProperty("biomarker");
  });

  it("requires at least one source for a related disease assertion", () => {
    expect(() =>
      createRelatedDiseaseDraft({
        compoundId: "compound-1",
        diseaseId: "disease-1",
        assertion: "reported",
        sources: []
      })
    ).toThrow("Related disease requires at least one original or secondary source");
  });

  it("exports JSON with dataset_presence separated from related_diseases", () => {
    const exported = serializeCompoundForExport({
      compoundId: "compound-1",
      pubchemCid: 702,
      commonName: "Ethanol",
      iupacName: "ethanol",
      molecularFormula: "C2H6O",
      molecularWeight: "46.068",
      annotationSummary: null,
      identity: null,
      names: [],
      externalIdentifiers: [],
      classificationLinks: [],
      typeLinks: [],
      diseasePresence: [
        {
          dataset: {
            datasetId: "dataset-1",
            title: "Public breath VOC dataset",
            analyticalPlatform: "GC-MS"
          },
          disease: {
            diseaseId: "disease-1",
            name: "Asthma",
            ontologyId: null
          },
          evidenceLevel: "reported",
          frequency: null,
          presencePercent: null,
          notes: null
        }
      ],
      relatedDiseases: [
        {
          disease: {
            diseaseId: "disease-2",
            name: "Respiratory disease",
            ontologyId: null
          },
          assertion: "reported",
          notes: null,
          originalReference: null,
          sources: [
            {
              role: "secondary",
              sourceOrigin: {
                sourceOriginId: "source-1",
                name: "PubChem",
                kind: "database",
                url: "https://pubchem.ncbi.nlm.nih.gov"
              }
            }
          ]
        }
      ]
      ,
      references: [],
      evidenceRecords: [],
      annotationConfidence: null,
      artifactAssessments: [],
      pathways: [],
      targets: [],
      notes: [],
      sourcePayloads: []
    });

    expect(exported.dataset_presence).toHaveLength(1);
    expect(exported.related_diseases).toHaveLength(1);
    expect(exported.dataset_presence[0].disease.name).toBe("Asthma");
    expect(exported.related_diseases[0].sources[0].source_origin.name).toBe("PubChem");
  });
});
