import { loadVocab } from './flashcards.js';
import { READING_INDEX, countWords, loadText } from './reading.js';
import { LISTENING_INDEX, loadListen } from './listening.js';
import { TOPICS } from './grammar.js';
import { addLexiconEntry, isSaved } from './notebook.js';

const LEVELS = ['a1', 'a2', 'b1', 'b2'];
let indexCache = null;

export async function renderSearch(view, level) {
  const query = readQuery();
  const type = readParam('type') || 'all';
  const index = await buildSearchIndex();
  const results = searchIndex(index, query, { type, level });

  view.innerHTML = `
    <div class="dashboard-top">
      <div>
        <h1>Búsqueda global</h1>
        <p class="muted">Encuentra vocabulario, colocaciones, lecturas, listening y puntos gramaticales desde un solo lugar.</p>
      </div>
      <a class="btn" href="#/notebook">Abrir cuaderno</a>
    </div>

    <form id="search-form" class="search-panel">
      <input id="search-input" type="search" value="${escapeAttr(query)}" placeholder="Buscar: present perfect, take, breakfast, conditionals...">
      <select id="search-type">
        <option value="all"${type === 'all' ? ' selected' : ''}>Todo</option>
        <option value="vocab"${type === 'vocab' ? ' selected' : ''}>Vocabulario</option>
        <option value="reading"${type === 'reading' ? ' selected' : ''}>Lectura</option>
        <option value="listening"${type === 'listening' ? ' selected' : ''}>Listening</option>
        <option value="grammar"${type === 'grammar' ? ' selected' : ''}>Gramática</option>
      </select>
      <button class="btn btn-primary" type="submit">Buscar</button>
    </form>

    <div class="search-meta">
      <span>${results.length} resultados</span>
      <span>${query ? `Consulta: ${escapeHtml(query)}` : 'Sugerencias para tu nivel actual'}</span>
    </div>

    <div id="search-results" class="search-results">
      ${renderResults(results)}
    </div>
    <div id="search-status" class="status-line"></div>
  `;

  wireSearch(results);
}

async function buildSearchIndex() {
  if (indexCache) return indexCache;
  const items = [];

  for (const level of LEVELS) {
    const vocab = await loadVocab(level).catch(() => []);
    for (const card of vocab) {
      const term = headword(card.front);
      items.push({
        type: 'vocab',
        level,
        title: term,
        subtitle: `${level.toUpperCase()} · ${card.translation || ''}`,
        body: [card.definition, card.example, card.translation, ...(card.tags || [])].join(' '),
        href: '#/flashcards',
        save: {
          term,
          meaning: card.translation || card.definition,
          example: card.example,
          source: `vocab-${level}`,
          level,
          tags: card.tags || [],
        },
      });
    }

    for (const id of READING_INDEX[level] || []) {
      const text = await loadText(id).catch(() => null);
      if (!text) continue;
      items.push({
        type: 'reading',
        level,
        title: text.title,
        subtitle: `${level.toUpperCase()} · ${countWords(text.text)} palabras`,
        body: [text.summary, stripHtml(text.text), ...(text.collocations || [])].join(' '),
        href: `#/reading/${id}`,
      });
      for (const phrase of text.collocations || []) {
        items.push({
          type: 'vocab',
          level,
          title: phrase,
          subtitle: `${level.toUpperCase()} · colocación de lectura`,
          body: `${text.title} ${text.summary}`,
          href: `#/reading/${id}`,
          save: {
            term: phrase,
            meaning: 'Colocación para usar como bloque.',
            example: findSentence(stripHtml(text.text), phrase),
            source: `reading-${id}`,
            level,
            tags: ['collocation'],
          },
        });
      }
    }

    for (const id of LISTENING_INDEX[level] || []) {
      const item = await loadListen(id).catch(() => null);
      if (!item) continue;
      items.push({
        type: 'listening',
        level,
        title: item.title,
        subtitle: `${level.toUpperCase()} · ${item.duration}`,
        body: [item.summary, item.script, ...(item.vocabulary || []).map(v => `${v.word} ${v.meaning}`)].join(' '),
        href: `#/listening/${id}`,
      });
      for (const vocab of item.vocabulary || []) {
        items.push({
          type: 'vocab',
          level,
          title: vocab.word,
          subtitle: `${level.toUpperCase()} · vocabulario de listening`,
          body: `${vocab.meaning} ${item.title} ${item.script}`,
          href: `#/listening/${id}`,
          save: {
            term: vocab.word,
            meaning: vocab.meaning,
            example: findSentence(item.script, vocab.word),
            source: `listening-${id}`,
            level,
            tags: ['listening'],
          },
        });
      }
    }
  }

  for (const topic of TOPICS) {
    items.push({
      type: 'grammar',
      level: topic.level,
      title: topic.title,
      subtitle: `${topic.level.toUpperCase()} · gramática`,
      body: [
        topic.why,
        topic.rule,
        ...topic.examples.flat(),
        ...topic.exercises.map(ex => `${ex.q} ${ex.options.join(' ')}`),
      ].join(' '),
      href: `#/grammar/${topic.id}`,
    });
  }

  indexCache = items.map(item => ({ ...item, haystack: normalize(`${item.title} ${item.subtitle} ${item.body}`) }));
  return indexCache;
}

function searchIndex(index, query, { type, level }) {
  const q = normalize(query);
  const tokens = q.split(/\s+/).filter(Boolean);
  const pool = index.filter(item => type === 'all' || item.type === type);

  if (!tokens.length) {
    return pool
      .filter(item => item.level === level || item.type === 'grammar')
      .slice(0, 24)
      .map(item => ({ ...item, score: item.level === level ? 2 : 1 }));
  }

  return pool
    .map(item => ({ ...item, score: scoreItem(item, tokens, level) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, 60);
}

function scoreItem(item, tokens, level) {
  let score = 0;
  for (const token of tokens) {
    if (normalize(item.title).includes(token)) score += 8;
    if (normalize(item.subtitle).includes(token)) score += 3;
    if (item.haystack.includes(token)) score += 2;
  }
  if (score > 0 && item.level === level) score += 2;
  return score;
}

function renderResults(results) {
  if (!results.length) {
    return '<div class="empty">No encontré resultados. Prueba con una palabra más corta o cambia el filtro.</div>';
  }

  return results.map((item, i) => `
    <article class="search-card">
      <div>
        <div class="tag-row">
          <span class="tag">${labelForType(item.type)}</span>
          <span class="tag">${escapeHtml(item.level.toUpperCase())}</span>
          ${item.save && isSaved(item.save.term) ? '<span class="tag good">En cuaderno</span>' : ''}
        </div>
        <h2><a href="${item.href}">${escapeHtml(item.title)}</a></h2>
        <p class="muted">${escapeHtml(item.subtitle)}</p>
        <p>${escapeHtml(snippet(item.body))}</p>
      </div>
      <div class="card-actions">
        <a class="btn" href="${item.href}">Abrir</a>
        ${item.save ? `<button class="btn btn-primary" data-save="${i}">${isSaved(item.save.term) ? 'Actualizar' : 'Guardar'}</button>` : ''}
      </div>
    </article>
  `).join('');
}

function wireSearch(results) {
  const input = document.getElementById('search-input');
  const type = document.getElementById('search-type');
  const status = document.getElementById('search-status');
  document.getElementById('search-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (input.value.trim()) params.set('q', input.value.trim());
    if (type.value !== 'all') params.set('type', type.value);
    location.hash = `#/search${params.toString() ? `?${params}` : ''}`;
  });

  document.getElementById('search-results').addEventListener('click', (event) => {
    const button = event.target.closest('button[data-save]');
    if (!button) return;
    const item = results[Number(button.dataset.save)];
    if (!item?.save) return;
    const saved = addLexiconEntry(item.save);
    button.textContent = 'Guardado';
    status.textContent = saved ? `${saved.term} añadido al cuaderno.` : 'No se pudo guardar.';
  });
}

function readQuery() {
  return readParam('q') || '';
}

function readParam(name) {
  const [, query = ''] = location.hash.split('?');
  return new URLSearchParams(query).get(name);
}

function labelForType(type) {
  return {
    vocab: 'Vocabulario',
    reading: 'Lectura',
    listening: 'Listening',
    grammar: 'Gramática',
  }[type] || type;
}

function snippet(text) {
  return stripHtml(String(text || '')).replace(/\s+/g, ' ').trim().slice(0, 190);
}

function stripHtml(text) {
  return String(text || '').replace(/<[^>]*>/g, ' ');
}

function findSentence(text, term) {
  const re = new RegExp(`[^.!?]*\\b${escapeRe(term)}\\b[^.!?]*[.!?]?`, 'i');
  return (String(text || '').match(re) || [''])[0].trim();
}

function headword(front) {
  return String(front).replace(/\s*\([^)]*\)\s*$/, '').trim();
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
