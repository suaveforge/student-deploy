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
