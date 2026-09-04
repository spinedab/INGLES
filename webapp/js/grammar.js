import * as storage from './storage.js';
import * as lang from './lang.js';
import { logActivity } from './insights.js';

// Tópicos gramaticales focalizados en errores recurrentes de hispanohablantes.
// Los temas se cargan de content/grammar.json, generado por
// tools/build_grammar.py desde content/grammar.json (la fuente canónica).
// Antes estaban escritos aquí a mano Y otra vez en mobile/lib/content.ts.
const _topics = new Map();

export async function loadTopics() {
  const code = lang.current();
  if (_topics.has(code)) return _topics.get(code);
  const r = await fetch(lang.path('grammar.json'));
  if (!r.ok) throw new Error(`No se pudo cargar la gramática (HTTP ${r.status})`);
  const data = await r.json();
  _topics.set(code, data);
  return data;
}

export async function renderGrammar(view, level) {
  const route = location.hash.replace(/^#\/grammar\/?/, '');
  if (!route) return renderIndex(view, level);
  const TOPICS = await loadTopics();
  const topic = TOPICS.find(t => t.id === route);
  if (!topic) {
    view.innerHTML = `<p>Tópico no encontrado.</p><a href="#/grammar">← Volver</a>`;
    return;
  }
  return renderTopic(view, topic);
}

async function renderIndex(view, level) {
  const TOPICS = await loadTopics();
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
