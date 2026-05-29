# INGLES — App móvil + web (Expo)

App nativa iOS/Android + web desde un único codebase TypeScript con [Expo Router](https://docs.expo.dev/router/introduction/).

Implementa los principios del [tratado](../docs/index.html): input comprensible, output forzado, recasts, noticing, scaffolding en ZPD.

## Arquitectura

```
mobile/
├── app/                       # Rutas (Expo Router file-based)
│   ├── _layout.tsx            # Layout raíz
│   ├── index.tsx              # Dashboard
│   ├── settings.tsx
│   ├── flashcards/
│   │   ├── _layout.tsx
│   │   ├── index.tsx          # Listado / arranque
│   │   └── session.tsx        # Sesión activa SRS
│   ├── reading/
│   │   ├── _layout.tsx
│   │   ├── index.tsx
│   │   └── [id].tsx
│   ├── listening/
│   │   ├── _layout.tsx
│   │   ├── index.tsx
│   │   └── [id].tsx
│   └── grammar/
│       ├── _layout.tsx
│       ├── index.tsx
│       └── [id].tsx
├── components/                # UI compartida
├── lib/                       # Lógica de negocio (sin UI)
│   ├── srs.ts                 # Algoritmo SuperMemo-2
│   ├── storage.ts             # AsyncStorage wrapper
│   ├── api.ts                 # Cliente HTTP al backend
│   ├── content.ts             # Loaders de contenido local
│   ├── theme.ts               # Tokens de diseño (dark/light auto)
│   └── types.ts               # Tipos TypeScript compartidos
├── assets/
│   └── content/               # JSON local de vocab/lecturas/listening
├── BACKEND_API.md             # Contrato REST para tu hosting
├── app.json
├── package.json
└── tsconfig.json
```

## Setup

Requisitos: Node 20+, npm o yarn, Xcode (para iOS), Android Studio (para Android).

```bash
cd mobile
npm install
```

## Desarrollo

```bash
npm run start       # Selector interactivo (iOS / Android / web)
npm run ios         # Lanzar simulador iOS
npm run android     # Lanzar emulador Android
npm run web         # Lanzar en navegador (http://localhost:8081)
```

Edita un archivo y verás hot reload en cualquier target.

## Build para producción

### iOS / Android (con EAS Build)
```bash
npm install -g eas-cli
eas login
eas build:configure
eas build -p ios       # Genera .ipa
eas build -p android   # Genera .aab para Play Store
```

### Web estático
```bash
npm run build:web
# Salida en mobile/dist/ → sube a tu hosting (Vercel, Netlify, o tu VPS)
```

## Backend

El cliente está diseñado **offline-first**: todo el progreso se guarda en `AsyncStorage` y opcionalmente se sincroniza con tu backend.

Configura la URL base en `app.json` → `expo.extra.apiBaseUrl`, o en runtime mediante `Settings` (pantalla incluida).

El contrato REST que tu hosting debe implementar está documentado en [`BACKEND_API.md`](BACKEND_API.md). Incluye:
- `POST /auth/login`, `POST /auth/register`, `POST /auth/refresh`
- `GET/PUT /me/progress`
- `GET /content/vocab/:level`, `GET /content/lectura/:id`, `GET /content/listening/:id`
- `POST /sync/srs-batch` (sube cambios locales)

Mientras no implementes el backend, **la app sigue funcionando 100% offline** con el contenido empaquetado en `assets/content/`.

## Diferencias entre plataformas

- **Móvil**: navegación nativa con `react-native-screens`, gestos, haptic feedback en flashcards.
- **Web**: usa React DOM via `react-native-web`. URLs limpias (`/flashcards/session`), historial de navegador, deep linking.
- **Audio listening**: `expo-av` en móvil; HTML `<audio>` polyfill en web.
- **Persistencia**: `AsyncStorage` envuelto en `lib/storage.ts` — en web usa `localStorage` automáticamente vía polyfill de Expo.

## Testing manual

Una vez en marcha (`npm run web` es lo más rápido para iterar):

1. Dashboard → ver stats por nivel.
2. Cambiar nivel en Settings (A1/A2/B1/B2).
3. Flashcards → revisar 5+ cards, cerrar, reabrir → estado persistido.
4. Reading → seleccionar un texto, leer, contestar preguntas, ver puntuación.
5. Listening → ver script tras "revelar".
6. Grammar → completar ejercicios, ver corrección inmediata.
7. Settings → export/import de progreso JSON.
