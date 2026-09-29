#!/bin/sh
set -e

: ${PUBLIC_URL:=""}

echo "Building application with PUBLIC_URL=${PUBLIC_URL}..."

# Pass PUBLIC_URL to build step
PUBLIC_URL=${PUBLIC_URL} npm run build

# Clear target folder and copy built files
mkdir -p /usr/share/nginx/html
rm -rf /usr/share/nginx/html/*
cp -r /app/dist/* /usr/share/nginx/html/

# Remove default conf files to prevent duplicate directives
rm -rf /etc/nginx/conf.d/*

# Replace the main Nginx configuration directly
cp /app/nginx.conf /etc/nginx/nginx.conf

echo "Starting Nginx & Enhanced for Todoist..."
exec nginx -g "daemon off;"