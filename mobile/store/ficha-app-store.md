# Ficha de App Store — Tutor Inglés IA

Textos listos para pegar en App Store Connect → Distribución → iOS 1.0.

- **App ID**: 6798352342
- **Bundle ID**: com.spinedab.ingles
- **SKU**: INGLES-IOS-001
- **Idioma principal**: es-ES (cambiable a es-MX una vez subidas las capturas de ese idioma)

Las cifras de abajo son las reales del contenido incluido a día de hoy (505
cards, 15 lecturas, 4 listenings, 5 bloques de gramática). Si amplías el
contenido, actualiza también este fichero — prometer más de lo que hay es
motivo de rechazo en revisión (guideline 2.3, *Accurate Metadata*).

---

## Nombre (30 caracteres máx.)

```
Tutor Inglés IA
```

## Subtítulo (30 caracteres máx.)

```
Inglés con base científica
```
(25 caracteres)

## Texto promocional (170 caracteres máx., editable sin revisión)

```
Sin rachas que te castiguen ni vidas que se agotan. Vocabulario con repaso espaciado, lecturas graduadas y un tutor que te corrige de verdad.
```
(139 caracteres)

## Descripción (4.000 caracteres máx.)

```
Aprende inglés con métodos que tienen respaldo en la investigación, no en la ludificación.

La mayoría de las apps de idiomas están diseñadas para que vuelvas cada día, no para que aprendas. Tutor Inglés IA hace lo contrario: aplica cinco principios del consenso en adquisición de segundas lenguas y se quita de en medio.

EN QUÉ SE BASA

• Input comprensible (Krashen): lecturas graduadas a un nivel ligeramente por encima del tuyo, con glosas al toque y colocaciones resaltadas.
• Output significativo (Swain): el coach de escritura te pide producir, no reconocer.
• Interacción negociada (Long): el tutor reformula tus errores con recasts naturales en vez de cortarte la conversación.
• Atención consciente a la forma (Schmidt): al cerrar cada bloque, la app te lista los puntos concretos que conviene notar.
• Andamiaje (Vygotsky): el nivel se ajusta a lo que ya puedes hacer.

QUÉ INCLUYE

• 505 tarjetas de vocabulario repartidas en A1, A2, B1 y B2, con definición en inglés sencillo, ejemplo en contexto y traducción de respaldo. Seleccionadas de listas de frecuencia (GSL/NGSL) y de la Academic Word List.
• Repaso espaciado con SM-2, el algoritmo de SuperMemo. Cada tarjeta reaparece justo cuando estás a punto de olvidarla.
• 15 lecturas graduadas con preguntas de comprensión, glosario y colocaciones marcadas.
• 4 ejercicios de listening con transcripción, que se revela después de la primera escucha.
• 5 bloques de gramática centrados en los errores frecuentes de hispanohablantes: present perfect frente a past simple, do-support, orden de palabras, condicionales y phrasal verbs.
• Coach de escritura y de shadowing, con comparación de tu producción frente al modelo.
• Cuaderno léxico para lo que encuentres por tu cuenta. Las palabras que anotas tú se aprenden más rápido que las de un mazo ajeno.
• Test de posicionamiento inicial para no empezar en el nivel equivocado.
• Búsqueda global sobre todo el contenido.

LO QUE NO VAS A ENCONTRAR

• Rachas que te hagan sentir culpable por un día libre.
• Vidas, gemas ni monedas.
• Notificaciones para manipularte y que abras la app.
• Ejercicios de traducción palabra por palabra.

FUNCIONA SIN CONEXIÓN

Todo el contenido va dentro de la app y tu progreso se guarda en el dispositivo. Solo se necesita conexión para conversar con el tutor.

TU PROGRESO ES TUYO

No hay cuentas ni registro. El progreso vive en tu iPhone y puedes exportarlo cuando quieras.

INTERFAZ EN ESPAÑOL, CONTENIDO EN INGLÉS

Las explicaciones están en español porque entender la regla en tu lengua ahorra tiempo. El contenido está en inglés porque es donde se aprende.
```

## Palabras clave (100 caracteres máx., separadas por comas, sin espacios)

```
ingles,aprender,vocabulario,flashcards,gramatica,srs,anki,lectura,listening,b2,cefr,tutor
```
(88 caracteres)

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

> Canónica es `ingles.nexocloud.co` (hosting propio, sitio completo con la
> webapp en `/` y el export de Expo en `/app/`). Ver [`deploy/`](../../deploy/).
>
> `https://spinedab.github.io/INGLES/` sigue vivo y sirve la misma webapp; vale
> como respaldo si el hosting no estuviera disponible cuando envíes. Comprueba
> que la que pegues responda 200 antes de enviar: Apple valida las URLs.

## Categorías

- **Principal**: Educación
- **Secundaria**: Referencia

## Clasificación por edades

Sin contenido objetable. Responder «Ninguno» a todo. Dos matices que sí aplican:

- **Contenido generado por IA / chat sin filtrar**: el tutor es un LLM y produce
  texto libre. Apple pregunta por funciones de chat; declara que **no** hay
  comunicación entre usuarios (no es un chat social, es un tutor). Sí conviene
  mencionar el filtrado en las notas de revisión.
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
La app no requiere cuenta ni inicio de sesión. Todo el contenido de estudio (vocabulario, lecturas, listening, gramática) está incluido en el binario y funciona sin conexión.

La pestaña "Coach" incluye un tutor conversacional. Envía el texto que escribe el usuario a nuestro propio servidor (https://tutor.apicloud.lat), que ejecuta un modelo de lenguaje alojado en infraestructura propia. No se envía ninguna información personal ni identificadores: solo el mensaje y el nivel CEFR seleccionado. El servidor no almacena historial asociado a personas.

El tutor está restringido por instrucciones de sistema a enseñanza de inglés y rechaza salirse de ese dominio. No hay comunicación entre usuarios ni contenido publicado por usuarios.

Para probar: al abrir la app se muestra un test de posicionamiento de 8 preguntas. Se puede responder cualquier cosa; al terminar se accede a las cinco pestañas. No hay compras dentro de la app.
```

## Cuestionario de App Privacy

Ir a **Privacidad de la app** y declarar:

| Pregunta | Respuesta |
|---|---|
| ¿Recopilas datos de esta app? | **Sí** (por el tutor; ver abajo) |
| Identificadores | No |
| Datos de uso | No |
| Diagnósticos | No |
| Ubicación, contactos, salud, finanzas, fotos | No |
| **Otros datos** → «Otros datos de usuario» | **Sí** |

Para «Otros datos de usuario»:

- **Uso**: Funcionalidad de la app.
- **¿Vinculado a la identidad del usuario?**: **No** (no hay cuentas).
- **¿Se usa para seguimiento (tracking)?**: **No**.
- Justificación: son los mensajes de texto que el usuario escribe voluntariamente
  al tutor, enviados para poder generar la respuesta pedagógica.

El resto (progreso, SRS, cuaderno léxico) **no se declara** porque nunca sale del
dispositivo: vive en AsyncStorage local.

### URL de política de privacidad (obligatoria)

```
https://ingles.nexocloud.co/privacidad.html
```

La página está escrita y versionada en [`privacidad.html`](../../privacidad.html)
(raíz del repo). Se publica por dos vías, y **hay que verificar 200 antes de
pegarla** porque Apple la comprueba y rechaza el envío si da 404:

| URL | Cómo se publica | Estado |
|---|---|---|
| `https://ingles.nexocloud.co/privacidad.html` | `dream-admin/scripts/deploy-ingles.sh` | Pendiente: el nodo no es alcanzable desde esta red (incidente del 2026-08-05) |
| `https://spinedab.github.io/INGLES/privacidad.html` | Merge a `main` → GitHub Pages | Respaldo; Pages ya sirve el repo |

```bash
curl -sI https://ingles.nexocloud.co/privacidad.html | head -1
```
