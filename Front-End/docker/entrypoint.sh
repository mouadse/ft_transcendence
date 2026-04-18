#!/bin/sh
set -eu

readonly RUNTIME_TEMPLATE="/usr/share/nginx/html/runtime-config.template.js"
readonly RUNTIME_OUTPUT="/usr/share/nginx/html/runtime-config.js"
readonly TLS_DIR="/tmp/frontend-tls"
readonly TLS_CERT_TARGET="$TLS_DIR/frontend.crt"
readonly TLS_KEY_TARGET="$TLS_DIR/frontend.key"

DEFAULT_CERT_SOURCE="/run/frontend-certs/frontend.crt"
DEFAULT_KEY_SOURCE="/run/frontend-certs/frontend.key"
CERT_SOURCE="${FRONTEND_TLS_CERT_FILE:-$DEFAULT_CERT_SOURCE}"
KEY_SOURCE="${FRONTEND_TLS_KEY_FILE:-$DEFAULT_KEY_SOURCE}"
SELF_SIGNED_HOSTS="${FRONTEND_TLS_SELF_SIGNED_HOSTS:-localhost,127.0.0.1}"
SELF_SIGNED_DAYS="${FRONTEND_TLS_SELF_SIGNED_DAYS:-30}"

log() {
  printf '[frontend-entrypoint] %s\n' "$1"
}

prepare_runtime_config() {
  envsubst '${FRONTEND_PUBLIC_API_URL} ${FRONTEND_PUBLIC_EXERCISE_IMAGE_BASE_URL} ${FRONTEND_PUBLIC_ADMIN_REALTIME_WS_AUTH_MODE}' \
    < "$RUNTIME_TEMPLATE" \
    > "$RUNTIME_OUTPUT"
}

append_alt_names() {
  config_path="$1"
  dns_index=1
  ip_index=1
  old_ifs=$IFS
  IFS=','

  for raw_host in $SELF_SIGNED_HOSTS; do
    host=$(printf '%s' "$raw_host" | tr -d '\r' | xargs)
    [ -n "$host" ] || continue

    case "$host" in
      *[!0-9A-Fa-f:.]*)
        printf 'DNS.%s = %s\n' "$dns_index" "$host" >> "$config_path"
        dns_index=$((dns_index + 1))
        ;;
      *)
        printf 'IP.%s = %s\n' "$ip_index" "$host" >> "$config_path"
        ip_index=$((ip_index + 1))
        ;;
    esac
  done

  IFS=$old_ifs

  if [ "$dns_index" -eq 1 ] && [ "$ip_index" -eq 1 ]; then
    printf 'DNS.1 = localhost\nIP.1 = 127.0.0.1\n' >> "$config_path"
  fi
}

generate_self_signed_tls() {
  mkdir -p "$TLS_DIR"
  chmod 700 "$TLS_DIR"
  chown 101:101 "$TLS_DIR"

  tls_config=$(mktemp)
  cat > "$tls_config" <<'EOF'
[req]
default_bits = 2048
prompt = no
distinguished_name = req_dn
x509_extensions = req_ext

[req_dn]
CN = localhost

[req_ext]
subjectAltName = @alt_names

[alt_names]
EOF

  append_alt_names "$tls_config"

  log "generating self-signed TLS certificate for hosts: $SELF_SIGNED_HOSTS"
  openssl req -x509 -nodes -newkey rsa:2048 -sha256 \
    -days "$SELF_SIGNED_DAYS" \
    -keyout "$TLS_KEY_TARGET" \
    -out "$TLS_CERT_TARGET" \
    -config "$tls_config" >/dev/null 2>&1

  rm -f "$tls_config"
  chmod 600 "$TLS_CERT_TARGET" "$TLS_KEY_TARGET"
}

prepare_tls_material() {
  mkdir -p "$TLS_DIR"
  chmod 700 "$TLS_DIR"
  chown 101:101 "$TLS_DIR"

  cert_readable=0
  key_readable=0
  [ -r "$CERT_SOURCE" ] && cert_readable=1 || true
  [ -r "$KEY_SOURCE" ] && key_readable=1 || true

  if [ "$cert_readable" -eq 1 ] && [ "$key_readable" -eq 1 ]; then
    log "using mounted TLS certificate from $CERT_SOURCE"
    cp "$CERT_SOURCE" "$TLS_CERT_TARGET"
    cp "$KEY_SOURCE" "$TLS_KEY_TARGET"
    chmod 600 "$TLS_CERT_TARGET" "$TLS_KEY_TARGET"
    return
  fi

  if [ "$cert_readable" -ne "$key_readable" ]; then
    log "TLS certificate/key mismatch: cert readable=$cert_readable key readable=$key_readable"
    exit 1
  fi

  generate_self_signed_tls
}

prepare_runtime_config
prepare_tls_material
chown 101:101 "$TLS_DIR" "$RUNTIME_OUTPUT" "$TLS_CERT_TARGET" "$TLS_KEY_TARGET"

exec su-exec 101:101 "$@"
