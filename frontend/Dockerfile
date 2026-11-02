# syntax=docker/dockerfile:1
FROM nginx:1.27-alpine

# The official nginx image renders /etc/nginx/templates/*.template with envsubst
# at startup, so the upstream API address comes from environment variables.
ENV API_UPSTREAM=api:3000 \
    NGINX_ENVSUBST_OUTPUT_DIR=/etc/nginx/conf.d

RUN rm -f /etc/nginx/conf.d/default.conf
COPY templates/default.conf.template /etc/nginx/templates/default.conf.template
COPY public/ /usr/share/nginx/html/

EXPOSE 80
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/nginx-health || exit 1
