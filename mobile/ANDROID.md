# App de Android — build y publicación

App nativa de Android desde el mismo codebase que iOS y web (Expo SDK 52 +
React Native 0.76). **No** es el wrap de WebView de `native/`, que quedó
superseded — ver [`native/README.md`](../native/README.md).

| Dato | Valor |
|------|-------|
| applicationId | `com.spinedab.ingles` (el mismo que el bundle id de iOS) |
| versionCode / versionName | `1` / `1.0.0` (`app.json`) |
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
- No hay ningún AVD creado, así que para probar en emulador habría que crearlo
  primero.

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
