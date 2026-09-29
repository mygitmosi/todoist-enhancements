#!/bin/sh
set -e

: ${PUBLIC_URL:=""}

# Remove trailing slash if user provided one (e.g. "https://domain.com/" -> "https://domain.com")
PUBLIC_URL=$(echo "$PUBLIC_URL" | sed 's|/*$||')

echo "Building application with PUBLIC_URL=${PUBLIC_URL}..."

# Generate oauth/client.json if PUBLIC_URL is provided
if [ -n "$PUBLIC_URL" ]; then
  echo "Generating dynamic oauth/client.json for ${PUBLIC_URL}..."
  
  # Ensure the directory exists inside source folder
  mkdir -p /app/public/oauth /app/oauth

  CLIENT_JSON_CONTENT=$(cat <<EOF
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
  )

  # Write to both public/ (if used by Vite static assets) and root oauth/ folder
  echo "$CLIENT_JSON_CONTENT" > /app/oauth/client.json
  if [ -d "/app/public" ]; then
    echo "$CLIENT_JSON_CONTENT" > /app/public/oauth/client.json
  fi
fi

# Pass PUBLIC_URL to build step
PUBLIC_URL=${PUBLIC_URL} npm run build

# Clear target folder and copy built static files
mkdir -p /usr/share/nginx/html
rm -rf /usr/share/nginx/html/*
cp -r /app/dist/* /usr/share/nginx/html/

# Clean up default Nginx configurations
rm -rf /etc/nginx/conf.d/*

# Replace main Nginx configuration
cp /app/nginx.conf /etc/nginx/nginx.conf

echo "Starting Nginx & Enhanced for Todoist..."
exec nginx -g "daemon off;"