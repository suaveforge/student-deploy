#!/bin/sh
set -eu
# Only the student A record. Credentials never leave the existing server123 secret mount.
D=/home/ggul-docker/bin/docker
S=unix:///home/ggul-docker/run/docker.sock
test -s /home/suaveforge/secrets/spaceship.env || { echo STUDENT_SPACESHIP_CREDENTIALS_MISSING; exit 1; }
"$D" -H "$S" run --rm -i --network host --read-only \
 --cap-drop ALL --security-opt no-new-privileges \
 -v /home/suaveforge/secrets/spaceship.env:/run/spaceship.env:ro \
 python:3.11-alpine python - <<'PY'
from pathlib import Path
import urllib.request,json
env={}
for line in Path('/run/spaceship.env').read_text().splitlines():
    if '=' in line and not line.lstrip().startswith('#'):
        key,value=line.split('=',1)
        env[key.strip()]=value.strip().strip('"').strip("'")
key,secret=env.get('SPACESHIP_API_KEY'),env.get('SPACESHIP_API_SECRET')
if not key or not secret: raise RuntimeError('SPACESHIP_CREDENTIALS_MISSING')
domain='suaveforge.com';host='api-student'
base='https://spaceship.dev/api/v1/dns/records/'+domain
headers={'X-Api-Key':key,'X-Api-Secret':secret,'Accept':'application/json'}
def get():
    with urllib.request.urlopen(urllib.request.Request(base+'?take=500&skip=0',headers=headers),timeout=25) as r:
        obj=json.load(r)
    if isinstance(obj.get('items'),list):return obj['items']
    if isinstance(obj.get('records'),list):return obj['records']
    if isinstance(obj.get('data'),dict) and isinstance(obj['data'].get('items'),list):return obj['data']['items']
    raise RuntimeError('SPACESHIP_RESPONSE_UNKNOWN')
def ishost(x,h):
    n=str(x.get('name','')).lower().strip('.')
    return n in (h,h+'.'+domain)
current=get()
# Retrieve actual verified existing server123 address; never invent or change it.
targets={str(x.get('address')) for x in current if ishost(x,'jumper') and str(x.get('type','')).upper()=='A' and x.get('address')}
if len(targets)!=1:raise RuntimeError('SERVER123_REFERENCE_IP_NOT_UNIQUE')
target=next(iter(targets))
hits=[x for x in current if ishost(x,host)]
if hits:
    if len(hits)!=1 or str(hits[0].get('type','')).upper()!='A' or str(hits[0].get('address',''))!=target:
        raise RuntimeError('API_STUDENT_DNS_CONFLICT_REFUSE_OVERWRITE')
    print('API_STUDENT_DNS=ALREADY_SET')
else:
    payload=json.dumps({'force':False,'items':[{'type':'A','name':host,'address':target,'ttl':600}]}).encode()
    request=urllib.request.Request(base,data=payload,headers={**headers,'Content-Type':'application/json'},method='PUT')
    with urllib.request.urlopen(request,timeout=30) as r:
        print('API_STUDENT_DNS_WRITE_HTTP='+str(r.status))
verify=[x for x in get() if ishost(x,host)]
if len(verify)!=1 or str(verify[0].get('type','')).upper()!='A' or str(verify[0].get('address',''))!=target:
    raise RuntimeError('API_STUDENT_DNS_READBACK_FAILED')
print('API_STUDENT_DNS_VERIFIED=YES')
print('API_STUDENT_FQDN=api-student.suaveforge.com')
PY
