# Ficha de App Store — Tutor Inglés IA

Textos de la ficha. La 1.1 está a la venta con los textos anteriores; estos son
los de la **1.2**, que corrige la descripción (ver abajo). En App Store Connect la
descripción y las notas de versión solo se cambian con una versión nueva; el texto
promocional se edita en cualquier momento.

- **App ID**: 6798352342
- **Bundle ID**: com.spinedab.ingles
- **SKU**: INGLES-IOS-001
- **Idioma principal**: es-ES (cambiable a es-MX una vez subidas las capturas de ese idioma)

Las cifras de abajo son las reales (tabla de volumen en
[`content/README.md`](../../content/README.md)): inglés 1213 tarjetas, 23 temas
de gramática con 120 ejercicios, 15 lecturas y 8 listenings; portugués, francés,
italiano y mandarín 500 tarjetas, 8 temas, 4 lecturas y 2 listenings cada uno.
Si amplías el contenido, actualiza también este fichero — prometer más de lo que
hay es motivo de rechazo en revisión (guideline 2.3, *Accurate Metadata*).

> **Por qué la 1.2 cambia la descripción.** La de la 1.0/1.1 vendía una app solo
> de inglés con las cifras de la 1.0 (505 tarjetas, 4 listenings, 5 bloques) y
> prometía un tutor conversacional que la app móvil **no tiene**: el tutor vive en
> la versión web (`#/tutor`). La app no hace peticiones de red con datos del
> usuario, que es justo lo que declara App Privacy («No se recopilan datos»).

---

## Nombre (30 caracteres máx.)

```
Tutor Inglés IA
```

## Subtítulo (30 caracteres máx.)

```
5 idiomas con base científica
```
(29 caracteres; hasta la 1.1 era «Inglés con base científica»)

## Texto promocional (170 caracteres máx., editable sin revisión)

```
Inglés, portugués, francés, italiano y mandarín sin rachas que castigan ni vidas que se agotan: repaso espaciado, lecturas graduadas y listening.
```
(145 caracteres)

## Descripción (4.000 caracteres máx.)

```
Aprende inglés, portugués, francés, italiano o chino mandarín desde el español, con métodos que tienen respaldo en la investigación y no en la ludificación.

La mayoría de las apps de idiomas están diseñadas para que vuelvas cada día, no para que aprendas. Tutor Inglés IA hace lo contrario: aplica cinco principios del consenso en adquisición de segundas lenguas y se quita de en medio.

EN QUÉ SE BASA

• Input comprensible (Krashen): lecturas graduadas a un nivel ligeramente por encima del tuyo, con glosas al toque y colocaciones resaltadas.
• Output significativo (Swain): el coach de escritura te pide producir, no reconocer.
• Atención consciente a la forma (Schmidt): cada tema de gramática termina con los puntos concretos que conviene notar.
• Contraste con el español: cada idioma se escribió partiendo de los errores típicos de un hispanohablante, no traduciendo el contenido del inglés.
• Andamiaje (Vygotsky): el nivel se ajusta a lo que ya puedes hacer.

CINCO IDIOMAS, CUATRO NIVELES

• Inglés: 1.213 tarjetas de vocabulario de A1 a B2, seleccionadas de listas de frecuencia (GSL/NGSL) y de la Academic Word List; 23 temas de gramática con 120 ejercicios; 15 lecturas graduadas y 8 ejercicios de listening.
• Portugués de Brasil, francés, italiano y mandarín: 500 tarjetas cada uno de A1 a B2, 8 temas de gramática con ejercicios, 4 lecturas graduadas y 2 ejercicios de listening.
• Lo que más cuesta a un hispanohablante en cada idioma: falsos amigos y futuro do subjuntivo en portugués, artículos partitivos en francés, dobles consonantes y congiuntivo en italiano, y tonos, clasificadores y pinyin en mandarín.

QUÉ INCLUYE

• Repaso espaciado con SM-2, el algoritmo de SuperMemo. Cada tarjeta reaparece justo cuando estás a punto de olvidarla. Cada idioma lleva su propio progreso.
• Lecturas con preguntas de comprensión, glosario y colocaciones marcadas.
• Listening con la voz del sistema en el idioma que estudias y transcripción que se revela cuando decides.
• Coach de escritura y de shadowing (en inglés), con comparación de tu producción frente al modelo.
• Cuaderno léxico para lo que encuentres por tu cuenta. Las palabras que anotas tú se aprenden más rápido que las de un mazo ajeno.
• Test de posicionamiento inicial para no empezar en el nivel equivocado.
• Búsqueda global sobre todo el contenido.

LO QUE NO VAS A ENCONTRAR

• Rachas que te hagan sentir culpable por un día libre.
• Vidas, gemas ni monedas.
• Notificaciones para manipularte y que abras la app.
• Ejercicios de traducción palabra por palabra.

FUNCIONA SIN CONEXIÓN

Todo el contenido va dentro de la app y funciona sin conexión.

TU PROGRESO ES TUYO

No hay cuentas ni registro. El progreso vive en tu iPhone, no sale de él, y puedes exportarlo cuando quieras.

INTERFAZ EN ESPAÑOL

Las explicaciones están en español porque entender la regla en tu lengua ahorra tiempo. El contenido está en el idioma que eliges, porque es donde se aprende.
```

## Notas de la versión 1.2

```
Correcciones de contenido y de funcionamiento en los cinco idiomas.

• Las glosas de las lecturas ya aparecen en mandarín y en las palabras que empiezan o terminan con tilde.
• En los listening de mandarín, la voz ya no lee el pinyin ni los nombres de los personajes.
• La búsqueda y la pantalla Aprender se actualizan al cambiar de idioma.
• Exportar tus datos abre el menú de compartir del sistema.
• Erratas y explicaciones corregidas en vocabulario y gramática de portugués, francés e italiano.
```

## Palabras clave (100 caracteres máx., separadas por comas, sin espacios)

```
ingles,portugues,frances,italiano,chino,vocabulario,flashcards,gramatica,srs,anki,lectura,cefr
```
(94 caracteres)

> Nota: no repitas el nombre de la app ni el subtítulo en las keywords — Apple ya
> indexa ambos, y duplicar desperdicia caracteres. Tampoco uses marcas de
> terceros (Duolingo, Babbel…): es causa de rechazo.

## URL de soporte (obligatoria)

```
https://ingles.nexocloud.co/
```

## URL de marketing (opcional)

```
https://ingles.nexocloud.co/
```

> Canónica es `ingles.nexocloud.co` (hosting propio: landing en `/`, webapp en
> `/webapp/` y export de Expo en `/app/`). Ver [`deploy/`](../../deploy/).
>
> `https://spinedab.github.io/INGLES/` sigue vivo y sirve la misma webapp; vale
> como respaldo si el hosting no estuviera disponible cuando envíes. Comprueba
> que la que pegues responda 200 antes de enviar: Apple valida las URLs.

## Categorías

- **Principal**: Educación
- **Secundaria**: Referencia

## Clasificación por edades

Sin contenido objetable. Responder «Ninguno» a todo. La app no tiene chat con IA
(el tutor está solo en la web), así que no hay texto generado en la app. Un matiz:

- **Redes sociales**: responder **no** a las nuevas preguntas de clasificación —
  la app no tiene perfiles, ni feed, ni contacto entre usuarios.

Clasificación esperada: **4+**.

## Derechos de copyright

```
2026 Santiago Pineda Botero
```

---

## Notas para el equipo de revisión

```
La app no requiere cuenta ni inicio de sesión. Todo el contenido de estudio (vocabulario, lecturas, listening y gramática de inglés, portugués, francés, italiano y mandarín) está incluido en el binario y funciona sin conexión. La app no envía datos del usuario a ningún servidor.

La pestaña "Coach" es un coach local de escritura y shadowing: compara el texto del usuario con un modelo sin salir del dispositivo. No hay chat con IA en la app, ni comunicación entre usuarios, ni contenido publicado por usuarios.

Para probar: al abrir la app se muestra un test de posicionamiento de 8 preguntas. Se puede responder cualquier cosa; al terminar se accede a las cinco pestañas. El idioma de estudio se cambia en Aprender o en Perfil. No hay compras dentro de la app.
```

## Cuestionario de App Privacy

Respondido y publicado en *Distribución → Privacidad de la app*: **«No, no
recopilamos datos de esta app»**. Es exacto porque la app no hace peticiones de
red con datos del usuario: el progreso, el SRS y el cuaderno léxico viven en
AsyncStorage local y nunca salen del dispositivo, y el tutor (que sí envía los
mensajes a `tutor.apicloud.lat`) solo existe en la versión web.

> Si algún día se añade el tutor a la app, esta respuesta deja de ser cierta y
> hay que declarar «Otros datos de usuario» (funcionalidad, no vinculado a la
> identidad, sin seguimiento) **antes** de publicar esa versión.

### URL de política de privacidad (obligatoria)

```
https://ingles.nexocloud.co/privacidad.html
```

La página está escrita y versionada en [`privacidad.html`](../../privacidad.html)
(raíz del repo). Se publica por dos vías, y **hay que verificar 200 antes de
pegarla** porque Apple la comprueba y rechaza el envío si da 404:

| URL | Cómo se publica | Estado |
|---|---|---|
| `https://ingles.nexocloud.co/privacidad.html` | `dream-admin/scripts/deploy-ingles.sh` | Publicada (HTTP 200, comprobado el 2026-10-19) |
| `https://spinedab.github.io/INGLES/privacidad.html` | Merge a `main` → GitHub Pages | Respaldo; Pages ya sirve el repo |

```bash
curl -sI https://ingles.nexocloud.co/privacidad.html | head -1
```
