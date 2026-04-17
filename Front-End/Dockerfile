# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

COPY . .
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime
USER root
RUN apk add --no-cache gettext \
    && rm -f /etc/nginx/conf.d/default.conf

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
COPY docker/runtime-config.template.js /usr/share/nginx/html/runtime-config.template.js

RUN chown -R 101:101 /usr/share/nginx/html /etc/nginx/conf.d

USER 101

ENV FRONTEND_PUBLIC_API_URL=/api \
    FRONTEND_PUBLIC_EXERCISE_IMAGE_BASE_URL=/exercise-lib \
    FRONTEND_PUBLIC_ADMIN_REALTIME_WS_AUTH_MODE=query

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1

CMD ["/bin/sh", "-c", "envsubst '${FRONTEND_PUBLIC_API_URL} ${FRONTEND_PUBLIC_EXERCISE_IMAGE_BASE_URL} ${FRONTEND_PUBLIC_ADMIN_REALTIME_WS_AUTH_MODE}' < /usr/share/nginx/html/runtime-config.template.js > /usr/share/nginx/html/runtime-config.js && exec nginx -g 'daemon off;'"]
