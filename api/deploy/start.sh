#!/usr/bin/env bash
# Arranque en producción (Mac Studio). Invocado por el LaunchAgent al login,
# o manualmente para levantar/actualizar el stack.
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR"

# Espera a que colima (runtime Docker) esté listo — brew services lo arranca
# en paralelo al login y `docker compose` fallaría si corre antes.
for i in $(seq 1 30); do
  docker info >/dev/null 2>&1 && break
  sleep 2
done

if [ ! -f deploy/.env.production ]; then
  echo "Falta deploy/.env.production. Copia deploy/.env.production.example y rellena GEMMA_API_TOKEN." >&2
  exit 1
fi

docker compose -f docker-compose.yml -f deploy/docker-compose.prod.yml \
  --env-file deploy/.env.production up -d --build

# Espera a que el health check pase antes de salir (LaunchAgent lo registra como éxito).
for i in $(seq 1 30); do
  curl -sf http://127.0.0.1:8817/health >/dev/null 2>&1 && { echo "ingles-api arriba"; exit 0; }
  sleep 2
done

echo "ingles-api no respondió a tiempo en /health" >&2
exit 1
