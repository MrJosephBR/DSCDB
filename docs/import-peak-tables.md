# Peak Table Import

Use `/imports` or `POST /api/import/peak-table` with multipart fields:

- `file`: `.csv` or `.xlsx`
- `datasetTitle`: dataset title
- `diseaseName`: disease/cohort name
- `dryRun`: optional `true`

## Supported Input

The importer supports tables shaped as PubChem CID by sample columns:

```csv
pubchem_cid,SAMPLE_001,SAMPLE_002
460,123.4,0
702,0,55.2
```

Files named like these are expected to work when they follow that shape:

- `Asthma_peaktable_ver3.csv`
- `Bronchi_peaktable_ver3.csv`
- `COPD_peaktable_ver3.csv`

## What It Creates

- `Dataset`
- `Disease`
- `DatasetFile`
- `Sample`
- `Compound`
- `CompoundMeasurement`
- `CompoundDiseasePresence`
- `ImportJob`
- `AuditLog`

Zero or blank values are stored as not detected/missing measurements. Aggregated presence remains observational and is never a diagnostic claim.

## Metadata Workbooks

`CBD_metadata_for_ver3.xlsx` and `Intersection_of_detected_compounds.xlsx` are not yet full metadata import sources. Use them as curation references or extend the importer with explicit mapping rules before automatic ingestion.
