#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: $0 <port> [--force]"
  echo "  <port>    TCP port number to free (e.g. 5000)"
  echo "  --force   Send SIGKILL if process does not stop after SIGTERM"
}

if [[ $# -lt 1 || $# -gt 2 ]]; then
  usage
  exit 1
fi

PORT="$1"
FORCE="${2:-}"

if ! [[ "$PORT" =~ ^[0-9]+$ ]] || (( PORT < 1 || PORT > 65535 )); then
  echo "Error: invalid port '$PORT'. Expected 1-65535."
  exit 1
fi

if [[ -n "$FORCE" && "$FORCE" != "--force" ]]; then
  usage
  exit 1
fi

if ! command -v lsof >/dev/null 2>&1; then
  echo "Error: 'lsof' is required but not installed."
  exit 1
fi

mapfile -t pids < <(lsof -ti "tcp:$PORT" | sort -u || true)

if [[ ${#pids[@]} -eq 0 ]]; then
  echo "No process is using TCP port $PORT."
  exit 0
fi

echo "Stopping process(es) on TCP port $PORT: ${pids[*]}"
kill "${pids[@]}"

sleep 1
mapfile -t remaining < <(lsof -ti "tcp:$PORT" | sort -u || true)

if [[ ${#remaining[@]} -eq 0 ]]; then
  echo "Port $PORT is now free."
  exit 0
fi

if [[ "$FORCE" == "--force" ]]; then
  echo "Force killing remaining process(es): ${remaining[*]}"
  kill -9 "${remaining[@]}"
  echo "Port $PORT is now free."
  exit 0
fi

echo "Some process(es) are still using port $PORT: ${remaining[*]}"
echo "Re-run with --force to send SIGKILL."
exit 1
