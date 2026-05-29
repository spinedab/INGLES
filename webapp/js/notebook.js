import * as storage from './storage.js';
import { logActivity } from './insights.js';

const KEY = 'lexicon:entries';

export function lexiconEntries() {
  return storage.get(KEY, []);
}

export function isSaved(term) {
  const id = entryId(term);
  return lexiconEntries().some(entry => entry.id === id);
}

export function addLexiconEntry(data) {
  const term = clean(data.term || data.word || '');
  if (!term) return null;

  const now = Date.now();
  const id = entryId(term);
  const entries = lexiconEntries();
  const current = entries.find(entry => entry.id === id);
  const next = {
    id,
    term,
    meaning: clean(data.meaning || data.definition || current?.meaning || ''),
    example: clean(data.example || current?.example || ''),
    notes: clean(data.notes || current?.notes || ''),
    source: clean(data.source || current?.source || 'manual'),
    level: clean(data.level || current?.level || ''),
    tags: Array.isArray(data.tags) ? data.tags : current?.tags || [],
    mastered: current?.mastered || false,
    hits: (current?.hits || 0) + 1,
    addedAt: current?.addedAt || now,
    updatedAt: now,
  };

  const saved = current
    ? entries.map(entry => entry.id === id ? next : entry)
    : [next, ...entries];

  storage.set(KEY, saved);
  logActivity('lexicon_saved', {
    skill: 'writing',
    term,
    minutes: 1,
  });
  return next;
}

export function renderNotebook(view, level) {
  const entries = lexiconEntries();
  const active = entries.filter(entry => !entry.mastered);
  const mastered = entries.filter(entry => entry.mastered);
  const levelEntries = entries.filter(entry => entry.level === level);

  view.innerHTML = `
    <div class="dashboard-top">
      <div>
        <h1>Cuaderno léxico</h1>
        <p class="muted">Guarda palabras, colocaciones y ejemplos para convertir el input en output reutilizable.</p>
      </div>
      <a class="btn btn-primary" href="#/search">Buscar contenido</a>
    </div>

    <div class="stats-row">
      <div class="stat-block"><div class="label">Activas</div><div class="value">${active.length}</div></div>
      <div class="stat-block"><div class="label">Dominadas</div><div class="value">${mastered.length}</div></div>
      <div class="stat-block"><div class="label">Nivel ${level.toUpperCase()}</div><div class="value">${levelEntries.length}</div></div>
      <div class="stat-block"><div class="label">Total</div><div class="value">${entries.length}</div></div>
    </div>

    <div class="tools-grid">
      <section class="tool-panel">
        <div class="panel-head">
          <div>
            <h2>Añadir entrada</h2>
            <p class="muted">Ideal para chunks: verb + preposition, collocations y frases útiles.</p>
          </div>
        </div>
        <form id="lexicon-form" class="stack-form">
          <label>Entrada
            <input id="lex-term" autocomplete="off" placeholder="take a photo">
          </label>
          <label>Significado
            <input id="lex-meaning" autocomplete="off" placeholder="hacer/tomar una foto">
          </label>
          <label>Ejemplo
            <textarea id="lex-example" placeholder="I want to take a photo of this page."></textarea>
          </label>
          <label>Notas
            <textarea id="lex-notes" placeholder="make a photo no suena natural en inglés estándar."></textarea>
          </label>
          <button class="btn btn-primary" type="submit">Guardar entrada</button>
        </form>
        <div id="lexicon-status" class="status-line"></div>
      </section>

      <section class="tool-panel">
        <div class="panel-head">
          <div>
            <h2>Quiz rápido</h2>
            <p class="muted">Práctica de recuperación con tus propias entradas activas.</p>
          </div>
          <button class="btn" id="new-quiz">Nuevo</button>
        </div>
        <div id="quiz-box" class="quiz-box">
          ${renderQuiz(active)}
        </div>
      </section>
    </div>

    <h2>Entradas guardadas</h2>
    <div class="filter-row">
      <input id="lex-filter" type="search" placeholder="Filtrar cuaderno">
      <select id="lex-status-filter">
        <option value="active">Activas</option>
        <option value="all">Todas</option>
        <option value="mastered">Dominadas</option>
      </select>
    </div>
    <div id="lexicon-list">
      ${renderEntryList(active)}
    </div>
  `;

  wireNotebook(entries, active);
}

function wireNotebook(entries, active) {
  const status = document.getElementById('lexicon-status');
  const list = document.getElementById('lexicon-list');
  const filter = document.getElementById('lex-filter');
  const statusFilter = document.getElementById('lex-status-filter');

  document.getElementById('lexicon-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const saved = addLexiconEntry({
      term: document.getElementById('lex-term').value,
      meaning: document.getElementById('lex-meaning').value,
      example: document.getElementById('lex-example').value,
      notes: document.getElementById('lex-notes').value,
      source: 'manual',
    });
    status.textContent = saved ? `Guardado: ${saved.term}` : 'Escribe una entrada primero.';
    event.target.reset();
    refreshList();
  });

  document.getElementById('new-quiz').addEventListener('click', () => {
    document.getElementById('quiz-box').innerHTML = renderQuiz(lexiconEntries().filter(entry => !entry.mastered));
    wireQuizReveal();
  });
  wireQuizReveal();

  filter.addEventListener('input', refreshList);
  statusFilter.addEventListener('change', refreshList);
  list.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const id = button.dataset.id;
    if (button.dataset.action === 'master') toggleMastered(id);
    if (button.dataset.action === 'delete') deleteEntry(id);
    refreshList();
  });

  function refreshList() {
    const q = normalize(filter.value);
    const state = statusFilter.value;
    let visible = lexiconEntries();
    if (state === 'active') visible = visible.filter(entry => !entry.mastered);
    if (state === 'mastered') visible = visible.filter(entry => entry.mastered);
    if (q) {
      visible = visible.filter(entry => normalize([
        entry.term,
        entry.meaning,
        entry.example,
        entry.notes,
        entry.source,
      ].join(' ')).includes(q));
    }
    list.innerHTML = renderEntryList(visible);
  }
}

function wireQuizReveal() {
  const reveal = document.getElementById('reveal-quiz');
  if (!reveal) return;
  reveal.addEventListener('click', () => {
    document.getElementById('quiz-answer').hidden = false;
    logActivity('lexicon_quiz', { skill: 'writing', minutes: 3 });
  });
}

function renderEntryList(entries) {
  if (!entries.length) {
    return '<div class="empty">Aún no hay entradas en este filtro.</div>';
  }

  return `
    <div class="lexicon-list">
      ${entries.map(entry => `
        <article class="lexicon-card">
          <div>
            <div class="lexicon-title">${escapeHtml(entry.term)}</div>
            <p>${escapeHtml(entry.meaning || 'Sin significado todavía.')}</p>
            ${entry.example ? `<blockquote>${escapeHtml(entry.example)}</blockquote>` : ''}
            ${entry.notes ? `<p class="muted">${escapeHtml(entry.notes)}</p>` : ''}
            <div class="tag-row">
              ${entry.level ? `<span class="tag">${escapeHtml(entry.level.toUpperCase())}</span>` : ''}
              <span class="tag">${escapeHtml(entry.source)}</span>
              ${entry.mastered ? '<span class="tag good">Dominada</span>' : '<span class="tag">Activa</span>'}
            </div>
          </div>
          <div class="card-actions">
            <button class="btn" data-action="master" data-id="${escapeAttr(entry.id)}">${entry.mastered ? 'Reactivar' : 'Domino'}</button>
            <button class="btn danger" data-action="delete" data-id="${escapeAttr(entry.id)}">Eliminar</button>
          </div>
        </article>
      `).join('')}
    </div>
  `;
}

function renderQuiz(entries) {
  if (!entries.length) {
    return '<p class="muted">Guarda algunas entradas para activar el quiz.</p>';
  }
  const entry = entries[Math.floor(Math.random() * entries.length)];
  const cloze = entry.example
    ? entry.example.replace(new RegExp(escapeRe(entry.term), 'i'), '_____')
    : `How would you use "${entry.term}" in a sentence?`;
  return `
    <div class="quiz-card">
      <div class="eyebrow">Recuperación activa</div>
      <p>${escapeHtml(cloze)}</p>
      <button class="btn btn-primary" id="reveal-quiz">Revelar</button>
      <div id="quiz-answer" hidden>
        <h3>${escapeHtml(entry.term)}</h3>
        <p>${escapeHtml(entry.meaning || '')}</p>
        ${entry.example ? `<blockquote>${escapeHtml(entry.example)}</blockquote>` : ''}
      </div>
    </div>
  `;
}

function toggleMastered(id) {
  const entries = lexiconEntries().map(entry =>
    entry.id === id ? { ...entry, mastered: !entry.mastered, updatedAt: Date.now() } : entry
  );
  storage.set(KEY, entries);
}

function deleteEntry(id) {
  storage.set(KEY, lexiconEntries().filter(entry => entry.id !== id));
}

function entryId(term) {
  return normalize(term).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || String(Date.now());
}

function clean(value) {
  return String(value || '').trim();
}

function normalize(value) {
  return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function escapeAttr(s) {
  return escapeHtml(s);
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
