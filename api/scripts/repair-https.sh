#!/usr/bin/env bash
# Run on the ECS host as root, or through repair-https.mjs.
set -euo pipefail

cert_name="${1:-xinggui.xin}"
if [[ ! "$cert_name" =~ ^[a-zA-Z0-9.-]+$ ]]; then
  echo "Invalid certificate name" >&2
  exit 1
fi
if [[ "$EUID" -ne 0 ]]; then
  echo "Run this script as root (sudo bash repair-https.sh)." >&2
  exit 1
fi
certbot_bin="$(command -v certbot)"
command -v nginx >/dev/null
command -v openssl >/dev/null
nginx -t
cert_file="/etc/letsencrypt/live/$cert_name/fullchain.pem"
test -f "$cert_file"
echo "Certificate before renewal:"
openssl x509 -in "$cert_file" -noout -subject -dates

# Certbot's nginx authenticator creates the ACME challenge location even when
# the application redirects all public web routes to the admin page.
# Certbot restores its temporary nginx edits if validation fails.
"$certbot_bin" renew --cert-name "$cert_name" --nginx --non-interactive \
  --deploy-hook 'nginx -t && systemctl reload nginx'
openssl x509 -in "$cert_file" -checkend 604800 -noout
nginx -t
systemctl reload nginx

# Reload nginx after every future successful renewal, including cron/manual runs.
install -d -m 755 /etc/letsencrypt/renewal-hooks/deploy
cat >/etc/letsencrypt/renewal-hooks/deploy/20-szr3-nginx-reload <<'HOOK'
#!/bin/sh
set -eu
nginx -t
systemctl reload nginx
HOOK
chmod 755 /etc/letsencrypt/renewal-hooks/deploy/20-szr3-nginx-reload

# Prefer the existing distribution/snap renewal timer. Use a project timer only
# when the server has neither, so we do not install competing renewal jobs.
renewal_timer=""
for candidate in certbot.timer snap.certbot.renew.timer szr3-certbot-renew.timer; do
  if systemctl cat "$candidate" >/dev/null 2>&1; then
    renewal_timer="$candidate"
    break
  fi
done
if [[ -z "$renewal_timer" ]]; then
  cat >/etc/systemd/system/szr3-certbot-renew.service <<UNIT
[Unit]
Description=Renew Szr3 HTTPS certificates
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=$certbot_bin renew --quiet
UNIT
  cat >/etc/systemd/system/szr3-certbot-renew.timer <<'UNIT'
[Unit]
Description=Check Szr3 HTTPS certificate renewal twice daily

[Timer]
OnCalendar=*-*-* 00,12:00:00
RandomizedDelaySec=3600
Persistent=true

[Install]
WantedBy=timers.target
UNIT
  systemctl daemon-reload
  renewal_timer=szr3-certbot-renew.timer
fi
systemctl enable --now "$renewal_timer"

# Exercise the ACME challenge and prove future renewals can succeed.
"$certbot_bin" renew --cert-name "$cert_name" --nginx --dry-run --non-interactive
echo "Certificate after renewal:"
openssl x509 -in "$cert_file" -noout -subject -dates
systemctl list-timers "$renewal_timer" --no-pager
curl --fail --show-error --silent --max-time 20 "https://$cert_name/api/health"
echo
