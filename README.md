# Student — 배포 전용 저장소

**개발 원본:** [suaveforge/student](https://github.com/suaveforge/student) (비공개)  
**프론트엔드 배포 및 서버 스크립트:** [suaveforge/student-deploy](https://github.com/suaveforge/student-deploy) (공개)  
**최종 사용자 주소:** https://student.suaveforge.com (포트 없음)

GitHub Pages에서는 실제 상용형 인터페이스 HTML/CSS/JS만 제공하고, **로그인·역할별 DB 저장·교수 승인·파일 첨부·관리자 자동 Chrome 녹화/MP4는 모두 실제 Node.js/SQLite 서버 API**로 연결한다. 백엔드는 123 서버의 격리된 `127.0.0.1:18787` 앱과 전용 Nginx `https://api-student.suaveforge.com:19444`에 있다. 이 구조는 공유 Caddy나 운영 서버의 443 포트를 수정하지 않는다.

- `index.html`, `app.js`, `styles.css`: 비공개 소스에서 검수해 공개된 실제 브라우저 배포 파일 (가상 데이터만 사용)
- `CNAME`: `student.suaveforge.com`; Spaceship에서 해당 호스트만 `suaveforge.github.io`로 연결
- `scripts/deploy-student-server123.sh`: Student 독립 API, SQLite 및 녹화 데이터 볼륨 보존
- `scripts/configure-api-student-dns-server123.sh`: API 서브도메인 A 레코드 전용
- `scripts/setup-api-student-highport-https-server123.sh`, `config/nginx-api-student-19444.conf`: API용 독립 TLS·Nginx
- `scripts/cutover-student-portless-pages-dns-server123.sh`: 기존 Student A→Pages CNAME 한 건만 변경하고 오류 시 복구
- `scripts/renew-api-student-highport-tls-server123.sh`: API 독립 SSL 인증서 갱신

**검증 상태 (2026-11-20):** Pages 도메인 HTTPS, 실제 Student 전용 API 19444 HTTPS/헬스, 학생·관리자 로그인, MIRAE·6P 월별/학기별 차트·모바일 및 인쇄 PDF는 [실제 Chrome QA #44740391208](https://github.com/suaveforge/student/actions/runs/44740391208) **PASS**. 화면/인쇄 증빙은 [아티팩트 #14630058240](https://github.com/suaveforge/student/actions/runs/44740391208/artifacts/14630058240). 기존 Pages에는 백엔드 origin이 빠져 로그인 POST가 Pages /api/login에 405가 나던 오류가 있었으며, `index.html`에서 `window.STUDENT_API_BASE='https://api-student.suaveforge.com:19444'`를 공개 도메인에만 지정해 수정함. **실제 40명 이관 및 전 과업 정식 검수는 미완**.

**보안:** 비공식 제안용 시제품. 학생 정보는 전부 가상. 실제 키/비밀번호/토큰/DB 파일/MP4는 공개 Git에 넣지 않는다. 다른 운영 서비스, 기존 Caddy/443 설정 및 DNS 레코드는 변경 금지. 자세한 최신 실행 로그와 인계는 [docs/DEPLOY_STATUS.md](docs/DEPLOY_STATUS.md)와 소스의 `docs/MVP_MASTER_STATUS.md` 참조.
