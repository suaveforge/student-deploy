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
