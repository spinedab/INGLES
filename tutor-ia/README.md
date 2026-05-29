# Tutor IA conversacional

CLI Python que usa la API de Anthropic (Claude) como tutor de inglés. Aplica explícitamente los principios pedagógicos del [tratado](../docs/index.html): input comprensible, output forzado con recasts, noticing, scaffolding adaptado a la ZPD.

## Por qué es diferente de "hablar con ChatGPT"

Cuatro decisiones de diseño:

1. **Adaptación CEFR estricta**: el tutor calibra su producción al nivel del aprendiz (A1-C1). No usa vocabulario fuera de banda salvo señalado.
2. **Output forzado con recasts**: tras cada turno del aprendiz, el tutor (a) reformula el error sin sermonear, (b) hace una pregunta de seguimiento que requiere producción.
3. **Noticing explícito cada 6 turnos**: el tutor pausa la conversación y lista 3 items concretos a notar (colocaciones, formas erróneas, vocabulario nuevo).
4. **Anti-over-reliance**: el tutor se niega a "hacer la tarea" del aprendiz; pide intentarlo primero.

## Instalación

```bash
cd tutor-ia
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
export ANTHROPIC_API_KEY=sk-ant-...
```

(Si no tienes API key, ve a [console.anthropic.com](https://console.anthropic.com) y crea una. Hay créditos gratuitos al registrarse.)

## Uso

### Conversación libre

```bash
python tutor.py conversation --level a2
```

Inicia una conversación abierta adaptada a tu nivel. Escribe `quit` para salir. Cada 6 turnos verás un bloque "Notice these":

```
─── Notice these 3 items ───
• "I'm interested IN..." (no "ON")
• "make a decision" (no "take a decision")
• "spent" → past tense of "spend"
────────────────────────────
```

### Role-play

```bash
python tutor.py roleplay job-interview --level b1
```

Catálogo de escenarios en `escenarios.json`. Disponibles: `cafe`, `airport`, `doctor-visit`, `job-interview`, `apartment-rental`, `phone-call`, `restaurant-complaint`, `small-talk`.

### Gramática

```bash
python tutor.py grammar present-perfect --level b1
```

El tutor explica el punto con ejemplos B1-apropiados y luego practica contigo.

### Repasar items notados

```bash
python tutor.py review
```

Recicla los items que el tutor te marcó en sesiones previas. Vital para que el noticing se convierta en aprendizaje real.

## Niveles disponibles

| Nivel | Input del tutor | Output esperado del aprendiz |
|-------|----------------|------------------------------|
| a1 | Frases cortas SVO, vocabulario top 500, presente simple | Frases simples, vocabulario básico |
| a2 | Más conectores, pasado simple, futuro will/going to | Párrafos cortos, narración básica |
| b1 | Vocabulario medio, present perfect, condicionales 0-2 | Opiniones simples, descripciones detalladas |
| b2 | Vocabulario amplio, todas las estructuras, prensa simplificada | Argumentos coherentes, vocabulario académico básico |
| c1 | Lenguaje natural casi nativo | Discurso fluido, modulación de registro |

## Persistencia

Cada sesión queda registrada en `data/sesiones.jsonl` (una línea JSON por sesión):

```json
{"ts": "2026-05-20T10:30:00", "mode": "conversation", "level": "a2", "turns": 18, "items_to_notice": ["make/do collocations", "past simple irregulars"], "self_rating": {"effort": 4, "confidence": 3}}
```

El comando `review` lee este log.

## Costes estimados

Modelo por defecto: `claude-opus-4-7`. Una sesión de 30 minutos consume ~5.000-10.000 tokens, equivalente a $0,05-0,15 USD. Con `claude-sonnet-4-6` baja a $0,01-0,03.

Para minimizar coste:
- El system prompt se cachea automáticamente (90% reducción en sesiones largas).
- Cambia a Sonnet con `--model claude-sonnet-4-6`.

## Cómo NO usarlo

- **No le pidas que escriba tu ensayo por ti**. Te lo escribirá, pero no aprenderás. El tutor está configurado para resistir.
- **No saltes el bloque "Notice these"**. Es la parte donde el aprendizaje se consolida.
- **No lo uses como sustituto de un humano**. Es complementario. La interacción social humana (Kuhl 2003) es insustituible.

## Limitaciones conocidas

- No reconoce ni produce audio. Es texto puro.
- No detecta errores de pronunciación.
- Puede alucinar referencias culturales o gramaticales específicas — verifica con fuentes oficiales (Cambridge Dictionary, Murphy).
- El nivel CEFR no es perfecto; el tutor a veces se calibra mejor tras los primeros turnos.
