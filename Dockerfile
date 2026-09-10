# Multi-stage production container for T3N Sentinel
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json tsconfig.json ./
RUN npm ci

COPY src ./src
RUN npm run build

# Production runtime stage
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV SENTINEL_MODE=auto

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY agent-card.json ./

EXPOSE 3000

# Health check verifies system diagnostics
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "import('./dist/index.js').then(() => process.exit(0)).catch(() => process.exit(1))"

CMD ["node", "dist/cli/demo.js"]
