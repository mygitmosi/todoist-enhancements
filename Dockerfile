# Stage 1: Install dependencies and source code
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Stage 2: Runtime image with Node + Nginx
FROM node:20-alpine

# Install Nginx
RUN apk add --no-cache nginx

WORKDIR /app

# Copy full application code & dependencies
COPY --from=builder /app /app
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/entrypoint.sh"]