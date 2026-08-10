# native/ — wrap de Capacitor (SUPERSEDIDO)

> **No uses esto para publicar.** El Android que se publica se construye desde
> `mobile/` con Expo, igual que el de iOS. Ver [`mobile/ANDROID.md`](../mobile/ANDROID.md).

## Qué era

Capacitor 6 empaquetando el **export web** de `mobile/` dentro de un WebView,
para tener un AAB de Android sin tocar código nativo. Paquete
`com.spinedab.ingles`, targetSdk 35.

## Por qué se dejó de usar

Desde que `mobile/` compila Android de verdad con `expo prebuild`, este wrap es
estrictamente peor:

- Es una web en un WebView, no una app nativa: sin gestos nativos, sin el
  rendimiento de las listas, y el TTS depende del motor del navegador embebido en
  vez del del sistema.
- Duplica el camino de publicación. Dos artefactos para la misma tienda con el
  mismo `applicationId` es una fuente de errores garantizada.
- `android/` nunca se versionó, así que el AAB que había aquí **no era
  reproducible** desde el repo.

## El AAB que había aquí

Se retiró `dist/TutorInglesIA-release.aab`. Estaba fechado el 2026-07-29, o sea
**anterior** a: las 1.213 cards de vocabulario (había 154), los 23 temas de
gramática (había 5), las 15 lecturas y el arreglo del listening, que antes no
reproducía nada. Publicarlo habría subido a Play una versión mucho peor que la
actual, y su presencia invitaba a hacerlo.

Sigue en el historial de git si alguna vez hiciera falta:

```bash
git log --all --oneline -- native/dist/TutorInglesIA-release.aab
git show <commit>:native/dist/TutorInglesIA-release.aab > recuperado.aab
```

## Se conserva la carpeta porque

`capacitor.config.json` y `package.json` documentan cómo estaba montado el wrap,
por si algún día interesa un WebView para otra plataforma. No hace falta para
nada del flujo actual.
