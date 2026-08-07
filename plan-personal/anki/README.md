# Decks de Anki

Decks de vocabulario para importar en Anki, uno por nivel CEFR.

> **Estos ficheros se generan, no se editan.** Salen de la fuente canónica
> `content/vocab/<nivel>.tsv` (raíz del repo) vía `python3 tools/build_vocab.py`,
> el mismo comando que alimenta los decks de la webapp y de la app móvil. Si
> editas un `vocab-*.tsv` a mano, el siguiente build sobreescribe el cambio.

Formato TSV (tab-separated values), 5 campos por línea:

| Campo | Contenido |
|-------|-----------|
| 1 (Front) | Palabra en inglés + categoría gramatical |
| 2 (Back) | Definición en inglés básico |
| 3 (Example) | Frase de ejemplo en contexto |
| 4 (Translation) | Traducción al español (campo de respaldo) |
| 5 (Tags) | Etiquetas (frecuencia, tema, nivel CEFR) |

## Cómo importar a Anki

1. Abre Anki (versión escritorio).
2. **File → Import**.
3. Selecciona el archivo `.tsv`.
4. En el diálogo de importación:
   - **Type**: "Basic (and reversed card)" o crea un nuevo *note type* con 4 campos: Front, Back, Example, Translation.
   - **Deck**: créalo nuevo con el nombre del fichero.
   - **Field separator**: Tab.
   - **Field 1 → Front, Field 2 → Back, Field 3 → Example, Field 4 → Translation**.
   - **Allow HTML in fields**: marca SÍ.
   - **Tags**: campo 5.
5. Click *Import*.

## Cómo estudiar

- **Cards nuevas/día**: 15-25 cards al principio; subir a 30-40 cuando te sientas cómodo. Más de 50 cards/día es contraproducente (Wozniak, 1985).
- **Reviews/día**: deja que el algoritmo decida. Si te sales del rango ±10% durante 2 semanas, ajusta intervalos.
- **Tiempo total**: 10-25 min/día. Si pasas más de 30 min, hay backlog: reduce cards nuevas hasta que se equilibre.
- **Honestidad en el rating**:
  - Again (1): no me vino la palabra.
  - Hard (2): me vino, pero con esfuerzo.
  - Good (3): bien, fluida.
  - Easy (4): inmediata, casi insultantemente fácil. Usar con moderación (alarga intervalos demasiado rápido).

## Estrategia de uso

1. **Pre-Anki**: encuentra la palabra en un texto/audio (input real), no aislada.
2. **Anki**: confírmala con SRS.
3. **Post-Anki**: úsala en producción (output) en una frase propia durante la semana.

Sin pre y post, Anki por sí solo produce *paper vocabulary* — palabras que reconoces pero no usas.

## Decks incluidos

Un deck por nivel, con exactamente el mismo contenido que estudia la app (misma
fuente). Las palabras llevan tags de procedencia (`top100`, `awl`, `sublist1`…),
así que puedes filtrar dentro de un deck con búsquedas de Anki como `tag:awl`.

| Deck | Cards | Contenido |
|------|-------|-----------|
| `vocab-a1.tsv` | 175 | Núcleo de altísima frecuencia (rango top-1000, GSL/NGSL). Lo imprescindible. |
| `vocab-a2.tsv` | 100 | Rango top-1000/2000 más chunks y phrasal verbs de uso diario. |
| `vocab-b1.tsv` | 154 | Salto a vocabulario académico: mayoría de Academic Word List (Coxhead, 2000). |
| `vocab-b2.tsv` | 76 | AWL de sublistas altas, registro formal y algunas entradas C1. |

Total: 505 cards. Es una base, no un objetivo: `PLAN.md` apunta a 2.000 por
nivel. Para ampliar, añade filas a `content/vocab/<nivel>.tsv` y regenera.

> Los ficheros anteriores `top2000-a1a2.tsv` y `awl-b1b2.tsv` se retiraron: sus
> nombres prometían 2.000 y 570 palabras cuando tenían 257 y 177, y su contenido
> está íntegro en los decks por nivel de arriba.

## Decks complementarios recomendados

Para crecer más allá de estos, descarga desde [AnkiWeb shared decks](https://ankiweb.net/shared/decks/):
- "4000 Essential English Words" (Paul Nation, 6 niveles).
- "Academic Word List" deck completo.
- "Phrasal Verbs Top 200".

## Personalización avanzada

- **Audio**: añade audio TTS con AwesomeTTS (add-on de Anki).
- **Imágenes**: complementa cards con imágenes (memoria visual).
- **Cards propias**: cada vocabulario que encuentres en tus lecturas/listenings, créale una card. Cards autoproducidas se aprenden 30-50% más rápido que decks ajenos.
