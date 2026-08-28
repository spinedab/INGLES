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

# Espejo de arranque para el LaunchAgent. Tiene que vivir fuera de ~/Documents:
# launchd no puede leer ahí (TCC) y el agente moría con exit 126 en cada
# reinicio, así que el tutor no volvía solo tras apagar la Mac.
MIRROR="$HOME/.local/share/apps/ingles-api"
mkdir -p "$MIRROR"
# `config` resuelve las dos capas de compose y las variables en un solo archivo,
# de modo que boot.sh no necesita el repo para levantar el stack.
docker compose -f docker-compose.yml -f deploy/docker-compose.prod.yml \
  --env-file deploy/.env.production config > "$MIRROR/runtime.yml"
cp deploy/.env.production "$MIRROR/env.production"
cp deploy/boot.sh "$MIRROR/boot.sh"
chmod 600 "$MIRROR/env.production"
chmod +x "$MIRROR/boot.sh"
echo "Espejo de arranque actualizado en $MIRROR"

# Espera a que el health check pase antes de salir (LaunchAgent lo registra como éxito).
for i in $(seq 1 30); do
  curl -sf http://127.0.0.1:8817/health >/dev/null 2>&1 && { echo "ingles-api arriba"; exit 0; }
  sleep 2
done

echo "ingles-api no respondió a tiempo en /health" >&2
exit 1
