#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE=(docker compose -p heartme-match-e2e -f "$ROOT/docker-compose.match-e2e.yml")
BASE_URL="${MATCH_E2E_BASE_URL:-http://localhost:14200}"
KEEP_STACK="${KEEP_MATCH_E2E_STACK:-0}"

log() { printf '[match-e2e] %s\n' "$*"; }
fail() { printf '[match-e2e] FAILED: %s\n' "$*" >&2; exit 1; }
json_field() {
  local field="$1"
  python3 -c 'import json,sys; data=json.load(sys.stdin); value=data[sys.argv[1]]; print(value)' "$field"
}
api() {
  local method="$1" path="$2" token="${3:-}" body="${4:-}"
  local args=(-fsS -X "$method" "$BASE_URL$path" -H 'Content-Type: application/json')
  if [[ -n "$token" ]]; then args+=(-H "Authorization: Bearer $token"); fi
  if [[ -n "$body" ]]; then args+=(--data "$body"); fi
  curl "${args[@]}"
}
cleanup() {
  if [[ "$KEEP_STACK" != "1" ]]; then
    "${COMPOSE[@]}" down -v --remove-orphans >/dev/null 2>&1 || true
  else
    log "KEEP_MATCH_E2E_STACK=1: stack preserved"
  fi
}
trap cleanup EXIT

cd "$ROOT"
log "starting isolated frontend + backend + PostgreSQL/PostGIS + Redis + Kafka"
"${COMPOSE[@]}" down -v --remove-orphans >/dev/null 2>&1 || true
"${COMPOSE[@]}" up -d --build

log "waiting for backend health"
for _ in $(seq 1 90); do
  if curl -fsS http://localhost:18080/actuator/health >/dev/null 2>&1; then break; fi
  sleep 1
done
curl -fsS http://localhost:18080/actuator/health >/dev/null || {
  "${COMPOSE[@]}" logs backend >&2 || true
  fail "backend did not become healthy"
}

log "waiting for frontend nginx"
for _ in $(seq 1 60); do
  if curl -fsS "$BASE_URL/" >/dev/null 2>&1; then break; fi
  sleep 1
done
curl -fsS "$BASE_URL/" >/dev/null || fail "frontend did not become ready"

STAMP="$(date +%s)-$RANDOM"
PASSWORD='MatchE2E!12345'
EMAIL_A="match-a-$STAMP@example.test"
EMAIL_B="match-b-$STAMP@example.test"

log "registering two independent accounts through the FRONTEND nginx /api proxy"
REG_A="$(api POST /api/v1/auth/register '' "{\"email\":\"$EMAIL_A\",\"password\":\"$PASSWORD\"}")"
REG_B="$(api POST /api/v1/auth/register '' "{\"email\":\"$EMAIL_B\",\"password\":\"$PASSWORD\"}")"
USER_A="$(printf '%s' "$REG_A" | json_field id)"
USER_B="$(printf '%s' "$REG_B" | json_field id)"

LOGIN_A="$(api POST /api/v1/auth/web/login '' "{\"email\":\"$EMAIL_A\",\"password\":\"$PASSWORD\"}")"
LOGIN_B="$(api POST /api/v1/auth/web/login '' "{\"email\":\"$EMAIL_B\",\"password\":\"$PASSWORD\"}")"
TOKEN_A="$(printf '%s' "$LOGIN_A" | json_field accessToken)"
TOKEN_B="$(printf '%s' "$LOGIN_B" | json_field accessToken)"

PROFILE_A='{"displayName":"Match E2E A","bio":"Conta A","birthDate":"1993-01-01","gender":"MAN","bodyType":"ATHLETIC","city":"Blumenau","state":"SC","country":"BR","latitude":-26.9194,"longitude":-49.0661,"minAge":18,"maxAge":99,"maxDistanceKm":500,"strictAge":false,"strictDistance":false,"discoverable":true,"recentlyActiveFirst":false,"globalMode":true,"interests":["e2e"],"lookingFor":["WOMAN"],"preferredBodyTypes":[]}'
PROFILE_B='{"displayName":"Match E2E B","bio":"Conta B","birthDate":"1994-01-01","gender":"WOMAN","bodyType":"AVERAGE","city":"Blumenau","state":"SC","country":"BR","latitude":-26.9194,"longitude":-49.0661,"minAge":18,"maxAge":99,"maxDistanceKm":500,"strictAge":false,"strictDistance":false,"discoverable":true,"recentlyActiveFirst":false,"globalMode":true,"interests":["e2e"],"lookingFor":["MAN"],"preferredBodyTypes":[]}'
api PUT /api/v1/profile "$TOKEN_A" "$PROFILE_A" >/dev/null
api PUT /api/v1/profile "$TOKEN_B" "$PROFILE_B" >/dev/null

log "asserting both accounts are mutually discoverable before LIKE"
DISC_A="$(api GET '/api/v1/discovery/page?limit=100' "$TOKEN_A")"
DISC_B="$(api GET '/api/v1/discovery/page?limit=100' "$TOKEN_B")"
python3 - "$USER_A" "$USER_B" "$DISC_A" "$DISC_B" <<'PY'
import json,sys
ua,ub=sys.argv[1],sys.argv[2]
a,b=json.loads(sys.argv[3]),json.loads(sys.argv[4])
ids_a={x['profile']['userId'] for x in a['items']}
ids_b={x['profile']['userId'] for x in b['items']}
assert ub in ids_a, f'B ({ub}) missing from A discovery: {ids_a}'
assert ua in ids_b, f'A ({ua}) missing from B discovery: {ids_b}'
PY

log "LIKE A -> B"
LIKE_A="$(api POST "/api/v1/interactions/$USER_B" "$TOKEN_A" '{"type":"LIKE"}')"
log "LIKE B -> A"
LIKE_B="$(api POST "/api/v1/interactions/$USER_A" "$TOKEN_B" '{"type":"LIKE"}')"

log "waiting for exactly one ACTIVE match visible to both accounts"
MATCH_A='[]'; MATCH_B='[]'
for _ in $(seq 1 30); do
  MATCH_A="$(api GET /api/v1/matches "$TOKEN_A")"
  MATCH_B="$(api GET /api/v1/matches "$TOKEN_B")"
  if python3 - "$USER_A" "$USER_B" "$MATCH_A" "$MATCH_B" <<'PY'
import json,sys
ua,ub=sys.argv[1],sys.argv[2]
a,b=json.loads(sys.argv[3]),json.loads(sys.argv[4])
def ok(rows):
    active=[m for m in rows if m['status']=='ACTIVE' and {m['userA'],m['userB']}=={ua,ub}]
    return len(active)==1
raise SystemExit(0 if ok(a) and ok(b) else 1)
PY
  then break; fi
  sleep 0.2
done

MATCH_ID="$(python3 - "$USER_A" "$USER_B" "$MATCH_A" "$MATCH_B" <<'PY'
import json,sys
ua,ub=sys.argv[1],sys.argv[2]
a,b=json.loads(sys.argv[3]),json.loads(sys.argv[4])
def rows(xs): return [m for m in xs if m['status']=='ACTIVE' and {m['userA'],m['userB']}=={ua,ub}]
ma,mb=rows(a),rows(b)
assert len(ma)==1, f'A expected exactly 1 ACTIVE match, got {ma}'
assert len(mb)==1, f'B expected exactly 1 ACTIVE match, got {mb}'
assert ma[0]['id']==mb[0]['id'], (ma,mb)
print(ma[0]['id'])
PY
)"

log "asserting one conversation was created from MatchCreated"
CONV_A='[]'; CONV_B='[]'
for _ in $(seq 1 30); do
  CONV_A="$(api GET /api/v1/conversations "$TOKEN_A")"
  CONV_B="$(api GET /api/v1/conversations "$TOKEN_B")"
  if python3 - "$MATCH_ID" "$CONV_A" "$CONV_B" <<'PY'
import json,sys
mid=sys.argv[1]; a=json.loads(sys.argv[2]); b=json.loads(sys.argv[3])
ca=[c for c in a if c['matchId']==mid]; cb=[c for c in b if c['matchId']==mid]
raise SystemExit(0 if len(ca)==1 and len(cb)==1 and ca[0]['id']==cb[0]['id'] else 1)
PY
  then break; fi
  sleep 0.2
done
CONV_ID="$(python3 - "$MATCH_ID" "$CONV_A" "$CONV_B" <<'PY'
import json,sys
mid=sys.argv[1]; a=json.loads(sys.argv[2]); b=json.loads(sys.argv[3])
ca=[c for c in a if c['matchId']==mid]; cb=[c for c in b if c['matchId']==mid]
assert len(ca)==1 and len(cb)==1, (ca,cb)
assert ca[0]['id']==cb[0]['id'], (ca,cb)
print(ca[0]['id'])
PY
)"

log "sending a message from A and reading it as B"
api POST "/api/v1/conversations/$CONV_ID/messages" "$TOKEN_A" '{"content":"match e2e hello"}' >/dev/null
HISTORY="$(api GET "/api/v1/conversations/$CONV_ID/messages?limit=50" "$TOKEN_B")"
python3 - "$HISTORY" <<'PY'
import json,sys
rows=json.loads(sys.argv[1])
assert any(m['content']=='match e2e hello' for m in rows), rows
PY

log "PASSED: frontend proxy -> auth -> profiles -> discovery -> reciprocal LIKE -> ACTIVE match -> conversation -> message"
log "matchId=$MATCH_ID conversationId=$CONV_ID"
