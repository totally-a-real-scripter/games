#!/bin/sh
# Makes 240px- and 360px-wide copies of every .jpg under $1 into $2/240/... and $2/360/...
# (same sub-folders and file names). Used by the Dockerfile; safe to run more than once.
SRC="${1:-thumbnails}"
OUT="${2:-thumbs}"
if command -v magick >/dev/null 2>&1; then MOGRIFY="magick mogrify"; else MOGRIFY="mogrify"; fi
cd "$SRC" || exit 1
for w in 240 360; do
  find . -type d | while IFS= read -r d; do
    set -- "$d"/*.jpg
    [ -e "$1" ] || continue            # no pictures in this folder
    mkdir -p "$OUT/$w/$d"
    $MOGRIFY -path "$OUT/$w/$d" -resize "${w}x" -strip -interlace Plane -quality 80 "$@" || echo "thumbs: failed in $d ($w)" >&2
  done
done
echo "thumbs: made $(find "$OUT" -type f -name '*.jpg' | wc -l) pictures"
