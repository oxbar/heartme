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
SENT="$(api POST "/api/v1/conversations/$CONV_ID/messages" "$TOKEN_A" '{"content":"match e2e hello"}')"
MESSAGE_ID="$(printf '%s' "$SENT" | json_field id)"
HISTORY="$(api GET "/api/v1/conversations/$CONV_ID/messages?limit=50" "$TOKEN_B")"
python3 - "$HISTORY" <<'PY'
import json,sys
rows=json.loads(sys.argv[1])
assert any(m['content']=='match e2e hello' for m in rows), rows
PY

log "marking the conversation read and asserting sender receives persisted read state"
api POST "/api/v1/conversations/$CONV_ID/read" "$TOKEN_B" '{}' >/dev/null
HISTORY_A="$(api GET "/api/v1/conversations/$CONV_ID/messages?limit=50" "$TOKEN_A")"
python3 - "$MESSAGE_ID" "$HISTORY_A" <<'PY'
import json,sys
mid=sys.argv[1]; rows=json.loads(sys.argv[2])
message=next(m for m in rows if m['id']==mid)
assert message['readAt'] is not None, message
PY

log "reacting with a heart from B and asserting the reaction is visible to A"
REACTION="$(api PUT "/api/v1/conversations/$CONV_ID/messages/$MESSAGE_ID/heart" "$TOKEN_B" '{}')"
python3 - "$REACTION" <<'PY'
import json,sys
r=json.loads(sys.argv[1])
assert r['heartReactedByMe'] is True, r
assert r['heartReactionCount']==1, r
PY
HISTORY_A="$(api GET "/api/v1/conversations/$CONV_ID/messages?limit=50" "$TOKEN_A")"
python3 - "$MESSAGE_ID" "$HISTORY_A" <<'PY'
import json,sys
mid=sys.argv[1]; rows=json.loads(sys.argv[2])
message=next(m for m in rows if m['id']==mid)
assert message['heartReactionCount']==1, message
assert message['heartReactedByMe'] is False, message
PY

log "checking online/last-seen presence through the same frontend proxy"
api POST /api/v1/profile/presence "$TOKEN_B" '{}' >/dev/null
PRESENCE="$(api GET "/api/v1/profile/$USER_B/presence" "$TOKEN_A")"
python3 - "$USER_B" "$PRESENCE" <<'PY'
import json,sys
uid=sys.argv[1]; p=json.loads(sys.argv[2])
assert p['userId']==uid, p
assert p['online'] is True, p
assert p['lastSeenAt'], p
PY

log "checking actionable MESSAGE notification for B"
NOTIFICATIONS="$(api GET '/api/v1/notifications?limit=100' "$TOKEN_B")"
python3 - "$CONV_ID" "$NOTIFICATIONS" <<'PY'
import json,sys
conversation_id=sys.argv[1]; rows=json.loads(sys.argv[2])
message_notifications=[n for n in rows if n['type']=='MESSAGE']
assert message_notifications, rows
assert any(json.loads(n['dataJson']).get('conversationId')==conversation_id for n in message_notifications), message_notifications
PY

log "unmatching and asserting the old chat is no longer authorized"
api DELETE "/api/v1/matches/$MATCH_ID" "$TOKEN_A" >/dev/null
MATCH_AFTER="$(api GET /api/v1/matches "$TOKEN_B")"
python3 - "$MATCH_ID" "$MATCH_AFTER" <<'PY'
import json,sys
mid=sys.argv[1]; rows=json.loads(sys.argv[2])
assert all(m['id'] != mid or m['status'] != 'ACTIVE' for m in rows), rows
PY
HTTP_CODE="$(curl -sS -o /dev/null -w '%{http_code}' \
  -H "Authorization: Bearer $TOKEN_B" \
  "$BASE_URL/api/v1/conversations/$CONV_ID/messages?limit=10")"
[[ "$HTTP_CODE" == "403" ]] || fail "expected old conversation to return 403 after unmatch, got $HTTP_CODE"

log "clearing B notifications"
api DELETE /api/v1/notifications "$TOKEN_B" >/dev/null
NOTIFICATIONS_AFTER="$(api GET '/api/v1/notifications?limit=100' "$TOKEN_B")"
python3 - "$NOTIFICATIONS_AFTER" <<'PY'
import json,sys
assert json.loads(sys.argv[1]) == [], sys.argv[1]
PY

log "PASSED: proxy -> auth -> discovery -> match -> conversation -> read receipt -> reaction -> presence -> notification -> unmatch"
log "matchId=$MATCH_ID conversationId=$CONV_ID messageId=$MESSAGE_ID"
