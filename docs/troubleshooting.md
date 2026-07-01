# Troubleshooting

## Compounds Still Appear After Reset

Run `docker compose down -v`. Without `-v`, the old Postgres volume remains.

## Seed Data Is Confusing

`prisma/seed.ts` creates reference/source vocabularies and the local admin user. It does not create hidden compounds.

## JSON Shows In Tables

New imports convert complex note/evidence objects to readable text and store raw objects in `source_payloads`. For older imports, reimport the source file or clean affected notes/evidence records.

## Import Fails

Check that every compound has `identifiers.pubchem_cid`, and every peak table has a PubChem CID column plus at least one sample column.

## Login Fails

After a clean reset:

```bash
docker compose exec app npx prisma db seed
```

Then use `admin@example.local` / `change-me` locally.
