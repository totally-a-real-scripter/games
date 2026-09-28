#!/bin/sh
# Container entrypoint: runs the Veil proxy (Browse + AI) and nginx (the games site) side by side.
# nginx is the only thing listening publicly (port 3847); the proxy listens on 127.0.0.1:43117.
# If either process stops, the container stops, so Coolify/Docker restarts it.
set -eu

# Password rule for nginx, from SITE_PASSWORD (same script the plain nginx image used).
NGINX_CONF_DIR=/etc/nginx/http.d /docker/40-site-password.sh

# Proxy: bound to localhost only, runs as the unprivileged "node" user.
export HOST=127.0.0.1
export PORT="${VEIL_PORT:-43117}"
cd /opt/veil
su-exec node node --enable-source-maps dist/src/server.js &
VEIL_PID=$!

nginx -g 'daemon off;' &
NGINX_PID=$!

stop() {
  kill -TERM "$NGINX_PID" "$VEIL_PID" 2>/dev/null || true
}
trap stop TERM INT

# Wait until either process exits (the short sleep lets the trap run promptly).
while kill -0 "$VEIL_PID" 2>/dev/null && kill -0 "$NGINX_PID" 2>/dev/null; do
  sleep 2 & wait $! || true
done
echo "start.sh: a process exited; stopping the container." >&2
stop
wait || true
exit 1
