# Delete fails for media that a required upload in an array uses (Postgres)

The blank template (`pnpx create-payload-app@latest -t blank`, Postgres) with one change:
a `stores` collection with an array field `banners` that has a required `upload`
sub-field `image` ([src/collections/Stores.ts](src/collections/Stores.ts)).

## Environment

```text
payload: 3.94.0
@payloadcms/db-postgres: 3.94.0
@payloadcms/drizzle: 3.94.0
next: 16.4.6
react: 19.2.9
Node.js: 24.22.3
PostgreSQL: 17.12 (Docker image postgres:17)
OS: macOS (darwin arm64)
```

## Setup

```sh
cp .env.example .env
docker compose up -d
pnpm install
```

## Steps: test

```sh
pnpm test:int tests/int/delete-media.int.spec.ts
```

The test ([tests/int/delete-media.int.spec.ts](tests/int/delete-media.int.spec.ts)):

1. Creates a media document.
2. Creates a store with `banners: [{ image: <media id> }]`.
3. Deletes the media document.

Run only this file. On an empty database, the template's sample test
(`tests/int/api.int.spec.ts`) pushes the same schema at the same time and can fail.

## Steps: admin panel

1. Run `pnpm dev` and open http://localhost:3000/admin. Create the first user.
2. In Media, upload an image.
3. In Stores, create a store. Add one banner with that image. Save.
4. In Media, open the image and delete it.

## Expected

The delete either succeeds with a schema that matches the field, or Payload returns a
validation error that names the documents that use the file.

## Actual

The delete fails with a database error, and the media document stays.

Test output:

```text
FAIL  tests/int/delete-media.int.spec.ts > delete media used by a required upload inside an array > does not fail with a database error
AssertionError: expected 'error: null value in column "image_id…' not to contain 'violates not-null constraint'
Received: "error: null value in column "image_id" of relation "stores_banners" violates not-null constraint"
```

REST API (what the admin panel calls), with a logged-in user:

```text
DELETE /api/media/1
HTTP 500 {"errors":[{"message":"Something went wrong."}]}

GET /api/media/1 after the delete
HTTP 200
```

Server log:

```text
"message": "Failed query: delete from \"media\" where \"media\".\"id\" = $1\nparams: 1: null value in column \"image_id\" of relation \"stores_banners\" violates not-null constraint",
caused by: error: null value in column "image_id" of relation "stores_banners" violates not-null constraint
```

The schema that the adapter pushes:

```text
$ psql -c "SELECT is_nullable FROM information_schema.columns WHERE table_name='stores_banners' AND column_name='image_id'"
NO
$ psql -c "SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname='stores_banners_image_id_media_id_fk'"
FOREIGN KEY (image_id) REFERENCES media(id) ON DELETE SET NULL
```

The column is `NOT NULL` because the field is required. The foreign key is
`ON DELETE SET NULL`. Postgres cannot do both, so the delete of the media row fails.
