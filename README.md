# Student — 배포 전용 저장소

**소스:** [suaveforge/student](https://github.com/suaveforge/student) (비공개)  
**배포:** [suaveforge/student-deploy](https://github.com/suaveforge/student-deploy) (공개 배포 스크립트)  
**서비스 주소:** https://student.suaveforge.com

기존 Jumper/JumperKids/Option Trader와 같은 **GitHub Actions → server123 독립 Docker → Spaceship DNS → 공유 Caddy HTTPS** 방식이다. GitHub Pages 설정은 이 서비스의 실제 배포에 쓰지 않는다. Node.js·SQLite·Chrome 전체 창/커서 MP4 녹화는 server123 독립 컨테이너에서 실행된다.

- `scripts/deploy-student-server123.sh`: 비공개 소스 checkout으로 이미지 빌드 → HTTP/SQLite 실제 테스트 → Student 전용 컨테이너 `suaveforge_student_w01`을 loopback `127.0.0.1:18787`로 실행, Student 전용 볼륨 사용
- `scripts/configure-student-dns-server123.sh`: 기존 서버 측 Spaceship 비밀키를 **읽기 전용** 마운트해 `student` A 레코드만 충돌 검사 후 등록/재조회. 다른 레코드 변경 없음
- `scripts/configure-student-caddy-server123.sh`: `/home/student/deploy/Caddyfile.student` 신규 사이트만 추가하고 전체 Caddy 설정 검증/실패 시 복구
- **실행 트리거:** 비공개 소스 저장소의 `.github/workflows/deploy-student-server123.yml` (앱 배포) 및 `student-server123-domain.yml` (앱 성공 후 도메인 연결)
- **소스 CI:** 소스 저장소 `.github/workflows/ci.yml` — 실제 server123 러너에서 분리된 Node/Python 컨테이너로 테스트

실사용자 데이터는 받지 않고 가상 데이터만 사용한다. 실제 학교 서비스 아님: **비공식 제안용 시제품**.

## 격리 안전 규칙

기존 서버 서비스, WORKLINK, Jumper, Option Trader 또는 DNS 레코드는 수정하지 않는다. 유일한 공유 영역 변경은 Student 전용 Caddy import 추가이며 변경 전 백업, 검사, 실패 복구를 수행한다. 비밀키는 기존 서버123에만 보관하며 공개 배포 저장소에 커밋하지 않는다. 기본 데모 계정은 공공 운영 인증이 아닌 가상 데이터 체험용임을 분명히 표시한다.

## 현재 검증 기록

- server123 읽기전용 사전점검 [44577510198](https://github.com/suaveforge/student/actions/runs/44577510198): **SUCCESS**, Docker 24.0.9, Caddy, Spaceship 인증파일, Student 전용 18787 포트 미사용 확인
- 소스 CI [44578361188](https://github.com/suaveforge/student/actions/runs/44578361188): **SUCCESS**, HTTP+SQLite/권한 테스트, Python 녹화 코드 구문 검사
- 실제 서버 앱 배포 [44577932517](https://github.com/suaveforge/student/actions/runs/44577932517): 실행 중이었으며 성공 여부는 최신 Actions에서 확인해야 한다
- Spaceship DNS, 실제 Caddy TLS, 13단계 실 Chrome MP4: **성공 검증 전까지 미완료**

상세 인계: [docs/DEPLOY_STATUS.md](docs/DEPLOY_STATUS.md).
