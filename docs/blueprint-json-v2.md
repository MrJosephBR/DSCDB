# DSCDB JSON v2 Blueprint

The official compound exchange format uses:

```json
{
  "schema_version": "DSCDB_COMPOUND_V2",
  "compounds": []
}
```

Each compound is normalized around Prisma-backed entities:

```json
{
  "identity": {},
  "names": [],
  "external_identifiers": [],
  "classifications": [],
  "compound_types": [],
  "dataset_presence": [],
  "related_diseases": [],
  "pathways": [],
  "targets": [],
  "pdb_structures": [],
  "evidence_records": [],
  "references": [],
  "artifact_assessment": {},
  "annotation_confidence": {},
  "curator_notes": [],
  "source_payloads": []
}
```

## Scientific Semantics

`dataset_presence` means a compound was observed in an imported dataset/cohort. It must not be interpreted as diagnosis, causality, or a validated biomarker claim.

`related_diseases` and `evidence_records` are literature/database/curation statements. Interpretive respiratory records should be marked as interpretation, not causal or diagnostic evidence.

`source_payloads` are audit records. They preserve original import data and should not be displayed as primary compound content.

## Field Mapping

- `identity`: PubChem CID, formula, exact mass, molecular weight, InChI, InChIKey, SMILES.
- `names`: common, IUPAC, synonym, trade, or other names.
- `external_identifiers`: PubChem, HMDB, KEGG, CAS, ChEBI, InChIKey, InChI, SMILES, PDB, PathBank, BioCyc, PlantCyc, DrugBank, UniProt, or Other.
- `classifications`: chemical classifications such as ClassyFire or KEGG BRITE.
- `compound_types`: endogenous, exogenous, microbial, dietary, environmental, artifact/contaminant, or local curated types.
- `dataset_presence`: dataset-level disease/cohort observation records.
- `related_diseases`: non-dataset disease associations from databases, literature, or curated sources.
- `pathways`: pathway, reaction, enzyme, or related-compound records when no dedicated reaction/enzyme table exists.
- `targets`: target/interactions with gene symbol, UniProt, organism, action, directness, and evidence context.
- `pdb_structures`: PDB structures and compound links.
- `evidence_records`: literature findings, mechanism records, interpretations, and evidence gaps.
- `artifact_assessment`: exposure, contamination, endogenous/exogenous, and analytical artifact interpretation.
- `annotation_confidence`: curation confidence level and rationale.
- `curator_notes`: structured visible notes only.
- `source_payloads`: raw/audit payload metadata.

See `docs/examples/compound-v2.example.json`.
