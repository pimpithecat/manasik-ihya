#!/bin/bash
# Terbitkan sertifikat umrah.ngopikir.com via HTTP-01 (webroot),
# salin ke folder yang di-mount nginx, lalu aktifkan konfigurasi final.
set -euo pipefail

DOMAIN="umrah.ngopikir.com"
BASE="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PROJECT="${WP_DIR:-/home/wp/wordpress-multi}"
EMAIL="${CERTBOT_EMAIL:-muh@nastain.com}"

echo "=== Cek DNS ==="
dig +short "$DOMAIN" A

echo "=== Cek ACME challenge lewat Cloudflare ==="
TESTFILE="$BASE/acme/.well-known/acme-challenge/__manasik_test"
echo "manasik-ok" > "$TESTFILE"
sleep 1
BODY="$(curl -s --max-time 15 "http://$DOMAIN/.well-known/acme-challenge/__manasik_test" || true)"
rm -f "$TESTFILE"
echo "HTTP challenge body: ${BODY:-<kosong>}"
if [ "$BODY" != "manasik-ok" ]; then
    echo "GAGAL: path ACME tidak mengembalikan isi yang benar."
    echo "Cek vhost nginx dan Cloudflare (Always Use HTTPS / cache .well-known)."
    exit 1
fi

echo "=== Terbitkan sertifikat ==="
certbot certonly --webroot -w "$BASE/acme" \
    --config-dir "$BASE/certbot" \
    --work-dir "$BASE/certbot/work" \
    --logs-dir "$BASE/certbot/logs" \
    -d "$DOMAIN" \
    --agree-tos --no-eff-email -m "$EMAIL"

echo "=== Salin sertifikat ==="
mkdir -p "$PROJECT/ssl/live/$DOMAIN"
cp -L "$BASE/certbot/live/$DOMAIN"/fullchain.pem "$PROJECT/ssl/live/$DOMAIN/fullchain.pem"
cp -L "$BASE/certbot/live/$DOMAIN"/privkey.pem "$PROJECT/ssl/live/$DOMAIN/privkey.pem"
cp -L "$BASE/certbot/live/$DOMAIN"/chain.pem "$PROJECT/ssl/live/$DOMAIN/chain.pem"
chmod 644 "$PROJECT/ssl/live/$DOMAIN"/*.pem
chmod 600 "$PROJECT/ssl/live/$DOMAIN/privkey.pem"

echo "=== Aktifkan konfigurasi final ==="
cp "$PROJECT/nginx/$DOMAIN-ssl.conf" "$PROJECT/nginx/$DOMAIN.conf"
docker exec wp_nginx nginx -t
docker exec wp_nginx nginx -s reload

echo ""
echo "Selesai. Cek: curl -I https://$DOMAIN"
