import * as storage from './storage.js';
import { logActivity } from './insights.js';

// Tópicos gramaticales focalizados en errores recurrentes de hispanohablantes.
export const TOPICS = [
  {
    id: 'present-perfect-vs-past',
    title: 'Present Perfect vs. Past Simple',
    level: 'b1',
    why: 'Error #1 de hispanohablantes: usar "I have eaten yesterday" cuando "yesterday" exige past simple. El present perfect implica conexión con el presente (sin tiempo definido); el past simple, tiempo cerrado.',
    rule: 'Past simple: tiempo determinado y cerrado (yesterday, last year, in 2019, ago). Present perfect: experiencia (ever, never), resultado presente, periodo no terminado (today, this week, since, for + período hasta ahora).',
    examples: [
      ['I lived in Madrid in 2015.', 'Past simple — tiempo cerrado.'],
      ['I have lived in Madrid since 2015.', 'Present perfect — desde entonces y aún continúa.'],
      ['Have you ever been to Japan?', 'Present perfect — experiencia de vida.'],
      ['I went to Japan last summer.', 'Past simple — momento concreto.'],
    ],
    exercises: [
      { q: 'I _____ John yesterday.', options: ['saw', 'have seen'], answer: 0 },
      { q: 'I _____ in this city for 10 years.', options: ['lived', 'have lived'], answer: 1 },
      { q: 'She _____ to Paris three times in her life.', options: ['went', 'has been'], answer: 1 },
      { q: 'We _____ dinner an hour ago.', options: ['had', 'have had'], answer: 0 },
      { q: '_____ you ever _____ sushi?', options: ['Did / try', 'Have / tried'], answer: 1 },
      { q: 'I _____ the new movie last weekend.', options: ['saw', 'have seen'], answer: 0 },
      { q: 'They _____ in their new house since March.', options: ['live', 'have lived'], answer: 1 },
      { q: 'When _____ you _____ here?', options: ['did / arrive', 'have / arrived'], answer: 0 },
    ],
  },
  {
    id: 'do-support',
    title: 'Do-support en preguntas y negaciones',
    level: 'a2',
    why: 'En español preguntamos "¿Tú comes carne?" sin auxiliar. En inglés se requiere "do/does" excepto con be y modales: "Do you eat meat?".',
    rule: 'Para presente simple: do (I, you, we, they) / does (he, she, it). Pasado simple: did para todos. El verbo principal en infinitivo SIN -s ni -ed: "Does he LIVE here?" (no "lives"). Excepciones: be, modal verbs (can, must, will, etc.), have got.',
    examples: [
      ['Do you speak English?', 'NO: "*Speak you English?"'],
      ['She doesn\'t like coffee.', 'NO: "*She not likes coffee."'],
      ['Did they arrive on time?', 'NO: "*Arrived they on time?"'],
      ['Is he a doctor?', 'Con "be" no hay do-support.'],
    ],
    exercises: [
      { q: '_____ you like pizza?', options: ['Are', 'Do', '—'], answer: 1 },
      { q: 'She _____ live in Madrid.', options: ['don\'t', 'doesn\'t', 'not'], answer: 1 },
      { q: '_____ he come yesterday?', options: ['Was', 'Did', 'Do'], answer: 1 },
      { q: 'They _____ work on Sundays.', options: ['don\'t', 'doesn\'t', 'aren\'t'], answer: 0 },
      { q: '_____ your sister speak French?', options: ['Is', 'Does', 'Do'], answer: 1 },
      { q: 'I _____ understand the question.', options: ['don\'t', 'am not', 'not'], answer: 0 },
    ],
  },
  {
    id: 'word-order',
    title: 'Orden de palabras: adjetivo + sustantivo',
    level: 'a1',
    why: 'En español "una casa roja", en inglés "a red house". El adjetivo SIEMPRE va antes del sustantivo en inglés.',
    rule: 'Adjetivo + sustantivo. Si hay varios: opinión → tamaño → edad → forma → color → origen → material → propósito. "A beautiful little old square brown wooden picture frame."',
    examples: [
      ['a red car', 'NO: "*a car red"'],
      ['expensive Italian shoes', 'opinión + origen'],
      ['the small black cat', 'tamaño + color'],
    ],
    exercises: [
      { q: 'Choose: "Tengo un coche nuevo y rápido."', options: ['I have a new fast car.', 'I have a car new and fast.', 'I have a fast new car.'], answer: 0 },
      { q: 'Choose: "Una casa grande y blanca"', options: ['A big white house', 'A white big house', 'A house big white'], answer: 0 },
      { q: 'Choose the correct sentence:', options: ['She wore a beautiful long red dress.', 'She wore a red long beautiful dress.', 'She wore a dress beautiful long red.'], answer: 0 },
    ],
  },
  {
    id: 'conditionals',
    title: '1ª, 2ª y 3ª condicional',
    level: 'b1',
    why: 'Cuatro patrones que muchos confunden. Decisión clave: ¿situación real, hipotética presente o hipotética pasada?',
    rule: '0ª: If + present, present (verdad general). 1ª: If + present, will (futuro real). 2ª: If + past, would (hipotético presente). 3ª: If + past perfect, would have + p.p. (hipotético pasado).',
    examples: [
      ['If you heat water, it boils.', '0ª — verdad.'],
      ['If it rains, I\'ll stay home.', '1ª — real futuro.'],
      ['If I had more money, I would travel.', '2ª — irreal presente.'],
      ['If I had studied harder, I would have passed.', '3ª — irreal pasado.'],
    ],
    exercises: [
      { q: 'If I _____ rich, I would buy a house.', options: ['am', 'were', 'have been'], answer: 1 },
      { q: 'If it _____ tomorrow, we\'ll cancel the picnic.', options: ['rains', 'will rain', 'rained'], answer: 0 },
      { q: 'If she had known, she _____ you.', options: ['would tell', 'would have told', 'will tell'], answer: 1 },
      { q: 'If you _____ ice, it melts.', options: ['heat', 'will heat', 'heated'], answer: 0 },
      { q: 'If I _____ you, I would apologize.', options: ['am', 'was', 'were'], answer: 2 },
    ],
  },
  {
    id: 'phrasal-verbs-core',
    title: 'Phrasal verbs esenciales',
    level: 'b1',
    why: 'No se pueden traducir literalmente. "Look up" puede significar "mirar arriba" o "buscar (en diccionario)" según contexto. Hay miles, pero ~200 cubren el uso diario.',
    rule: 'Separables (objeto entre verbo y partícula u después): "turn the light on / turn on the light". Inseparables: "look after the children" (no "*look the children after"). Memorizar como unidades.',
    examples: [
      ['Could you turn off the TV?', 'Separable.'],
      ['I look after my grandmother.', 'Inseparable.'],
      ['Find out what time it starts.', 'Inseparable, transitivo.'],
      ['She finally gave up smoking.', 'Inseparable.'],
    ],
    exercises: [
      { q: 'Please _____ your homework before dinner.', options: ['turn off', 'finish off', 'figure out'], answer: 1 },
      { q: 'I can\'t _____ this puzzle.', options: ['figure out', 'put up with', 'come across'], answer: 0 },
      { q: 'How do you _____ all this stress?', options: ['put up with', 'look up', 'turn into'], answer: 0 },
      { q: 'I ran _____ an old friend yesterday.', options: ['into', 'after', 'on'], answer: 0 },
      { q: 'We need to _____ a solution to this problem.', options: ['come up with', 'put off', 'take after'], answer: 0 },
    ],
  },
];

export async function renderGrammar(view, level) {
  const route = location.hash.replace(/^#\/grammar\/?/, '');
  if (!route) return renderIndex(view, level);
  const topic = TOPICS.find(t => t.id === route);
  if (!topic) {
    view.innerHTML = `<p>Tópico no encontrado.</p><a href="#/grammar">← Volver</a>`;
    return;
  }
  return renderTopic(view, topic);
}

function renderIndex(view, level) {
  view.innerHTML = `
    <h1>Gramática focalizada</h1>
    <p class="muted">Puntos críticos para hispanohablantes. Instrucción explícita (Norris &amp; Ortega 2000, d=0.96) + práctica con feedback inmediato.</p>
    <ul class="section-list">
      ${TOPICS.map(t => `
        <li class="section-card"><a href="#/grammar/${t.id}">
          <div class="num">Nivel ${t.level.toUpperCase()}</div>
          <div class="title">${escapeHtml(t.title)}</div>
          <div class="desc">${escapeHtml(t.why.slice(0, 130))}…</div>
        </a></li>
      `).join('')}
    </ul>
  `;
}

function renderTopic(view, topic) {
  view.innerHTML = `
    <p><a href="#/grammar">← Volver al índice</a></p>
    <h1>${escapeHtml(topic.title)}</h1>
    <p class="muted">Nivel ${topic.level.toUpperCase()}</p>

    <h2>¿Por qué importa?</h2>
    <p>${escapeHtml(topic.why)}</p>

    <h2>Regla</h2>
    <p>${escapeHtml(topic.rule)}</p>

    <h2>Ejemplos</h2>
    <ul>
      ${topic.examples.map(([s, comment]) => `
        <li><strong>${escapeHtml(s)}</strong> <span class="muted">— ${escapeHtml(comment)}</span></li>
      `).join('')}
    </ul>

    <h2>Práctica</h2>
    <div id="exercises"></div>
    <div id="score" style="display:none"></div>
  `;

  const exContainer = document.getElementById('exercises');
  const answers = new Array(topic.exercises.length).fill(null);
  topic.exercises.forEach((ex, i) => {
    const el = document.createElement('div');
    el.className = 'question';
    el.innerHTML = `
      <div class="q-text">${i + 1}. ${escapeHtml(ex.q)}</div>
      <div class="options">${ex.options.map((o, oi) => `<div class="opt" data-i="${oi}">${escapeHtml(o)}</div>`).join('')}</div>
    `;
    el.querySelectorAll('.opt').forEach(o => {
      o.addEventListener('click', () => {
        if (answers[i] != null) return;
        const pick = parseInt(o.dataset.i, 10);
        answers[i] = pick;
        el.querySelectorAll('.opt').forEach((other, oi) => {
          if (oi === ex.answer) other.classList.add('correct');
          if (oi === pick && oi !== ex.answer) other.classList.add('wrong');
        });
        checkAll();
      });
    });
    exContainer.appendChild(el);
  });

  function checkAll() {
    if (answers.every(a => a != null)) {
      const correct = answers.filter((a, i) => a === topic.exercises[i].answer).length;
      const score = document.getElementById('score');
      score.style.display = 'block';
      score.innerHTML = `<div class="stat-block"><div class="label">Tu puntuación</div><div class="value">${correct}/${topic.exercises.length}</div></div>`;
      storage.set(`grammar:score:${topic.id}`, { correct, total: topic.exercises.length, ts: Date.now() });
      logActivity('grammar_score', {
        skill: 'grammar',
        id: topic.id,
        title: topic.title,
        correct,
        total: topic.exercises.length,
      });
    }
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
