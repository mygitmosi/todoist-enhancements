# --- Stage 1: Build stage ---
FROM node:20-alpine AS builder

WORKDIR /app

# Declare the build-time variable
ARG PUBLIC_URL

# Copy dependency files and install
COPY package*.json ./
RUN npm ci

# Copy full application source code and build
COPY . .

# Pass the ARG to the build process
ENV PUBLIC_URL=$PUBLIC_URL
RUN npm run build

# --- Stage 2: Production stage ---
FROM nginx:alpine

# Copy built static files from Stage 1 to Nginx default public directory
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose HTTP port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
