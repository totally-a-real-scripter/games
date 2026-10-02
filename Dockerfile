# Sigmund:re — game portal (nginx) + Browse & AI (the Veil proxy, Node.js) in one container.
# Visitors reach everything on port 3847, behind the same password (set SITE_PASSWORD).

# ---- build the proxy (TypeScript -> JavaScript) ----
FROM node:22-alpine AS veil-build
WORKDIR /veil
COPY proxy/package.json proxy/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY proxy/tsconfig.json ./
COPY proxy/src ./src
RUN npx tsc -p tsconfig.json

# ---- smaller copies of the game pictures (240px and 360px wide) ----
# Cards show pictures far smaller than the 480x270 originals, and browsers keep every decoded picture in
# memory, so the site offers these copies via srcset (assets/app.js). Never fatal: if this step can't run,
# the folder stays empty and the site simply uses the originals.
FROM alpine:3.20 AS thumbs
RUN apk add --no-cache imagemagick imagemagick-jpeg || true
COPY thumbnails/ /src/
COPY docker/make-thumbs.sh /make-thumbs.sh
RUN sed -i 's/\r$//' /make-thumbs.sh && sh /make-thumbs.sh /src /out || true; mkdir -p /out

# ---- runtime: Node for the proxy + nginx for the site ----
FROM node:22-alpine
# nginx from Alpine's packages, with our own main config (docker/nginx-main.conf) replacing Alpine's.
RUN apk add --no-cache nginx su-exec \
 && rm -f /etc/nginx/http.d/default.conf \
 && mkdir -p /run/nginx
COPY docker/nginx-main.conf /etc/nginx/nginx.conf

# nginx config (port 3847) and the start-up scripts.
# (sed strips Windows line endings, which would break the scripts.)
COPY nginx.conf /etc/nginx/http.d/gamestash.conf
COPY docker/40-site-password.sh docker/start.sh /docker/
RUN sed -i 's/\r$//' /docker/*.sh && chmod +x /docker/*.sh

# The proxy: production dependencies + compiled code + its UI files.
WORKDIR /opt/veil
COPY proxy/package.json proxy/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force
COPY --from=veil-build /veil/dist ./dist
COPY proxy/public ./public

# Site files + games + thumbnails
COPY index.html login.html games.json /usr/share/nginx/html/
COPY assets/ /usr/share/nginx/html/assets/
COPY thumbnails/ /usr/share/nginx/html/thumbnails/
COPY --from=thumbs /out/ /usr/share/nginx/html/thumbs/
COPY UGS-Files/ /usr/share/nginx/html/UGS-Files/

# Requests reach the proxy through Coolify's proxy and then nginx: two hops in X-Forwarded-For.
ENV NODE_ENV=production \
    TRUST_PROXY_HOPS=2

EXPOSE 3847
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3847/healthz >/dev/null && wget -qO- http://127.0.0.1:43117/healthz >/dev/null || exit 1

CMD ["/docker/start.sh"]
