#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

git clone --depth 1 https://github.com/angular/skills.git "$TMP/angular-skills"
rm -rf "$ROOT/.trae/skills/angular-developer"
mkdir -p "$ROOT/.trae/skills"
cp -R "$TMP/angular-skills/angular-developer" "$ROOT/.trae/skills/angular-developer"
echo "Installed official angular-developer skill at .trae/skills/angular-developer"
