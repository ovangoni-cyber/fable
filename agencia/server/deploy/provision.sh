#!/usr/bin/env bash
# Prepares the VPS for the Ingrid Realtor site. Safe to run again: it only changes what is missing or different.
# From the repository root, on the owner's computer:
#   tar -C agencia/server/deploy -czf - . | ssh root@79.110.63.60 'rm -rf /tmp/ingrid-setup && mkdir /tmp/ingrid-setup && tar xzf - -C /tmp/ingrid-setup && bash /tmp/ingrid-setup/provision.sh'
# It does not change the SSH settings (password login is closed by hand once key login is checked).
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
SITE=/var/www/ingrid-realtor
export DEBIAN_FRONTEND=noninteractive

echo '== packages'
apt-get update -q
apt-get install -y -q nginx certbot fail2ban unattended-upgrades nodejs rsync >/dev/null
node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 18 ? 0 : 1)' || { echo 'Node 18 or newer is needed'; exit 1; }

echo '== users and folders'
id deploy >/dev/null 2>&1 || useradd --create-home --shell /bin/bash deploy
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
# The deploy user logs in with the same keys as root.
install -m 600 -o deploy -g deploy /root/.ssh/authorized_keys /home/deploy/.ssh/authorized_keys
id ingrid-forms >/dev/null 2>&1 || useradd --system --no-create-home --shell /usr/sbin/nologin ingrid-forms
install -d -m 755 -o deploy -g deploy "$SITE" "$SITE/releases"
install -d -m 750 -o ingrid-forms -g ingrid-forms /var/lib/ingrid-forms
install -d -m 755 /var/www/letsencrypt
if [ ! -e "$SITE/current" ]; then
  # Placeholder until the first deploy.
  install -d -o deploy -g deploy "$SITE/releases/empty"
  echo '<!doctype html><meta charset="utf-8"><title>Ingrid Realtor</title><p>Pronto.</p>' > "$SITE/releases/empty/index.html"
  chown deploy:deploy "$SITE/releases/empty/index.html"
  ln -sfn releases/empty "$SITE/current"
  chown -h deploy:deploy "$SITE/current"
fi
# The deploy user may only restart the form service.
echo 'deploy ALL=(root) NOPASSWD: /usr/bin/systemctl restart ingrid-forms' > /etc/sudoers.d/ingrid-deploy
chmod 440 /etc/sudoers.d/ingrid-deploy
visudo -cq

echo '== nginx'
install -d /etc/nginx/ingrid
install -m 644 "$HERE/site.inc" "$HERE/headers.inc" /etc/nginx/ingrid/
# The noindex switch is the owner's to change: install it only the first time.
[ -e /etc/nginx/ingrid/noindex.conf ] || install -m 644 "$HERE/noindex.conf" /etc/nginx/ingrid/noindex.conf
rm -f /etc/nginx/sites-enabled/default
if [ -e /etc/letsencrypt/live/ingrid-realtor.com/fullchain.pem ]; then
  install -m 644 "$HERE/ingrid-realtor.conf" /etc/nginx/sites-available/ingrid-realtor.conf
else
  install -m 644 "$HERE/bootstrap.conf" /etc/nginx/sites-available/ingrid-realtor.conf
fi
ln -sfn /etc/nginx/sites-available/ingrid-realtor.conf /etc/nginx/sites-enabled/ingrid-realtor.conf
nginx -t -q
systemctl enable -q --now nginx
systemctl reload nginx
# Reload nginx after each certificate renewal.
install -d /etc/letsencrypt/renewal-hooks/deploy
printf '#!/bin/sh\nsystemctl reload nginx\n' > /etc/letsencrypt/renewal-hooks/deploy/reload-nginx
chmod 755 /etc/letsencrypt/renewal-hooks/deploy/reload-nginx

echo '== form service'
install -m 644 "$HERE/ingrid-forms.service" /etc/systemd/system/ingrid-forms.service
install -m 644 "$HERE/logrotate" /etc/logrotate.d/ingrid-forms
systemctl daemon-reload
systemctl enable -q ingrid-forms
if [ -e /etc/ingrid-forms.env ] && [ -e "$SITE/current/server/main.mjs" ]; then systemctl restart ingrid-forms; fi

echo '== firewall and protection'
ufw allow OpenSSH >/dev/null
ufw allow 'Nginx Full' >/dev/null
ufw --force enable >/dev/null
printf '[sshd]\nenabled = true\nmaxretry = 5\nbantime = 1h\n' > /etc/fail2ban/jail.d/sshd.local
systemctl enable -q --now fail2ban
systemctl restart fail2ban
printf 'APT::Periodic::Update-Package-Lists "1";\nAPT::Periodic::Unattended-Upgrade "1";\n' > /etc/apt/apt.conf.d/20auto-upgrades

echo '== done'
ufw status | head -8
systemctl is-active nginx fail2ban
