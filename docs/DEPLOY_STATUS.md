# W01 Student deployment — 2026-11-20 KST

## Confirmed
- Existing deployment architecture inspected: private source → GitHub Actions self-hosted runner → server123 Docker → Spaceship DNS → shared Caddy HTTPS (JumperKids and Option Trader evidence).
- Source `suaveforge/student`, public deployment scripts `suaveforge/student-deploy`. GitHub Pages is **not** the actual runtime.
- Read-only preflight [44577510198](https://github.com/suaveforge/student/actions/runs/44577510198) PASS: runner 123-suaveforge-org-02, Docker 24.0.9, Caddyfile+Caddy binary+Spaceship secret present; port 18787 no listener and student Caddy site absent.
- Source CI [44578361188](https://github.com/suaveforge/student/actions/runs/44578361188) PASS: real HTTP/SQLite integration and recording Python AST.
- Server123 app release run: [44577932517](https://github.com/suaveforge/student/actions/runs/44577932517). **Do not claim success before checking final result.**
- Independent student deployment scripts were added; no change to other source repositories, unrelated services or DNS records yet.

## Incomplete / gates
- Actual Student container / loopback HTTP: requires successful release job and verified response.
- Spaceship student A: source `student-server123-domain.yml` workflow runs only after successful application deploy; requires readback.
- Caddy HTTPS / publicly trusted TLS: requires actual domain workflow PASS and independent external verification.
- Actual Chrome headed 13-step recording / MP4, PC/mobile full browser QA: not yet proven.
- Original G2B attachment details: not yet read.

## Recovery
Source workflow deploy-student-server123.yml owns application release. If build fails, inspect its **real job log** and change only student scripts/source, then retest. After successful app release, source workflow student-server123-domain.yml configures only Student A/Caddy and verifies HTTPS. App source remains private. Never force-overwrite records or other containers.


## 2026-11-20 actual server123 release checkpoint (supersedes early blocked status)

- Existing proven pipeline private source `suaveforge/student` → GitHub Actions private server123 self-hosted runner → server123 isolated Docker → Spaceship DNS → shared Caddy HTTPS, matching JumperKids and Option Trader. GitHub Pages not used for application.
- Deploy scripts: `scripts/deploy-student-server123.sh` handles source build, integration test, Student-only safe replacement and rollback, dedicated port `127.0.0.1:18787`, named SQLite/video volumes. `scripts/configure-student-dns-server123.sh` writes only student A; `scripts/configure-student-caddy-server123.sh` adds the student-only Caddy import with backup/rollback.
- Verified real release run 44577932517 **SUCCESS**; subsequent 44579985642, 44580507439, 44581239716 **SUCCESS** after fixes.
- Spaceship run 44579236938 **SUCCESS**; DNS API 204 + readback. Caddy/public HTTPS run 44579268897 **SUCCESS** including trusted HTTPS /api/health; subsequent 44581356694 **SUCCESS**.
- Real headed Chrome 13-step/FFmpeg verified run 44580634302 **SUCCESS**, 57.8sec MP4 artifact 14557908305. Second success 44581356646 58.534sec MP4 artifact 14559690367. Both from synthetic records. Recording flow includes real Chrome address bar and OS cursor, persisted SQLite and admin/professor/student workflows.
- Experimental native window CDP maximization broke 44582056829 (failed during login), reverted at source 7ee9030b0b0a89eb860dc9081c03854e49c1be0b; ensure rollback release and its E2E test PASS before claiming latest head. Old verified MP4 artifacts remain valid.
- Still incomplete: original G2B full attachment, physical mobile browser QA, public demo access hardening, cosmetic full-frame screenshot QA. Do not mark official school service / work W02-W05.


## 2026-11-20 NO-CADDY OVERRIDE — latest authoritative user direction

- User forbids Caddy for new Student deployment due to prior exposure; independent high-port backend plus Nginx (or equivalent non-Caddy) HTTPS is required. The older document above is *historical evidence only*, not architectural approval.
- Source main `22ab4ea9804859383b1eca85c88f85a6b2ee90bc` removes the automatic `student-server123-domain.yml` Caddy reapply workflow. This deploy repository removes the now-obsolete Caddy deployment script. The existing live ingress remains untouched, because sharing TCP 443 with other services makes unilateral replacement unsafe.
- Read-only live server123 inventory, run `44656674263` **SUCCESS**: 80/443/18787/18443 in use; 19443/28443 free on loopback; Nginx executable not visible in runner namespace; Docker daemon usable; Student 18787 health PASS; existing HTTPS health HTTP 200.
- Next: identify approved Nginx TLS runtime/certificate path and independent 443 routing or separate IP/host; stage Student-only high-port TLS; verify certificate, auth and Chrome MP4; cut over ONLY when other services are protected and rollback is proven. Do not claim TLS migration complete, do not change unrelated production services.


## 2026-11-20 FINAL HIGHPORT CUTOVER (supersedes legacy Caddy runbook)

- Live Student: **https://student.suaveforge.com:19443** (standalone Nginx TLS; no Student route on 443), Student backend `127.0.0.1:18787`. Old 443 Student import removed; shared other sites unchanged.
- Independent Let's Encrypt cert issued via Spaceship DNS-01, no 80/443 challenge; initial Nginx CAP_CHOWN startup failure [44659574078](https://github.com/suaveforge/student/actions/runs/44659574078), diagnosed [44660092418](https://github.com/suaveforge/student/actions/runs/44660092418), repaired [44660239653](https://github.com/suaveforge/student/actions/runs/44660239653) SUCCESS.
- Isolated backend redeployment [44660431317](https://github.com/suaveforge/student/actions/runs/44660431317) PASS; real headed Chrome 13-step MP4 through **:19443** [44660519718](https://github.com/suaveforge/student/actions/runs/44660519718) PASS, artifact `14594698823`, 59.867s, 2,386,231 bytes.
- Remove only old Student 443 route after video QA [44660707946](https://github.com/suaveforge/student/actions/runs/44660707946) PASS, old 443 Student API no longer routed; preserves other Caddy configuration bytes and sites.
- Current deployment paths: `scripts/setup-student-highport-https-server123.sh`, `scripts/repair-student-highport-nginx-server123.sh`, `scripts/retire-student-443-route-server123.sh`, `config/nginx-student-19443.conf` and weekly `scripts/renew-student-highport-tls-server123.sh`. Never redeploy the removed Caddy provisioner.
- Independent external read: `:19443/api/health` JSON `ok=true`, old `443/api/health` unavailable.
- Renewal workflow `student/.github/workflows/student-19443-renew.yml` added, requires actual PASS confirmation. Roll back standalone TLS only by stopping `suaveforge_student_https_19443`; preserved Student backend/data volumes are separate. Do not modify other projects.
- The new highport architecture is verified; **full W01 functional acceptance** still pending procurement attachment, physical mobile QA and demo security checks. Do not mark W01 full project complete.


## 2026-11-20 PORTLESS USER URL — latest W01 frontend deployment state

- Target **https://student.suaveforge.com** (browser displays no port). Actual frontend is the genuine HTML/CSS/JS application deployed as GitHub Pages static client assets with **real backend API**, not a fake static service; full backend is separate Node/SQLite and real Chrome FFmpeg recorder on server123.
- API hostname `api-student.suaveforge.com:19444`: independent Spaceship A, DNS-01 Let's Encrypt certificate, dedicated Nginx container; [44666282721](https://github.com/suaveforge/student/actions/runs/44666282721) SUCCESS. No changes to other shared Caddy/443 services. New API-only renewal cron; previous `student:19443` certificates obsolete.
- Pages `main` root contains `index.html`, `app.js`, `styles.css`, `CNAME`; https://suaveforge.github.io/student-deploy/ preview shows MIRAE Pathways. [44666826060](https://github.com/suaveforge/student-deploy/actions/runs/44666826060) virtual hostname test SUCCESS (insecure test only); [44666956634](https://github.com/suaveforge/student-deploy/actions/runs/44666956634) verified Pages domain registered, but custom HTTPS certificate still pending. Do not distribute portless URL as verified until browser-trusted TLS ready.
- Spaceship `student` DNS was switched **A→CNAME suaveforge.github.io** [44667181465](https://github.com/suaveforge/student/actions/runs/44667181465) SUCCESS, exact record only. Earlier attempt [44667081875](https://github.com/suaveforge/student/actions/runs/44667081875) failed 422 due wrong payload field, safe rollback attempted; fixed to `cname`. Public DNS confirms CNAME. API preflight with whitelist CORS passed [44666926331](https://github.com/suaveforge/student/actions/runs/44666926331).
- Portless Chrome recording: **NOT YET RETESTED**. Deployment script now targets `RECORD_BASE_URL=https://student.suaveforge.com` and separate API endpoint but source Student app has not yet been rebuilt with this env, awaiting valid frontend certificate. Do not reuse old :19443 recording to claim the new frontend works.

- **Trusted TLS blocker reproduced at deployment preflight:** [44667766451](https://github.com/suaveforge/student/actions/runs/44667766451) FAILED safely before Student container replacement because GitHub Pages still presents a certificate without student.suaveforge.com SAN (`curl: (60)`). This is a real external certificate issue, not an app or SQLite failure; existing API and persistent volumes remain healthy.
- **Automatic conditional promotion configured:** source commit `88475d5311161f9305c474cc194c08c8a8379666`, `.github/workflows/student-portless-cert-promotion.yml`, initial [44668003923](https://github.com/suaveforge/student/actions/runs/44668003923) SUCCESS as diagnostic with `STUDENT_PORTLESS_TRUSTED_TLS_READY=NO` and `STUDENT_PROMOTION=BLOCKED_CERTIFICATE_NOT_READY` (no deployment). Cron every 15 min checks browser-trusted UI TLS and independent API; only when both pass and live Student still has old recorder URL does it request a dedicated existing deploy workflow. Existing deploy preflight then rechecks cert before touching container, and successful deploy triggers existing real Chrome/MP4 QA. This automation is configured but **future promotion is unverified**; do not claim deployment or 13-step MP4 complete for the new URL until actual separate Actions run succeeds.
- **GitHub Pages official behavior:** custom certificate provisioning can take up to one hour after the CNAME is correctly configured. Never bypass SSL checks, edit other services' shared 443, or report HTTP-only/insecure Pages capture as final success. The canonical domain is correctly registered and DNS mapped; certificate is the outstanding vendor dependency.


## P. 2026-11-20 — 포트 없는 실서비스 및 Chrome 녹화 직접 검증 완료

- 최종 사용자 주소 **https://student.suaveforge.com/** (브라우저에 포트 노출 없음). GitHub Pages frontend는 공개 `suaveforge/student-deploy`에, 실제 Node/SQLite/첨부·권한·시연 API는 전용 `api-student.suaveforge.com:19444`(독립 Nginx) 및 123 서버에 격리. 다른 운영 서비스의 DNS/443/Caddy 수정 없음.
- 기존 KIMSE/WattGuard와 같은 `*-deploy` 정적 클라이언트 + 별도 백엔드 방식 대조 후 유지. 제3자 원격 자동 로그인 도구는 사용하지 않고 서버123 자체 Headed Chrome/Playwright/X11/FFmpeg만 QA에 사용.
- Pages 인증서 상태가 `null`인 사실 확인 [44684623970](https://github.com/suaveforge/student-deploy/actions/runs/44684623970); CNAME만 잠시 제거했다 재등록하는 공식 복구 흐름 이후 `authorization_pending` 시작 [44684915842](https://github.com/suaveforge/student-deploy/actions/runs/44684915842). 이후 외부에서 **신뢰되는 실제 HTTPS** 및 'MIRAE Pathways' 웹 화면 확인.
- Student-only 조건부 승인/배포 [44685091778](https://github.com/suaveforge/student/actions/runs/44685091778) SUCCESS, 실제 백엔드 재배포 [44685129084](https://github.com/suaveforge/student/actions/runs/44685129084) SUCCESS. CORS+권한 테스트 및 실제 SQLite 응답 확인. 메인 DB 영상 볼륨 유지.
- 13단계 **실제 Headed Chrome 전체 데스크톱 녹화**를 독립 서버123에서 재실행 [44685787716](https://github.com/suaveforge/student/actions/runs/44685787716) **SUCCESS**. 01 Chrome 시작 → 02 `student.suaveforge.com` 주소창 직접 입력 → 03 학생 로그인 → 04 실제 계획 작성 → 05 DB 저장 → 06 제출 → 07 로그아웃 → 08 교수 로그인·조회 → 09 교수 승인·피드백 → 10 관리자 로그인 → 11 대시보드·승인 확인 → 12 브라우저 새로고침·DB 지속성 확인 → 13 최종 MP4 생성. 완료 마커에 `"url": "https://student.suaveforge.com"` 실제 기록 검사 PASS.
- MP4 `recording-10.mp4` FFprobe **H.264 1440×900 15 FPS, duration 58.067s, size 2,508,650 bytes** PASS. 아티팩트 [14606346942](https://github.com/suaveforge/student/actions/runs/44685787716/artifacts/14606346942) / GitHub 보존기한 **2026-12-04 UTC**. 실제 다운로드 파일을 ffprobe로 재확인하고 프레임 캡처 육안 점검: **Chrome 주소창, 탭, 실제 X11 커서와 학생·관리자 UI 표시 확인**. 주의: 영상에는 현재 Chrome 창 바깥 검은 데스크톱 여백이 있으므로 최고 품질 완성 단계에서 화면 맞춤 개선 가능. 이 시각적 문제는 기능·녹화 검증 성공과 구분한다.
- 기존 `student.suaveforge.com:19443`는 최종 URL이 아니며 오래된 영상의 완료 마커를 새 검증 증거로 재사용하지 않음.
- **여전히 별도 범위 미완료**: G2B 원본 과업 첨부 문서 확보·항목별 대조, 부서 인정·6P/MIRAE 및 데이터 이관 세부 요구 완전 구현 여부, 실제 iOS/Android 디바이스 검증, 공개 가상 계정 보호정책, Chrome 녹화 화면 검은 여백 최소화 및 번역 팝업 억제. 이 사항들을 W01 전체 완료로 오인하지 않는다.
