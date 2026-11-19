#!/bin/sh
set -eu
# Independent student.suaveforge.com Caddy site; preserve all existing imports.
D=/home/ggul-docker/bin/docker
S=unix:///home/ggul-docker/run/docker.sock
"$D" -H "$S" run --rm -i --network host -v /home:/home:rw \
  python:3.11-alpine python - <<'PY'
from pathlib import Path
import os,subprocess,fcntl,shutil
root=Path('/home/student')
deploy=root/'deploy';backups=root/'backups'
deploy.mkdir(parents=True,exist_ok=True)
backups.mkdir(parents=True,exist_ok=True)
main=Path('/home/gyeol/Caddyfile')
binary=Path('/home/gyeol/runtime/caddy/caddy')
snippet=deploy/'Caddyfile.student'
imp='import /home/student/deploy/Caddyfile.student'
if not binary.is_file() or not main.is_file():raise RuntimeError('SHARED_CADDY_UNAVAILABLE')
content='''# Student W01 - nonofficial proposed student activity management
student.suaveforge.com {
    encode gzip zstd
    reverse_proxy 127.0.0.1:18787
    header {
        X-Content-Type-Options "nosniff"
        Referrer-Policy "strict-origin-when-cross-origin"
        X-Frame-Options "DENY"
    }
}
'''
lock=deploy/'.caddy.lock'
fd=os.open(lock,os.O_RDWR|os.O_CREAT,0o600)
fcntl.flock(fd,fcntl.LOCK_EX)
try:
    original=main.read_bytes()
    if b'student.suaveforge.com' in original and imp.encode() not in original:
        raise RuntimeError('STUDENT_CADDY_CONFLICT_REFUSE_OVERWRITE')
    old_snippet=snippet.read_bytes() if snippet.exists() else None
    snippet.write_text(content)
    candidate=original if imp.encode() in original else original.rstrip()+b'\n\n'+imp.encode()+b'\n'
    tmp=main.parent/'.Caddyfile.student.candidate'
    tmp.write_bytes(candidate)
    shutil.copymode(main,tmp)
    check=subprocess.run([str(binary),'adapt','--config',str(tmp),'--adapter','caddyfile'],stdout=subprocess.DEVNULL,stderr=subprocess.PIPE,timeout=30)
    if check.returncode:
        tmp.unlink(missing_ok=True)
        if old_snippet is None:snippet.unlink(missing_ok=True)
        else:snippet.write_bytes(old_snippet)
        raise RuntimeError('STUDENT_CADDY_VALIDATION_FAILED')
    if candidate!=original:
        backup=backups/'Caddyfile.before-student'
        if not backup.exists():backup.write_bytes(original);os.chmod(backup,0o600)
        os.replace(tmp,main)
    else:tmp.unlink(missing_ok=True)
    reload=subprocess.run([str(binary),'reload','--config',str(main),'--adapter','caddyfile'],stdout=subprocess.DEVNULL,stderr=subprocess.PIPE,timeout=40)
    if reload.returncode:
        if candidate!=original:
            rollback=main.parent/'.Caddyfile.student.rollback'
            rollback.write_bytes(original);shutil.copymode(main,rollback);os.replace(rollback,main)
        if old_snippet is None:snippet.unlink(missing_ok=True)
        else:snippet.write_bytes(old_snippet)
        subprocess.run([str(binary),'reload','--config',str(main),'--adapter','caddyfile'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,timeout=30)
        raise RuntimeError('STUDENT_CADDY_RELOAD_FAILED_ROLLED_BACK')
    print('STUDENT_CADDY_HTTPS_SITE=STAGED_AND_RELOADED')
finally:
    fcntl.flock(fd,fcntl.LOCK_UN)
    os.close(fd)
PY
