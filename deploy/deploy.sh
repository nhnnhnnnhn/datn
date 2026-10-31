#!/bin/sh
# Usage: IMAGE_TAG=<git sha> sh deploy.sh   (also used by hand to roll back)
set -eu

: "${IMAGE_TAG:?set IMAGE_TAG to the git sha to deploy}"
export IMAGE_TAG

cd "$(dirname "$0")"
compose="docker compose -f docker-compose.prod.yml"

echo "[DEPLOY] pulling images tag=$IMAGE_TAG"
$compose pull

echo "[DEPLOY] starting services"
$compose up -d --remove-orphans --wait --wait-timeout 180

echo "$IMAGE_TAG" > .deployed-tag
docker image prune -f > /dev/null
echo "[DEPLOY] done tag=$IMAGE_TAG"
