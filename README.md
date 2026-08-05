# INGLES — Sistema integral de aprendizaje de inglés basado en evidencia

**Web pública:** https://ingles.nexocloud.co — webapp en `/`, app Expo en `/app/`.
Cómo se publica y por qué así: [`deploy/`](deploy/).
Espejo en GitHub Pages: https://spinedab.github.io/INGLES/

Implementación de siete subproyectos derivados del tratado enciclopédico sobre ESL/EFL:

| # | Subproyecto | Carpeta | Propósito |
|---|-------------|---------|-----------|
| 1 | Plan personal de aprendizaje | [`plan-personal/`](plan-personal/) | Currículo 6 meses A1→B2, rutinas, recursos, Anki |
| 2 | Sitio de documentación | [`docs/`](docs/) | Tratado navegable en HTML estático, 15 secciones |
| 3 | App web rápida (vanilla) | [`webapp/`](webapp/) | SPA vanilla JS/PWA con SRS, flashcards, lecturas, listening, grammar, coach, búsqueda global y cuaderno léxico — cero build. Es la que sirve GitHub Pages |
| 4 | Tutor IA conversacional (CLI) | [`tutor-ia/`](tutor-ia/) | CLI Python con Claude API aplicando principios pedagógicos |
| 5 | **App móvil + web (Expo + RN)** | [`mobile/`](mobile/) | TypeScript, iOS / Android / web desde un único codebase: tabs, onboarding con placement test, design system propio. Pipeline de Apple en [`mobile/IOS.md`](mobile/IOS.md) |
| 6 | App Android nativa (wrap) | [`native/`](native/) | Capacitor 6 empaqueta el export web de `mobile/` → AAB firmado `com.spinedab.ingles` |
| 7 | API del tutor (servicio) | [`api/`](api/) | FastAPI que expone el tutor IA por HTTP para integrarlo en las apps |

## Documentos clave

- **[PROYECTO.md](PROYECTO.md)** — Descripción del proyecto, fundamentación teórica, mapa entre tratado e implementación.
- **[PLAN.md](PLAN.md)** — Plan de implementación detallado por fases, decisiones técnicas, criterios de aceptación.

## Arranque rápido

```bash
# Sitio de documentación
open docs/index.html

# App web rápida
open webapp/index.html
# Recomendado para evitar restricciones de fetch/localStorage en algunos navegadores:
cd webapp && python3 -m http.server 5189 --bind 127.0.0.1
# http://127.0.0.1:5189

# App móvil + web Expo (recomendada como producto principal)
cd mobile
npm install
npm run web         # http://localhost:8081
npm run ios         # Simulador iOS
npm run android     # Emulador Android

# Tutor IA (requiere API key de Anthropic)
cd tutor-ia
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
export ANTHROPIC_API_KEY=sk-ant-...
python tutor.py

# Plan personal: leer plan-personal/README.md
```

## Qué webapp usar

| Necesitas | Usa |
|-----------|-----|
| Abrir y usar en 5 segundos sin instalar nada | `webapp/` (vanilla JS, doble-click al `index.html`) — es la web pública |
| App nativa iOS/Android para tu bolsillo | `mobile/` (`npm run ios` o `android`) |
| IPA / TestFlight / App Store | `mobile/` con EAS — ver [`mobile/IOS.md`](mobile/IOS.md) |
| AAB para Google Play | `native/` (Capacitor): `mobile/dist` → `native/www` → `gradlew bundleRelease` |
| Web "de producto" para subir a tu hosting | `mobile/` con `npm run build:web` → genera estático en `dist/` |
| Sincronización entre dispositivos / tutor IA en apps | [`api/`](api/) (FastAPI) + contrato en [`mobile/BACKEND_API.md`](mobile/BACKEND_API.md) |

## Pipeline Android (resumen)

```bash
cd mobile && npm run build:web          # 1. export web
rsync -a --delete dist/ ../native/www/  # 2. sync al wrap
cd ../native && npx cap sync android    # 3. capacitor sync
cd android && ./gradlew bundleRelease   # 4. AAB firmado
```

## Pipeline Apple (resumen)

```bash
cd mobile
npm install
npm run assets            # 1. iconos y splash desde el SVG de marca
npm run prebuild:ios      # 2. genera ios/ desde app.json (no se versiona)
npm run ios               # 3. simulador
npm run build:ios         # 4. IPA firmada vía EAS
npm run submit:ios        # 5. subir a App Store Connect
```

Bundle id `com.spinedab.ingles`, el mismo que el AAB de Android. Pasos 4-5
requieren cuenta de Apple Developer. Detalle completo, requisitos de revisión y
qué queda pendiente para publicar: [`mobile/IOS.md`](mobile/IOS.md).

## Contenido de vocabulario (una sola fuente)

Los decks de vocabulario se editan en un único sitio, `content/vocab/<nivel>.tsv`,
y se propagan con:

```bash
python3 tools/build_vocab.py          # regenera; --check valida sin escribir
```

De ahí salen los decks de la webapp, los de la app móvil y los TSV de import de
Anki. Antes había dos bancos que se editaban por separado y habían divergido
(505 palabras en total, solo 82 en común); ahora son consumidores generados. El
script valida que ningún `id` cambie: el progreso SRS vive en
`localStorage['srs:<id>']` y reasignar un id borraría el historial del aprendiz.

## Producción

La API del tutor (`api/`) corre desplegada en la infraestructura DreamsTech:
IA local (Gemma4 vía Ollama, sin coste) + Docker en la Mac Studio + túnel
Cloudflare. Público en **https://tutor.apicloud.lat**. Detalles completos,
decisiones y gotchas en [`api/docs/DESPLIEGUE.md`](api/docs/DESPLIEGUE.md).

```bash
curl -s https://tutor.apicloud.lat/health
```

Las apps ya consumen el servicio: la webapp tiene la vista **Tutor IA** (`#/tutor`,
cliente en `webapp/js/tutor-client.js`) y `mobile/` tiene el cliente tipado
`mobile/lib/tutorApi.ts`. Cómo integrarlo, ejemplos copiables, configuración de
base URL, token opcional y limitaciones en
[`api/docs/USO-CLIENTES.md`](api/docs/USO-CLIENTES.md).

## Fundamento

Todo el sistema opera sobre cinco principios convergentes del consenso post-método (Kumaravadivelu, 1994):

1. **Input comprensible** (Krashen, 1985) — i+1 graduado.
2. **Output significativo** (Swain, 1985) — producción con noticing.
3. **Interacción negociada** (Long, 1996) — feedback correctivo, recasts.
4. **Atención consciente** (Schmidt, 1990) — noticing de la forma.
5. **Mediación social** (Vygotsky / Lantolf) — scaffolding en ZPD.

Las decisiones de diseño en cada subproyecto se justifican explícitamente contra estos principios en `PROYECTO.md`.
