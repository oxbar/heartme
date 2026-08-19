#!/usr/bin/env bash
set -euo pipefail
echo "== Java =="; java -version
echo "== Maven =="; mvn -version
echo "== Node =="; node --version
echo "== npm =="; npm --version

echo "== Ports =="
for port in 5432 6379 9092; do
  if nc -z localhost "$port" 2>/dev/null; then echo "localhost:$port OK"; else echo "localhost:$port unavailable"; fi
done

echo "== Backend compile =="
(cd backend && mvn -q -DskipTests compile)

echo "== Frontend build =="
(cd frontend && npm run build)
