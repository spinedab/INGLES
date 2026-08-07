# Despliegue — API del Tutor IA (INGLES)

> Escrito el 2026-07-30. Explica cómo corre este servicio en la infraestructura
> de DreamsTech, qué decisiones se tomaron y por qué, para que al retomarlo no
> haya que redescubrirlo. Mismo patrón que [`EMOJI/emoji-generator`](../../../EMOJI/emoji-generator/docs/DESPLIEGUE.md)
> y AI Studio.

## Dónde corre y por qué

```
Internet ──HTTPS──► túnel Cloudflare ──► Mac Studio (M4 Max, 64 GB)
                                          │
                                          ├─ API    127.0.0.1:8817  (Docker)
                                          ├─ Redis  (Docker, interno, sin puerto publicado)
                                          │
                                          └─► gemma-proxy :11436 ──► Ollama :11434 (gemma4:e4b, GPU)
```

**El proyecto vive en la Mac, no en una VPS**, por el mismo motivo que el resto
del ecosistema: la IA local (aquí, Gemma vía Ollama) necesita GPU/memoria
unificada de Apple Silicon, y las VPS del ecosistema (Hetzner) no tienen GPU.
La VPS Hetzner (`87.99.136.237`) solo interviene para crear la ruta DNS del
túnel (tiene el `cert.pem` del tunnel), igual que en todos los demás proyectos.

## Qué se integró y por qué (este cambio)

Antes de este despliegue, `api/` ya soportaba tres proveedores de LLM
(`openclaw` / `anthropic` / `gemma`, ver `app/config.py` y `app/claude.py`) pero
**no corría en ningún sitio**: solo existía el código. Este despliegue:

1. Añade `Dockerfile` + `docker-compose.yml` (dev) + `deploy/docker-compose.prod.yml`
   (producción), siguiendo el patrón ya validado en EMOJI.
2. Configura el proveedor de producción como **`gemma`**: usa el Gemma4 local
   de la Mac (`gemma4:e4b` vía Ollama) a través del **mismo `gemma-proxy`** que
   ya usan otros proyectos del ecosistema (`~/.local/share/apps/gemma-proxy`,
   puerto `11436`, auth Bearer). Cero coste, cero llamada a Anthropic de pago,
   consistente con el resto de "IA local" de DreamsTech.
3. Despliega el servicio en la Mac con Docker + LaunchAgent, y lo expone al
   público por el túnel de Cloudflare ya existente.

`app/config.py` **no se tocó**: el soporte para `gemma` (proveedor OpenAI-compat
con `base_url` + `token` + `model`) ya estaba ahí, escrito para un caso como
este. Solo hizo falta apuntarlo al proxy real y desplegarlo.

## Puertos del ecosistema

Sigue la numeración establecida; el siguiente libre tras EMOJI (`8816`) es:

| Puerto | Servicio |
|---|---|
| 8801–8804 | música · imagen (FLUX) · voz · video |
| 8810 | PosterLab |
| 8811 | Lea Librería |
| 8812 | GAFAS-META (señalización) |
| 8813–8814 | sitios estáticos / Periódico |
| 8815 | AI Studio (fachada de la IA local) |
| 8816 | Emoji Generator |
| **8817** | **API del Tutor IA — INGLES (este servicio)** |
| 11434 | Ollama (Gemma4 y otros modelos locales) |
| 11435–11436 | studio-proxy · **gemma-proxy** (auth + forward a Ollama) |

## Por qué pasa por `gemma-proxy` y no por Ollama directamente

Ollama no tiene autenticación nativa. `gemma-proxy` es un gateway mínimo
(Node.js, `~/.local/share/apps/gemma-proxy/server.js`) que:

- Escucha en `127.0.0.1:11436` y exige `Authorization: Bearer <TOKEN>`.
- Reenvía a `http://127.0.0.1:11434` (Ollama) preservando body/headers.
- Aplica rate-limit simple por IP (vía `CF-Connecting-IP`).

Este proyecto llama al proxy por `host.docker.internal:11436` (no por la URL
pública `gemma2.apicloud.lat`), por la misma razón documentada en EMOJI: evita
una vuelta innecesaria por Cloudflare y no ata el servicio a que el túnel esté
arriba.

## Nombre público: `tutor.apicloud.lat`, no `ingles.apicloud.lat`

**Importante — no confundir ni reutilizar sin verificar primero.**
Al intentar registrar `ingles.apicloud.lat` para este servicio, Cloudflare
rechazó la ruta porque **ese hostname ya existe y apunta a otro origen**:
un healthcheck contra él responde `{"provider": "openclaw", ...}` — es decir,
ya hay (o hubo) **otro despliegue de esta misma API en otra infraestructura**,
configurado con el proveedor `openclaw` (el gateway gratuito vía OAuth de
Claude Max que también soporta `app/config.py`). No se tocó ni se investigó
más a fondo esa DNS/origen para no interferir con algo que puede estar en uso.

Por eso el despliegue de la Mac usa el hostname **`tutor.apicloud.lat`**. Si en
el futuro se decide que ambos deben ser el mismo servicio, hay que decidir
conscientemente cuál de las dos infraestructuras (y qué proveedor de LLM) es
la fuente de verdad antes de tocar el registro DNS existente.

## Primer despliegue

Requisitos: Docker vía **colima**, y `gemma-proxy` + Ollama corriendo
(`launchctl list | grep com.apps.gemma-proxy`, modelo `gemma4:e4b` bajado en
Ollama).

```bash
cd ~/Documents/INGLES/api

# 1. Entorno de producción
cp deploy/.env.production.example deploy/.env.production
grep '^TOKEN=' ~/.local/share/apps/gemma-proxy/.env   # copiar a GEMMA_API_TOKEN
chmod 600 deploy/.env.production

# 2. Levantar el stack
./deploy/start.sh

# 3. Arranque automático al encender la Mac
cp deploy/com.apps.ingles-api.plist ~/Library/LaunchAgents/
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.apps.ingles-api.plist
```

## Exponerlo al público

```bash
# 1. Añadir el hostname al túnel de la Mac
#    (editar ~/.cloudflared/config.yml, ANTES de la regla http_status:404)
#      - hostname: tutor.apicloud.lat
#        service: http://localhost:8817

# 2. Crear la ruta DNS (se ejecuta desde la VPS, que tiene el cert.pem del túnel)
ssh -i ~/.ssh/studio_vps_key openclaw@116.203.199.148 \
  'cloudflared tunnel route dns 7317b2ff-322b-40b7-98e7-5f7b651ce275 tutor.apicloud.lat'

# 3. Recargar el túnel
launchctl kickstart -k gui/$(id -u)/com.dreamstech.cloudflared
```

## Gotcha real encontrado al desplegar

**`ports:` con `!reset` seguido de un valor no vacío se descarta entero**, no
se reemplaza. En Compose 2.24+, `!reset` siempre resetea al valor "vacío" del
tipo, **ignorando cualquier valor que le des** — sirve para `ports: !reset []`
(vaciar una lista heredada), pero `ports: !reset ["127.0.0.1:8817:8000"]`
también termina en una lista vacía, y Docker publica el puerto base (`8000:8000`)
sin restricción de host, o directamente fallaba con "port is already
allocated" si ambos compose files definían el mismo puerto.

El tag correcto para "sustituir por este valor concreto" es **`!override`**:

```yaml
services:
  api:
    ports: !override ["127.0.0.1:8817:8000"]
```

Diferencia con `!reset` (usado en EMOJI para redis, donde el valor deseado
*era* vacío): `!reset` = "vacía esto sin importar lo que pongas al lado";
`!override` = "reemplaza con exactamente este valor".

## Pendiente manual: arranque automático (LaunchAgent)

El LaunchAgent (`deploy/com.apps.ingles-api.plist`) está instalado y
registrado (`launchctl list | grep ingles`), pero **falla al ejecutarse** con:

```
shell-init: error retrieving current directory: getcwd: cannot access parent directories: Operation not permitted
bash: /Users/macstudio/Documents/INGLES/api/deploy/start.sh: Operation not permitted
```

Es una restricción TCC de macOS ("Archivos y Carpetas" / acceso a Documentos):
otros LaunchAgents del ecosistema (EMOJI, AI Studio) ya tenían ese permiso
concedido de una sesión interactiva anterior; este es nuevo y macOS no deja
que un proceso lanzado por `launchd` sin sesión interactiva acceda a
`~/Documents/INGLES` hasta que alguien lo apruebe una vez desde la UI.

**El servicio en sí funciona perfectamente** — está corriendo ahora mismo vía
`docker compose up -d` manual y verificado en producción (ver más abajo). Solo
falta el arranque automático tras reiniciar la Mac. Para resolverlo (acción
manual, no delegable):

1. Ajustes del Sistema → Privacidad y Seguridad → Archivos y Carpetas
   (o Acceso Total al Disco) → conceder acceso a `/bin/bash` (o Terminal, según
   cuál aparezca en el prompt) para la carpeta Documentos.
2. `launchctl kickstart -k gui/$(id -u)/com.apps.ingles-api`
3. Verificar: `launchctl list | grep ingles` (debería mostrar PID en vez de `-`).

Mientras tanto, si la Mac se reinicia, arrancar el stack manualmente:

```bash
cd ~/Documents/INGLES/api && ./deploy/start.sh
```

## Operación diaria

```bash
cd ~/Documents/INGLES/api
C="docker compose -f docker-compose.yml -f deploy/docker-compose.prod.yml --env-file deploy/.env.production"

$C ps                     # estado
$C logs -f api            # logs de la API
$C restart api            # reiniciar tras un cambio de código
$C down                   # parar todo
```

Comprobación rápida de punta a punta:

```bash
curl -s https://tutor.apicloud.lat/health

SID=$(curl -s -X POST https://tutor.apicloud.lat/v1/sessions/start \
  -H 'Content-Type: application/json' -d '{"level":"b1","mode":"conversation"}' \
  | python3 -c 'import json,sys;print(json.load(sys.stdin)["sessionId"])')

curl -s -X POST "https://tutor.apicloud.lat/v1/sessions/$SID/respond" \
  -H 'Content-Type: application/json' \
  -d '{"text":"Hi! I want to practice talking about my weekend."}' | python3 -m json.tool
```

## Verificado en producción (2026-07-30)

```json
{"status":"ok","provider":"gemma","model":"gemma4:e4b","scenarios_loaded":8}
```

Turno real de conversación completado end-to-end contra Gemma4 local vía
`gemma-proxy` → Ollama, con feedback pedagógico coherente (nivel B1,
modo `conversation`).

## Diferencias entre desarrollo y producción

| | Desarrollo (`docker-compose.yml`) | Producción (+ `deploy/docker-compose.prod.yml`) |
|---|---|---|
| Proveedor LLM | El que pongas en `.env` local | **`gemma`** (forzado en el override) |
| Redis | Publicado en `16379` para inspección | Sin puerto publicado |
| API escucha en | `0.0.0.0:8000` | **solo** `127.0.0.1:8817` |
| `INGLES_TRUST_PROXY` | `false` | `true` (el túnel de Cloudflare hace de proxy confiable) |
| Restart policy | Ninguna | `unless-stopped` |

## Cómo conectar las apps existentes

- **`mobile/`** (Expo/RN): configurar `Ajustes → Backend` → `https://tutor.apicloud.lat`.
  El contrato general está en [`mobile/BACKEND_API.md`](../../mobile/BACKEND_API.md);
  los endpoints reales que expone **este** servicio (sesiones de tutor, no
  auth/sync de progreso) están documentados en los docstrings de
  [`app/main.py`](../app/main.py).
- **`webapp/`** (vanilla): no tiene integración con el tutor todavía — es
  100% cliente con `localStorage` (ver `PROYECTO.md` §3.1). Si se quiere
  añadir un modo "practicar con el tutor" ahí, este endpoint es el que hay
  que llamar.
- **`tutor-ia/`** (CLI): sigue siendo independiente, llama a Anthropic
  directamente. No comparte infraestructura con este despliegue — es la
  versión "de escritorio, con tu propia API key" del mismo tutor.

## Qué falta

- [ ] Fijar `INGLES_API_TOKEN` antes de anunciar la URL ampliamente (hoy sin
      auth — cualquiera que conozca `tutor.apicloud.lat` puede abrir sesiones).
- [ ] Restringir `INGLES_CORS_ORIGINS` a los orígenes reales una vez la
      build de `mobile/` para producción esté fijada.
- [ ] Decidir qué hacer con el otro despliegue en `ingles.apicloud.lat`
      (proveedor `openclaw`) — ¿retirarlo, fusionarlo, o dejarlo como está?
      No se investigó su origen para no interferir con él sin instrucción.
- [ ] Conectar `webapp/` o `mobile/` de verdad a este endpoint (hoy el
      despliegue existe y funciona, pero ninguna app apunta a él todavía).

---

Para consumir este servicio desde `webapp/` y `mobile/`, ver
[USO-CLIENTES.md](USO-CLIENTES.md).
