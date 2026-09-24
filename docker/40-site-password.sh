#!/bin/sh
# Runs at container start (nginx image runs everything in /docker-entrypoint.d/).
# Turns the SITE_PASSWORD environment variable into the nginx rule that checks the sign-in cookie.
# The cookie is sha256("lanternwise|" + password); the same salt is used in login.html.
set -eu

OUT=/etc/nginx/conf.d/00-site-password.conf
SALT='lanternwise|'

if [ -z "${SITE_PASSWORD:-}" ]; then
  echo "40-site-password: WARNING - SITE_PASSWORD is not set, so nobody can sign in. Set it and restart." >&2
  # A value no cookie can ever match: the site stays locked.
  TOKEN="locked-$(head -c 16 /dev/urandom | od -An -tx1 | tr -d ' \n')"
else
  TOKEN=$(printf '%s%s' "$SALT" "$SITE_PASSWORD" | sha256sum | cut -d' ' -f1)
  echo "40-site-password: password protection is on."
fi

cat > "$OUT" <<EOF
# Generated at startup by 40-site-password.sh. Do not edit; set SITE_PASSWORD instead.
map_hash_bucket_size 128;
map \$cookie_lw_session \$sig_authed {
    default 0;
    "$TOKEN" 1;
}
EOF
