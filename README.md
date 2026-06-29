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
docker compose up -d
docker compose exec app npx prisma migrate deploy
docker compose exec app npx prisma db seed
```

The web app is exposed at:

```text
http://localhost:3000
```

Health check:

```text
GET /api/health
```

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

For this milestone, the importer upserts basic compound identity fields, external identifiers, raw source payloads, database notes, respiratory relevance notes, artifact assessment notes, and cautious nonzero peaktable presence records. Zero values are not imported as absence. Presence rows are dataset observations only and are not treated as diagnosis, causality, or confirmed biomarker claims.

## Main Pages

- `/compounds` searchable compound table
- `/compounds/[compoundId]` compound detail
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

## Production Notes

For Oracle VPS production, PostgreSQL is not exposed publicly in `docker-compose.yml`; it is available only on the internal Docker network. Caddy terminates HTTP/HTTPS and proxies to the app service. Use a real `.env` on the server, set `APP_DOMAIN`, keep `JWT_SECRET` private, and run backups with:

```bash
BACKUP_DIR=/srv/vocs-backups ./scripts/backup.sh
```
