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

## Ficha completa y build subido (2026-08-07)

Todo esto se hizo con la API (`tools/asc.py`), sin contraseñas:

| Elemento | Valor |
|---|---|
| Build | v1 `VALID`, asociado a la versión 1.0. Delivery `94d90304-24ed-48f5-9a3a-d145c232c433` |
| IPA | 13,9 MB, firmado con `Apple Distribution: Santiago Pineda Botero (Y9A29F6TZL)`, validado con `altool --validate-app` sin errores |
| Nombre / subtítulo | Tutor Inglés IA / Inglés con base científica |
| Descripción | 2.608 caracteres |
| Keywords | 89 de 100 caracteres |
| Categorías | Educación / Referencia |
| Clasificación | **4+** |
| URL de privacidad | https://ingles.nexocloud.co/privacidad.html (viva, HTTP 200) |
| Capturas | 3 a 1320×2868 en el set `APP_IPHONE_67`, estado `COMPLETE` |
| Notas de revisión | 935 caracteres, explicando el tutor LLM y que no hay chat entre usuarios |

**iPhone only**: `supportsTablet` se puso en `false` y el proyecto compila con
`TARGETED_DEVICE_FAMILY = 1`. La app no tiene layouts de iPad — todas las
pantallas son de una columna centrada — así que declarar soporte de tablet daría
una app estirada y es riesgo de rechazo por la guideline 4.0 (Design). En iPad
sigue funcionando en modo compatibilidad. Como efecto secundario, Apple ya no
exige capturas de iPad.

> ⚠ **El teléfono de contacto de revisión es un relleno** (`+57 300 0000000`).
> Es un campo obligatorio y no conozco el real. **Corrígelo** en
> *Distribución → Información de revisión de la app*: Apple lo usa para
> contactar si tienen dudas durante la revisión.

## Lo que falta para poder enviar

Dos cosas, y **ninguna la puede hacer un script**: las dos son declaraciones que
corresponden al titular de la cuenta.

1. **Cuestionario de App Privacy.** En *Distribución → Privacidad de la app*.
   Los endpoints de la API (`/v1/appDataUsages`, `/v1/appDataUsagePublishState`)
   responden 404 en esta cuenta, así que es solo web — y además es una
   declaración legal sobre qué datos recoges. Las respuestas exactas, ya
   razonadas, están en [`ficha-app-store.md`](ficha-app-store.md#cuestionario-de-app-privacy):
   en resumen, «Otros datos de usuario» → funcionalidad, **no** vinculado a
   identidad, **no** usado para seguimiento; el resto todo «no».

2. **Condición de comerciante (DSA).** En *Negocio → Información de comerciante*.
   App Store Connect avisa en portada que sin declararla las apps nuevas no se
   pueden enviar para la Unión Europea.

Con esas dos hechas, el botón **«Añadir para revisión»** de la versión 1.0 ya
tiene todo lo demás relleno y el build asociado.

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
