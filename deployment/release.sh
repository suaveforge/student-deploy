#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
sha="$1"
if [[ ! "$sha" =~ ^[0-9a-f]{40}$ ]]; then
  echo "BLOCKED: release requires a pinned 40-character source commit SHA" >&2
  exit 2
fi
for gate in STUDENT_DEPLOY_ENABLED STUDENT_HOST_APPROVED STUDENT_DNS_READY STUDENT_HTTPS_READY STUDENT_DEMO_ACCESS_RESTRICTED; do
  if [[ "$(printenv "$gate" || true)" != "true" ]]; then
    echo "BLOCKED: $gate must be true" >&2
    exit 3
  fi
done
command -v docker >/dev/null
command -v curl >/dev/null
docker compose version >/dev/null
export STUDENT_SOURCE_SHA="$sha"
file="deployment/compose.yml"
docker compose -p suaveforge_student -f "$file" config --quiet
docker compose -p suaveforge_student -f "$file" pull student
docker compose -p suaveforge_student -f "$file" up -d --no-build --no-deps student
for i in $(seq 1 24); do
  if curl --silent --fail --max-time 3 http://127.0.0.1:18787/api/health | grep -q '"ok":true'; then
    echo "PASS local student API health; source=$sha"
    exit 0
  fi
  sleep 3
done
echo "FAIL student API health; existing persistent volumes retained" >&2
exit 1
