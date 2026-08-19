#!/usr/bin/env bash
set -euo pipefail
BASE_URL="${BASE_URL:-http://localhost:8080}"

echo "Health:"
curl -fsS "$BASE_URL/actuator/health"
echo

echo "Swagger JSON:"
curl -fsS "$BASE_URL/v3/api-docs" >/dev/null
echo "OK"
