#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

if ! command -v docker >/dev/null 2>&1; then
  echo "❌ 找不到 docker，請先安裝 Docker Desktop / Docker Engine"
  exit 1
fi

if docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD="docker-compose"
else
  echo "❌ 找不到 docker compose"
  exit 1
fi

echo "🚀 啟動 AIIIII..."
$COMPOSE_CMD up --build
