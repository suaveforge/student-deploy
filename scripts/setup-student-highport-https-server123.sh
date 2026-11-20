#!/bin/sh
set -eu
# W01 standalone 19443 TLS; never modify 80, 443, Caddy or any other service.
D=/home/ggul-docker/bin/docker
S=unix:///home/ggul-docker/run/docker.sock
NAME=suaveforge_student_https_19443
BASE=/home/student
PORT=19443
test -x "$D"
test -s /home/suaveforge/secrets/spaceship.env
test -s config/nginx-student-19443.conf
curl --fail --silent --show-error --max-time 8 http://127.0.0.1:18787/api/health | grep -q '"ok":true'
if "$D" -H "$S" container inspect "$NAME" >/dev/null 2>&1; then
  echo STUDENT_TLS_CONTAINER_EXISTS_STOP_FOR_REVIEW
  exit 14
fi
if (echo >/dev/tcp/127.0.0.1/"$PORT") >/dev/null 2>&1; then
  echo STUDENT_19443_CONFLICT_ABORT
  exit 15
fi
# Check DNS-01 label only: refuse if an independently managed TXT record exists.
"$D" -H "$S" run --rm -i --network host --read-only \
  --cap-drop ALL --security-opt no-new-privileges \
  -v /home/suaveforge/secrets/spaceship.env:/run/spaceship.env:ro \
  python:3.11-alpine python - <<'PY'
from pathlib import Path
import urllib.request,json
env={}
for line in Path('/run/spaceship.env').read_text().splitlines():
    if '=' in line and not line.lstrip().startswith('#'):
        k,v=line.split('=',1);env[k.strip()]=v.strip().strip('"').strip("'")
key,secret=env.get('SPACESHIP_API_KEY'),env.get('SPACESHIP_API_SECRET')
if not key or not secret:raise RuntimeError('SPACESHIP_CREDENTIALS_UNAVAILABLE')
url='https://spaceship.dev/api/v1/dns/records/suaveforge.com?take=500&skip=0'
req=urllib.request.Request(url,headers={'X-Api-Key':key,'X-Api-Secret':secret,'Accept':'application/json'})
with urllib.request.urlopen(req,timeout=25) as r: result=json.load(r)
items=result.get('items',result.get('records',result.get('data',{}).get('items',[])))
if not isinstance(items,list):raise RuntimeError('DNS_RECORDS_API_UNEXPECTED')
host='_acme-challenge.student'
hits=[x for x in items if str(x.get('name','')).lower().rstrip('.') in (host,host+'.suaveforge.com')]
if hits:raise RuntimeError('ACME_TXT_LABEL_ALREADY_USED_REFUSE_OVERWRITE')
student=[x for x in items if str(x.get('name','')).lower().rstrip('.') in ('student','student.suaveforge.com')]
if len(student)!=1 or student[0].get('type','').upper()!='A':raise RuntimeError('STUDENT_A_NOT_VERIFIED')
print('STUDENT_ACME_LABEL_FREE=YES')
print('STUDENT_EXISTING_A_UNCHANGED=YES')
PY
# Directories only within pre-existing /home/student. No shared proxy files touched.
"$D" -H "$S" run --rm --network none \
  -v "$BASE:/student:rw" alpine:3.20 sh -ec \
  'umask 077; mkdir -p /student/tls-acme/account /student/tls-acme/live /student/tls-acme/nginx; chmod 700 /student/tls-acme /student/tls-acme/account /student/tls-acme/live /student/tls-acme/nginx'
# Copy exact public Nginx site into dedicated host directory; validated before launch.
"$D" -H "$S" run --rm -i --network none \
  -v "$BASE:/student:rw" alpine:3.20 sh -ec \
  'umask 077; cat >/student/tls-acme/nginx/student.conf.new; mv /student/tls-acme/nginx/student.conf.new /student/tls-acme/nginx/student.conf' \
  < config/nginx-student-19443.conf
# Use Spaceship DNS-01: no need to own/listen on 80 or 443.
# The plugin only manages _acme-challenge.student TXT and removes its own value.
"$D" -H "$S" run --rm --network bridge \
  --cap-drop ALL --security-opt no-new-privileges \
  -v /home/suaveforge/secrets/spaceship.env:/run/spaceship.env:ro \
  -v "$BASE/tls-acme/account:/acme.sh:rw" \
  -v "$BASE/tls-acme/live:/student-tls:rw" \
  --entrypoint /bin/sh neilpang/acme.sh:latest -ec '
    set -a
    . /run/spaceship.env
    set +a
    export SPACESHIP_ROOT_DOMAIN=suaveforge.com
    test -n "$SPACESHIP_API_KEY"
    test -n "$SPACESHIP_API_SECRET"
    acme.sh --issue --dns dns_spaceship --server letsencrypt --keylength ec-256 \
      --dnssleep 120 -d student.suaveforge.com --home /acme.sh
    acme.sh --install-cert --ecc -d student.suaveforge.com --home /acme.sh \
      --key-file /student-tls/privkey.pem \
      --fullchain-file /student-tls/fullchain.pem
    chmod 600 /student-tls/privkey.pem
    chmod 644 /student-tls/fullchain.pem
    echo STUDENT_INDEPENDENT_ACME_DNS01_CERT_INSTALLED
  '
"$D" -H "$S" run --rm --network none \
  -v "$BASE/tls-acme/live:/certs:ro" alpine:3.20 sh -ec \
  'test -s /certs/privkey.pem && test -s /certs/fullchain.pem'
# Validate Nginx config BEFORE start; not touching shared TLS services.
"$D" -H "$S" run --rm --network host \
  -v "$BASE/tls-acme/nginx/student.conf:/etc/nginx/conf.d/default.conf:ro" \
  -v "$BASE/tls-acme/live:/etc/nginx/student-tls:ro" \
  nginx:1.27-alpine nginx -t
"$D" -H "$S" run -d --name "$NAME" --restart unless-stopped \
  --network host --read-only --cap-drop ALL \
  --security-opt no-new-privileges --memory 128m --pids-limit 80 \
  --tmpfs /var/cache/nginx:rw,nosuid,nodev,size=32m \
  --tmpfs /var/run:rw,nosuid,nodev,size=4m \
  -v "$BASE/tls-acme/nginx/student.conf:/etc/nginx/conf.d/default.conf:ro" \
  -v "$BASE/tls-acme/live:/etc/nginx/student-tls:ro" \
  nginx:1.27-alpine >/dev/null
# Publicly trusted TLS and reverse proxy must both work on 19443.
for i in $(seq 1 18); do
  if curl --fail --silent --show-error --max-time 7 \
    https://student.suaveforge.com:19443/api/health | grep -q '"ok":true'; then
    echo STUDENT_INDEPENDENT_19443_HTTPS=PASS
    exit 0
  fi
  sleep 3
done
echo STUDENT_19443_EXTERNAL_TLS_OR_FIREWALL_FAILED
exit 12
