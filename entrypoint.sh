#!/bin/sh
set -e

: ${PUBLIC_URL:=""}

# Trailing Slash entfernen (z. B. "https://domain.com/" -> "https://domain.com")
PUBLIC_URL=$(echo "$PUBLIC_URL" | sed 's|/*$||')

echo "Configuring application with PUBLIC_URL=${PUBLIC_URL}..."

# Platzhalter in allen gebauten JS-, HTML- und JSON-Dateien ersetzen
find /usr/share/nginx/html -type f \( -name "*.js" -o -name "*.html" -o -name "*.json" \) \
  -exec sed -i "s|__PUBLIC_URL_PLACEHOLDER__|${PUBLIC_URL}|g" {} +

# oauth/client.json dynamisch im Nginx-Webverzeichnis erzeugen
if [ -n "$PUBLIC_URL" ]; then
  echo "Generating dynamic oauth/client.json for ${PUBLIC_URL}..."
  mkdir -p /usr/share/nginx/html/oauth

  cat <<EOF > /usr/share/nginx/html/oauth/client.json
{
  "client_id": "${PUBLIC_URL}/oauth/client.json",
  "client_name": "Enhanced for Todoist",
  "client_uri": "${PUBLIC_URL}/",
  "logo_uri": "${PUBLIC_URL}/icon-192.png",
  "redirect_uris": [
    "${PUBLIC_URL}/"
  ],
  "grant_types": ["authorization_code", "refresh_token"],
  "response_types": ["code"],
  "token_endpoint_auth_method": "none"
}
EOF
fi

echo "Starting Nginx & Enhanced for Todoist..."
exec nginx -g "daemon off;"