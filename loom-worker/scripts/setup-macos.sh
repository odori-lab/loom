#!/bin/bash
# loom-worker 자동 배포 스크립트 (macOS)
# 사용법: cd loom-worker && ./scripts/setup-macos.sh

set -e  # 에러 발생 시 즉시 중단

# 색상 정의 (출력 가독성)
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'  # No Color

# 헬퍼 함수
log_info() { echo -e "${GREEN}✓${NC} $1"; }
log_warn() { echo -e "${YELLOW}⚠${NC} $1"; }
log_error() { echo -e "${RED}✗${NC} $1"; exit 1; }

# =============================================================================
# Step 1: 사전 요구사항 확인
# =============================================================================
check_prerequisites() {
  log_info "사전 요구사항 확인 중..."

  # macOS 확인
  if [[ "$(uname)" != "Darwin" ]]; then
    log_error "이 스크립트는 macOS 전용입니다."
  fi

  # 디렉토리 확인
  if [[ ! -f "package.json" ]] || [[ ! -d "src" ]]; then
    log_error "loom-worker/ 디렉토리에서 실행해주세요."
  fi

  # 인터넷 연결 확인
  if ! ping -c 1 google.com &> /dev/null; then
    log_error "인터넷 연결이 필요합니다."
  fi
}

# =============================================================================
# Step 2: Homebrew 설치
# =============================================================================
install_homebrew() {
  if command -v brew &> /dev/null; then
    log_info "Homebrew 이미 설치됨"
  else
    log_info "Homebrew 설치 중..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

    # M1/M2 Mac의 경우 PATH 추가
    if [[ -d "/opt/homebrew/bin" ]]; then
      echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
      eval "$(/opt/homebrew/bin/brew shellenv)"
    fi

    log_info "Homebrew 설치 완료"
  fi
}

# =============================================================================
# Step 3: Node.js 20+ 설치
# =============================================================================
install_node() {
  if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [[ $NODE_VERSION -ge 20 ]]; then
      log_info "Node.js $(node -v) 이미 설치됨"
      return
    else
      log_warn "Node.js $NODE_VERSION 발견. v20+ 필요. 업그레이드 중..."
    fi
  fi

  log_info "Node.js 20 설치 중..."
  brew install node@20

  # PATH 추가
  if [[ -d "/opt/homebrew/opt/node@20/bin" ]]; then
    echo 'export PATH="/opt/homebrew/opt/node@20/bin:$PATH"' >> ~/.zshrc
    export PATH="/opt/homebrew/opt/node@20/bin:$PATH"
  fi

  log_info "Node.js 설치 완료: $(node -v)"
}

# =============================================================================
# Step 4: pnpm 10+ 설치
# =============================================================================
install_pnpm() {
  if command -v pnpm &> /dev/null; then
    log_info "pnpm $(pnpm -v) 이미 설치됨"
  else
    log_info "pnpm 10 설치 중..."
    npm install -g pnpm@10
    log_info "pnpm 설치 완료: $(pnpm -v)"
  fi
}

# =============================================================================
# Step 5: Cloudflared 설치
# =============================================================================
install_cloudflared() {
  if command -v cloudflared &> /dev/null; then
    log_info "cloudflared 이미 설치됨: $(cloudflared --version)"
  else
    log_info "cloudflared 설치 중..."
    brew install cloudflared
    log_info "cloudflared 설치 완료"
  fi
}

# =============================================================================
# Step 6: 레포지토리 의존성 설치
# =============================================================================
install_dependencies() {
  log_info "pnpm 의존성 설치 중... (1-2분 소요)"

  # 현재 디렉토리 저장
  WORKER_DIR=$(pwd)

  # 레포지토리 루트로 이동
  cd ..

  # pnpm install 실행
  pnpm install

  # loom-worker로 복귀
  cd "$WORKER_DIR"

  log_info "의존성 설치 완료"
}

# =============================================================================
# Step 7: Playwright Chromium 설치
# =============================================================================
install_playwright() {
  log_info "Playwright Chromium 설치 중... (1-2분 소요)"

  npx playwright install chromium

  # macOS에서 chromium 실행 권한 부여 (quarantine 속성 제거)
  CHROMIUM_PATH=$(find ~/.cache/ms-playwright -type d -name "chromium-*" 2>/dev/null | head -1)
  if [[ -n "$CHROMIUM_PATH" ]] && [[ -d "$CHROMIUM_PATH/chrome-mac/Chromium.app" ]]; then
    xattr -d com.apple.quarantine "$CHROMIUM_PATH/chrome-mac/Chromium.app" 2>/dev/null || true
    log_info "Chromium 실행 권한 설정 완료"
  fi

  log_info "Playwright Chromium 설치 완료"
}

# =============================================================================
# Step 8: 프로젝트 빌드
# =============================================================================
build_project() {
  log_info "@loom/shared 빌드 중..."

  # 현재 디렉토리 저장
  WORKER_DIR=$(pwd)

  # 레포지토리 루트로 이동
  cd ..

  # @loom/shared 빌드
  pnpm --filter @loom/shared build

  log_info "@loom/worker 빌드 중..."

  # @loom/worker 빌드
  pnpm --filter @loom/worker build

  # loom-worker로 복귀
  cd "$WORKER_DIR"

  # 빌드 결과 확인
  if [[ ! -f "dist/index.js" ]]; then
    log_error "빌드 실패: dist/index.js 없음"
  fi

  log_info "프로젝트 빌드 완료"
}

# =============================================================================
# Step 9: .env 파일 확인
# =============================================================================
check_env_file() {
  if [[ ! -f ".env" ]]; then
    log_error ".env 파일이 없습니다. 원본 컴퓨터에서 loom-worker/.env를 복사해주세요."
  fi

  # 필수 환경변수 확인
  required_vars=("PORT" "SUPABASE_URL" "SUPABASE_SERVICE_ROLE_KEY" "THREADS_USERNAME" "WORKER_API_KEY")
  for var in "${required_vars[@]}"; do
    if ! grep -q "^${var}=" .env; then
      log_error ".env에 $var 변수가 없습니다."
    fi
  done

  log_info ".env 파일 확인 완료"
}

# =============================================================================
# Step 10: Cloudflare 설정 확인
# =============================================================================
check_cloudflare_config() {
  TUNNEL_ID="e595c43f-af2b-4fe6-807a-7f6162fdcf3e"

  if [[ ! -f "$HOME/.cloudflared/config.yml" ]]; then
    log_error "~/.cloudflared/config.yml 파일이 없습니다. 원본 컴퓨터에서 ~/.cloudflared/ 디렉토리 전체를 복사해주세요."
  fi

  if [[ ! -f "$HOME/.cloudflared/$TUNNEL_ID.json" ]]; then
    log_error "~/.cloudflared/$TUNNEL_ID.json (터널 credentials) 파일이 없습니다."
  fi

  log_info "Cloudflare Tunnel 설정 확인 완료"
}

# =============================================================================
# Step 11: pm2 설치 및 프로세스 등록
# =============================================================================
setup_pm2() {
  if ! command -v pm2 &> /dev/null; then
    log_info "pm2 설치 중..."
    npm install -g pm2
  else
    log_info "pm2 이미 설치됨"
  fi

  # 기존 프로세스 중지 (있다면)
  pm2 delete loom-worker 2>/dev/null || true
  pm2 delete cloudflare-tunnel 2>/dev/null || true

  log_info "pm2에 loom-worker 등록 중..."
  pm2 start dist/index.js --name loom-worker --max-memory-restart 3G

  log_info "pm2에 Cloudflare Tunnel 등록 중..."
  pm2 start cloudflared --name cloudflare-tunnel -- tunnel run loom-worker

  # 프로세스 리스트 저장
  pm2 save

  log_info "pm2 프로세스 등록 완료"
}

# =============================================================================
# Step 12: 부팅 시 자동 시작 설정
# =============================================================================
setup_autostart() {
  log_info "부팅 시 자동 시작 설정 중..."

  # pm2 startup 명령어 실행 (sudo 권한 필요)
  STARTUP_CMD=$(pm2 startup | grep "sudo env" || true)
  if [[ -n "$STARTUP_CMD" ]]; then
    log_warn ""
    log_warn "========================================"
    log_warn "다음 명령어를 실행해주세요 (관리자 권한):"
    echo "$STARTUP_CMD"
    log_warn "========================================"
    echo ""
    read -p "위 명령어를 실행했나요? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      log_info "자동 시작 설정 완료"
    else
      log_warn "자동 시작 설정을 건너뜁니다. 나중에 수동으로 실행하세요."
    fi
  else
    log_info "pm2 startup이 이미 설정되어 있습니다."
  fi
}

# =============================================================================
# Step 13: 설치 완료 및 상태 확인
# =============================================================================
print_status() {
  echo ""
  log_info "======================================"
  log_info "loom-worker 설치 완료!"
  log_info "======================================"
  echo ""

  log_info "프로세스 상태:"
  pm2 list
  echo ""

  log_info "로그 확인 명령어:"
  echo "  pm2 logs loom-worker"
  echo "  pm2 logs cloudflare-tunnel"
  echo ""

  log_info "Health check 수행 중..."
  sleep 3

  # 로컬 health check
  if curl -s http://localhost:3001/health | grep -q "ok"; then
    log_info "✓ localhost:3001 정상 작동"
  else
    log_warn "localhost:3001 응답 없음. 로그를 확인하세요: pm2 logs loom-worker"
  fi

  # 공개 URL health check
  if curl -s https://worker.loom.dev/health | grep -q "ok"; then
    log_info "✓ worker.loom.dev 정상 작동"
  else
    log_warn "worker.loom.dev 응답 없음. DNS 전파 대기 중이거나 Cloudflare 설정 확인 필요"
  fi

  echo ""
  log_info "관리 명령어:"
  echo "  pm2 restart loom-worker       # 재시작"
  echo "  pm2 stop loom-worker          # 중지"
  echo "  pm2 delete loom-worker        # 삭제"
  echo "  pm2 logs loom-worker          # 로그 보기"
  echo ""
}

# =============================================================================
# Main Execution
# =============================================================================
main() {
  echo ""
  echo "======================================"
  echo "loom-worker 자동 배포 스크립트 (macOS)"
  echo "======================================"
  echo ""

  check_prerequisites
  install_homebrew
  install_node
  install_pnpm
  install_cloudflared
  install_dependencies
  install_playwright
  build_project
  check_env_file
  check_cloudflare_config
  setup_pm2
  setup_autostart
  print_status

  echo ""
  log_info "모든 작업이 완료되었습니다!"
  echo ""
}

# 스크립트 실행
main
