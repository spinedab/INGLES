# Decks de Anki

Decks de vocabulario para importar en Anki. Formato TSV (tab-separated values), 5 campos por línea:

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

### `top2000-a1a2.tsv`
~250 palabras del rango de las 2.000 más frecuentes (cubre ~80% del inglés cotidiano). Base imprescindible para A1-A2.

### `awl-b1b2.tsv`
~120 palabras del Academic Word List (Coxhead, 2000). Cubre vocabulario académico que aparece en >3 ramas del conocimiento. Útil para B1-B2 con objetivos académicos.

## Decks complementarios recomendados

Para crecer más allá de estos, descarga desde [AnkiWeb shared decks](https://ankiweb.net/shared/decks/):
- "4000 Essential English Words" (Paul Nation, 6 niveles).
- "Academic Word List" deck completo.
- "Phrasal Verbs Top 200".

## Personalización avanzada

- **Audio**: añade audio TTS con AwesomeTTS (add-on de Anki).
- **Imágenes**: complementa cards con imágenes (memoria visual).
- **Cards propias**: cada vocabulario que encuentres en tus lecturas/listenings, créale una card. Cards autoproducidas se aprenden 30-50% más rápido que decks ajenos.
