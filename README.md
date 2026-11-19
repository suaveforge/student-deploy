# Student — deployment repository

This is the **deployment-only** repository for the nonofficial SuaveForge student-management proposal MVP (R26BD00301798).

- **Application source (private):** [suaveforge/student](https://github.com/suaveforge/student)
- **Deployment configuration (this repository):** `suaveforge/student-deploy`
- **Target:** `https://student.suaveforge.com`
- **Current state:** NOT DEPLOYED. No claim of a live backend, tested Chrome recording or working HTTPS.

This is a full-stack Node.js + SQLite service with an OS-level Chrome/FFmpeg recording engine. **GitHub Pages cannot run this service**. Do not publish a static replica as though it were functional. This repository pins a built image by its source commit SHA and deploys it via an isolated self-hosted runner *after* preflight checks.

## Separation

| Repository | Responsibility |
| --- | --- |
| `suaveforge/student` | Editable application source, database schema, role-based UI/API, reusable recording engine, test suite and application CI/container build |
| `suaveforge/student-deploy` | Deployment Compose, gateway example, release and health gates, immutable source SHA, deployment workflow and deployment evidence |

**Preflight requires:** dedicated runner labelled `student-deploy`, isolated host, image pull permission, explicit `STUDENT_DEPLOY_ENABLED=true` repository variable, DNS authority and an HTTPS reverse proxy protecting the known demo credentials. Existing services/DNS records must not be modified. Never put passwords, keys, session tokens, real student data or recorded MP4s into Git.

Read [deployment/RELEASE.md](deployment/RELEASE.md) and [docs/DEPLOY_STATUS.md](docs/DEPLOY_STATUS.md).

**Notice:** 비공식 제안용 시제품. 연세대학교의 공식 서비스가 아닙니다. All data must be synthetic.
