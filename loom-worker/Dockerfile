FROM node:20-slim

# Install pnpm
RUN npm install -g pnpm@10

WORKDIR /app

# Copy workspace config + lockfile + base tsconfig
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./

# Copy shared package
COPY packages/ ./packages/

# Copy worker package
COPY loom-worker/ ./loom-worker/

# Install dependencies (workspace-aware)
RUN pnpm install --frozen-lockfile

# Install Playwright Chromium with system dependencies
RUN cd loom-worker && npx playwright install --with-deps chromium

# Build shared package first, then worker
RUN pnpm --filter @loom/shared build && pnpm --filter @loom/worker build

WORKDIR /app/loom-worker

EXPOSE 3001

CMD ["node", "dist/index.js"]
