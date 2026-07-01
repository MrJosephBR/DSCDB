# DSCDB

DSCDB is a research console for scientific curation and consultation of volatile organic compounds (VOCs) in public or anonymized GC-MS breathomics datasets. It is designed for compound identity, dataset presence, evidence, diseases, pathways, targets, references, auditability, and repeatable local imports.

DSCDB is not a clinical diagnostic tool. A compound observed in an asthma, bronchiectasis, COPD, or other disease dataset is stored as dataset presence only; it is not a causal, diagnostic, or confirmed biomarker claim.

## Stack

- Next.js, React, TypeScript
- Prisma ORM
- PostgreSQL
- Docker Compose
- Zod validation for curated JSON import
- Vitest for importer/domain tests

## Project Structure

- `src/app`: Next.js routes, UI, API endpoints
- `src/modules`: domain services, auth, importers, exporters, audit
- `prisma/schema.prisma`: database model
- `prisma/migrations`: deployable database migrations
- `prisma/seed.ts`: clean local seed for source origins, vocabularies, and demo admin user
- `docs`: technical documentation for data model, imports, Docker, curation, and troubleshooting

## Environment Variables

Use `.env.example` as the committed template:

```bash
cp .env.example .env
```

Do not commit `.env`. The repo intentionally ignores `.env` and `.env*.local`.

Important variables:

- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: replace the demo value before sharing any deployed instance
- `APP_URL`: local or deployed app URL
- `UPLOAD_DIR`: app-container upload directory
- `MAX_UPLOAD_SIZE_MB`: upload limit
- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`: Docker database bootstrap values

There is no `example.env` standard in this project; use `.env.example`.

## Local Docker Run

```bash
cp .env.example .env
docker compose up -d --build
```

Open:

```text
http://localhost:3000
```

Health check:

```text
http://localhost:3000/api/health
```

The app container runs migrations and seed during startup through the Docker entrypoint.

## Local Run Without Docker

Use a PostgreSQL database reachable from the host and set:

```env
DATABASE_URL="postgresql://voc_user:voc_password@localhost:5432/vocs_db"
```

Then run:

```bash
npm install
npm run prisma:generate
npm run prisma:dev
npm run db:seed
npm run dev
```

## Migrations And Seed

Deploy migrations:

```bash
npm run prisma:migrate
```

Seed local reference data:

```bash
npm run db:seed
```

Reset a non-Docker local database managed by Prisma:

```bash
npm run db:reset
```

`prisma/seed.ts` currently creates source origins, chemical vocabularies, compound types, and one local admin user. It does not create hidden compound demo data. If demo compounds are needed, place them in `prisma/demo-data` and import them explicitly from the seed.

## Clean Docker Reset

Use this when you need to prove whether visible compounds came from old Postgres volumes, previous imports, seeds, or hardcoded UI data:

```bash
docker compose down -v
docker compose up -d --build
docker compose exec app npx prisma migrate deploy
docker compose exec app npx prisma db seed
```

After `docker compose down -v`, all Postgres volume data is removed. With the current seed, the app should start with reference data and the demo admin user, but no compounds unless you import them.

## Demo Credentials

Local seed user:

```text
email: admin@example.local
password: change-me
```

Change this password and `JWT_SECRET` before sharing a deployed instance.

## Data Origin Checklist

When compounds appear after startup, check in this order:

1. Prisma seed: `prisma/seed.ts`
2. Persistent Docker/Postgres volume data from earlier imports
3. Import jobs in `/imports`
4. Source payloads linked to compounds
5. Hardcoded UI data

At the time of this revision, compound pages query the database and no compound list/detail data is hardcoded in React components.

## Compound JSON Import

Use `/imports` or:

```text
POST /api/import/compounds-json
multipart form field: file
```

This endpoint autodetects:

- Legacy DSCDB JSON v1: old viewer files with `compounds[].identifiers`, `interactions`, `reactions_pathways`, and related legacy sections.
- DSCDB JSON v2: official normalized format with `schema_version = "DSCDB_COMPOUND_V2"`.

Force legacy v1 when needed:

```text
POST /api/import/legacy-compounds-json
multipart form field: file
```

Dry run:

```text
POST /api/import/compounds-json?dryRun=1
multipart form fields: file, dryRun=true
```

Official v2 top-level shape:

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

The legacy normalizer preserves identifiers, classifications, disease associations, pathways/reactions/enzymes, targets/interactions, PDB structures, literature evidence, respiratory relevance, artifact assessment, notes, peaktable presence, and the original compound payload.

Import summaries include `detected_format`, entity counts, warnings, and errors. Raw original compound JSON is stored in `source_payloads` for audit. Notes and evidence summaries are converted to readable text instead of storing raw JSON strings as visible content.

More details: `docs/import-json.md`, `docs/blueprint-json-v2.md`, and `docs/examples/compound-v2.example.json`.

## Peak Table CSV/XLSX Import

Use `/imports` or:

```text
POST /api/import/peak-table
multipart form fields: file, datasetTitle, diseaseName
```

Supported files:

- `Asthma_peaktable_ver3.csv`
- `Bronchi_peaktable_ver3.csv`
- `COPD_peaktable_ver3.csv`
- `.xlsx` worksheets with the same table shape

Expected table:

```csv
pubchem_cid,SAMPLE_001,SAMPLE_002
460,123.4,0
702,0,55.2
```

The importer creates or updates dataset, disease, source file, samples, compounds by PubChem CID, measurements, and aggregated `compound_disease_presence`.

Metadata workbooks such as `CBD_metadata_for_ver3.xlsx` and `Intersection_of_detected_compounds.xlsx` are documented in `docs/import-peak-tables.md`; dedicated metadata mapping can be extended there without changing the core measurement importer.

## Main Entities

- `Compound`: unique by `pubchem_cid`
- `CompoundIdentity`: formula, mass, InChI, SMILES
- `ExternalIdentifier`: database-specific IDs
- `Dataset`, `Sample`, `CompoundMeasurement`: GC-MS dataset observations
- `CompoundDiseasePresence`: aggregated dataset presence by disease and dataset
- `CompoundRelatedDisease`: literature/database disease associations, separate from dataset presence
- `EvidenceRecord`: structured evidence summaries
- `Reference`: DOI/PMID/URL/citation metadata
- `Pathway`, `Target`, `PdbStructure`: knowledge links
- `SourcePayload`: original import payload for traceability
- `ImportJob`: import status, summary, errors/warnings
- `AuditLog`: curation actions

## Curation Flow

1. Import curated JSON or peak tables through `/imports`.
2. Review import summary and warnings.
3. Search compounds in `/compounds`.
4. Open a compound detail page and inspect source payloads only when auditing.
5. Curate evidence, disease links, pathways, targets, notes, and artifact status.
6. Review duplicates in `/duplicates`.
7. Export filtered JSON from `/compounds` or `/api/export/combined`; v2 is the default, and `?format=legacy` is available for viewer compatibility.

## Permissions

Read routes are available to the app UI. Write actions require login:

- compound create/update/delete: `admin`, `curator`, `editor`
- imports: `admin`, `curator`, `editor`
- duplicate review updates: `admin`, `curator`
- user management: `admin`

## Useful Commands

```bash
npm run dev
npm run build
npm run lint
npm test
npm run prisma:generate
npm run prisma:migrate
npm run db:seed
npm run db:reset
npx prisma validate
```

Docker:

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f app
docker compose down -v
```

## Troubleshooting

- Compounds remain after reset: confirm you ran `docker compose down -v`, not only `down`.
- Login fails after reset: reseed with `docker compose exec app npx prisma db seed`.
- JSON appears in visible notes: old imported records may still contain serialized text; reimport after this revision or clean the affected notes.
- Import fails on CID: every compound row requires a positive PubChem CID.
- Docker app cannot connect to DB: inside Compose, `DATABASE_URL` must use host `db`.

## Roadmap

- Rich metadata mapping for `CBD_metadata_for_ver3.xlsx`
- Intersection workbook importer
- Pagination controls beyond the current record limit
- More granular import warning counts
- Dedicated SourcePayload audit filters
- Optional sidebar collapse control
