# VOCs Breathomics DB

Research, scientific curation, and knowledge-management platform for volatile organic compounds (VOCs) in public or anonymized breathomics datasets.

The v1 scope is not clinical diagnosis. A compound detected in a disease dataset is stored as dataset presence only; it is not treated as causal, diagnostic, or a confirmed biomarker.

## Stack

- Node.js, TypeScript, Next.js
- Prisma ORM
- PostgreSQL
- Docker Compose

## Quick Start

```bash
cp .env.example .env
docker compose up -d --build
```

The app container runs Prisma migrations and seed automatically on start. The web app is exposed at:

```text
http://localhost:3000
```

Health check:

```text
GET /api/health
```

Seed credentials for local development:

```text
email: admin@example.local
password: change-me
```

Login writes the `dscdb_session` HTTP-only cookie.

## Curated JSON Import

Open the import screen:

```text
http://localhost:3000/imports
```

Or post a `.json` file as multipart form data:

```text
POST /api/import/compounds-json
form field: file
```

Dry-run before writing:

```text
POST /api/import/compounds-json?dryRun=1
form fields: file, dryRun=true
```

The first importer supports files shaped like:

```json
{
  "compounds": [
    {
      "identifiers": {
        "pubchem_cid": "460",
        "common_name": "Guaiacol",
        "iupac_name": "2-methoxyphenol",
        "formula": "C7H8O2",
        "inchikey": "LHGVFZTZFXWLCP-UHFFFAOYSA-N",
        "smiles": "COC1=CC=CC=C1O",
        "hmdb_id": "HMDB0000001",
        "kegg_id": "C01513"
      },
      "database_notes": [],
      "peaktable_presence": {
        "asthma": 1,
        "bronchiectasis": 0,
        "COPD": 0
      }
    }
  ]
}
```

The importer upserts compound identity fields, external identifiers, ClassyFire-style classifications, compound types, references, evidence records, pathways, targets, related diseases with sources, artifact assessments, annotation confidence, raw source payloads, database notes, respiratory relevance notes, and cautious nonzero peaktable presence records. Zero values are not imported as absence. Presence rows are dataset observations only and are not treated as diagnosis, causality, or confirmed biomarker claims.

The full original compound object is preserved in `source_payloads`. Unknown or partially mapped blocks such as PDB structures, SIMCOMP/similarity, nested pathway data, miscellaneous database notes, and viewer-specific fields are never discarded.

## Peak Table Import

The first peak-table importer supports CSV files with one PubChem CID column and sample columns:

```csv
pubchem_cid,SAMPLE_001,SAMPLE_002
460,123.4,0
702,0,55.2
```

Use `/imports` or:

```text
POST /api/import/peak-table?dryRun=1
form fields: file, datasetTitle, diseaseName, dryRun
```

The importer creates datasets, dataset files, diseases, samples, compounds by PubChem CID, measurements, and aggregated `compound_disease_presence`. Presence remains a dataset observation only.

## Main Pages

- `/compounds` searchable compound table
- `/compounds/[compoundId]` compound detail
- `/compounds/new` create compound
- `/datasets` datasets and disease cohorts
- `/diseases` diseases and linked compounds
- `/imports` JSON upload, dry-run, summary, and job history
- `/duplicates` duplicate review queue
- `/audit` audit log
- `/users` admin-only user management
- `/login` local development login

## API Routes

- `GET /api/compounds`
- `POST /api/compounds`
- `GET /api/compounds/[id]`
- `PATCH /api/compounds/[id]`
- `DELETE /api/compounds/[id]`
- `GET /api/datasets`
- `GET /api/diseases`
- `GET /api/imports`
- `POST /api/import/compounds-json`
- `POST /api/import/peak-table`
- `GET /api/audit`
- `GET /api/duplicates`
- `PATCH /api/duplicates/[id]`
- `GET /api/auth/me`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/users`
- `POST /api/users`
- `PATCH /api/users/[id]`
- `DELETE /api/users/[id]`
- `GET /api/export/combined`

Write routes require login as `editor`, `curator`, or `admin`. Duplicate review updates require `curator` or `admin`.
User management requires `admin`.

Combined export supports filters:

```text
/api/export/combined?disease=Asthma&dataset=Curated&cidMin=100&cidMax=999&artifactFlag=unknown
```

## Development

```bash
npm install
npm run prisma:generate
npm run prisma:dev
npm run prisma:seed
npm run dev
```

When running outside Docker, use a localhost database URL:

```env
DATABASE_URL="postgresql://voc_user:voc_password@localhost:5432/vocs_db"
```

## Tests

```bash
npm test
```

Initial tests cover:

- PubChem CID uniqueness rule
- compound creation contract
- soft delete behavior
- disease presence without causality or biomarker assertion
- related disease source requirement
- JSON export separation between `dataset_presence` and `related_diseases`
- Curated JSON import with richer viewer fields
- Peak table CSV parsing, invalid CIDs, and duplicate CIDs

## Data Model Rules

- `pubchem_cid` is required and unique for every compound.
- `compound_id` UUID is the technical primary key and relationship target.
- Diseases are modeled through `datasets`, `diseases`, and `compound_disease_presence`.
- New diseases and datasets do not require schema changes.
- Related diseases are separate from dataset presence.
- Original and secondary sources are stored for related disease assertions.
- JSONB is reserved for original payload backup and unmapped source data.
- Edits are written to `audit_logs`.
- Deletes are logical via `deleted_at`.
- Duplicate candidates are reviewed, not merged automatically.

## Docker

Local build and run:

```bash
docker compose up -d --build
docker compose ps
```

Expected local URLs:

```text
App: http://localhost:3000
Health: http://localhost:3000/api/health
```

The default Compose profile starts PostgreSQL 16 and the Next.js app. PostgreSQL is internal to Docker and is not published to the host. For production reverse proxy with Caddy:

```bash
docker compose --profile production up -d --build
```

## Oracle VPS

On the VPS:

```bash
git clone <repo-url> vocs-db
cd vocs-db
cp .env.example .env
```

Edit `.env`:

```env
APP_ENV="production"
APP_URL="https://your-domain.example.com"
APP_DOMAIN="your-domain.example.com"
JWT_SECRET="replace_with_a_long_random_secret"
DATABASE_URL="postgresql://voc_user:strong_password@db:5432/vocs_db"
POSTGRES_PASSWORD="strong_password"
```

Then run:

```bash
docker compose --profile production up -d --build
```

Open only ports `80` and `443` publicly. Do not expose PostgreSQL.

## Backup And Restore

Run backups with:

```bash
BACKUP_DIR=/srv/vocs-backups ./scripts/backup.sh
```

Restore database example:

```bash
docker exec -i voc-db psql -U voc_user -d vocs_db < /srv/vocs-backups/vocs_db_YYYYMMDD_HHMMSS.sql
```

Restore uploads example:

```bash
docker run --rm -v dscdb_uploads:/uploads -v /srv/vocs-backups:/backups alpine sh -c "cd /uploads && tar -xzf /backups/uploads_YYYYMMDD_HHMMSS.tar.gz"
```
