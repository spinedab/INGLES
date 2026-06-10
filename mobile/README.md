# INGLES — App móvil + web (Expo + React Native)

App nativa iOS/Android + web desde un único codebase TypeScript con [Expo Router](https://docs.expo.dev/router/introduction/).

Implementa los principios del [tratado](../docs/index.html): input comprensible (Krashen), output forzado (Swain), recasts (Long), noticing (Schmidt), scaffolding en ZPD (Vygotsky/Lantolf).

**Web pública:** https://spinedab.github.io/INGLES/
**Android (AAB):** se empaqueta vía Capacitor en [`../native/`](../native/) — paquete `com.spinedab.ingles`, targetSdk 35.

## Arquitectura

```
mobile/
├── app/                       # Rutas (Expo Router file-based)
│   ├── _layout.tsx            # Stack raíz
│   ├── index.tsx              # Redirect: onboarding (1ª vez) o (tabs)
│   ├── onboarding.tsx         # Welcome → meta diaria → placement test → nivel
│   ├── (tabs)/                # Tab bar: Inicio · Aprender · Coach · Cuaderno · Perfil
│   │   ├── index.tsx          # Dashboard (misión, progress ring, actividad)
│   │   ├── learn.tsx          # Hub de destrezas
│   │   ├── coach.tsx          # Timer + writing coach + shadowing + analytics
│   │   ├── notebook.tsx       # Lexicón personal + cloze quiz
│   │   └── profile.tsx        # Perfil, ajustes, export/import
│   ├── flashcards/            # SRS SuperMemo-2 (index + session)
│   ├── reading/               # Lecturas graduadas con glosas ([id])
│   ├── listening/             # Audio + script revelado ([id])
│   ├── grammar/               # Gramática focalizada ([id])
│   ├── search.tsx             # Búsqueda global (modal)
│   └── settings.tsx
├── components/                # UI compartida (13 componentes, Reanimated)
├── lib/                       # Lógica de negocio (12 módulos, sin UI)
│   ├── theme.ts               # Design System v2: indigo/terracotta, dark mode
│   ├── srs.ts                 # SuperMemo-2
│   ├── insights.ts            # Activity log, racha, misión diaria
│   ├── notebook.ts            # Lexicón CRUD + cloze
│   ├── writingCoach.ts        # Analizador de errores hispanohablantes
│   ├── shadowing.ts           # TTS + comparación de speech
│   ├── search.ts              # Índice global
│   └── storage / api / content / types / levelContext
├── assets/content/            # JSON local: vocab, lecturas, listening
└── BACKEND_API.md             # Contrato REST para backend propio (ver ../api/)
```

## Desarrollo

Requisitos: Node 20+, Xcode (iOS), Android Studio (Android).

```bash
cd mobile
npm install
npm run web         # http://localhost:8081 — más rápido para iterar
npm run ios         # Simulador iOS
npm run android     # Emulador Android
npm run typecheck   # tsc --noEmit
```

## Build para producción

### Web estático
```bash
npm run build:web    # → mobile/dist/
```
Sube `dist/` a tu hosting, o sincroniza a GitHub Pages.

### Android (AAB firmado, vía Capacitor)
El wrap nativo vive en `../native/` (Capacitor 6, clave SpineDab):
```bash
cd mobile && npm run build:web
rsync -a --delete dist/ ../native/www/
cd ../native && npx cap sync android
cd android && ./gradlew bundleRelease
# salida: native/android/app/build/outputs/bundle/release/app-release.aab
```

### iOS (EAS Build)
```bash
npm install -g eas-cli
eas login && eas build:configure
eas build -p ios
```

## Backend

Offline-first: todo el progreso vive en AsyncStorage. Backend opcional para sync — el contrato REST está en [`BACKEND_API.md`](BACKEND_API.md) y hay una implementación FastAPI del tutor IA en [`../api/`](../api/). Configura la URL en la pestaña Perfil.

## Flujo de primera ejecución

1. **Onboarding**: logo → selección de meta diaria (15/30/45/60 min) → placement test de 8 preguntas graduadas (A1→B2) → asignación automática de nivel.
2. **Dashboard**: misión del día (3 pasos), progress ring, racha, módulos.
3. El onboarding solo aparece una vez (flag `onboarding:done` en storage). Para repetirlo: borrar datos desde Perfil.
