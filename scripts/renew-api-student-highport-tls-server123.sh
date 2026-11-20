#!/bin/sh
set -eu
# Standalone Student cert renewal (DNS-01) and Nginx reload on port 19444 only.
# The legacy shared 443 service, cert store, proxy and other projects are never accessed.
D=/home/ggul-docker/bin/docker
S=unix:///home/ggul-docker/run/docker.sock
NAME=suaveforge_student_api_https_19444
BASE=/home/student/tls-api-acme
test -x "$D"
test -s /home/suaveforge/secrets/spaceship.env
test "$("$D" -H "$S" inspect --format '{{.State.Running}}' "$NAME")" = true
curl --fail --silent --show-error --max-time 10 \
 https://api-student.suaveforge.com:19444/api/health | grep -q '"ok":true'
"$D" -H "$S" run --rm --network bridge \
 --cap-drop ALL --security-opt no-new-privileges \
 -v /home/suaveforge/secrets/spaceship.env:/run/spaceship.env:ro \
 -v "$BASE/account:/acme.sh:rw" \
 -v "$BASE/live:/student-tls:rw" \
 --entrypoint /bin/sh neilpang/acme.sh:latest -ec '
   set -a
   . /run/spaceship.env
   set +a
   export SPACESHIP_ROOT_DOMAIN=suaveforge.com
   test -n "$SPACESHIP_API_KEY"
   test -n "$SPACESHIP_API_SECRET"
   acme.sh --cron --home /acme.sh --server letsencrypt
   echo STUDENT_INDEPENDENT_TLS_RENEWAL_CRON=PASS
 '
# Only the independent Student Nginx process reloads to pick up renewed files.
"$D" -H "$S" exec "$NAME" nginx -s reload
curl --fail --silent --show-error --max-time 15 \
 https://api-student.suaveforge.com:19444/api/health | grep -q '"ok":true'
echo STUDENT_19444_CERT_RENEWAL_HEALTH=PASS
