# Rules File Format

## What Rules Do

Audiom turns geographic data into an audio experience. Raw data from sources like OpenStreetMap or ESRI has properties like `USE_TYPE=Office` or `amenity=restaurant` — but the audio engine doesn't know what those mean. Rules are the bridge: they read the raw properties and decide **what a feature is**, **what it sounds like**, **what it's called**, and **whether the user can walk through it**.

Without rules, a GeoJSON polygon is just geometry. With rules, it becomes "Conference Room B" that plays an ambient office hum, shows up in the navigation menu, and lets the avatar walk inside.

### What Each Rule Output Controls

| Output | What the user experiences |
|--------|--------------------------|
| **`ruleType`** | Which **sounds** play — ambient loops, stepping sounds, identification beeps. The audio engine looks up sound files by ruleType (e.g. `restaurant_loop.mp3`, `restaurant_short.mp3`, `restaurant_step1.mp3`). |
| **`ruleName`** | The **spoken label** — what text-to-speech says, what appears in menus. If a feature has name "Luigi's" and ruleName "Italian Restaurant", the user hears "Luigi's (Italian Restaurant)". |
| **`name`** | The feature's **proper name** — "Starbucks", "Room 101", "Main Street". This is what the user sees and hears first. If missing, ruleName is used instead. |
| **`passable`** | Whether the avatar can **walk through** the feature. Walls and buildings block movement; corridors and doors allow it. |
| **`width`** | How **physically wide** a wall or barrier is, in meters. A 0.3m wall creates a 0.15m buffer on each side that the avatar can't enter. |
| **`exclude`** | **Remove the feature entirely** — it won't appear in menus, won't make sounds, won't be clickable. Used for metadata-only features like floor boundaries or structural columns. |

### Sound Lookup

When the audio engine needs a sound for a feature, it tries file names in this order:

1. Feature's specific **id** (e.g. `osm_123456_loop.mp3`)
2. Feature's **name** (e.g. `starbucks_loop.mp3`)
3. Feature's **ruleName** (e.g. `italian restaurant_loop.mp3`)
4. Feature's **ruleType** (e.g. `restaurant_loop.mp3`)

It stops at the first match. So a custom sound for a specific business takes priority over the generic category sound. If nothing matches, the feature is silent (no ambient) or uses default stepping sounds.

Sound files live in `public/audio/` and follow the naming pattern `{name}_{type}.mp3` where type is one of:

| Sound Type | When It Plays | Example |
|-----------|---------------|---------|
| `_loop` | Continuously while near the feature (3D-positioned) | `airport_loop.mp3` |
| `_short` | When the feature is focused in a menu or grid | `restaurant_short.mp3` |
| `_step1` through `_step5` | As the avatar walks through the feature | `bridge_step3.mp3` |
| `_intro` | When the feature is first selected | `office_intro.mp3` |
| `_hit` | When the avatar collides with the feature | `boundary_hit.mp3` |

### What Happens Without a Rule

Features that match no rule still appear on the map, but with empty `ruleType` and `ruleName`. They have no category-specific sounds, no semantic label, and no passability setting. They're essentially anonymous geometry — the user might walk through them but won't hear anything distinctive or see a meaningful name.

Features that match a rule with `exclude: true` are dropped completely — they don't exist in the audio map at all.

---

## File Format

Rules files are JSON. Every file has this structure:

```json
{
  "version": 2,
  "rules": [ ... ],
  "augmenters": [ ... ]
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `version` | Yes | Must be `2` |
| `rules` | Yes | Array of rules (order matters for tie-breaking) |
| `augmenters` | No | Name enrichment pipeline (adds addresses, lifecycle state, etc.) |

## Rules

Each rule answers two questions: **"which features does this apply to?"** (the filter) and **"what should those features become?"** (the output).

```json
{
  "filter": ["==", ["get", "USE_TYPE"], "Office"],
  "output": {
    "ruleName": ["concat", "Office ", ["coalesce", ["get", "NAME"], ""]],
    "ruleType": "office",
    "passable": true
  }
}
```

This rule says: *"Any feature where USE_TYPE is Office → call it 'Office {NAME}', use office sounds, and let the avatar walk inside."*

### Rule Fields

| Field | Required | Default | Description |
|-------|----------|---------|-------------|
| `filter` | Yes | — | Condition that determines if this rule matches a feature |
| `output` | Yes | — | What to assign when matched (see below) |
| `id` | No | `rule-{index}` | Label for warning messages |
| `priority` | No | `1000` | Lower number = higher priority. Rarely needed. |

### Output Fields

| Field | Required | Default | Description |
|-------|----------|---------|-------------|
| `ruleName` | Yes | — | Category label. Shown to user in menus and speech. |
| `ruleType` | No | Same as `ruleName` | Sound category. Maps to audio files. |
| `name` | No | Original feature name | Display name. What the user sees/hears first. |
| `passable` | No | (unset) | `true` = avatar can enter. `false` = blocks movement. |
| `width` | No | (unset) | Physical width in meters. Creates a collision buffer around line features (walls, barriers). |
| `exclude` | No | `false` | `true` = remove the feature from the audio map entirely. |
| `fill` | No | (unset) | Fill color as hex string (e.g. `#80ed99`). Passed through to visual rendering. |
| `stroke` | No | (unset) | Stroke color as hex string (e.g. `#2d6a4f`). |
| `stroke-width` | No | (unset) | Stroke width as a number (e.g. `1.1`). |
| `fill-opacity` | No | (unset) | Fill opacity, 0–1 (e.g. `0.7`). |
| `stroke-dasharray` | No | (unset) | Dash pattern as a JSON array (e.g. `[4, 3]`). |
| `minstep` | No | (unset) | Minimum step size as a distance string (e.g. `2m`, `1km`). |
| `maxstep` | No | (unset) | Maximum step size as a distance string (e.g. `1km`, `50km`). |

Every output field accepts either a **literal value** (`"office"`, `true`, `3.5`) or an **expression** that computes a value from the feature's properties.

---

## Expressions

Filters and output values use [Mapbox GL expressions](https://docs.mapbox.com/style-spec/reference/expressions/) — a JSON array syntax where the first element is an operator.

### Reading a Feature's Properties

```json
["get", "USE_TYPE"]                       → the value of the USE_TYPE field
["get", "type", ["get", "door"]]          → nested: door.type
```

### Checking if a Property Exists

```json
["has", "name"]                           → true if the feature has a "name" field at all
```

### Comparing Values

```json
["==", ["get", "amenity"], "restaurant"]  → amenity is exactly "restaurant"
["!=", ["get", "status"], "closed"]       → status is not "closed"
[">",  ["to-number", ["get", "floors"]], 3]  → floors is greater than 3
```

### Combining Conditions

```json
["all", condition1, condition2]           → both must be true (AND)
["any", condition1, condition2]           → at least one true (OR)
["!", condition]                          → opposite (NOT)
```

### Building Text

```json
["concat", "Office ", ["coalesce", ["get", "NAME"], ""]]
```

This produces `"Office 101"` if NAME is "101", or `"Office "` if NAME is missing. `coalesce` returns the first non-null value, so `["coalesce", ["get", "NAME"], ""]` means "use NAME, or empty string if NAME doesn't exist."

In XLSX-backed rule files, the equivalent template syntax is:

| XLSX value | Compiles to |
|-----------|-------------|
| `{NAME}` | `["coalesce", ["get", "NAME"], ""]` |
| `{Label|Unlabeled}` | `["coalesce", ["get", "Label"], "Unlabeled"]` |
| `Layer {sourceName|Layer}` | `["concat", "Layer ", ["coalesce", ["get", "sourceName"], "Layer"]]` |

The `|fallback` segment is optional. When present, it preserves a non-empty string fallback through XLSX -> JSON -> XLSX round-trip instead of collapsing to `{prop}`.

### Always-True Filter

```json
["literal", true]                         → matches every feature (catch-all)
```

---

## How Matching Works

When a feature is processed, every rule's filter is tested. If multiple rules match, the most **specific** rule wins.

### Specificity

The system prefers rules that check exact values over rules that only check if a key exists:

| Condition Type | Weight | Example |
|---------------|--------|---------|
| Key equals value | 2 points | `["==", ["get", "amenity"], "restaurant"]` |
| Key exists | 1 point | `["has", "amenity"]` |

**Tie-breaking order:**
1. Any rule with a key=value condition beats any rule with only key-existence conditions
2. Higher total score wins
3. More conditions breaks ties
4. First rule in the file wins final ties (with a warning logged)

**Example:** A feature with `amenity=restaurant` and `cuisine=italian`:
- Rule A: `["==", ["get", "amenity"], "restaurant"]` — score 2, 1 condition
- Rule B: `["all", ["==", ["get", "amenity"], "restaurant"], ["==", ["get", "cuisine"], "italian"]]` — score 4, 2 conditions
- Rule C: `["all", ["has", "amenity"], ["has", "cuisine"]]` — score 2, 2 conditions, but key-existence only

Rule B wins (highest score among key=value rules).

### Priority vs Specificity

`priority` and specificity are different:
- Rules are sorted by **priority** first (lower number = checked first)
- Among all matching rules, **specificity** picks the winner

Most rules don't set priority. Use it only when you need to force a particular evaluation order.

---

## Augmenters

Augmenters enrich feature names after rules have been applied. They add contextual details like street addresses or lifecycle state (e.g. "abandoned", "under construction").

```json
{
  "filter": ["has", "addr:street"],
  "transform": ["concat", "at ", ["coalesce", ["get", "addr:housenumber"], ""], " ", ["coalesce", ["get", "addr:street"], ""]],
  "position": "after",
  "priority": 0
}
```

This augmenter says: *"If the feature has a street address, append 'at 123 Main St' to its name."*

A feature named "Starbucks" at 123 Main St becomes "Starbucks at 123 Main St".

### Augmenter Fields

| Field | Required | Default | Description |
|-------|----------|---------|-------------|
| `filter` | No | Always apply | Condition for when to apply this augmenter |
| `transform` | Yes | — | Text to produce |
| `position` | No | `"after"` | Where to place the text: `"before"`, `"after"`, or `"replace"` |
| `priority` | No | `1000` | Lower runs first |

Augmenters run in priority order. Each one can reference `__currentName` to read the name as modified by earlier augmenters.

---

## Complete Examples

### Indoor office (ESRI)

*"Any room where USE_TYPE is Conference Room → label it, play conference room sounds, let people walk in."*

```json
{
  "filter": ["==", ["get", "USE_TYPE"], "Conference Room"],
  "output": {
    "ruleName": ["concat", "Conference Room ", ["coalesce", ["get", "NAME"], ""]],
    "ruleType": "conferenceroom",
    "name": ["coalesce", ["get", "NAME"], ""],
    "passable": true
  }
}
```

User experience: Avatar can enter. Menu shows "Room B (Conference Room Room B)". Ambient sound: `conferenceroom_loop.mp3`.

### Restaurant with cuisine (OSM)

*"A restaurant that has a cuisine type → name it by cuisine."*

```json
{
  "filter": ["all",
    ["==", ["get", "amenity"], "restaurant"],
    ["has", "cuisine"]
  ],
  "output": {
    "ruleName": ["concat", ["coalesce", ["get", "cuisine"], ""], " Restaurant"],
    "ruleType": "restaurant",
    "name": ["coalesce", ["get", "name"], ""]
  }
}
```

User experience: Menu shows "Luigi's (Italian Restaurant)". Short sound: `restaurant_short.mp3`. Ambient: `restaurant_loop.mp3`.

### Wall (exclude from menus, block movement)

*"Walls are physical barriers — don't list them in menus, but block the avatar."*

Note: exclude removes the feature from menus and display, but a separate mechanism handles collision. Walls that need to block movement are typically handled through the `passable: false` + a width value, not `exclude`.

```json
{
  "filter": ["==", ["get", "USE_TYPE"], "Wall"],
  "output": {
    "ruleName": "Wall",
    "ruleType": "wall",
    "passable": false,
    "width": 0.3
  }
}
```

User experience: Wall doesn't appear in menus. Avatar can't walk through it. A 0.15m buffer on each side prevents clipping. Collision plays `boundary_hit.mp3`.

### Restroom (IMDF indoor)

*"Simple static label — no dynamic text needed."*

```json
{
  "filter": ["==", ["get", "category"], "restroom.female"],
  "output": {
    "ruleName": "Women's Restroom",
    "ruleType": "Restroom"
  }
}
```

### Transit route (GTFS)

*"Name the route by its short name and vehicle type."*

```json
{
  "filter": ["==", ["get", "route_type"], "0"],
  "output": {
    "ruleName": ["concat", ["coalesce", ["get", "route_short_name"], ""], " Tram"],
    "ruleType": "tram"
  }
}
```

A route with `route_short_name=E` becomes "E Tram" in the menu.

### Exclude (metadata-only features)

*"Floor level boundaries are structural metadata — remove them from the audio map."*

```json
{
  "filter": ["==", ["get", "USE_TYPE"], "Level"],
  "output": {
    "ruleName": "Level",
    "ruleType": "level",
    "exclude": true
  }
}
```

User experience: These features don't exist as far as the user is concerned — no menu entry, no sound, no collision.

---

## Existing Rule Files

| File | Source Data | What It Classifies | Primary Match Field |
|------|-----------|-------------------|---------------------|
| `osm.json` | OpenStreetMap | Streets, buildings, shops, parks, transit, amenities | OSM tags (`amenity`, `building`, `highway`, etc.) |
| `esri.json` | ESRI FeatureServer | Geographic/demographic features | `NAME`, `COUNTY` |
| `esri_indoor.json` | ESRI Indoor Mapping | Rooms, corridors, walls, doors, elevators | `USE_TYPE` |
| `indoor.json` | IMDF (Apple Maps indoor) | Rooms, hallways, amenities in buildings | `category` |
| `transit.json` | GTFS transit feeds | Bus, tram, subway, ferry routes | `route_type` |
| `mvt.json` | Mapbox Vector Tiles | Various (layer-dependent) | Varies |

---

## Quick Reference: Common ruleType Values and Their Sounds

These are the ruleType values that have corresponding sound files in `public/audio/`:

| ruleType | Ambient Loop | Short Sound | Step Sounds | Typical Use |
|----------|:---:|:---:|:---:|-------------|
| `airport` | yes | yes | — | Airports |
| `bar` | yes | yes | — | Bars, pubs |
| `beach` | yes | yes | — | Beaches |
| `bicycle_lane` | yes | yes | yes | Bike lanes |
| `bridge` | — | yes | yes | Bridges |
| `building` | — | yes | — | Generic buildings |
| `church` | yes | yes | — | Churches |
| `forest` | yes | yes | — | Forests, woods |
| `hospital` | yes | yes | — | Hospitals |
| `office` | — | yes | — | Office spaces |
| `park` | yes | yes | — | Parks |
| `restaurant` | yes | yes | — | Restaurants |
| `road` | — | yes | yes | Roads, streets |
| `school` | yes | yes | — | Schools |
| `shop` | yes | yes | — | Shops, retail |
| `water` | yes | yes | — | Lakes, rivers |

Features with a ruleType not in this list are silent (no ambient, no identification sound) but still appear in menus with their name and ruleName.

---

## Source Files

| File | Purpose |
|------|---------|
| `src/rules/ruleTypes.ts` | TypeScript type definitions |
| `src/rules/mapboxRuleProcessor.ts` | Rule evaluator: filter matching, specificity scoring, augmenters |
| `src/rules/mapboxExpressionCompiler.ts` | Compiles simple `key=value&key2` syntax to Mapbox expressions |
| `src/rules/ruleMigrator.ts` | Converts v1 rules to v2 format |
