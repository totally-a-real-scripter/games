# Game Stash — static game portal served by nginx
FROM nginx:1.27-alpine

# Replace the default site with ours (port 3847)
RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/gamestash.conf

# Site files + games + thumbnails
COPY index.html games.json /usr/share/nginx/html/
COPY assets/ /usr/share/nginx/html/assets/
COPY thumbnails/ /usr/share/nginx/html/thumbnails/
COPY UGS-Files/ /usr/share/nginx/html/UGS-Files/

EXPOSE 3847
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3847/healthz || exit 1
