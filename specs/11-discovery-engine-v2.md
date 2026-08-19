# Discovery Engine V2

## Goal

Discovery is a recommendation pipeline, not a single SQL filter. The V2 engine preserves hard safety/visibility rules while ranking soft preferences so sparse markets do not collapse to an empty feed.

## Pipeline

1. **Candidate retrieval** — PostgreSQL/PostGIS returns a bounded geo-aware pool (default 1000). Redis caches candidate IDs for 45 seconds.
2. **Hard eligibility** — self, hidden profiles, safety exclusions, active matches, recent unmatches, viewer gender preference, strict age, strict distance and interaction cooldowns.
3. **Feature building** — preference fit, distance decay, activity, Jaccard interest similarity, profile completeness, novelty, implicit preference and deterministic exploration.
4. **Ranking** — weighted score 0..100. Cold-start and `recentlyActiveFirst` use different weight sets.
5. **Diversification** — MMR-style penalty prevents near-identical profiles from occupying consecutive positions.
6. **Exploration** — reserves space for recent profiles and deterministic serendipity candidates.
7. **Cursor page** — opaque cursor continues after the last candidate while the legacy list endpoint remains compatible.

## Hard rules

Only rules that must exclude a candidate belong in eligibility:

- candidate is not the viewer;
- `discoverable=true`;
- no block/report exclusion;
- no active match;
- unmatch cooldown has elapsed;
- candidate gender is in the viewer's `lookingFor` when configured;
- age only excludes when viewer `strictAge=true`;
- distance only excludes when viewer `strictDistance=true` and `globalMode=false`;
- action cooldown has elapsed.

The candidate's private preferences are **never reverse-applied** to the viewer's feed.

`preferredBodyTypes`, non-strict age/distance and behavioral affinity are soft ranking features, never silent hard filters.

## Ranking features

All features are normalized to 0..1 before weighting.

- `preference`: non-strict age + preferred body type fit;
- `distance`: exponential distance decay (global mode uses a much slower decay);
- `activity`: `lastActiveAt` buckets, updated from authenticated activity with a 5 minute database write throttle;
- `interests`: case-insensitive Jaccard similarity;
- `profileQuality`: bio, location, body type, interests and coordinates completeness;
- `novelty`: unseen/new profile boost and gradual re-entry after old interactions;
- `implicitPreference`: learned soft affinity from behavior;
- `exploration`: deterministic per viewer/candidate/day to avoid refresh instability.

### Default non-cold-start weights

| Feature | Weight |
|---|---:|
| preference | 0.30 |
| distance | 0.18 |
| activity | 0.12 |
| interests | 0.12 |
| profile quality | 0.10 |
| novelty | 0.08 |
| implicit preference | 0.05 |
| exploration | 0.05 |

When `recentlyActiveFirst=true`, activity receives more weight. During cold start (fewer than 20 behavior signals), implicit preference is disabled and weight is redistributed to declared preferences, activity and profile quality.

### Cold-start weights

Before enough behavioral history exists, ranking follows the declared-preference baseline discussed for the product: 35% preference compatibility, 20% distance, 15% activity, 10% common interests, 10% profile quality, 5% novelty and 5% exploration. Implicit preference stays at zero until the cold-start threshold is reached.

## Implicit preference signals

Behavior never changes the user's explicit settings. It only provides a soft ranking affinity.

| Signal | Weight |
|---|---:|
| VIEW | +0.05 |
| LIKE | +1.00 |
| SUPER_LIKE | +2.00 |
| MATCH | +3.00 |
| MESSAGE | +4.00 |
| CONVERSATION (3+ messages) | +6.00 |
| PASS | -0.50 |
| UNMATCH | -3.00 |
| BLOCK | -8.00 |
| REPORT | -10.00 |

The model currently learns body-type and interest affinity. This is deliberately explainable and deterministic; a future ML ranker can consume the same feature contract.

## Cooldowns

`seen` is not permanent exclusion anymore.

| Event | Default suppression |
|---|---:|
| VIEW | 24 hours |
| PASS | 14 days |
| LIKE | 30 days or until match |
| SUPER_LIKE | 30 days or until match |
| ACTIVE MATCH | permanent while active |
| UNMATCH | 90 days |
| BLOCK | permanent until unblock |
| REPORT | permanent in both directions |

All durations are configuration properties.

## PostgreSQL/PostGIS

Migration `V3__discovery_engine_v2.sql` enables PostGIS, adds `profiles.last_active_at`, a GIST expression index over profile coordinates, an activity discovery index and an interaction history index.

Candidate retrieval uses `ST_DWithin` in the database instead of loading the whole population into Java and calculating radius eligibility there. If a non-strict local pool is sparse, retrieval expands up to the configured maximum radius before ranking. Exact coordinates remain private and are never added to the public recommendation projection.

Local Docker builds `docker/postgres/Dockerfile` from `postgres:17-bookworm` and installs the PostgreSQL 17 PostGIS packages, keeping the database image under project control for local development.

## Redis

`CandidatePoolCache` stores only candidate IDs, not profile payloads. Profile rows are reloaded so rapidly changing visibility/activity fields are not frozen for the entire cache TTL. Redis errors fail open to PostgreSQL retrieval.

## APIs

Legacy:

`GET /api/v1/discovery?limit=20`

V2 cursor page:

`GET /api/v1/discovery/page?limit=20&cursor=<opaque>`

Response:

```json
{
  "items": [],
  "nextCursor": "opaque-or-null",
  "poolSize": 642,
  "eligibleCount": 211
}
```

View/impression signal:

`POST /api/v1/discovery/{candidateId}/view`

Explainability (disabled by default; local Docker enables `HIMEROS_DISCOVERY_EXPLAIN_ENABLED=true`):

`GET /api/v1/discovery/explain/{candidateId}`

Example:

```json
{
  "candidateId": "...",
  "eligible": true,
  "excludedBy": "ELIGIBLE",
  "score": 87.34,
  "distanceKm": 12.4,
  "features": {
    "preference": 1.0,
    "distance": 0.82,
    "activity": 1.0,
    "interests": 0.61,
    "profileQuality": 0.90,
    "novelty": 0.75,
    "implicitPreference": 0.67,
    "exploration": 0.42
  },
  "weights": {},
  "commonInterests": ["academia", "viagens"],
  "cooldownUntil": null,
  "coldStart": false
}
```

Excluded candidates return `eligible=false`, `excludedBy` such as `STRICT_AGE`, `STRICT_DISTANCE`, `INTERACTION_COOLDOWN`, `ACTIVE_MATCH`, `UNMATCH_COOLDOWN`, `BLOCKED_OR_REPORTED`, and a `cooldownUntil` when relevant.

## Metrics

Low-cardinality Micrometer metrics:

- `himeros.discovery.request` timer;
- `himeros.discovery.pool.size` summary;
- `himeros.discovery.result.size` summary;
- `himeros.discovery.excluded{reason=...}` counter;
- `himeros.discovery.cache{result=hit|miss|error}` counter.

Do not tag metrics with user or candidate IDs.

## Tuning environment variables

- `HIMEROS_DISCOVERY_POOL_SIZE`
- `HIMEROS_DISCOVERY_POOL_MULTIPLIER`
- `HIMEROS_DISCOVERY_NON_STRICT_RADIUS_KM`
- `HIMEROS_DISCOVERY_MAX_RETRIEVAL_RADIUS_KM`
- `HIMEROS_DISCOVERY_CACHE_TTL`
- `HIMEROS_DISCOVERY_VIEW_COOLDOWN`
- `HIMEROS_DISCOVERY_PASS_COOLDOWN`
- `HIMEROS_DISCOVERY_LIKE_COOLDOWN`
- `HIMEROS_DISCOVERY_SUPER_LIKE_COOLDOWN`
- `HIMEROS_DISCOVERY_UNMATCH_COOLDOWN`
- `HIMEROS_DISCOVERY_COLD_START_INTERACTIONS`
- `HIMEROS_DISCOVERY_IMPLICIT_HISTORY_LIMIT`
- `HIMEROS_DISCOVERY_NEW_PROFILE_DAYS`
- `HIMEROS_DISCOVERY_NEW_PROFILE_SHARE`
- `HIMEROS_DISCOVERY_EXPLORATION_SHARE`
- `HIMEROS_DISCOVERY_DIVERSIFICATION_PENALTY`
