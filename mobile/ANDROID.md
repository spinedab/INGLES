# App de Android — build y publicación

App nativa de Android desde el mismo codebase que iOS y web (Expo SDK 52 +
React Native 0.76). **No** es el wrap de WebView de `native/`, que quedó
superseded — ver [`native/README.md`](../native/README.md).

| Dato | Valor |
|------|-------|
| applicationId | `com.spinedab.ingles` (el mismo que el bundle id de iOS) |
| versionCode / versionName | `2` / `1.0.0` (`app.json`) |
| targetSdk | 35 |
| Nombre visible | Tutor Inglés IA |

## Requisitos del entorno

Ninguno viene configurado por defecto en esta Mac, así que hay que exportar las
variables en cada shell (o añadirlas al perfil):

```bash
export JAVA_HOME=/opt/homebrew/Cellar/openjdk@17/17.0.19/libexec/openjdk.jdk/Contents/Home
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

**Esto todavía no se ha hecho y no está empezado del lado de la tienda.** Hace
falta:

1. **Cuenta de Google Play Developer** — 25 USD, pago único (a diferencia de
   Apple, que son 99 USD/año). No consta que exista: `com.spinedab.ingles`
   devuelve 404 en Play.
2. **Crear la ficha** en Play Console y activar **Play App Signing** al subir el
   primer AAB.
3. **Ficha de tienda**: los textos de [`store/ficha-app-store.md`](store/ficha-app-store.md)
   sirven casi tal cual, pero Play tiene límites distintos — descripción corta de
   80 caracteres y larga de 4.000, sin campo de keywords (Play indexa la
   descripción).
4. **Capturas**: las de `store/capturas/ios-6.9/` son de iPhone. Play pide
   mínimo 2 capturas de teléfono, entre 320 y 3840 px de lado. Se regeneran con
   un emulador Android por el mismo método que las de iOS.
5. **Cuestionario de contenido y Data safety** — el equivalente al App Privacy de
   Apple. Las respuestas razonadas de
   [`store/ficha-app-store.md`](store/ficha-app-store.md#cuestionario-de-app-privacy)
   aplican igual: el progreso no sale del dispositivo y lo único que se envía son
   los mensajes al tutor, sin identificadores.
6. **Política de privacidad**: la misma URL, https://ingles.nexocloud.co/privacidad.html

Con la cuenta creada, la subida se puede automatizar con la Google Play
Developer API y una cuenta de servicio, igual que se hizo con la clave `.p8` de
Apple.

## Bug abierto: los iconos de Ionicons no se renderizan en Android

**Estado: sin resolver.** La app arranca, navega y es usable, pero **ningún
glifo de `@expo/vector-icons` se dibuja en Android**: ni el del onboarding ni los
del tab bar, que quedan invisibles. En iOS se renderizan bien.

Se detectó ejecutando el APK de release en un emulador (Pixel 7, Android 15).
No se habría visto de otra forma: el build es correcto y no da ningún error.

### Lo que se comprobó

- Las 20 fuentes TTF **sí están** dentro del APK. No es empaquetado.
- `enableProguardInReleaseBuilds` y `shrinkResources` están en **false**, así que
  **no es minificación** de R8 quitando recursos.
- `adb shell uiautomator dump` muestra **0 nodos con glifo** y solo 4 nodos de
  texto en el onboarding. El componente `<Ionicons>` **no emite ningún nodo** —
  no es que pinte un cuadro vacío. `@expo/vector-icons` devuelve `null` mientras
  su fuente no está lista, así que la fuente nunca llega a estarlo.
- No aparece ningún error en `logcat`.

### Tres hipótesis probadas y refutadas

1. **Carga en runtime**: `useFonts(Ionicons.font)` explícito en
   `app/_layout.tsx`. No lo arregla.
2. **Fuente no embebida**: embeber `Ionicons.ttf` como recurso nativo con el
   plugin `expo-font`. La fuente aparece en `assets/fonts/Ionicons.ttf`, pero no
   lo arregla.
3. **New Architecture**: se compiló con `newArchEnabled: false` para descartar un
   problema de bridgeless en la carga de fuentes. **Los iconos siguen ausentes**,
   así que no es eso. El flag se restauró a `true` porque el build 2 de iOS ya
   subido a App Store Connect se compiló con New Architecture, y dejarlo en false
   desalinearía el repo del binario en revisión.

Los cambios 1 y 2 se conservan porque son la práctica recomendada y no hacen
daño, pero **ninguno resolvió el síntoma**.

### Lo que sí se arregló de camino

El primer intento dejó el **splash colgado para siempre** cuando la fuente no
cargaba. `app/_layout.tsx` ahora cierra el splash cuando la fuente carga, falla
**o pasan 3 segundos**, de modo que un problema de fuentes degrada a «app sin
iconos» y nunca a «app que no abre».

### Por dónde seguir — la vía recomendada

**Sustituir `@expo/vector-icons` por SVG.** `react-native-svg` ya es dependencia,
así que no añade peso, y elimina la clase de problema entera: no hay fuente que
cargar, el trazo se dibuja siempre. Son ~12 iconos en 5 ficheros
(`app/onboarding.tsx`, `app/(tabs)/_layout.tsx`, `app/(tabs)/learn.tsx`,
`app/(tabs)/profile.tsx`): `language`, `time-outline`, `person`, `person-circle`,
`home`, `book`, `fitness`, `journal`, `chevron-forward`, `search` y los de
destreza. Es un refactor acotado y determinista.

Alternativas menos fiables: probar en un móvil físico (podría ser específico del
emulador) o revisar incompatibilidades conocidas de `expo-font` con RN 0.76.

**No bloquea iOS**, que no está afectado y renderiza los iconos bien.

## Por qué la app NO se ha subido a Play todavía

La cuenta existe y está accesible: **DreamLabsTech**, cuenta personal, ID
`8501044510791725431`, con 88 apps. El AAB está firmado y listo.

No se ha subido **a propósito**: con este bug, el tab bar se publicaría con los
cinco iconos invisibles. Es la navegación principal de la app. Publicarlo sería
peor que esperar, y una vez en Play la primera impresión ya está dada.

Orden recomendado: arreglar los iconos → verificar en el emulador (`ingles_test`)
→ crear la app en Play Console → subir el AAB.
