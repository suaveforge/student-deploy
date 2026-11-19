#!/bin/sh
set -eu
D=/home/ggul-docker/bin/docker
S=unix:///home/ggul-docker/run/docker.sock
APP=suaveforge_student_w01
REV=$GITHUB_SHA
test -x "$D"
test -f Dockerfile
test -f server.mjs
test -f tests/integration.test.mjs
test "$(printf %s "$REV" | wc -c)" -eq 40
if "$D" -H "$S" container inspect "$APP" >/dev/null 2>&1; then
  echo STUDENT_CONTAINER_EXISTS_REFUSE_OVERWRITE
  exit 4
fi
if (echo >/dev/tcp/127.0.0.1/18787) >/dev/null 2>&1; then
  echo STUDENT_PORT_OCCUPIED
  exit 5
fi
echo STUDENT_IMAGE_BUILD_START
"$D" -H "$S" build -t "suaveforge-student:$REV" -f Dockerfile .
echo STUDENT_HTTP_SQLITE_TEST_START
"$D" -H "$S" run --rm --entrypoint node "suaveforge-student:$REV" --test tests/integration.test.mjs
echo STUDENT_HTTP_SQLITE_TEST_PASS
"$D" -H "$S" volume create suaveforge_student_data >/dev/null
"$D" -H "$S" volume create suaveforge_student_artifacts >/dev/null
"$D" -H "$S" run --rm --user 0 --entrypoint /bin/sh \
  -v suaveforge_student_data:/app/data -v suaveforge_student_artifacts:/app/artifacts \
  "suaveforge-student:$REV" -c 'chown -R node:node /app/data /app/artifacts'
"$D" -H "$S" run -d --name "$APP" --restart unless-stopped --init \
 --shm-size 1g --cap-drop ALL --security-opt no-new-privileges \
 -p 127.0.0.1:18787:8787 \
 -e HOST=0.0.0.0 -e PORT=8787 -e DBFILE=/app/data/mvp.sqlite \
 -e COOKIE_SECURE=1 -e RECORD_BASE_URL=https://student.suaveforge.com \
 -e RECORDER_PYTHON=/opt/w01-python/bin/python -e CHROME_BIN=/usr/bin/google-chrome-stable \
 -v suaveforge_student_data:/app/data -v suaveforge_student_artifacts:/app/artifacts \
 "suaveforge-student:$REV" >/dev/null
ok=0
for i in $(seq 1 25); do
  if curl --fail --silent --max-time 4 http://127.0.0.1:18787/api/health | grep -q '"ok":true'; then ok=1; break; fi
  sleep 2
done
if test "$ok" -ne 1; then
  echo STUDENT_HEALTH_FAILED
  "$D" -H "$S" rm -f "$APP" >/dev/null
  exit 6
fi
echo STUDENT_ISOLATED_HTTP=200
echo "STUDENT_SOURCE_SHA=$REV"
