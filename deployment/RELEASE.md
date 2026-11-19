# W01 student-deploy release gates

The application source is in private suaveforge/student; this public repository is deployment-only. An immutable image is built from source CI at ghcr.io/suaveforge/student:<40-char-source-SHA>. The app includes Node + SQLite + real OS Chrome + FFmpeg; GitHub Pages **cannot host this application**. Do not publish a fake static replacement.

1. Inventory real authoritative DNS and current host ports/proxy/runner using read-only commands. Do not alter existing SuaveForge services or records.
2. Obtain authorized DNS management access and add only the student hostname on the true DNS provider; verify propagation.
3. Provision a dedicated host with Docker, Chrome GUI dependencies, TLS reverse proxy and access restrictions for the **published demo credentials**. The example nginx vhost defaults to deny traffic and is not a TLS configuration.
4. Provision a dedicated GitHub Actions runner labelled student-deploy and protected GitHub environment student-production.
5. Set secrets STUDENT_GHCR_USER and STUDENT_GHCR_READ_TOKEN with image read permission. No credentials go into Git or logs.
6. After individually verifying the facts, set deployment-repo variables STUDENT_DEPLOY_ENABLED, STUDENT_HOST_APPROVED, STUDENT_DNS_READY, STUDENT_HTTPS_READY, STUDENT_DEMO_ACCESS_RESTRICTED to true.
7. Trigger deploy workflow with a SHA whose source CI built/published the image. Source can dispatch a student-release event after CI success only if cross-repo STUDENT_DEPLOY_DISPATCH_TOKEN is securely configured in the source repo.
8. Verify actual HTTPS, authorized UI login, student/professor/admin workflows, SQLite persistence, headed Chrome 13-step OS-screen recording and verified MP4. API-only health is not final acceptance.

Deployment service is isolated Compose project suaveforge_student; container suaveforge_student_w01; port 127.0.0.1:18787; named volumes suaveforge_student_data and suaveforge_student_artifacts. Do not delete these volumes. Rollback by dispatching the last verified source SHA, not by touching another service.

STATUS: Not deployed or validated on a live host. No Spaceship connector or SSH/runner was available when this configuration was authored.
