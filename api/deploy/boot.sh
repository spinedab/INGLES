#!/usr/bin/env bash
# Arranque automático al iniciar sesión (LaunchAgent com.apps.ingles-api).
#
# Corre desde ~/.local/share/apps/ingles-api y NO desde ~/Documents: macOS
# (TCC) no deja a los procesos lanzados por launchd leer dentro de Documentos, y
# el agente moría con «exit code 126» (no se puede ejecutar) en cada reinicio.
# Mismo patrón que emoji-generator, ai-studio, media-host y gemma-proxy.
#
# Usa runtime.yml —la configuración ya resuelta que deploy/start.sh deja aquí en
# cada despliegue— y levanta sin construir: construir exige el código fuente, que
# vive precisamente donde launchd no puede entrar.
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUNTIME="$DIR/runtime.yml"
ENV_FILE="$DIR/env.production"

if [ ! -f "$RUNTIME" ]; then
  echo "Falta $RUNTIME. Ejecuta deploy/start.sh desde el repo para generarlo." >&2
  exit 1
fi

# colima lo arranca brew services en paralelo al login: hay que esperarlo.
echo "Esperando el runtime de Docker…"
for _ in $(seq 1 60); do
  docker info >/dev/null 2>&1 && break
  sleep 5
done

if ! docker info >/dev/null 2>&1; then
  echo "Docker no responde tras 5 minutos. Prueba: colima start" >&2
  exit 1
fi

echo "Levantando el stack (sin build)…"
docker compose -p api -f "$RUNTIME" --env-file "$ENV_FILE" up -d --no-build

echo "Esperando que la API responda…"
for _ in $(seq 1 40); do
  if curl -fsS http://127.0.0.1:8817/health >/dev/null 2>&1; then
    echo "ingles-api listo en http://127.0.0.1:8817"
    exit 0
  fi
  sleep 3
done

echo "La API no respondió a tiempo. Revisa: docker compose -p api logs api" >&2
exit 1
