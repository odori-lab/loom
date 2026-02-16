FROM node:20-slim

WORKDIR /app

COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Install Playwright Chromium with system dependencies
RUN npx playwright install --with-deps chromium

COPY . .
RUN npm run build

# Remove devDependencies after build
RUN npm prune --production

EXPOSE 3001

CMD ["npm", "start"]
