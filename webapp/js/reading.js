import * as storage from './storage.js';
import { logActivity } from './insights.js';

export const READING_INDEX = {
  a1: ['a1-01', 'a1-02'],
  a2: ['a2-01', 'a2-02'],
  b1: ['b1-01', 'b1-02'],
  b2: ['b2-01'],
};

export async function loadText(id) {
  const r = await fetch(`content/lecturas/${id}.json`);
  return r.json();
}

export async function renderReading(view, level) {
  const route = location.hash.replace(/^#\/reading\/?/, '');
  if (!route) return renderIndex(view, level);
  return renderText(view, level, route);
}

async function renderIndex(view, level) {
  const ids = READING_INDEX[level] || [];
  const items = await Promise.all(ids.map(async id => {
    const t = await loadText(id).catch(() => null);
    return { id, t };
  }));
  view.innerHTML = `
    <h1>Lectura graduada — ${level.toUpperCase()}</h1>
    <p class="muted">Lecturas i+1 (Krashen 1985). Las palabras subrayadas tienen glosa al pasar el cursor. Las colocaciones aparecen resaltadas — anótalas.</p>
    ${items.length === 0 ? '<p>Sin lecturas en este nivel todavía.</p>' :
      '<ul class="section-list">' + items.filter(x => x.t).map(({ id, t }) => `
        <li class="section-card"><a href="#/reading/${id}">
          <div class="num">${id}</div>
          <div class="title">${escapeHtml(t.title)}</div>
          <div class="desc">${escapeHtml(t.summary)} · ~${countWords(t.text)} palabras</div>
        </a></li>
      `).join('') + '</ul>'}
  `;
}

async function renderText(view, level, id) {
  const t = await loadText(id);
  let bodyHtml = t.text;
  // Apply glosses (data-tip) and collocations.
  for (const g of t.glosses || []) {
    const re = new RegExp(`\\b(${escapeRe(g.word)})\\b`, 'i');
    bodyHtml = bodyHtml.replace(re, `<span class="gloss" data-tip="${escapeAttr(g.tip)}">$1</span>`);
  }
  for (const c of t.collocations || []) {
    const re = new RegExp(`(${escapeRe(c)})`, 'i');
    bodyHtml = bodyHtml.replace(re, `<span class="collocation">$1</span>`);
  }

  const progressKey = `reading:done:${id}`;
  const isDone = storage.get(progressKey, false);

  view.innerHTML = `
    <p><a href="#/reading">← Volver al índice</a></p>
    <h1>${escapeHtml(t.title)}</h1>
    <p class="muted">${escapeHtml(t.summary)}</p>
    <div class="text-block">${bodyHtml}</div>

    <h2>Comprensión</h2>
    <div id="questions"></div>
    <div id="score" style="display:none"></div>

    <h3>Colocaciones para anotar</h3>
    <ul>${(t.collocations || []).map(c => `<li><strong>${escapeHtml(c)}</strong></li>`).join('')}</ul>

    <p style="margin-top:30px">
      <button id="mark-done" class="btn ${isDone ? '' : 'btn-primary'}">${isDone ? '✓ Marcada como leída' : 'Marcar como leída'}</button>
    </p>
  `;

  const qs = document.getElementById('questions');
  const answers = new Array(t.questions.length).fill(null);
  t.questions.forEach((q, qi) => {
    const el = document.createElement('div');
    el.className = 'question';
    el.innerHTML = `
      <div class="q-text">${qi + 1}. ${escapeHtml(q.q)}</div>
      <div class="options">
        ${q.options.map((opt, oi) => `<div class="opt" data-i="${oi}">${escapeHtml(opt)}</div>`).join('')}
      </div>
    `;
    el.querySelectorAll('.opt').forEach(o => {
      o.addEventListener('click', () => {
        if (answers[qi] != null) return;
        const i = parseInt(o.dataset.i, 10);
        answers[qi] = i;
        el.querySelectorAll('.opt').forEach((other, oi) => {
          if (oi === q.answer) other.classList.add('correct');
          if (oi === i && oi !== q.answer) other.classList.add('wrong');
        });
        checkAllAnswered();
      });
    });
    qs.appendChild(el);
  });

  function checkAllAnswered() {
    if (answers.every(a => a != null)) {
      const correct = answers.filter((a, i) => a === t.questions[i].answer).length;
      const score = document.getElementById('score');
      score.style.display = 'block';
      score.innerHTML = `<div class="stat-block"><div class="label">Tu puntuación</div><div class="value">${correct}/${t.questions.length}</div></div>`;
      storage.set(`reading:score:${id}`, { correct, total: t.questions.length, ts: Date.now() });
      logActivity('reading_score', {
        skill: 'reading',
        id,
        title: t.title,
        correct,
        total: t.questions.length,
        minutes: 6,
      });
    }
  }

  document.getElementById('mark-done').addEventListener('click', (e) => {
    const wasDone = storage.get(progressKey, false);
    storage.set(progressKey, true);
    e.target.textContent = '✓ Marcada como leída';
    e.target.classList.remove('btn-primary');
    if (!wasDone) {
      logActivity('reading_done', {
        skill: 'reading',
        id,
        title: t.title,
        minutes: Math.max(8, Math.round(countWords(t.text) / 18)),
      });
    }
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function escapeAttr(s) { return escapeHtml(s); }
function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
export function countWords(s) { return s.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length; }
