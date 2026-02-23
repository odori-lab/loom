# loom-worker 배포 사전 준비 (macOS)

자동 설치 스크립트(`setup-macos.sh`)를 실행하기 전에, 다음 파일들을 원본 컴퓨터에서 새 컴퓨터로 복사해야 합니다.

## 1. .env 파일 복사

**원본 경로**: `loom-worker/.env`

**복사 방법** (원본 컴퓨터에서):
```bash
cd ~/work/loom/loom-worker
cat .env  # 내용 확인
```

새 컴퓨터에서 git clone 후:
```bash
cd ~/work/loom/loom-worker
# .env 파일을 생성하고 원본 내용 붙여넣기
nano .env
```

**필수 환경변수**:
- `PORT` - 서버 포트 (기본: 3001)
- `SUPABASE_URL` - Supabase 프로젝트 URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase 서비스 키
- `THREADS_USERNAME` - Threads 계정 ID
- `THREADS_PASSWORD` - Threads 비밀번호
- `WORKER_API_KEY` - API 보호 키

## 2. Cloudflare Tunnel 설정 복사

**원본 경로**: `~/.cloudflared/`

**복사 방법** (원본 컴퓨터에서):
```bash
# 디렉토리 전체를 압축
cd ~
tar -czf cloudflared-backup.tar.gz .cloudflared/

# USB 또는 scp로 새 컴퓨터에 전송
# 예: scp cloudflared-backup.tar.gz user@new-mac:~/
```

새 컴퓨터에서:
```bash
cd ~
tar -xzf cloudflared-backup.tar.gz
ls -la ~/.cloudflared/  # 파일 확인
```

**필수 파일**:
- `config.yml` - Cloudflare Tunnel 설정
- `cert.pem` - 인증서 (있는 경우)
- `e595c43f-af2b-4fe6-807a-7f6162fdcf3e.json` - 터널 credentials

## 3. 레포지토리 클론

```bash
cd ~/work  # 또는 원하는 디렉토리
git clone https://github.com/odori-lab/loom.git
cd loom/loom-worker
```

## 4. 자동 설치 스크립트 실행

```bash
chmod +x scripts/setup-macos.sh
./scripts/setup-macos.sh
```

스크립트가 자동으로:
- ✅ Homebrew 설치 (없으면)
- ✅ Node.js 20+ 설치
- ✅ pnpm 10+ 설치
- ✅ cloudflared 설치
- ✅ 레포지토리 의존성 설치
- ✅ Playwright Chromium 설치
- ✅ @loom/shared 및 @loom/worker 빌드
- ✅ .env 및 Cloudflare 설정 검증
- ✅ pm2 설치 및 프로세스 등록
- ✅ Cloudflare Tunnel 시작
- ✅ Health check 수행

## 소요 시간

- **파일 준비**: 5분
- **자동 설치 스크립트**: 5-10분 (인터넷 속도에 따라)

**총 15분 내에 완료 가능**

## 트러블슈팅

### "loom-worker/ 디렉토리에서 실행해주세요" 에러
```bash
# 올바른 디렉토리로 이동
cd ~/work/loom/loom-worker
./scripts/setup-macos.sh
```

### ".env 파일이 없습니다" 에러
원본 컴퓨터에서 `.env` 파일을 복사하지 않았습니다. 위 1번 섹션을 참고하여 복사하세요.

### "~/.cloudflared/config.yml 파일이 없습니다" 에러
원본 컴퓨터에서 `~/.cloudflared/` 디렉토리를 복사하지 않았습니다. 위 2번 섹션을 참고하여 복사하세요.

### Playwright 브라우저 실행 에러
```bash
npx playwright install chromium
```

### pm2 프로세스가 자동 시작되지 않음
스크립트 실행 중 "sudo env..." 명령어를 실행하지 않았습니다.
```bash
pm2 startup
# 출력된 "sudo env..." 명령어를 복사하여 실행
pm2 save
```

## 검증

설치가 완료되면 다음 명령어로 상태를 확인하세요:

```bash
# pm2 프로세스 상태
pm2 list

# 로그 확인
pm2 logs loom-worker --lines 20
pm2 logs cloudflare-tunnel --lines 20

# Health check
curl http://localhost:3001/health
curl https://worker.loom.dev/health
```

모든 health check가 `{"status":"ok",...}`를 반환하면 성공입니다!
