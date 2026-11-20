#!/bin/sh
set -eu
# W01: change ONLY student.suaveforge.com from old A to GitHub Pages CNAME.
# All other DNS records (api-student, Jumper, Mail, etc.) are immutable.
D=/home/ggul-docker/bin/docker
S=unix:///home/ggul-docker/run/docker.sock
test -s /home/suaveforge/secrets/spaceship.env
curl --fail --silent --show-error --max-time 15 \
  https://api-student.suaveforge.com:19444/api/health | grep -q '"ok":true'
# Confirm Pages serves the real Student UI when reached with the desired Host/SNI, without editing DNS.
edge=$(getent ahostsv4 suaveforge.github.io | awk 'NR==1{print $1}')
test -n "$edge"
curl -ksS --max-time 15 --resolve "student.suaveforge.com:443:$edge" \
  https://student.suaveforge.com/ | grep -q 'MIRAE Pathways'
echo PORTLESS_PAGES_STAGING_VHOST=PASS
"$D" -H "$S" run --rm -i --network host --read-only \
  --cap-drop ALL --security-opt no-new-privileges \
  -v /home/suaveforge/secrets/spaceship.env:/run/spaceship.env:ro \
  python:3.11-alpine python - <<'PY'
import json,urllib.request,urllib.error
from pathlib import Path
env={}
for line in Path('/run/spaceship.env').read_text().splitlines():
    if '=' in line and not line.lstrip().startswith('#'):
        k,v=line.split('=',1)
        env[k.strip()]=v.strip().strip('"').strip("'")
key,secret=env.get('SPACESHIP_API_KEY'),env.get('SPACESHIP_API_SECRET')
if not key or not secret:raise RuntimeError('SPACESHIP_CREDENTIALS_MISSING')
base='https://spaceship.dev/api/v1/dns/records/suaveforge.com'
headers={'X-Api-Key':key,'X-Api-Secret':secret,'Accept':'application/json','Content-Type':'application/json'}
def request(method='GET',body=None):
    url=base+('?take=500&skip=0' if method=='GET' else '')
    req=urllib.request.Request(url,method=method,headers=headers,data=None if body is None else json.dumps(body).encode())
    with urllib.request.urlopen(req,timeout=35) as r:
        return json.load(r) if method=='GET' else r.status
def records():
    obj=request()
    items=obj.get('items',obj.get('records',obj.get('data',{}).get('items',[])))
    if not isinstance(items,list):raise RuntimeError('DNS_RESPONSE_UNEXPECTED')
    return items
def matches(x,name):
    return str(x.get('name','')).lower().strip('.') in (name,name+'.suaveforge.com')
def matching(items,name):
    return [x for x in items if matches(x,name)]
initial=records()
student=matching(initial,'student')
api=matching(initial,'api-student')
if len(api)!=1 or str(api[0].get('type','')).upper()!='A':raise RuntimeError('API_STUDENT_DNS_MISSING_REFUSE_CUTOVER')
if len(student)!=1:raise RuntimeError('STUDENT_DNS_UNEXPECTED_RECORD_COUNT')
entry=student[0]
if str(entry.get('type','')).upper()=='CNAME' and str(entry.get('address','')).lower().rstrip('.')=='suaveforge.github.io':
    print('STUDENT_PAGES_CNAME=ALREADY_SET')
    raise SystemExit(0)
if str(entry.get('type','')).upper()!='A' or str(entry.get('address',''))!=str(api[0].get('address','')):
    raise RuntimeError('STUDENT_EXISTING_A_MISMATCH_REFUSE_CUTOVER')
original={'type':'A','name':'student','address':str(entry['address'])}
target={'type':'CNAME','name':'student','address':'suaveforge.github.io'}
old_deleted=False
try:
    status=request('DELETE',[original])
    if status!=204:raise RuntimeError('STUDENT_OLD_A_DELETE_HTTP_'+str(status))
    old_deleted=True
    print('STUDENT_OLD_A_REMOVED=YES')
    status=request('PUT',{'force':False,'items':[{**target,'ttl':600}]})
    if status!=204:raise RuntimeError('STUDENT_PAGES_CNAME_WRITE_HTTP_'+str(status))
    result=matching(records(),'student')
    if len(result)!=1 or result[0].get('type','').upper()!='CNAME' or str(result[0].get('address','')).lower().rstrip('.')!='suaveforge.github.io':
        raise RuntimeError('STUDENT_PAGES_CNAME_READBACK_FAILED')
    print('STUDENT_PAGES_CNAME_READBACK=PASS')
    print('STUDENT_ONLY_DNS_CHANGED=YES')
except Exception:
    if old_deleted:
        try:
            now=matching(records(),'student')
            if len(now)==1 and now[0].get('type','').upper()=='CNAME' and str(now[0].get('address','')).lower().rstrip('.')=='suaveforge.github.io':
                request('DELETE',[target])
            if not matching(records(),'student'):
                request('PUT',{'force':False,'items':[{**original,'ttl':600}]})
            print('STUDENT_DNS_ROLLBACK_A_ATTEMPTED')
        except Exception as e:
            print('STUDENT_DNS_ROLLBACK_FAILED_'+type(e).__name__)
    raise
PY
