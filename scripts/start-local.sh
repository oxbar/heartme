#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

for port in 5432 6379 9092; do
  if ! nc -z localhost "$port" 2>/dev/null; then
    echo "Required local dependency is not reachable on localhost:$port"
    echo "Start PostgreSQL (5432), Redis (6379) and Kafka (9092), then retry."
    exit 1
  fi
done

cleanup() {
  if [[ -n "${BACKEND_PID:-}" ]]; then kill "$BACKEND_PID" 2>/dev/null || true; fi
}
trap cleanup EXIT INT TERM

(
  cd "$ROOT/backend"
  mvn spring-boot:run
) &
BACKEND_PID=$!

echo "Backend PID: $BACKEND_PID"
echo "Starting Angular on http://localhost:4200"

cd "$ROOT/frontend"
npm start
