# `payload-locked-documents` rows cross tenants (multi-tenant plugin)

The blank template (`pnpx create-payload-app@latest -t blank`, Postgres) with one change:
`@payloadcms/plugin-multi-tenant`, a `tenants` collection and a tenant-scoped `pages`
collection ([src/payload.config.ts](src/payload.config.ts)). The plugin uses its
defaults, so no user has access to all tenants.

`getLockedDocumentsCollection` (`payload/dist/locked-documents/config.js`) gives the
`payload-locked-documents` collection `defaultAccess` (any logged-in user) for read,
create, update and delete. The collection is added in `sanitizeConfig`, after plugins
run, so the config cannot change its access.

## Environment

```text
payload: 3.94.0
@payloadcms/db-postgres: 3.94.0
@payloadcms/plugin-multi-tenant: 3.94.0
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
pnpm test:int tests/int/locked-documents.int.spec.ts
```

The test ([tests/int/locked-documents.int.spec.ts](tests/int/locked-documents.int.spec.ts))
uses the Local API with `user` and `overrideAccess: false`:

1. Creates tenant A and tenant B, user A in tenant A and user B in tenant B.
2. Creates a page in tenant B.
3. Creates the lock row that the admin panel writes while user B edits that page.
4. As user A: reads the tenant B page (control), lists lock rows, creates a lock row
   on the tenant B page, and deletes user B's lock row.

Run only this file. On an empty database, the template's sample test
(`tests/int/api.int.spec.ts`) pushes the same schema at the same time and can fail.

## Expected

User A cannot read, create or delete lock rows of documents that user A cannot read.

## Actual

The control passes: user A cannot read the tenant B page. The other three checks fail.
User A sees the tenant B page id and user B's id, and can create and delete lock rows
on the tenant B page.

```text
FAIL  ... > user A does not see the tenant B lock row
AssertionError: expected [ { id: 1, document: { …(2) }, …(4) } ] to deeply equal []
+ [
+   {
+     "createdAt": "2026-11-18T08:53:07.623Z",
+     "document": {
+       "relationTo": "pages",
+       "value": 1,
+     },
+     "globalSlug": null,
+     "id": 1,
+     "updatedAt": "2026-11-18T08:53:07.623Z",
+     "user": {
+       "relationTo": "users",
+       "value": 2,
+     },
+   },
+ ]

FAIL  ... > user A cannot lock the tenant B page
AssertionError: promise resolved "{ id: 2, document: { …(2) }, …(4) }" instead of rejecting

FAIL  ... > user A cannot delete the tenant B lock row
AssertionError: promise resolved "{ id: 1, document: { …(2) }, …(4) }" instead of rejecting

Tests  3 failed | 1 passed (4)
```

The same through the REST API, with user A and user B logged in (`pnpm dev`). The lock
requests also had `select[document]=true&select[user]=true`, which is why the bodies are
short:

```text
# user B opens tenant B page 1: lock row 3

# user A (tenant A)
GET /api/pages/1
HTTP 404 {"errors":[{"message":"Not Found"}]}

GET /api/payload-locked-documents?where[id][equals]=3
HTTP 200 {"docs":[{"id":3,"document":{"relationTo":"pages","value":1},"user":{"relationTo":"users","value":2}}],...,"totalDocs":1}

POST /api/payload-locked-documents  {"document":{"relationTo":"pages","value":1},"user":{"relationTo":"users","value":2}}
HTTP 201 {"doc":{"id":4,"document":{"relationTo":"pages","value":1},"user":{"relationTo":"users","value":2}},"message":"Payload Locked Document successfully created."}

DELETE /api/payload-locked-documents/3
HTTP 200 {"doc":{"id":3,...},"message":"Deleted successfully."}
```

In the `POST`, user A also set `user` to user B's id, and Payload accepted it.
