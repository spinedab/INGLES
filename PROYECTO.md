# PROYECTO — Sistema integral de aprendizaje de inglés

## 1. Origen y motivación

Este proyecto materializa, en cuatro artefactos concretos, los principios y la evidencia recogidos en el **Tratado Enciclopédico sobre ESL/EFL** (15 secciones, ~12.000 palabras). El tratado consolida más de un siglo de investigación en lingüística aplicada, SLA, neurociencia y pedagogía. Los artefactos traducen esa base teórica en herramientas usables hoy.

## 2. Mapa tratado → implementación

| Sección del tratado | Aplicación en este proyecto |
|---------------------|------------------------------|
| §1 Historia de la enseñanza | Justifica abandono de GTM puro; mezcla CLT + TBLT + lexical approach + Dogme en webapp y tutor |
| §2.1 Krashen — Input Hypothesis | Lecturas graduadas i+1, podcasts ESL, listening en webapp |
| §2.2 Swain — Output Hypothesis | Tutor IA fuerza producción con recasts; webapp incluye prompts de escritura |
| §2.3 Long — Interaction Hypothesis | Tutor IA negocia significado, ofrece feedback correctivo |
| §2.4 Schmidt — Noticing | Tutor IA destaca formas (highlighting); webapp marca colocaciones |
| §2.5 Vygotsky / Lantolf — ZPD | Tutor IA gradúa scaffolding según respuestas del aprendiz |
| §2.8 Período crítico | Plan personal asume aprendiz adulto: estrategias metacognitivas explícitas |
| §3.6 Atención y noticing | Eye-catching highlighting en webapp, ejercicios de detección |
| §5.6 Nation — vocabulario | Listas High-Frequency (2k), AWL (570), por nivel CEFR en webapp |
| §5.7 Norris & Ortega — instrucción explícita | Explicaciones gramaticales breves + práctica en webapp |
| §6.3 MALL + §7 Tecnología | App web responsiva, tutor CLI |
| §8.1 CEFR | Niveles A1-C2 estructuran todo el currículo y contenidos |
| §9.1 Dörnyei — L2 motivational self | Plan personal incluye ejercicios de visualización del Ideal L2 Self |
| §9.4 Horwitz — FLCAS | Plan personal incluye autoevaluación de ansiedad y mitigaciones |
| §10.6 Norris & Ortega meta-análisis | Confirma diseño con instrucción explícita complementaria |
| §15.1 IA generativa | Tutor IA con Claude, conscientes de riesgos (over-reliance, hallucination) |

## 3. Decisiones arquitectónicas

### 3.1 Cero backend
La webapp es 100% estática (HTML/CSS/JS). El estado del aprendiz se persiste en `localStorage`. Razones:
- Privacidad: ningún dato sale del navegador.
- Portabilidad: corre offline tras la primera carga.
- Sostenibilidad: sin coste de servidor.

### 3.2 Tutor IA como CLI Python
El tutor es un script Python que invoca la API de Anthropic. Razones:
- Itera rápido sobre prompt engineering sin build pipeline.
- Es trivialmente extensible (logs, integraciones, automatización).
- El aprendiz controla el ritmo y el coste.

### 3.3 Sitio docs como HTML estático generado a mano
No usamos MkDocs/Docusaurus para evitar dependencias. Cada sección del tratado vive en un HTML autoconrtenido bajo `docs/secciones/`. Un `docs/index.html` orquesta la navegación.

### 3.4 Plan personal en Markdown
Documentos puros. Razón: la disciplina la pone el aprendiz, no la herramienta. Un Markdown abierto en cualquier editor (Obsidian, VS Code, iA Writer) basta.

## 4. Suposiciones sobre el aprendiz

- Adulto (>17 años) — por tanto fuera del período crítico clásico (§2.8). Compensa con metacognición explícita.
- Hispanohablante L1. Aprovecha cognados (~30% del vocabulario académico inglés es de origen latino).
- Acceso a internet y a un ordenador. Smartphone deseable para MALL.
- 30-90 min/día disponibles para inglés. La rutina mínima asume 30 min; la óptima 90 min.
- Nivel de partida desconocido; el sistema incluye un test de posicionamiento informal.

## 5. Criterios de éxito (a 6 meses)

| Métrica | Meta mínima | Meta óptima |
|---------|-------------|-------------|
| Vocabulario receptivo (CEFR Vocabulary Size Test) | +1.500 familias | +3.000 familias |
| Listening: comprensión podcasts ESL nivel intermedio sin transcripción | 70% | 90% |
| Reading: graded reader B1 sin diccionario en <2x tiempo nativo | sí | sí |
| Writing: 300 palabras coherentes sobre tema familiar | sí | sí (sin errores básicos) |
| Speaking: 5 min monólogo grabado, tema familiar, comprensible | sí | sí (fluido, sin pausas largas) |
| Tests estandarizados (estimación, no obligatorio) | A2→B1 según CEFR | B1→B2 |

## 6. Riesgos identificados

1. **Sobreuso del tutor IA** → atrofia del esfuerzo cognitivo (§15.1). Mitigación: el tutor obliga a producción antes de revelar respuestas, fuerza pausas, pide auto-corrección.
2. **Fosilización temprana** (§2.7). Mitigación: feedback correctivo persistente sobre 5-10 estructuras prioritarias por nivel.
3. **Ansiedad** (§9.4). Mitigación: tutor en texto antes que voz; rutinas suaves los primeros 14 días.
4. **Plateau B1→B2** (§4.5, recomendaciones). Mitigación: lectura extensiva forzada, pushed output, contenidos especializados.
5. **Pseudo-aprendizaje por gamificación** (Duolingo y similares producen menos transferencia a uso real). Mitigación: nuestra webapp prioriza textos reales sobre gamificación; el tutor IA simula interacción auténtica.

## 7. Lo que este proyecto NO hace

- No sustituye interacción con humanos (Kuhl 2003: social gating). Recomienda explícitamente Italki/Preply/Tandem.
- No certifica niveles. Para certificación oficial: IELTS/TOEFL/Cambridge/DET (§8.3).
- No enseña pronunciación con detección automática (requeriría ASR especializado fuera de scope).
- No genera contenido nuevo automáticamente: el contenido del webapp está curado a mano para garantizar calidad.

## 8. Mantenimiento

El proyecto está pensado como **sistema cerrado y suficiente**: una vez creado, no requiere mantenimiento. Las dependencias externas mínimas (Anthropic API en el tutor) son aisladas. Los contenidos del webapp pueden ampliarse editando JSON en `webapp/content/`.
