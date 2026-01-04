#!/usr/bin/env bash
set -euo pipefail

IMAGE="${1:-}"
CONTEXT="${2:-.}"

if [ -z "$IMAGE" ]; then
  echo "Usage: $0 <registry>/<name>:tag [context]"
  exit 1
fi

if ! docker buildx inspect >/dev/null 2>&1; then
  docker buildx create --use
fi

docker buildx build --platform linux/amd64,linux/arm64 -t "$IMAGE" --push "$CONTEXT"
