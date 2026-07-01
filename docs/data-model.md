# Data Model

DSCDB stores PubChem CID as the required public compound identifier and uses UUIDs as internal primary keys.

## Core Tables

- `compounds`: one row per curated compound, unique by `pubchem_cid`.
- `compound_identity`: formula, exact mass, molecular weight, InChI, InChIKey, SMILES.
- `compound_names`: common names, IUPAC names, synonyms, trade names, and other aliases.
- `external_identifiers`: database, identifier, URL, source, and notes.
- `datasets`, `dataset_files`, `samples`, `compound_measurements`: GC-MS dataset import structure.
- `compound_disease_presence`: aggregated observation by compound, dataset, and disease.
- `compound_related_diseases`: external or curated disease associations, separate from dataset observations.
- `evidence_records`: structured evidence summaries and references.
- `source_payloads`: raw import payloads retained for traceability.
- `import_jobs`: status, summary, warnings/errors, and timing for imports.
- `audit_logs`: create, update, delete, restore, import, and export events.

## Scientific Rules

- Dataset presence is observational.
- Related diseases are not the same as detection in a dataset.
- Source payload JSON is for audit, not primary display.
- Notes should be clean text with source/type context.
- Evidence should be structured by type, mechanism/context, source, confidence, and references where possible.

## Indexes

The schema includes indexes for common search/filter paths:

- compound names and PubChem CID
- external identifiers
- disease and dataset presence
- dataset title/platform
- artifact flag
- annotation confidence
- pathway external IDs
- target gene symbol and UniProt ID
