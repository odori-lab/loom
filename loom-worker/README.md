# loom-worker

Threads 스크래핑 및 PDF 생성 워커 서버

## Quick Start (로컬 개발)

```bash
# 레포지토리 루트에서 의존성 설치
cd ~/work/loom
pnpm install

# 개발 모드 (hot reload)
cd loom-worker
pnpm dev

# 프로덕션 빌드
pnpm build

# 프로덕션 실행
pnpm start
```

## 새 macOS 컴퓨터에 배포하기

### 1. 사전 준비

원본 컴퓨터에서 다음 파일들을 복사:
- `loom-worker/.env`
- `~/.cloudflared/` (디렉토리 전체)

자세한 내용: [scripts/PRE_SETUP.md](scripts/PRE_SETUP.md)

### 2. 자동 설치

```bash
cd loom-worker
chmod +x scripts/setup-macos.sh
./scripts/setup-macos.sh
```

스크립트가 자동으로 Node.js, pnpm, Playwright, Cloudflare Tunnel 등을 설치하고 pm2로 워커를 시작합니다.

**소요 시간**: 5-10분

### 3. 상태 확인

```bash
pm2 list
pm2 logs loom-worker
curl http://localhost:3001/health
curl https://worker.loom.dev/health
```

## Architecture

- **Express Server**: port 3001
- **Endpoints**:
  - `GET /health` - Health check
  - `POST /scrape` - Threads 프로필 스크래핑
  - `POST /create-loom` - Loom 생성 (스크래핑 + DB 저장)
  - `POST /generate-pdf` - PDF 생성 및 업로드
- **Cloudflare Tunnel**: `worker.loom.dev` → `localhost:3001`
- **Process Manager**: pm2 (자동 재시작, 로그 로테이션)
- **Browser Automation**: Puppeteer + Playwright Chromium

## Environment Variables

필수 환경변수는 `.env` 파일에 정의:

```bash
PORT=3001                           # 서버 포트
SUPABASE_URL=https://...            # Supabase 프로젝트 URL
SUPABASE_SERVICE_ROLE_KEY=eyJ...    # Supabase 서비스 키
THREADS_USERNAME=your_username      # Threads 계정 ID
THREADS_PASSWORD=your_password      # Threads 비밀번호
WORKER_API_KEY=secret_key           # API 보호 키
```

## API Usage

### Health Check

```bash
curl http://localhost:3001/health
```

**응답**:
```json
{
  "status": "ok",
  "timestamp": "2026-02-24T01:00:00.000Z",
  "uptime": 123.456
}
```

### Scrape Threads Profile

```bash
curl -X POST http://localhost:3001/scrape \
  -H "Content-Type: application/json" \
  -H "x-api-key: your_worker_api_key" \
  -d '{
    "username": "zuck",
    "limit": 100
  }'
```

**응답**:
```json
{
  "posts": [...],
  "profile": {...},
  "metadata": {...}
}
```

### Create Loom

```bash
curl -X POST http://localhost:3001/create-loom \
  -H "Content-Type: application/json" \
  -H "x-api-key: your_worker_api_key" \
  -d '{
    "userId": "uuid",
    "threadUsername": "zuck",
    "postIds": ["123", "456"],
    "coverData": {...}
  }'
```

**응답**:
```json
{
  "loomId": "uuid",
  "status": "completed"
}
```

## pm2 관리 명령어

```bash
# 프로세스 관리
pm2 list                    # 프로세스 목록 보기
pm2 restart loom-worker     # 재시작
pm2 stop loom-worker        # 중지
pm2 delete loom-worker      # 삭제
pm2 logs loom-worker        # 로그 보기 (실시간)
pm2 logs loom-worker --lines 100  # 최근 100줄

# Cloudflare Tunnel 관리
pm2 restart cloudflare-tunnel
pm2 logs cloudflare-tunnel

# 모든 프로세스 관리
pm2 restart all
pm2 stop all
pm2 save                    # 현재 상태 저장
```

## Cloudflare Tunnel

현재 설정된 터널:
- **도메인**: `worker.loom.dev`
- **Tunnel ID**: `e595c43f-af2b-4fe6-807a-7f6162fdcf3e`
- **Tunnel Name**: `loom-worker`

### Tunnel 상태 확인

```bash
cloudflared tunnel list
cloudflared tunnel info loom-worker
```

### Tunnel 수동 실행

```bash
cloudflared tunnel run loom-worker
```

### Tunnel 설정 파일

`~/.cloudflared/config.yml`:
```yaml
tunnel: e595c43f-af2b-4fe6-807a-7f6162fdcf3e
credentials-file: /Users/username/.cloudflared/e595c43f-af2b-4fe6-807a-7f6162fdcf3e.json

ingress:
  - hostname: worker.loom.dev
    service: http://localhost:3001
  - service: http_status:404
```

## Troubleshooting

### Playwright 브라우저 실행 에러

```bash
npx playwright install chromium

# macOS quarantine 속성 제거
xattr -d com.apple.quarantine ~/.cache/ms-playwright/chromium-*/chrome-mac/Chromium.app
```

### DNS 해석 실패 (worker.loom.dev)

- Cloudflare Tunnel이 실행 중인지 확인: `pm2 logs cloudflare-tunnel`
- DNS 캐시 플러시: `sudo dscacheutil -flushcache`
- Cloudflare 대시보드에서 DNS 레코드 확인

### 메모리 부족

pm2가 자동으로 3GB 초과 시 재시작합니다. 필요시 조정:

```bash
pm2 delete loom-worker
pm2 start dist/index.js --name loom-worker --max-memory-restart 5G
pm2 save
```

### pm2 프로세스가 재부팅 후 자동 시작 안 됨

```bash
pm2 startup
# 출력된 "sudo env..." 명령어를 복사하여 실행
pm2 save
```

### Threads 로그인 실패

`.env` 파일의 `THREADS_USERNAME`과 `THREADS_PASSWORD`를 확인하세요.

```bash
# 환경변수 확인
cat .env | grep THREADS

# 워커 재시작
pm2 restart loom-worker
```

## Development

### 로컬 개발 환경

```bash
# 개발 모드 (hot reload with tsx)
pnpm dev

# 빌드 후 실행
pnpm build
pnpm start

# 타입 체크
pnpm --filter @loom/worker type-check
```

### 프로젝트 구조

```
loom-worker/
├── src/
│   ├── index.ts            # Express 서버 진입점
│   ├── routes/             # API 라우트
│   ├── services/           # 비즈니스 로직
│   └── utils/              # 유틸리티
├── dist/                   # 빌드 결과 (tsup)
├── scripts/
│   ├── setup-macos.sh      # 자동 배포 스크립트
│   └── PRE_SETUP.md        # 사전 준비 가이드
├── package.json
├── tsconfig.json
└── README.md
```

### 의존성

- **Express**: HTTP 서버
- **Puppeteer**: Threads 스크래핑 (Playwright Chromium 사용)
- **@supabase/supabase-js**: Supabase 클라이언트
- **@loom/shared**: 공유 타입 (모노레포)
- **tsup**: TypeScript 빌드 도구
- **tsx**: TypeScript 개발 실행기

## License

MIT
