# Lexical edit view is about 11,000 px wide in an RTL admin

The blank template (`pnpx create-payload-app@latest -t blank`, Postgres) with one change:
Arabic as the admin language (`i18n.supportedLanguages: { ar }`,
`i18n.fallbackLanguage: 'ar'`) and an `articles` collection with one `richText` field
([src/payload.config.ts](src/payload.config.ts),
[src/collections/Articles.ts](src/collections/Articles.ts)).

## Environment

```text
payload: 3.94.0
@payloadcms/richtext-lexical: 3.94.0
@payloadcms/translations: 3.94.0
@payloadcms/db-postgres: 3.94.0
next: 16.4.6
react: 19.2.9
Node.js: 24.22.3
PostgreSQL: 17.12 (Docker image postgres:17)
Browser: Chrome for Testing 153.0.8010.12 (Playwright 1.63.0 chromium)
OS: macOS (darwin arm64)
```

## Setup

```sh
cp .env.example .env
docker compose up -d
pnpm install
pnpm exec playwright install chromium
```

## Steps: test

```sh
pnpm test:e2e tests/e2e/rtl-width.e2e.spec.ts
```

The test ([tests/e2e/rtl-width.e2e.spec.ts](tests/e2e/rtl-width.e2e.spec.ts)) opens
`/admin/collections/articles/create` at a 1280 x 900 viewport and reads
`document.documentElement.scrollWidth`.

## Steps: browser

1. Run `pnpm dev` and open http://localhost:3000/admin. Create the first user.
2. Open Articles and create a new article. The admin is in Arabic (`<html dir="RTL">`).
3. In the browser console, run `document.documentElement.scrollWidth`.

## Expected

`scrollWidth` equals the viewport width (1280). The page has no horizontal scroll.

## Actual

```text
Error: expect(received).toBe(expected) // Object.is equality

Expected: 1280
Received: 11220
```

The edit view of a saved article gives the same value (11220).

The two elements outside the page, at a 1280 px viewport:

```text
[{"cls":"icon draggable-block-menu","transform":"translate(-10000px, -10000px)","left":-9940,"width":18},
 {"cls":"link-editor","transform":"translate(-10000px, -10000px)","left":-9940,"width":76}]
```

These elements are hidden with `transform: translate(-10000px, -10000px)`. The
`-10000px` offset is in these files of `@payloadcms/richtext-lexical/dist`:

- `lexical/plugins/handles/utils/setHandlePosition.js`
- `lexical/utils/setFloatingElemPosition.js`
- `lexical/utils/setFloatingElemPositionForLinkEditor.js`
- `features/link/client/plugins/floatingLinkEditor/LinkEditor/index.js`

In an RTL
document, overflow to the left is part of the scroll area, so the page gets 9940 px wider.

Measured in the same page:

| Change in the page | `scrollWidth` |
| --- | --- |
| None | 11220 |
| Those two elements: `transform: none; opacity: 0; pointer-events: none` | 1280 |
| `html[dir='rtl'] .rich-text-lexical { overflow-x: clip; }` | 1280 |

On a phone (Playwright `devices['iPhone 13']`, 390 px wide), the create view first
shows an empty white screen: `scrollWidth` 10374, layout viewport 1560 px,
`scrollX` -1170.
