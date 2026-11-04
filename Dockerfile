# Stage 1: Install dependencies and source code
FROM node:lithium-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Stage 2: Runtime image with Node + Nginx
FROM node:lithium-slim

# Install Nginx via apt-get (Debian/Ubuntu)
RUN apt-get update && \
    apt-get install -y --no-install-recommends nginx && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy full application code & dependencies
COPY --from=builder /app /app
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/entrypoint.sh"]