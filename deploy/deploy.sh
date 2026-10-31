#!/bin/sh
# Usage: IMAGE_TAG=<git sha> sh deploy.sh   (also used by hand to roll back)
set -eu

: "${IMAGE_TAG:?set IMAGE_TAG to the git sha to deploy}"
export IMAGE_TAG

cd "$(dirname "$0")"
compose="docker compose -f docker-compose.prod.yml"
previous=$(cat .deployed-tag 2>/dev/null || true)

echo "[DEPLOY] pulling images tag=$IMAGE_TAG previous=${previous:-none}"
$compose pull

echo "[DEPLOY] starting services"
if ! $compose up -d --remove-orphans --wait --wait-timeout 180; then
  echo "[ERROR] [DEPLOY] services not healthy tag=$IMAGE_TAG"
  $compose ps
  $compose logs --tail 50 backend frontend
  if [ -n "$previous" ] && [ "$previous" != "$IMAGE_TAG" ]; then
    echo "[DEPLOY] rolling back tag=$previous"
    IMAGE_TAG=$previous $compose up -d --remove-orphans --wait --wait-timeout 180
  fi
  exit 1
fi

echo "$IMAGE_TAG" > .deployed-tag
# Every deploy pulls a new sha tag, so old images are never dangling; keep a week for rollbacks
docker image prune -af --filter "until=168h" > /dev/null
echo "[DEPLOY] done tag=$IMAGE_TAG"
