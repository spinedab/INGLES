# App de Android — build y publicación

App nativa de Android desde el mismo codebase que iOS y web (Expo SDK 52 +
React Native 0.76). **No** es el wrap de WebView de `native/`, que quedó
superseded — ver [`native/README.md`](../native/README.md).

| Dato | Valor |
|------|-------|
| applicationId | `com.spinedab.ingles` (el mismo que el bundle id de iOS) |
| versionCode / versionName | `3` / `1.0.0` (`app.json`) — el `2` ya está subido a Play |
| targetSdk | 35 |
| Nombre visible | Tutor Inglés IA |

## Requisitos del entorno

Ninguno viene configurado por defecto en esta Mac, así que hay que exportar las
variables en cada shell (o añadirlas al perfil):

```bash
export JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"
```

- **JDK 17.** Hay también `openjdk` y `openjdk@21` en Homebrew; RN 0.76 va con 17.
- **SDK de Android** en `~/Library/Android/sdk` con platform 35 y build-tools 35.
- Android Studio **no** está instalado y no hace falta: todo va por Gradle.
- **Ya está todo configurado de forma persistente** en `~/.zshrc`: `JAVA_HOME`,
  `ANDROID_HOME`, el PATH con `adb`/`emulator`/`cmdline-tools` y la carga
  automática del keystore. Un shell nuevo funciona sin exportar nada.
- Emulador y una imagen `android-35;google_apis;arm64-v8a` instalados, con un AVD
  llamado `ingles_test` (Pixel 7). Arrancarlo:
  `emulator -avd ingles_test -no-snapshot -no-audio -no-boot-anim -gpu swiftshader_indirect`

## Generar el proyecto nativo

`android/` es **generado** y no se versiona: se reconstruye desde `app.json`.
Cualquier cambio hecho a mano en él se pierde en el siguiente prebuild.

```bash
cd mobile
npm install
npx expo prebuild --platform android --clean
```

> `expo-system-ui` es necesario para que `userInterfaceStyle: automatic` se
> aplique en Android. Sin él, prebuild avisa y el tema oscuro no sigue al
> sistema correctamente. Ya está en las dependencias.

## Firma

El keystore de **subida** vive fuera del repo, en `~/.android-signing/`:

```
~/.android-signing/ingles-upload.jks    # keystore, RSA 4096, 30 años
~/.android-signing/ingles.env           # ruta, alias y contraseña (chmod 600)
```

La firma la inyecta el config plugin
[`plugins/withAndroidUploadSigning.js`](plugins/withAndroidUploadSigning.js) en
cada prebuild, leyendo el keystore **del entorno**. Dos razones:

- `android/` es generado y gitignorado, así que editar `app/build.gradle` a mano
  no sirve: el siguiente `prebuild --clean` lo borra y el release se firmaría con
  la clave de debug **sin avisar**.
- Leyendo del entorno, el keystore no puede colarse en un commit.

Si las variables no están exportadas, `storeFile` apunta a `/dev/null` y Gradle
falla con un error claro en vez de producir un AAB inservible. El plugin también
falla en voz alta si la plantilla de Expo cambia y no encuentra dónde inyectar.

> ⚠ **Haz copia de `~/.android-signing/`.** Con Play App Signing, Google guarda
> la clave de firma real y esta es solo la de subida, así que si se pierde
> Google puede reemplazarla — pero es un trámite con soporte. Copiarla a un
> gestor de contraseñas cuesta un minuto.

## Compilar

```bash
cd mobile/android
source ~/.android-signing/ingles.env
export INGLES_KEYSTORE INGLES_KEY_ALIAS INGLES_KEYSTORE_PASSWORD
./gradlew bundleRelease     # AAB para Play
./gradlew assembleRelease   # APK, para instalar a mano o repartir
```

Salida: `android/app/build/outputs/bundle/release/app-release.aab` (~56 MB, que
es lo normal en un AAB: lleva todas las arquitecturas y Play entrega mucho menos
por dispositivo).

Verificado end-to-end: `prebuild --clean` seguido de `bundleRelease` produce un
AAB firmado (`jarsigner -verify` → «jar verified») sin ninguna intervención
manual, con el bundle de Hermes dentro y el contenido de la app comprobado
(gramática, vocabulario y los textos del listening presentes en el bytecode).

## Publicar en Google Play

> **Corrección importante.** Una versión anterior de este documento afirmaba que
> «no está empezado del lado de la tienda» y que la cuenta no constaba, porque
> `com.spinedab.ingles` devolvía **404** en Play. Esa inferencia era falsa: un 404
> solo significa que la app **no es pública**, no que no exista. La app sí existe.

Estado real en Play Console (verificado el 12 ago 2026):

| Dato | Valor |
|------|-------|
| Cuenta | DreamLabsTech, personal, ID `8501044510791725431` |
| App | «INGLES: aprende con IA», id `4972652599663596483` |
| Ficha de tienda | **En directo** — nombre, icono, capturas, Data safety y clasificación ya resueltos |
| Segmento activo | **Prueba cerrada «alpha»**, versión 1.0, 177/177 países |
| Producción | Inactivo |
| App bundles subidos | versionCode **1** (9 jun 2026) y **2** (30 jul 2026) |
| Play App Signing | Activo |

Por eso `app.json` va con `versionCode: 3`: el 2 ya está ocupado.

### Bloqueo 1 — la clave de carga no es la de este Mac

`~/.android-signing/ingles-upload.jks` **no** es la clave con la que se subieron
los builds de junio y julio, así que un AAB firmado con ella lo **rechaza** Play:

| Clave | SHA-256 |
|-------|---------|
| Registrada en Play como clave de carga | `FF:41:A1:DC:A0:24:83:01:DB:90:92:0C:...` |
| `ingles-upload.jks` (este Mac) | `3C:2D:DD:62:CE:D7:DB:5B:53:40:70:B8:AF:46:12:A0:3E:30:B7:BB:75:F9:9E:FA:B8:FF:B1:07:50:10:6A:AD` |

La original no está en este Mac: no aparece en `~/.android-signing/`, ni en
`~/.android/debug.keystore`, ni en `dream-admin/.secrets/`, ni en el historial del
shell. Se generó en otra máquina o en un pipeline cuyos secretos no están aquí.

Dos salidas, y **la elección no es técnica**:

1. **Recuperar el keystore original** de donde se firmó el build del 30 jul. Es la
   opción limpia: no cambia nada en Play.
2. **Pedir el restablecimiento de la clave de carga** en Play Console → Firma de
   apps → «Cómo solicitar que se restablezca la clave de carga», adjuntando
   `~/.android-signing/ingles-upload-cert.pem` (ya exportado). Google tarda unos
   días. **Ojo:** esto invalida la clave anterior, así que rompería la máquina o
   el pipeline que todavía la use. No se ha hecho, precisamente por eso.

La clave de firma **real** la guarda Google (Play App Signing), así que en ningún
caso se pierde la app ni las instalaciones existentes.

### Bloqueo 2 — producción exige 12 verificadores y 14 días

Las cuentas personales nuevas no pueden lanzar a producción directamente. Play
pide, y lo muestra en el panel de la app:

- ✅ Publicar una versión de prueba cerrada — *hecho*
- ⬜ **12 verificadores que acepten** participar — *actualmente 0*
- ⬜ Mantener la prueba cerrada con esos 12 durante **14 días**

Esto no es trabajo de código: son 12 personas reales aceptando una invitación.
Hasta que se cumpla, «Producción» seguirá inactivo por diseño de Google.

### Lo que sí queda listo desde el repo

- `bundleRelease` reproducible y firmado (ver arriba).
- Textos de ficha en [`store/ficha-app-store.md`](store/ficha-app-store.md). Play
  usa descripción corta de 80 caracteres y larga de 4.000, sin campo de keywords.
- Capturas: las de `store/capturas/ios-6.9/` son de iPhone. Play acepta capturas
  de teléfono de 320–3840 px, y la ficha ya tiene las suyas publicadas.
- Política de privacidad: https://ingles.nexocloud.co/privacidad.html

Cuando la clave esté resuelta, la subida se puede automatizar con la Google Play
Developer API y una cuenta de servicio, igual que se hizo con la `.p8` de Apple.

## Iconos: por qué son SVG y no @expo/vector-icons

`components/Icon.tsx` dibuja los 14 iconos de la app con `react-native-svg`.
No es una preferencia estética: **los glifos de `@expo/vector-icons` no se
renderizaban en Android**, ni en el onboarding ni en el tab bar, que salía con
sus cinco iconos invisibles. En iOS sí funcionaban.

Tres hipótesis se probaron y se descartaron por medición, no por suposición:

1. **Carga en runtime** — `useFonts(Ionicons.font)` explícito. No lo arregló.
2. **Fuente no embebida** — embeberla como recurso nativo con el plugin
   `expo-font`. La fuente aparecía en `assets/fonts/Ionicons.ttf`. No lo arregló.
3. **New Architecture** — compilado con `newArchEnabled: false`. Los iconos
   seguían ausentes, así que no era bridgeless.

Datos que orientaron el diagnóstico: las 20 TTF **sí** estaban en el APK,
`minifyEnabled`/`shrinkResources` estaban en **false** (no era R8), y `logcat` no
mostraba ningún error. Los codepoints del área privada de Unicode se dibujan como
**nada** al caer al font por defecto, así que el texto se renderizaba sin la
fuente aplicada, sin dejar rastro visible.

Con SVG no hay fuente que cargar: el trazo se dibuja siempre. `react-native-svg`
ya era dependencia, así que no añade peso. La API de `Icon` imita la de Ionicons
(`name`, `size`, `color`) para que la sustitución fuera mecánica.

**Verificado en el emulador**: los 14 iconos se renderizan, incluidos los cinco
del tab bar.

