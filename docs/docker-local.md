# Docker Local

Start from a clean checkout:

```bash
cp .env.example .env
docker compose up -d --build
```

Open `http://localhost:3000`.

## Clean Reset

```bash
docker compose down -v
docker compose up -d --build
docker compose exec app npx prisma migrate deploy
docker compose exec app npx prisma db seed
```

`down -v` removes the Postgres volume. After this, compounds should only appear after an import or explicit demo seed.

## Logs

```bash
docker compose ps
docker compose logs -f app
docker compose logs -f db
```

Inside Compose, `DATABASE_URL` must use host `db`.
