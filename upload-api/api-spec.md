# Audiom Upload API Specification

> Version: 1.0  •  Audience: external integrators and internal tooling
> authors who need to push rules or GeoJSON into Audiom without using the
> web UI.

## 1. Overview

Audiom's data plane is a Feathers v4 REST + Socket.IO app. There is **no
`multipart/form-data` upload endpoint**. All "uploads" are ordinary
`application/json` `POST`s to standard Feathers services.

Two upload flows are supported:

| Flow | Target services | Used for |
|---|---|---|
| **Rules upload** | `rulesets`, `rules`, `augmenters` | Importing a v2 rules JSON (or XLSX-derived JSON) into a tenant |
| **GeoJSON upload** | `datasources` | Registering a GeoJSON `FeatureCollection` as a reusable data source for maps |

Both flows are governed by the same auth, visibility, and rate-limiting
rules as the rest of the API.

## 2. Base URL & Transport

| Item | Value |
|---|---|
| Base URL | `${NEXT_PUBLIC_APP_API_URL}` (env-configured; e.g. `https://api.audiom.app`) |
| Content type (request) | `application/json; charset=utf-8` |
| Content type (response) | `application/json; charset=utf-8` |
| Pagination shape | Feathers standard: `{ total, limit, skip, data: [...] }` |
| ID type | Auto-increment integer (`id`) for all rows |

Service URLs follow `${baseUrl}/${service}` and `${baseUrl}/${service}/${id}`
(Feathers convention).

## 3. Authentication

Two mechanisms; either is sufficient. Frontend proxies forward whichever the
caller presents (see [src/utils/apiProxy.ts](../../src/utils/apiProxy.ts)).

### 3.1 Bearer (user session)

```http
Authorization: Bearer <jwt>
```

Obtained via Auth0 login on the web app, or by exchanging credentials at
`POST /authentication` (Feathers `authentication` service).

### 3.2 API Key (machine clients) — recommended for upload tooling

```http
X-API-Key: <plaintext key>
```

API keys are issued per organization through the `api-keys` service. A new
key's `key` field (full plaintext) is returned **only at create time**;
afterwards only `keyPrefix` is visible. See
[ApiKeyData](../../src/types/services.ts) and the in-app
**Settings → API Keys** page.

API keys carry `scopes`. Uploading rules requires `rulesets:write` and
`rules:write`; uploading GeoJSON requires `datasources:write`.

## 4. Visibility Model

`rulesets` and `datasources` (via the maps that reference them) carry a
`visibility` field with values:

| Value | Who can read |
|---|---|
| `org` | Members of the owning organization |
| `api-key` | Anyone presenting a valid API key for the owning org |
| `unlisted` | Anyone with the slug/id; not listed publicly |
| `public` | Anyone, listed in public catalogs |

Defaults to `org` on create. Set explicitly when uploading public content.

## 5. Rules Upload

### 5.1 Concept

A rules "file" is a v2 [`MapboxRuleSet`](../rules-file-format.md):

```jsonc
{
  "version": 2,
  "rules":      [ /* MapboxRule */     ],
  "augmenters": [ /* MapboxAugmenter */ ]
}
```

Server-side this is **decomposed into one row per rule and per augmenter**.
You upload it by:

1. `POST /rulesets` — creates the container
2. `POST /rules` for each rule (carrying `rulesetId` and `order`)
3. `POST /augmenters` for each augmenter (carrying `rulesetId` and `order`)

There is no atomic "import this whole file" RPC: a Feathers `import` method
exists internally but is **not exposed over HTTP**
(see comment in [RulesetsListStore.ts](../../src/stores/RulesetsListStore.ts)
near `cloneRuleset`). Clients must perform the loop themselves and roll
back (`DELETE /rulesets/:id`) on partial failure if atomicity matters.

### 5.2 `POST /rulesets` — create container

Request:

```http
POST /rulesets
Content-Type: application/json
X-API-Key: <key>

{
  "name": "ACME Indoor v3",
  "slug": "acme-indoor-v3",
  "description": "Floors 1–5, updated 2026-04",
  "visibility": "org",
  "organizationId": 42,
  "parentRulesetId": null
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string \| null | yes | Human-readable display name |
| `slug` | string | yes | URL-safe; **unique per organization**. Allowlist `[A-Za-z0-9_-]` per segment, slashes allowed for namespacing |
| `description` | string \| null | no | |
| `visibility` | `"org"` \| `"api-key"` \| `"public"` \| `"unlisted"` | no | Defaults `"org"` |
| `organizationId` | integer | yes | Must match the caller's org |
| `parentRulesetId` | integer \| null | no | Set when forking an existing ruleset |

Response `201 Created`:

```jsonc
{
  "id": 1234,
  "slug": "acme-indoor-v3",
  "name": "ACME Indoor v3",
  ...
  "createdAt": "2026-05-04T12:00:00.000Z",
  "updatedAt": "2026-05-04T12:00:00.000Z"
}
```

### 5.3 `POST /rules` — append a single rule

Request body per rule, in the order you want them evaluated:

```jsonc
{
  "rulesetId": 1234,
  "ruleId": "office",                         // optional label, used in warnings
  "priority": null,                            // optional (lower = first); null = default 1000
  "filter": ["==", ["get", "USE_TYPE"], "Office"],
  "output": {
    "ruleName": ["concat", "Office ", ["coalesce", ["get", "NAME"], ""]],
    "ruleType": "office",
    "name":     ["coalesce", ["get", "NAME"], ""],
    "passable": true
  },
  "order": 0
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `rulesetId` | integer | yes | From step 5.2 |
| `ruleId` | string \| null | no | Diagnostic label |
| `priority` | integer \| null | no | Lower runs first; defaults `1000` |
| `filter` | Mapbox GL expression (JSON) | yes | See [rules-file-format.md](../rules-file-format.md) |
| `output` | object of literals or expressions | yes | See [rules-file-format.md](../rules-file-format.md) |
| `order` | integer | yes | 0-based position within the ruleset |

Response: `201 Created` with the created `RuleData` row.

### 5.4 `POST /augmenters` — append a single augmenter

```jsonc
{
  "rulesetId": 1234,
  "filter": ["has", "addr:street"],
  "transform": ["concat", "at ",
    ["coalesce", ["get", "addr:housenumber"], ""], " ",
    ["coalesce", ["get", "addr:street"], ""]],
  "position": "after",
  "priority": 0,
  "unnamed": null,
  "order": 0
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `rulesetId` | integer | yes | |
| `filter` | expression \| null | no | Null = always apply |
| `transform` | expression | yes | Text producer |
| `position` | `"before"` \| `"after"` \| `"replace"` | no | Default `"after"` |
| `priority` | integer \| null | no | Lower runs first |
| `unnamed` | object \| null | no | Backend extension slot |
| `order` | integer | yes | |

### 5.5 Reading back: `GET /rules/<slug>.json` (frontend proxy)

The Audiom front-end exposes a public read proxy that **stitches** the three
services back into a single v2 ruleset:

```http
GET /api/rules/<slug>.json
```

Returns:

```jsonc
{ "version": 2, "rules": [...], "augmenters": [...] }
```

Implementation: [src/pages/api/rules/[...rulePath].ts](../../src/pages/api/rules/%5B...rulePath%5D.ts).
Slug segments must match `[A-Za-z0-9_-]+`. Cached for 60 s in the Next.js
process.

You can also bypass the proxy and call the backend directly:

```http
GET /rulesets?slug=<slug>&$limit=1
GET /rules?rulesetId=<id>&$sort[order]=1&$limit=500
GET /augmenters?rulesetId=<id>&$sort[order]=1&$limit=500
```

### 5.6 Update / Delete

| Operation | Request |
|---|---|
| Update ruleset metadata | `PATCH /rulesets/:id` with partial fields |
| Replace a rule | `PATCH /rules/:id` |
| Delete a rule | `DELETE /rules/:id` |
| Delete the whole ruleset | `DELETE /rulesets/:id` (cascades to rules + augmenters) |

To **replace the body of a ruleset** (i.e. re-upload a file in place), the
recommended pattern is:

1. `GET /rules?rulesetId=<id>` → ids
2. `DELETE /rules/<id>` for each
3. Same for `augmenters`
4. `POST` the new rows

Or simply `DELETE /rulesets/:id` and `POST /rulesets` again — note that
this **changes the `id`** but keeps the slug if you reuse it.

## 6. GeoJSON Upload

### 6.1 Concept

A GeoJSON file is uploaded as the `source` field of a `datasources` row.
The field is a string (stringified JSON) — it is **not** validated as
GeoJSON server-side; whatever string you store is what the frontend
re-serves.

### 6.2 `POST /datasources`

```http
POST /datasources
Content-Type: application/json
X-API-Key: <key>

{
  "name": "ACME Campus 2026",
  "source": "{\"type\":\"FeatureCollection\",\"features\":[ ... ]}",
  "sourceAttribution": "© ACME 2026, CC-BY-4.0",
  "organizationId": 42
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string \| null | yes | |
| `source` | string \| null | yes | **Stringified** GeoJSON `FeatureCollection`. May also be a URL/string the backend understands; for raw upload use a stringified `FeatureCollection` |
| `sourceAttribution` | string \| null | no | Surfaced in the map UI |
| `organizationId` | integer | yes | Caller's org |

Response `201 Created` with [`DatasourceData`](../../src/types/services.ts)
including the assigned `id`. **Save the `id`** — it is what map definitions
reference.

### 6.3 Size guidance

Audiom does not advertise a hard upload size limit, but the backend is
fronted by a standard reverse proxy with a typical default body limit of
~10 MB. For larger datasets:

- Upload by tile/quad split into multiple datasources, or
- Host the file externally and store its URL in `source` instead of the
  inline string (the loader transparently fetches `http(s)://` `source`
  values), or
- Use the ESRI FeatureServer flow (out of scope here).

### 6.4 Reading back: `GET /datasources/<id>.json` (frontend proxy)

```http
GET /api/datasources/<id>.json
```

Returns the raw `source` field with `Content-Type: application/json`. The
proxy unwraps the row so callers receive the GeoJSON directly. Implementation:
[src/pages/api/datasources/[...datasourcePath].ts](../../src/pages/api/datasources/%5B...datasourcePath%5D.ts).

Direct backend equivalent: `GET /datasources/<id>` returns the full
`DatasourceData` row.

### 6.5 Update / Delete

| Operation | Request |
|---|---|
| Replace GeoJSON in place | `PATCH /datasources/:id` with `{ "source": "<new stringified GeoJSON>" }` |
| Rename / re-attribute | `PATCH /datasources/:id` with partial fields |
| Delete | `DELETE /datasources/:id` (will fail if referenced by an existing layer) |

### 6.6 Linking the upload to a map

To make the uploaded GeoJSON visible on a map, attach it via the `layers`
service:

```http
POST /layers
{
  "mapId":        9876,
  "dataSourceId": 5432,
  "order":        0
}
```

Or for a `map-definitions`-based map, append a source entry referencing the
datasource:

```jsonc
{
  "type": "datasource",
  "datasourceId": 5432,
  "rules": "acme-indoor-v3"   // optional ruleset slug from §5
}
```

## 7. Error Responses

Standard Feathers shape:

```jsonc
{
  "name":    "Conflict",
  "message": "slug already in use",
  "code":    409,
  "className": "conflict",
  "errors":  { "slug": "must be unique per organization" }
}
```

Common cases for upload flows:

| Status | Cause |
|---|---|
| `400` | Malformed JSON; bad expression syntax in `filter`/`output`; missing required field |
| `401` | No / invalid `Authorization` or `X-API-Key` header |
| `403` | Authenticated but lacks scope for the target org |
| `409` | Duplicate slug per org (rules) |
| `413` | Payload too large (proxy / body limit) |
| `422` | Validation rejected a field value (e.g. unknown `visibility`) |
| `429` | Rate-limited (per `OrganizationData.rateLimit`) |
| `502` | Frontend proxy could not reach backend |

## 8. Worked Examples

### 8.1 Upload a rules file (Node / fetch)

```js
import { readFile } from 'node:fs/promises';

const BASE = process.env.AUDIOM_API_URL;       // e.g. https://api.audiom.app
const KEY  = process.env.AUDIOM_API_KEY;
const ORG  = Number(process.env.AUDIOM_ORG_ID);

const headers = {
  'Content-Type':  'application/json',
  'X-API-Key':     KEY,
};

async function uploadRulesFile(path, slug, name) {
  const file = JSON.parse(await readFile(path, 'utf8'));

  // 1. Create the container
  const ruleset = await fetch(`${BASE}/rulesets`, {
    method: 'POST', headers,
    body: JSON.stringify({
      name, slug, visibility: 'org', organizationId: ORG,
    }),
  }).then(r => r.json());

  // 2. POST each rule in order
  for (const [i, r] of file.rules.entries()) {
    await fetch(`${BASE}/rules`, {
      method: 'POST', headers,
      body: JSON.stringify({
        rulesetId: ruleset.id,
        filter:    r.filter,
        output:    r.output,
        ruleId:    r.id     ?? null,
        priority:  r.priority ?? null,
        order:     i,
      }),
    });
  }

  // 3. POST each augmenter in order
  for (const [i, a] of (file.augmenters ?? []).entries()) {
    await fetch(`${BASE}/augmenters`, {
      method: 'POST', headers,
      body: JSON.stringify({
        rulesetId: ruleset.id,
        filter:    a.filter ?? null,
        transform: a.transform,
        position:  a.position ?? 'after',
        priority:  a.priority ?? null,
        order:     i,
      }),
    });
  }

  return ruleset;
}
```

### 8.2 Upload a GeoJSON file

```js
import { readFile } from 'node:fs/promises';

const geojson = await readFile('./acme-campus.geojson', 'utf8');

const datasource = await fetch(`${BASE}/datasources`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-API-Key': KEY },
  body: JSON.stringify({
    name:               'ACME Campus 2026',
    source:             geojson,            // already a JSON string
    sourceAttribution:  '© ACME 2026',
    organizationId:     ORG,
  }),
}).then(r => r.json());

console.log('datasource id:', datasource.id);
```

### 8.3 curl one-liners

```bash
# Create empty ruleset
curl -X POST "$BASE/rulesets" \
  -H "Content-Type: application/json" -H "X-API-Key: $KEY" \
  -d '{"name":"Demo","slug":"demo","visibility":"org","organizationId":42}'

# Append one rule
curl -X POST "$BASE/rules" \
  -H "Content-Type: application/json" -H "X-API-Key: $KEY" \
  -d '{"rulesetId":1234,"filter":["==",["get","amenity"],"cafe"],
       "output":{"ruleName":"Cafe","ruleType":"restaurant"},"order":0}'

# Upload GeoJSON (file -> stringified -> wrapped)
jq -Rs '{ name:"My Layer", source:., organizationId:42 }' my.geojson \
  | curl -X POST "$BASE/datasources" \
      -H "Content-Type: application/json" -H "X-API-Key: $KEY" \
      --data-binary @-
```

## 9. Versioning & Compatibility

- Rules files are tagged `version: 2`. The backend rejects any other
  `version` on `POST /rulesets/.../import` style flows; for the per-row
  upload described here the version field is implicit (rows are always v2).
- Migration from v1 is offline; see
  [src/rules/ruleMigrator.ts](../../src/rules/ruleMigrator.ts) (third-party
  package `@coughlan-lab/layerloader`).
- The `datasources.source` field is opaque text; no schema version is
  enforced.

## 10. Out of Scope

- Streaming / chunked upload of huge GeoJSON.
- Atomic "replace ruleset contents" RPC — implemented client-side.
- ESRI / IMDF / GTFS source registration (handled by other source `type`s
  on `map-definitions.sources[]`, not by `datasources` upload).
- XLSX → JSON conversion — performed client-side via
  [scripts/rules/xlsx-to-json.mjs](../../scripts/rules/xlsx-to-json.mjs)
  before upload. The API only accepts JSON.

## 11. References

- v2 rules format: [../rules-file-format.md](../rules-file-format.md)
- XLSX pipeline: [../rule-editing.md](../rule-editing.md)
- Service type definitions: [../../src/types/services.ts](../../src/types/services.ts)
- Read proxies:
  - [../../src/pages/api/rules/[...rulePath].ts](../../src/pages/api/rules/%5B...rulePath%5D.ts)
  - [../../src/pages/api/datasources/[...datasourcePath].ts](../../src/pages/api/datasources/%5B...datasourcePath%5D.ts)
- Reference upload-loop implementation:
  [`cloneRuleset` in RulesetsListStore.ts](../../src/stores/RulesetsListStore.ts)
