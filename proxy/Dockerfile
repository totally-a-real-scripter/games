# ---- build stage: compile TypeScript -------------------------------------
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY tsconfig.json ./
COPY src ./src
RUN npx tsc -p tsconfig.json

# ---- runtime stage: production deps + compiled output only ----------------
FROM node:22-alpine AS runtime
# Dedicated default port (override at build time: --build-arg PORT=xxxxx,
# or at run time with -e PORT=xxxxx).
ARG PORT=43117
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=${PORT}
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY public ./public

# Run as the unprivileged "node" user; the app needs no writable filesystem.
USER node
EXPOSE ${PORT}

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||43117)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "--enable-source-maps", "dist/src/server.js"]
