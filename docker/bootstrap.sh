#!/usr/bin/env bash
set -euo pipefail

CONFIG_PATH="${CONFIG_PATH:-/app/.env}"

if [ "${WAIT_FOR_CONFIG:-true}" = "true" ]; then
  until [ -n "${DATABASE_URL:-}" ] || [ -f "$CONFIG_PATH" ]; do
    echo "Waiting for configuration. Provide DATABASE_URL or create $CONFIG_PATH."
    sleep 2
  done
fi

if [ -f "$CONFIG_PATH" ]; then
  set -o allexport
  # shellcheck disable=SC1090
  source "$CONFIG_PATH"
  set +o allexport
fi

if [ "${SKIP_MIGRATIONS:-false}" != "true" ]; then
  pnpm --filter api setup:init
fi

set +e
STATUS_OUTPUT=$(pnpm --filter api setup:status 2>&1)
STATUS_EXIT=$?
set -e

echo "$STATUS_OUTPUT"

if [ "$STATUS_EXIT" -eq 0 ]; then
  export PLATFORM_SETUP_COMPLETE=true
else
  export PLATFORM_SETUP_COMPLETE=false
fi

export NEXT_PUBLIC_SETUP_COMPLETE="$PLATFORM_SETUP_COMPLETE"

exec node server.js
