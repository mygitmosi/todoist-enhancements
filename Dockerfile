# Stage 1: Build der statischen Vite-App
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Build mit Platzhalter für spätere Runtime-Ersetzung
RUN PUBLIC_URL="__PUBLIC_URL_PLACEHOLDER__" npm run build

# Stage 2: Minimales Nginx Runtime-Image (~25 MB)
FROM nginx:alpine

# Gebaute Dateien aus Stage 1 übernehmen
COPY --from=builder /app/dist /usr/share/nginx/html

# Haupt-Nginx-Konfiguration direkt ersetzen
COPY nginx.conf /etc/nginx/nginx.conf

# Entrypoint-Script kopieren und ausführbar machen
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/entrypoint.sh"]