#!/bin/bash
# Deploy hook: salin sertifikat yang diperbarui ke folder nginx, lalu reload.
set -euo pipefail

DOMAIN="umrah.ngopikir.com"
PROJECT="${WP_DIR:-/home/wp/wordpress-multi}"

case "${RENEWED_LINEAGE:-}" in
    */"$DOMAIN")
        mkdir -p "$PROJECT/ssl/live/$DOMAIN"
        cp -L "$RENEWED_LINEAGE"/fullchain.pem "$PROJECT/ssl/live/$DOMAIN/fullchain.pem"
        cp -L "$RENEWED_LINEAGE"/privkey.pem "$PROJECT/ssl/live/$DOMAIN/privkey.pem"
        cp -L "$RENEWED_LINEAGE"/chain.pem "$PROJECT/ssl/live/$DOMAIN/chain.pem"
        chmod 644 "$PROJECT/ssl/live/$DOMAIN"/*.pem
        chmod 600 "$PROJECT/ssl/live/$DOMAIN/privkey.pem"
        /usr/bin/docker exec wp_nginx nginx -s reload
        echo "[manasik-cert] Sertifikat diperbarui dan nginx di-reload."
        ;;
esac
