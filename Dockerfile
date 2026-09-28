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

# ---- runtime: Node for the proxy + nginx for the site ----
FROM node:22-alpine
# Alpine's nginx.conf sets map_hash_bucket_size too small for the password token; drop it so the
# password script sets 128 (nginx won't start if it's set twice). Logs go to the container output.
RUN apk add --no-cache nginx su-exec \
 && rm -f /etc/nginx/http.d/default.conf \
 && sed -i '/map_hash_bucket_size/d' /etc/nginx/nginx.conf \
 && ln -sf /dev/stdout /var/log/nginx/access.log \
 && ln -sf /dev/stderr /var/log/nginx/error.log \
 && mkdir -p /run/nginx

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
COPY UGS-Files/ /usr/share/nginx/html/UGS-Files/

# Requests reach the proxy through Coolify's proxy and then nginx: two hops in X-Forwarded-For.
ENV NODE_ENV=production \
    TRUST_PROXY_HOPS=2

EXPOSE 3847
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3847/healthz >/dev/null && wget -qO- http://127.0.0.1:43117/healthz >/dev/null || exit 1

CMD ["/docker/start.sh"]
