# JSON Import

DSCDB supports two compound JSON formats.

## Legacy DSCDB JSON v1

Legacy v1 is the old viewer format used by `index.html`. It is detected when compounds contain `identifiers` plus legacy sections such as `reactions_pathways` or `interactions`.

Common legacy sections:

- `identifiers`, `identifier_links`
- `classifications`
- `metabolites`
- `interactions`
- `reactions_pathways`
- `literature_evidence`
- `respiratory_relevance`
- `exposure_artifact_assessment`
- `structures`
- `references`
- `database_notes`
- `peaktable_presence`

Use:

```text
POST /api/import/compounds-json
POST /api/import/legacy-compounds-json
```

`/api/import/compounds-json` autodetects v1 or v2. `/api/import/legacy-compounds-json` forces legacy v1 and rejects v2.

## DSCDB JSON v2

The official v2 format is detected by:

```json
{
  "schema_version": "DSCDB_COMPOUND_V2"
}
```

Top-level shape:

```json
{
  "schema_version": "DSCDB_COMPOUND_V2",
  "compounds": [
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
  ]
}
```

See `docs/blueprint-json-v2.md` and `docs/examples/compound-v2.example.json`.

## Dry Run

Dry run validates and previews counts without writing:

```text
POST /api/import/compounds-json?dryRun=1
multipart form fields: file, dryRun=true
```

The result includes:

- `detected_format`
- compound created/updated counts
- identifiers, names, classifications
- dataset presence
- related diseases
- pathways, targets, PDB structures
- evidence records, references, notes
- source payloads
- warnings and errors

## Mapping Summary

- Legacy identifiers map to `Compound`, `CompoundIdentity`, `CompoundName`, and `ExternalIdentifier`.
- `common_name` becomes a common/primary name; `iupac_name` is also stored as an IUPAC name.
- HMDB, KEGG, PubChem, InChI, InChIKey, SMILES, PDB, PathBank, BioCyc, PlantCyc, DrugBank, UniProt, CAS, and ChEBI become external identifiers when present.
- ClassyFire-like fields map to `CompoundClassification`; KEGG BRITE is preserved as a structured classification/note.
- `metabolites.disease_summary` and `secondary_disease_associations` map to related diseases and evidence records, not dataset presence.
- `interactions.*` maps to targets/interactions. Secondary or mixed-source records are marked in notes as `Evidence context: secondary/mixed-source` and are not treated as direct targets.
- `reactions_pathways.*` maps to pathways. Reactions, enzymes, and related compounds are preserved through pathway `role` and readable notes when dedicated tables do not exist.
- `structures.*pdb*` maps to `PdbStructure`; `PDB:` prefixes are normalized away for internal IDs.
- `literature_evidence.*` maps to `EvidenceRecord`; `evidence_gaps` become evidence records with category `evidence_gap`.
- `respiratory_relevance` maps to interpretive evidence records. These are interpretation records, not causal or diagnostic claims.
- `exposure_artifact_assessment` maps to artifact assessment, annotation confidence, and curator notes.
- `peaktable_presence` maps to `CompoundDiseasePresence` in the placeholder dataset `Legacy curated JSON import` with source `legacy_json`.
- The original legacy compound object is always saved in `SourcePayload` with `payloadType = legacy_compound_json_v1`.

## Scientific Warning

Dataset presence means an observation in a dataset/cohort. It does not mean diagnosis, causality, or a validated biomarker. Keep `dataset_presence` separate from `related_diseases` and interpretive `evidence_records`.

## Export

JSON export defaults to v2:

```text
GET /api/export/combined?format=v2
GET /api/compounds/{compoundId}/export?format=v2
```

Legacy viewer export is available when needed:

```text
GET /api/export/combined?format=legacy
GET /api/compounds/{compoundId}/export?format=legacy
```
