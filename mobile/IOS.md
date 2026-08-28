# App de Apple (iOS) — build y publicación

App nativa iOS de `mobile/` (Expo SDK 52 + expo-router 4 + React Native 0.76).
Mismo codebase que Android y web.

| Dato | Valor |
|------|-------|
| Bundle identifier | `com.spinedab.ingles` |
| Nombre visible | Tutor Inglés (`ios.infoPlist.CFBundleDisplayName`) |
| Nombre del proyecto Xcode | `TutorInglesIA` |
| Versión / build | `1.0.0` / `1` (`app.json`) |
| iPad | Soportado (`supportsTablet: true`) |
| Arquitectura | New Architecture activada (`newArchEnabled: true`) |

> El `expo.name` es ASCII a propósito (`TutorInglesIA`, sin acento). El nombre
> del proyecto Xcode y del target se derivan de ahí saneados, y `Inglés`
> generaba un `TutorInglsIA` con la letra comida. El acento vive solo en
> `CFBundleDisplayName`, que es lo que lee el usuario bajo el icono.

## Requisitos

- macOS con Xcode (probado con Xcode 26.6) y un simulador iOS instalado.
- CocoaPods.
- Node 20+.

CocoaPods aborta si el terminal no está en UTF-8, con un
`Encoding::CompatibilityError` que no explica la causa. Si te pasa:

```bash
export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8
```

## Generar el proyecto nativo

`ios/` es **generado** y no se versiona (ver `.gitignore`): se reconstruye
entero desde `app.json`. Cualquier cambio hecho a mano en Xcode se pierde en el
siguiente prebuild — la configuración se toca en `app.json`, no en el `.xcodeproj`.

```bash
cd mobile
npm install
npm run prebuild:ios      # expo prebuild --platform ios --clean
```

Eso crea `ios/` con el proyecto, el `Podfile` y los pods instalados.

## Correr en el simulador

```bash
npm run ios               # expo run:ios: compila, instala, lanza y abre Metro
```

## Iconos y splash

No se versionan PNG sueltos editados a mano: se generan del diseño de la marca.

```bash
npm run assets            # python3 scripts/generate-assets.py (requiere Pillow)
```

Produce, desde la geometría de `webapp/icons/app-icon.svg`:

| Fichero | Uso | Nota |
|---------|-----|------|
| `assets/icon.png` | Icono iOS/tienda | 1024×1024 **sin alfa** y sin esquinas redondeadas: App Store Connect rechaza iconos con transparencia, e iOS aplica su propia máscara. |
| `assets/adaptive-icon.png` | Foreground Android | Marca al 45%, dentro del safe-zone que recorta el launcher. |
| `assets/splash-icon.png` | Splash | Baldosa azul completa, no la E blanca suelta: el splash usa fondo claro y una E blanca sería invisible. |
| `assets/favicon.png` | Web | Aquí sí va redondeado; ningún navegador enmascara. |

El splash se retiene y se oculta a mano desde `app/_layout.tsx`, cuando
`LevelProvider` termina de leer el nivel guardado. Así el splash cubre ese
arranque en vez de enseñar un spinner sobre fondo vacío.

## Build de release y App Store

Los builds firmados van por EAS (`eas.json`). Requiere cuenta Expo y una cuenta
de Apple Developer de pago (99 USD/año) — sin ella se puede compilar y correr en
simulador, pero no distribuir ni subir a TestFlight.

```bash
npx eas login
npx eas build:configure          # vincula el proyecto y escribe extra.eas.projectId
npm run build:ios                # eas build --platform ios --profile production
```

Perfiles en `eas.json`:

- `development` — dev client, `simulator: true`, no requiere firma de dispositivo.
- `preview` — build interno firmado, para repartir por enlace.
- `production` — para App Store, con `autoIncrement` del build number.

### Antes de subir

`eas.json` tiene dos marcadores que hay que rellenar; `eas submit` falla si se
dejan como están:

```jsonc
"submit": { "production": { "ios": {
  "ascAppId":    "REEMPLAZAR_CON_APP_STORE_CONNECT_APP_ID",  // App Store Connect → App Information → Apple ID
  "appleTeamId": "REEMPLAZAR_CON_APPLE_TEAM_ID"              // developer.apple.com → Membership
}}}
```

Después:

```bash
npm run submit:ios               # eas submit --platform ios --profile production
```

### Cosas que Apple pide y ya están resueltas

- **Cifrado**: `ITSAppUsesNonExemptEncryption: false`. La app solo hace HTTPS
  estándar contra la API del tutor, así que no hay declaración de exportación.
- **Permisos**: la app no graba audio. Usa `expo-speech` (TTS, sin permiso) y
  `expo-av` solo para reproducir. El plugin de `expo-av` va con
  `microphonePermission: false` para que no se cuele un `NSMicrophoneUsageDescription`
  sin usar en el Info.plist — un permiso declarado y no usado es motivo de
  pregunta en revisión.
- **Localizaciones**: `CFBundleLocalizations: ["es", "en"]`. UI en español,
  contenido en inglés.

### Estado del envío (28 ago 2026)

**La versión 1.0 (build 2) está ENVIADA A REVISIÓN**: `WAITING_FOR_REVIEW`,
confirmado por la App Store Connect API. Todo se hizo por API con la clave
`.p8` (`tools/asc.py`), sin sesión de navegador:

- Teléfono del contacto de revisión corregido: el placeholder `+57 300 0000000`
  se sustituyó por el número real y verificado que consta como contacto de
  desarrollador en Google Play (+57 315 7218085).
- `contentRightsDeclaration: DOES_NOT_USE_THIRD_PARTY_CONTENT` — todo el
  contenido (vocabulario, lecturas, listening, gramática) se genera en este
  repo.
- Precio: gratis, territorio base USA, todos los países. Sin esto Apple
  rechaza el envío con «App is not eligible for submission until pricing has
  been set», un requisito que la UI no señalaba en la página de la versión.
- La condición de comerciante (DSA) quedó declarada antes («no soy
  comerciante»), requisito para distribuir en la UE.

El flujo por API para futuras versiones: crear `reviewSubmissions` (plataforma
IOS) → añadir la `appStoreVersion` como `reviewSubmissionItem` → `PATCH` con
`submitted: true`. Los errores 409 del segundo paso traen la lista real de lo
que falta en `meta.associatedErrors`, que es más fiable que la UI.

### Lo que hizo falta para llegar aquí

Contexto histórico de la ficha (ya resuelto, se deja como referencia):

1. Cuenta de Apple Developer activa.
2. Crear la ficha de la app en App Store Connect (nombre, categoría, precio) y
   pegar su Apple ID en `eas.json`.
3. Capturas de pantalla en los tamaños que exige Apple, icono de marketing,
   descripción, keywords.
4. Política de privacidad accesible por URL y el cuestionario de *App Privacy*.
   La app guarda el progreso solo en el dispositivo (AsyncStorage); lo único que
   sale del móvil son los mensajes que el usuario escribe al tutor, contra
   `tutor.apicloud.lat`. Eso hay que declararlo.
