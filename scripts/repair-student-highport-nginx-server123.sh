#!/bin/sh
set -eu
# Repair ONLY failed student HTTPS 19443 container; cert/DNS/backend remain unchanged.
D=/home/ggul-docker/bin/docker
S=unix:///home/ggul-docker/run/docker.sock
NAME=suaveforge_student_https_19443
BASE=/home/student
test -x "$D"
"$D" -H "$S" container inspect "$NAME" >/dev/null
image=$("$D" -H "$S" inspect --format '{{.Config.Image}}' "$NAME")
network=$("$D" -H "$S" inspect --format '{{.HostConfig.NetworkMode}}' "$NAME")
test "$image" = nginx:1.27-alpine || { echo STUDENT_TLS_CONTAINER_UNEXPECTED_IMAGE; exit 4; }
test "$network" = host || { echo STUDENT_TLS_NETWORK_UNEXPECTED; exit 4; }
curl --fail --silent --show-error --max-time 10 \
  http://127.0.0.1:18787/api/health | grep -q '"ok":true'
if curl --fail --silent --show-error --max-time 7 \
  https://student.suaveforge.com:19443/api/health | grep -q '"ok":true'; then
  echo STUDENT_19443_ALREADY_HEALTHY
  exit 0
fi
# Both cert files are the previously acquired, independent DNS-01 certificate.
"$D" -H "$S" run --rm --network none \
  -v "$BASE/tls-acme/live:/certs:ro" \
  -v "$BASE/tls-acme/nginx:/config:ro" alpine:3.20 sh -ec \
  'test -s /certs/fullchain.pem; test -s /certs/privkey.pem; test -s /config/student.conf'
"$D" -H "$S" run --rm --network host \
  -v "$BASE/tls-acme/nginx/student.conf:/etc/nginx/conf.d/default.conf:ro" \
  -v "$BASE/tls-acme/live:/etc/nginx/student-tls:ro" \
  nginx:1.27-alpine nginx -t
# Only the known W01 container is removed; do not touch shared services.
"$D" -H "$S" rm -f "$NAME" >/dev/null
"$D" -H "$S" run -d --name "$NAME" --restart unless-stopped \
  --network host --read-only --cap-drop ALL \
  --cap-add CHOWN --cap-add SETUID --cap-add SETGID \
  --security-opt no-new-privileges --memory 128m --pids-limit 80 \
  --tmpfs /var/cache/nginx:rw,nosuid,nodev,size=32m \
  --tmpfs /var/run:rw,nosuid,nodev,size=4m \
  -v "$BASE/tls-acme/nginx/student.conf:/etc/nginx/conf.d/default.conf:ro" \
  -v "$BASE/tls-acme/live:/etc/nginx/student-tls:ro" \
  nginx:1.27-alpine >/dev/null
for i in $(seq 1 18); do
  if curl --fail --silent --show-error --max-time 7 \
     https://student.suaveforge.com:19443/api/health | grep -q '"ok":true'; then
    echo STUDENT_INDEPENDENT_19443_HTTPS=PASS
    exit 0
  fi
  sleep 3
done
echo STUDENT_19443_TLS_NOT_YET_ACCESSIBLE
"$D" -H "$S" ps -a --filter name="$NAME" --format '{{.Names}} {{.Status}}'
"$D" -H "$S" logs --tail 12 "$NAME" || true
exit 12
