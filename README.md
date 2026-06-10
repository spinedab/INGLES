# INGLES — Sistema integral de aprendizaje de inglés basado en evidencia

**Web pública:** https://spinedab.github.io/INGLES/

Implementación de siete subproyectos derivados del tratado enciclopédico sobre ESL/EFL:

| # | Subproyecto | Carpeta | Propósito |
|---|-------------|---------|-----------|
| 1 | Plan personal de aprendizaje | [`plan-personal/`](plan-personal/) | Currículo 6 meses A1→B2, rutinas, recursos, Anki |
| 2 | Sitio de documentación | [`docs/`](docs/) | Tratado navegable en HTML estático, 15 secciones |
| 3 | App web rápida (vanilla) | [`webapp/`](webapp/) | SPA vanilla JS/PWA con SRS, flashcards, lecturas, listening, grammar, coach, búsqueda global y cuaderno léxico — cero build. Es la que sirve GitHub Pages |
| 4 | Tutor IA conversacional (CLI) | [`tutor-ia/`](tutor-ia/) | CLI Python con Claude API aplicando principios pedagógicos |
| 5 | **App móvil + web (Expo + RN)** | [`mobile/`](mobile/) | TypeScript, iOS / Android / web desde un único codebase: tabs, onboarding con placement test, design system propio |
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

## Fundamento

Todo el sistema opera sobre cinco principios convergentes del consenso post-método (Kumaravadivelu, 1994):

1. **Input comprensible** (Krashen, 1985) — i+1 graduado.
2. **Output significativo** (Swain, 1985) — producción con noticing.
3. **Interacción negociada** (Long, 1996) — feedback correctivo, recasts.
4. **Atención consciente** (Schmidt, 1990) — noticing de la forma.
5. **Mediación social** (Vygotsky / Lantolf) — scaffolding en ZPD.

Las decisiones de diseño en cada subproyecto se justifican explícitamente contra estos principios en `PROYECTO.md`.
