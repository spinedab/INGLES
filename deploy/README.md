# Deploy del sitio público

El sitio vive en **https://ingles.nexocloud.co** (hosting cPanel compartido de
DreamLabsTech). El subdominio existe desde julio de 2026; no hay que crearlo.

```
https://ingles.nexocloud.co/                 webapp vanilla (PWA, offline)
https://ingles.nexocloud.co/app/             export web de Expo (mismo codebase que iOS/Android)
https://ingles.nexocloud.co/privacidad.html  política de privacidad
```

## Cómo se publica

El orquestador vive en el repo de hosting, **no aquí**, porque es una tarea
administrativa contra cPanel/FTPS y ese repo ya tiene las credenciales y los
helpers. Aquí solo está el código y estos dos `.htaccess`:

```bash
cd /Users/macstudio/Documents/dream-admin
./scripts/deploy-ingles.sh            # build + ensamblar + subir + verificar
./scripts/deploy-ingles.sh --dry      # sin subir
```

Ese script lee este repo desde `INGLES_DIR`, genera el export web, ensambla el
árbol en un temporal y lo sube con `publish-site.sh`. Nada de este código se
copia al repo de hosting.

## Los dos `.htaccess`

Se despliegan, no se usan en local:

| Fichero | Destino | Para qué |
|---|---|---|
| `raiz.htaccess` | `/.htaccess` | Caché. Sobre todo: **nunca cachear `sw.js`**, o la gente queda clavada en una versión vieja de la webapp. |
| `app.htaccess` | `/app/.htaccess` | Reescrituras para expo-router. Sin ellas, recargar en `/app/learn` da 404: el router navega a rutas sin extensión y el export emite `.html`. |

## Detalles que se rompen si se tocan

- **`experiments.baseUrl: "/app"`** en `mobile/app.json`. Sin eso, el export
  emite rutas absolutas `/_expo/...` que dan 404 al servirse bajo `/app/`. Solo
  afecta a web; iOS y Android lo ignoran.
- **El service worker excluye `/app/`** (`webapp/sw.js`). Su scope es `/` y su
  estrategia es cache-first, así que sin esa exclusión se tragaba el export de
  Expo y lo dejaba congelado en la primera versión vista. Verificado: pasaba de
  verdad, `/app/` servía una respuesta vacía hasta desregistrar el SW.
- **Subir la versión de `CACHE_NAME`** en `webapp/sw.js` cada vez que cambie
  contenido de `CORE_ASSETS`, o los clientes ya instalados no lo ven.

## Si el deploy falla con timeout

El nodo de cPanel bloquea por IP. Ver el incidente del 2026-08-05 en
`dream-admin/PRODUCTION-STATUS.md`: Imunify360 bloqueó la IP de la oficina y toda
la operación pasa por el VPS. El nodo puede estar perfectamente sano y aun así
no responder desde esta red. Comprobar antes de dar por caído el hosting:

```bash
cd /Users/macstudio/Documents/dream-admin && ./scripts/public-health.sh
```
