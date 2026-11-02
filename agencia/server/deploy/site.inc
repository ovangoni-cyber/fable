# The site itself: included by ingrid-realtor.conf (HTTPS) and bootstrap.conf (HTTP, before the certificate).
root /var/www/ingrid-realtor/current;
index index.html;
charset utf-8;

# Hidden from search engines while the properties are samples: headers.inc includes the
# noindex switch (/etc/nginx/ingrid/noindex.conf). To open the site, see CLAUDE.md.
include /etc/nginx/ingrid/headers.inc;

gzip on;
gzip_types text/css application/javascript application/json image/svg+xml application/xml text/plain;

location = /api/form {
    limit_except POST { deny all; }
    client_max_body_size 32k;
    proxy_pass http://127.0.0.1:3100;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header Host $host;
}

# The form service's code is published with the site but never served.
location ^~ /server/ { return 404; }
location ~ /\. { return 404; }

# Properties change often: always ask for the latest data (as in netlify.toml).
location ^~ /data/ {
    include /etc/nginx/ingrid/headers.inc;
    add_header Cache-Control "no-cache" always;
}
# Scripts and styles change with every publish (build-site.js rewrites js/i18n.js): always check for a
# newer copy (a quick 304 when unchanged). Photos rarely change: keep them a week.
location ~* ^/(css|js)/ {
    include /etc/nginx/ingrid/headers.inc;
    add_header Cache-Control "no-cache" always;
}
location ^~ /img/ {
    include /etc/nginx/ingrid/headers.inc;
    add_header Cache-Control "public, max-age=604800" always;
}

location / {
    try_files $uri $uri/ =404;
}
