# Activos de tienda — iOS

Estado del envío a App Store y material listo para pegar.

## Lo que ya existe en la cuenta de Apple

Creado el 31 de julio de 2026 con la clave de API de App Store Connect
(`AuthKey_S32YS2GL7U.p8`), sin pasar por ninguna contraseña.

| Recurso | Valor | Cómo se creó |
|---|---|---|
| App ID (App Store Connect) | `6798352342` | Formulario web (la API no permite `CREATE` en `/v1/apps`) |
| Nombre en la tienda | Tutor Inglés IA | " |
| SKU | `INGLES-IOS-001` | " |
| Idioma principal | `es-ES` | " |
| Bundle ID | `com.spinedab.ingles` (id interno `HRJ6JGZ48W`) | `POST /v1/bundleIds` |
| Perfil de aprovisionamiento | `TutorInglesIA AppStore`, UUID `3f640bba-1914-419d-a5e5-2212ac718b08`, `IOS_APP_STORE`, activo | `POST /v1/profiles` |
| Certificado de distribución | `H447PJ87TQ` — Santiago Pineda Botero, expira 2027-07-29 | Ya existía |
| Team ID | `Y9A29F6TZL` | Ya existía |

`mobile/eas.json` ya lleva el `ascAppId` y el `appleTeamId` reales.

> El estado de la app es **«En preparación para el envío»**. Es un borrador
> privado: no está publicada, no es visible para nadie y se puede borrar.

## Ficha

Textos listos para copiar en [`ficha-app-store.md`](ficha-app-store.md):
nombre, subtítulo, descripción, keywords, categorías, notas para revisión y las
respuestas del cuestionario de App Privacy.

## Capturas

`capturas/ios-6.9/` — 3 capturas a **1320×2868**, uno de los dos tamaños que
Apple acepta para la clase de 6.9" (el otro es 1290×2796). Tomadas del build
Release en el simulador de iPhone 17 Pro Max, así que no llevan banner de
desarrollo.

Para regenerarlas:

```bash
cd mobile
npx expo prebuild --platform ios --clean
xcodebuild -workspace ios/TutorInglesIA.xcworkspace -scheme TutorInglesIA \
  -configuration Release -sdk iphonesimulator \
  -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath ios/build-release CODE_SIGNING_ALLOWED=NO
xcrun simctl install <udid> ios/build-release/Build/Products/Release-iphonesimulator/TutorInglesIA.app
xcrun simctl io <udid> screenshot captura.png     # sale a resolución nativa
```

## Lo que falta para poder enviar

1. **Capturas de iPad 13"**. `app.json` declara `supportsTablet: true`, y en ese
   caso Apple **exige** capturas de iPad además de las de iPhone. Dos caminos:
   generarlas con el simulador de iPad Pro 13", o poner `supportsTablet: false`
   y publicar solo para iPhone. Es una decisión de producto, no técnica.

2. **Publicar la política de privacidad**. La página está escrita en
   [`privacidad.html`](../../privacidad.html) pero solo estará viva cuando se
   haga merge a `main` y GitHub Pages redespliegue. Apple comprueba la URL y
   rechaza el envío si da 404. Verificar antes:
   ```bash
   curl -sI https://spinedab.github.io/INGLES/privacidad.html | head -1
   ```

3. **Declarar la condición de comerciante (DSA)**. App Store Connect avisa en
   portada: sin declararla no se pueden enviar apps nuevas para la Unión
   Europea. Solo lo puede hacer el titular de la cuenta, en
   *Negocio → Información de comerciante*.

4. **Subir un build**. Requiere archivar para dispositivo (no simulador) y
   firmar con el certificado de distribución y el perfil de arriba, y luego:
   ```bash
   xcrun altool --upload-app -f TutorInglesIA.ipa -t ios \
     --apiKey S32YS2GL7U --apiIssuer 54217fc3-2dec-4515-a14a-ad92ac1961dc
   ```
   La clave API sirve para subir sin contraseña. Alternativa gestionada:
   `npm run build:ios` (EAS), que además maneja las credenciales — pero requiere
   `eas login`.

5. **Enviar a revisión**. Ese es el paso que hace la app pública y debe pulsarlo
   una persona, no un script.

## Idioma principal

Quedó en `es-ES` porque el desplegable nativo de macOS en App Store Connect no
acepta eventos sintéticos. Cambiarlo a `es-MX` por API falla mientras no existan
capturas de ese idioma:

```
409 MISSING_SCREENSHOTS_PRIMARY_LOCALE
```

Una vez subidas las capturas, se puede cambiar con:

```bash
PATCH /v1/apps/6798352342  {"attributes":{"primaryLocale":"es-MX"}}
```

o a mano en *Información de la app*. Ambas variantes muestran español; no es
bloqueante.
