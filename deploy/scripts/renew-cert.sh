#!/bin/bash
# Perpanjang sertifikat Manasik Ihya dan deploy ke nginx.
set -euo pipefail

BASE="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

/usr/bin/certbot renew \
    --config-dir "$BASE/certbot" \
    --work-dir "$BASE/certbot/work" \
    --logs-dir "$BASE/certbot/logs" \
    --quiet \
    --deploy-hook "$BASE/deploy/scripts/deploy-cert.sh"
