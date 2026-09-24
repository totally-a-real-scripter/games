# Sigmund:re — static game portal served by nginx, behind a password (set SITE_PASSWORD)
FROM nginx:1.27-alpine

# Replace the default site with ours (port 3847)
RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/gamestash.conf

# Writes the password check from SITE_PASSWORD when the container starts.
# (sed strips Windows line endings, which would break the script.)
COPY docker/40-site-password.sh /docker-entrypoint.d/40-site-password.sh
RUN sed -i 's/\r$//' /docker-entrypoint.d/40-site-password.sh && chmod +x /docker-entrypoint.d/40-site-password.sh

# Site files + games + thumbnails
COPY index.html login.html games.json /usr/share/nginx/html/
COPY assets/ /usr/share/nginx/html/assets/
COPY thumbnails/ /usr/share/nginx/html/thumbnails/
COPY UGS-Files/ /usr/share/nginx/html/UGS-Files/

EXPOSE 3847
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3847/healthz || exit 1
