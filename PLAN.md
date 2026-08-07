# PLAN — Implementación detallada

## Visión general

El plan original eran cinco fases secuenciales, optimizadas para producir valor
temprano. Las cinco están hechas. Después el proyecto creció con tres fases más
que no estaban previstas aquí, y este documento se quedó atrás: describía cinco
fases cuando el README ya listaba siete subproyectos.

```
F0  Documentación raíz                        [HECHO]
F1  Plan personal                             [HECHO]
F2  Sitio de documentación del tratado        [HECHO]
F3  App web de aprendizaje                    [HECHO]
F4  Tutor IA conversacional                   [HECHO]
F5  App móvil + web (Expo + React Native)     [HECHO — mobile/, iOS y Android]
F6  API del tutor como servicio               [HECHO — api/, FastAPI, en producción]
F7  Publicación                               [HECHO — web; iOS a falta de dos
                                                declaraciones del titular]
```

Estado actual del contenido, que es lo que más ha cambiado respecto al plan:

| Módulo | Plan original | Ahora |
|---|---|---|
| Vocabulario | ~500/nivel de semilla, 2.000 objetivo | **1.213** (a1 308, a2 304, b1 300, b2 301) |
| Gramática | 20-30 ejercicios | **23 temas, 120 ejercicios** |
| Lecturas | 4-6 por nivel | 15 (4/4/4/3) |
| Listening | sin número fijo | 8, reproducibles con TTS del sistema |

## Fase 0 — Documentación raíz (HECHO)

Entregables:
- `README.md` — entrada y arranque rápido.
- `PROYECTO.md` — fundamentación y decisiones.
- `PLAN.md` — este documento.

Criterio de aceptación: los tres archivos existen y son coherentes entre sí.

## Fase 1 — Plan personal de aprendizaje

### Entregables

```
plan-personal/
├── README.md                     # Cómo usar el plan
├── 01-curriculo-6-meses.md       # Currículo A1→B2 por mes
├── 02-rutina-diaria.md           # 3 rutinas: 30/60/90 min
├── 03-semana-tipo.md             # 7 días planificados
├── 04-recursos-curados.md        # Apps, libros, podcasts, canales
├── 05-tracker-progreso.md        # Plantilla para llevar registro
├── 06-test-posicionamiento.md    # Auto-test inicial
└── anki/
    ├── README.md                 # Cómo importar a Anki
    ├── top2000-a1a2.tsv          # 2.000 palabras alta frecuencia
    └── awl-b1b2.tsv              # Academic Word List
```

### Decisiones

- **Formato Markdown**: editable desde cualquier app, perdurable.
- **Anki TSV en lugar de .apkg**: TSV es texto, versionable, sin dependencias propietarias. Anki importa TSV nativo.
- **Vocabulario de partida**: combinamos GSL/NGSL (Browne, 2013) para 2.000 alta frecuencia, AWL (Coxhead, 2000) para nivel académico.

### Criterio de aceptación

Un aprendiz adulto hispanohablante puede leer `plan-personal/README.md` y empezar a estudiar el día 1 sin pedir más información.

## Fase 2 — Sitio de documentación

### Entregables

```
docs/
├── index.html                    # Portada con índice y búsqueda
├── style.css                     # Estilos compartidos
├── search.js                     # Búsqueda client-side
└── secciones/
    ├── 01-historia.html          # §1 Historia (gramática-trad → post-método)
    ├── 02-teorias-sla.html       # §2 Teorías de SLA
    ├── 03-neurociencia.html      # §3 Neurociencia
    ├── 04-edades.html            # §4 Aprendizaje por edades
    ├── 05-destrezas.html         # §5 Cuatro destrezas
    ├── 06-metodologias.html      # §6 Metodologías contemporáneas
    ├── 07-tecnologia.html        # §7 Tecnología y apps
    ├── 08-evaluacion.html        # §8 Evaluación y certificaciones
    ├── 09-factores.html          # §9 Factores individuales
    ├── 10-estudios.html          # §10 Estudios canónicos
    ├── 11-programas.html         # §11 Programas e instituciones
    ├── 12-sociocultural.html     # §12 Sociocultural y crítico
    ├── 13-esp.html               # §13 ESP/EAP
    ├── 14-recursos.html          # §14 Recursos y materiales
    ├── 15-tendencias.html        # §15 Tendencias 2020-2026
    └── recomendaciones.html      # Recomendaciones + caveats
```

### Decisiones

- **HTML escrito a mano** (no MkDocs): control total, cero dependencias.
- **Búsqueda client-side**: índice JSON precomputado + filtro en JS, sin servidor.
- **Tipografía legible**: `system-ui` + 18px base + line-height 1.6. Inspirado en Stripe Press.
- **Navegación**: barra superior con secciones + sidebar con TOC intra-sección.

### Criterio de aceptación

Abrir `docs/index.html` con doble-click muestra una portada navegable; cualquier sección se abre en <100ms; la búsqueda encuentra "Krashen", "noticing", "Bialystok".

## Fase 3 — App web de aprendizaje

### Arquitectura

```
webapp/
├── index.html                    # Shell de la SPA
├── css/
│   └── app.css                   # Estilos
├── js/
│   ├── app.js                    # Router y bootstrap
│   ├── srs.js                    # Algoritmo SM-2
│   ├── storage.js                # Wrapper de localStorage
│   ├── flashcards.js             # Módulo de flashcards
│   ├── reading.js                # Módulo de lectura graduada
│   ├── listening.js              # Módulo de listening
│   └── grammar.js                # Ejercicios gramaticales
└── content/
    ├── vocab/
    │   ├── a1.json               # ~500 cards
    │   ├── a2.json               # ~500 cards
    │   ├── b1.json               # ~500 cards
    │   └── b2.json               # ~500 cards
    ├── lecturas/
    │   ├── a1-01.json            # Texto + glosario + preguntas
    │   ├── a1-02.json
    │   ├── ... (varios por nivel)
    └── listening/
        ├── a1-01.json            # Script + URL audio + preguntas
        └── ...
```

### Algoritmo SRS (SM-2 modificado)

Implementamos SuperMemo-2 (Wozniak, 1985) con quality scale 0-5:
- `easiness factor` (EF) inicial 2.5, ajustado tras cada review.
- `interval` en días: 1, 6, EF·interval...
- Reset a 1 día si quality < 3.
- Persistencia: `localStorage['srs:cardId'] = {ef, interval, due, reps}`.

### Decisiones de contenido

- **Vocabulario**: extraído de listas estándar (GSL, NGSL, AWL) con definición + ejemplo en contexto + traducción ES (campo de respaldo, no es el primer plano).
- **Lecturas**: textos cortos (150-400 palabras), tema cotidiano, con preguntas de comprensión + colocaciones destacadas.
- **Listening**: enlaces a VOA Learning English / BBC 6-Minute English (dominio público para textos en algunos casos; URLs externas para audio). El script se muestra después de la primera escucha (input → output según Field 2008).
- **Gramática**: 20-30 ejercicios focalizados en errores frecuentes de hispanohablantes (present perfect vs. past simple; do-support; word order; phrasal verbs).

### Decisiones técnicas

- **Vanilla JS, ES modules**: cero build, abre con doble-click.
- **Sin framework**: la app es simple, un framework sería overhead.
- **CSS variables + grid**: layout responsive, dark mode auto.
- **i18n mínima**: UI en español (target hispanohablante), contenido en inglés.

### Criterio de aceptación

1. Abrir `webapp/index.html` muestra dashboard con 4 módulos.
2. Flashcards: revisar 20 cards, refrescar la página, las cards siguen el orden SRS.
3. Reading: leer un texto, responder preguntas, ver feedback.
4. Listening: cargar audio externo, ver script tras escuchar.
5. Persistencia: localStorage retiene progreso entre sesiones.

## Fase 4 — Tutor IA conversacional

### Entregables

```
tutor-ia/
├── README.md                     # Cómo usar
├── requirements.txt              # anthropic, rich
├── tutor.py                      # CLI principal (integra toda la lógica de lección)
├── system_prompt.md              # Prompt del tutor (encoda la progresión CEFR)
├── escenarios.json               # Catálogo de role-plays
└── data/
    └── sesiones.jsonl            # Log de sesiones (creado en runtime)
```

> Nota de implementación: el diseño original contemplaba `lecciones/lesson_runner.py`
> y `lecciones/progresion.json` como módulos separados. Se refactorizó a una
> arquitectura simplificada: `tutor.py` integra la lógica de lección y la
> progresión CEFR vive en `system_prompt.md` (sección "CEFR calibration").
> Además, el tutor fue portado a servicio HTTP en `api/` (FastAPI + Redis)
> para integrarlo con las apps web/móvil.

### Diseño pedagógico del tutor

El system prompt encoda:
1. **Identidad**: "tutor de inglés basado en evidencia", explica en español si el aprendiz lo pide.
2. **Adaptación CEFR**: el tutor pregunta el nivel y modera su input (i+1).
3. **Output forzado**: tras cada turno del aprendiz, el tutor (a) confirma comprensión, (b) reformula con un recast si hay error, (c) plantea pregunta de seguimiento que requiere producción.
4. **Noticing explícito**: al final de cada bloque de 6 turnos, el tutor lista 3 "items a notar" (colocaciones, formas erróneas, vocabulario nuevo).
5. **Anti-over-reliance**: el tutor se niega a "hacer la tarea" del aprendiz; le pide intentar primero.
6. **Auto-evaluación**: al cerrar sesión, el aprendiz puntúa su esfuerzo y confianza (1-5).

### Modos

- `tutor.py conversation [nivel]` — conversación libre adaptada al nivel.
- `tutor.py roleplay <escenario>` — role-plays predefinidos (entrevista, restaurante, médico...).
- `tutor.py grammar <tema>` — explicación + práctica de un punto gramatical.
- `tutor.py review` — repaso de items notados en sesiones previas.

### Persistencia

Cada sesión se guarda en `data/sesiones.jsonl` (una línea JSON por sesión) con:
- timestamp, modo, nivel, duración, número de turnos.
- "items_to_notice" detectados.
- auto-evaluación del aprendiz.

`tutor.py review` lee este log para reciclar items.

### Decisiones técnicas

- **Streaming**: usamos `stream=True` para que las respuestas aparezcan token a token.
- **Model**: `claude-opus-4-7` o `claude-sonnet-4-6` según preferencia (Sonnet más barato; Opus más fino en pedagogía sutil).
- **Prompt caching**: el system prompt se cachea (>4k tokens). Beneficio: 90% reducción coste en sesiones largas.
- **Rich** para la TUI: colores, paneles, prompt interactivo.

### Criterio de aceptación

1. `python tutor.py conversation a2` arranca conversación; tutor saluda en inglés sencillo.
2. Si el aprendiz comete error gramatical, el tutor incluye recast natural y continúa.
3. Cada 6 turnos aparece un resumen "Notice these 3 items".
4. La sesión se guarda y `tutor.py review` recupera los items.

## Cronograma de ejecución (en esta sesión)

| Bloque | Fase | Entregable principal |
|--------|------|----------------------|
| 1 | F1 | 7 archivos en `plan-personal/` |
| 2 | F2 | 17 archivos HTML + CSS + JS en `docs/` |
| 3 | F3 | App webapp funcional con 4 módulos |
| 4 | F4 | Tutor IA con 4 modos |

## Tradeoffs aceptados conscientemente

- **No tests unitarios**: los criterios de aceptación siguen siendo manuales. Lo
  que sí hay es validación del contenido, que es donde de verdad se rompen las
  cosas: `tools/build_vocab.py --check` y `tools/build_grammar.py --check` fallan
  si un `answer` sale del rango de opciones, si falta un campo o si los ficheros
  generados están desincronizados de la fuente. Corren en CI.
- ~~**No CI/CD**: sistema local, no se despliega.~~ **Obsoleto**: el sistema se
  despliega en `ingles.nexocloud.co` (ver [`deploy/`](deploy/)) y hay un workflow
  que valida el contenido en cada push.
- **Contenido**: ya no es una semilla. 1.213 cards con SRS, 23 temas de gramática
  y 15 lecturas. El objetivo de 2.000/nivel de más abajo sigue abierto.
- **Tutor IA monolingüe (responde inglés por defecto)**: traducciones puntuales si se piden, pero el principio es maximizar input en L2.
- **Sin sincronización entre dispositivos**: localStorage es por navegador. Quien quiera multi-device puede exportar/importar JSON manualmente.

## Próximos pasos

Hechos desde la versión anterior de esta lista:

- ~~Integrar audio con TTS local~~ → hecho, pero con TTS **en tiempo de
  ejecución** (`expo-speech` en móvil, `speechSynthesis` en web) en vez de audio
  pregenerado: no pesa en el bundle, funciona sin conexión y no depende de
  enlaces externos, que es justo lo que estaba roto.
- ~~Conectar tutor IA con webapp~~ → hecho. La webapp tiene la vista `#/tutor` y
  el móvil `lib/tutorApi.ts`, ambos contra `tutor.apicloud.lat`.

Abiertos:

- Ampliar vocabulario hasta 2.000 por nivel (van 300+; ver `content/vocab/`).
- Más lecturas — objetivo 50 por nivel para lectura extensiva real (van 15).
- Sincronización entre dispositivos: hoy el progreso es local por diseño.
- Publicar la app de Android en Play: el AAB existe pero nunca se subió, y
  `native/android/` no está versionado, así que el wrap no es reproducible desde
  el repo.
