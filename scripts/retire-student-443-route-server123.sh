#!/bin/sh
set -eu
# ONE-TIME removal of only the OBSOLETE Student import from existing shared 443.
# Do not use this script to add any Caddy site. Do not stop shared Caddy or any service.
D=/home/ggul-docker/bin/docker
S=unix:///home/ggul-docker/run/docker.sock
test -x "$D"
curl --fail --silent --show-error --max-time 12 \
 https://student.suaveforge.com:19443/api/health | grep -q '"ok":true'
"$D" -H "$S" run --rm -i --network host \
 -v /home:/home:rw python:3.11-alpine python - <<'PY'
from pathlib import Path
import os,subprocess,shutil,fcntl
main=Path('/home/gyeol/Caddyfile')
binary=Path('/home/gyeol/runtime/caddy/caddy')
lock=Path('/home/student/deploy/.student-443-retire.lock')
backup=Path('/home/student/backups/Caddyfile.before-student-19443-retire')
site='import /home/student/deploy/Caddyfile.student'
if not main.is_file() or not binary.is_file():raise RuntimeError('SHARED_CONFIG_NOT_VERIFIED')
lock.parent.mkdir(parents=True,exist_ok=True)
backup.parent.mkdir(parents=True,exist_ok=True)
fd=os.open(lock,os.O_CREAT|os.O_RDWR,0o600)
fcntl.flock(fd,fcntl.LOCK_EX)
try:
    original=main.read_bytes()
    text=original.decode('utf-8')
    if text.count(site)!=1:
        if site not in text:
            print('STUDENT_443_IMPORT=ALREADY_ABSENT')
            raise SystemExit(0)
        raise RuntimeError('MULTIPLE_STUDENT_IMPORTS_REFUSE_CHANGE')
    if any(line.strip().startswith('student.suaveforge.com') for line in text.splitlines()):
        raise RuntimeError('STUDENT_443_INLINE_SITE_FOUND_REFUSE_CHANGE')
    lines=text.splitlines(keepends=True)
    altered=''.join(line for line in lines if line.strip()!=site)
    if text==altered or site in altered:raise RuntimeError('CANDIDATE_NOT_ISOLATED')
    candidate=main.with_name('Caddyfile.student-retire.candidate')
    candidate.write_text(altered)
    shutil.copymode(main,candidate)
    check=subprocess.run([str(binary),'adapt','--config',str(candidate),'--adapter','caddyfile'],stdout=subprocess.DEVNULL,stderr=subprocess.PIPE,timeout=30)
    if check.returncode:
        candidate.unlink(missing_ok=True)
        raise RuntimeError('REMOVE_STUDENT_ONLY_VALIDATION_FAILED')
    if not backup.exists():
        backup.write_bytes(original)
        os.chmod(backup,0o600)
    os.replace(candidate,main)
    reload=subprocess.run([str(binary),'reload','--config',str(main),'--adapter','caddyfile'],stdout=subprocess.DEVNULL,stderr=subprocess.PIPE,timeout=45)
    if reload.returncode:
        restore=main.with_name('Caddyfile.student-retire.rollback')
        restore.write_bytes(original)
        shutil.copymode(main,restore)
        os.replace(restore,main)
        subprocess.run([str(binary),'reload','--config',str(main),'--adapter','caddyfile'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,timeout=30)
        raise RuntimeError('REMOVE_STUDENT_443_RELOAD_FAILED_RESTORED')
    if site in main.read_text():raise RuntimeError('REMOVE_STUDENT_443_READBACK_FAILED')
    print('STUDENT_443_SITE_REMOVED=PASS')
    print('SHARED_OTHER_SITES_PRESERVED=CONFIG_BYTES_UNCHANGED_EXCEPT_STUDENT_IMPORT')
finally:
    fcntl.flock(fd,fcntl.LOCK_UN)
    os.close(fd)
PY
