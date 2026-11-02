# syntax=docker/dockerfile:1

# ---- deps: install production dependencies only ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# ---- test: run the test suite during the build (docker build --target test) ----
FROM node:20-alpine AS test
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY src ./src
COPY test ./test
RUN npm test

# ---- runtime: small, non-root image ----
FROM node:20-alpine AS runtime
ENV NODE_ENV=production \
    API_PORT=3000
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "src/healthcheck.js"]
CMD ["node", "src/server.js"]
