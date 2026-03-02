#!/bin/bash
set -e

echo "=== loom-worker setup ==="

# 1. Check prerequisites
echo "[1/5] Checking prerequisites..."

if ! node -e "process.exit(parseInt(process.versions.node) < 20 ? 1 : 0)" 2>/dev/null; then
  echo "ERROR: Node.js >= 20 is required. Current: $(node -v 2>/dev/null || echo 'not found')"
  exit 1
fi

if ! command -v pnpm &> /dev/null; then
  echo "  pnpm not found. Installing..."
  npm install -g pnpm@10
fi

if ! command -v cloudflared &> /dev/null; then
  echo "  cloudflared not found. Installing..."
  brew install cloudflared
fi

# 2. Install dependencies
echo "[2/5] Installing dependencies..."
cd "$(dirname "$0")/.."
pnpm install

# 3. Install Playwright browser
echo "[3/5] Installing Playwright Chromium..."
cd loom-worker
npx playwright install --with-deps chromium
cd ..

# 4. Build
echo "[4/5] Building..."
pnpm --filter @loom/shared build
pnpm --filter @loom/worker build

# 5. Cloudflare Tunnel setup
echo "[5/5] Setting up Cloudflare Tunnel..."

if ! cloudflared tunnel list 2>/dev/null | grep -q "loom-worker"; then
  # Login only if no cert exists
  if [ ! -f "$HOME/.cloudflared/cert.pem" ]; then
    echo "  Logging into Cloudflare..."
    cloudflared tunnel login
  fi

  echo "  Creating tunnel..."
  cloudflared tunnel create loom-worker

  echo "  Routing DNS..."
  cloudflared tunnel route dns loom-worker worker.th-reads.com
  echo "  Tunnel created: worker.th-reads.com"
else
  echo "  Tunnel 'loom-worker' already exists. Skipping."
fi

echo ""
echo "=== Setup complete ==="
echo ""
echo "Next steps:"
echo "  1. Create loom-worker/.env with the following variables:"
echo "     - SUPABASE_URL"
echo "     - SUPABASE_SERVICE_ROLE_KEY"
echo "     - THREADS_USERNAME"
echo "     - THREADS_PASSWORD"
echo "     - WORKER_API_KEY"
echo "     - PORT=3001 (optional, defaults to 3001)"
echo "  2. Start worker:  pnpm --filter @loom/worker dev"
echo "  3. Start tunnel:  cloudflared tunnel run --url http://localhost:3001 loom-worker"
