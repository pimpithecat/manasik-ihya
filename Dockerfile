FROM node:22-alpine AS builder

WORKDIR /app

ARG SITE_URL=https://umrah.ngopikir.com

ENV SITE_URL=$SITE_URL \
    ASTRO_TELEMETRY_DISABLED=1 \
    NODE_OPTIONS=--max-old-space-size=1536

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine AS runner

COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q --spider http://127.0.0.1/ || exit 1
