# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

FROM deps AS build
WORKDIR /app

COPY . .
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime
USER root

RUN apk add --no-cache gettext openssl su-exec \
    && rm -f /etc/nginx/conf.d/default.conf \
    && mkdir -p /run/frontend-certs

COPY docker/nginx-main.conf /etc/nginx/nginx.conf
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
COPY docker/runtime-config.template.js /usr/share/nginx/html/runtime-config.template.js
COPY docker/entrypoint.sh /entrypoint.sh

RUN chmod 0755 /entrypoint.sh \
    && chown -R 101:101 /usr/share/nginx/html /etc/nginx/conf.d /run/frontend-certs

ENV FRONTEND_PUBLIC_API_URL=/api \
    FRONTEND_PUBLIC_EXERCISE_IMAGE_BASE_URL=/exercise-lib \
    FRONTEND_PUBLIC_ADMIN_REALTIME_WS_AUTH_MODE=query \
    FRONTEND_TLS_CERT_FILE=/run/frontend-certs/frontend.crt \
    FRONTEND_TLS_KEY_FILE=/run/frontend-certs/frontend.key \
    FRONTEND_TLS_SELF_SIGNED_HOSTS=localhost,127.0.0.1 \
    FRONTEND_TLS_SELF_SIGNED_DAYS=30

EXPOSE 8080 8443

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-check-certificate -q -O /dev/null https://127.0.0.1:8443/healthz || exit 1

ENTRYPOINT ["/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
