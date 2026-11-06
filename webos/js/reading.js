import * as storage from './storage.js';
import * as lang from './lang.js';
import { logActivity } from './insights.js';

// El índice lo genera tools/build_content.py: ya no hay lista a mano.
export async function readingIndex() {
  return (await lang.index()).readings;
}

export async function loadText(id) {
  const r = await fetch(lang.path(`lecturas/${id}.json`));
  return r.json();
}

export async function renderReading(view, level) {
  // Decodificado: un id con tilde («pt-pretérito-imperfeito») llega como %C3%A9.
  const route = decodeURIComponent(location.hash.replace(/^#\/reading\/?/, ''));
  if (!route) return renderIndex(view, level);
  return renderText(view, level, route);
}

async function renderIndex(view, level) {
  const ids = (await readingIndex())[level] || [];
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
  const bodyHtml = annotate(t.text, t.glosses || [], t.collocations || []);

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
        ${q.options.map((opt, oi) => `<button type="button" class="opt" data-i="${oi}">${escapeHtml(opt)}</button>`).join('')}
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

const LETTER = 'A-Za-z\u00C0-\u024F';
const CJK = /[\u3400-\u9FFF]/;

// «离…很近» marca un hueco: en el texto aparece como «离公司很近».
function gapPattern(word) {
  const gap = CJK.test(word) ? '[^。！？\\n]{0,12}?' : '[^.!?\\n]{0,40}?';
  return word.split('…').map((p) => escapeRe(p.trim())).join(gap);
}

// La glosa trae a veces la pronunciación entre paréntesis («起床 (qǐchuáng)»),
// que no está en el texto. Y \b es ASCII: no casa ante «à» o «é», ni entre
// hanzi, que no llevan espacios. Por eso el límite de palabra se hace a mano y
// solo en escrituras con espacios. Grupo 1: lo que precede; grupo 2: la palabra.
function glossPattern(word) {
  const base = word.replace(/\s*\([^)]*\)\s*$/, '');
  const body = gapPattern(base);
  return CJK.test(base)
    ? new RegExp(`()(${body})`)
    : new RegExp(`(^|[^${LETTER}])(${body})(?![${LETTER}])`, 'i');
}

function glossTip(g) {
  const pron = g.word.match(/\(([^)]*)\)\s*$/);
  return pron ? `${pron[1]} · ${g.tip}` : g.tip;
}

// Marca rangos sobre el texto de los nodos, no sobre el HTML: una glosa ya no
// puede casar dentro de una etiqueta ni de un data-tip, y una glosa dentro de
// una colocación conserva las dos marcas (antes la glosa metía un <span> que
// impedía casar la colocación). Mismo criterio que mobile/app/reading/[id].tsx.
function annotate(html, glosses, collocations) {
  const parts = html.split(/(<[^>]+>)/); // índices impares: etiquetas
  const offset = [];
  let plain = '';
  parts.forEach((p, i) => {
    if (i % 2) { plain += '\n'; return; } // una etiqueta separa palabras
    offset[i] = plain.length;
    plain += p;
  });
  const tipAt = new Array(plain.length).fill(undefined);
  const collAt = new Array(plain.length).fill(false);
  for (const g of glosses) {
    const m = glossPattern(g.word).exec(plain);
    if (!m) continue;
    const start = m.index + m[1].length;
    const end = start + m[2].length;
    if (tipAt.slice(start, end).some(Boolean)) continue; // la primera glosa manda
    const tip = glossTip(g);
    for (let k = start; k < end; k++) tipAt[k] = tip;
  }
  for (const c of collocations) {
    const m = new RegExp(gapPattern(c), 'i').exec(plain);
    if (!m) continue;
    for (let k = m.index; k < m.index + m[0].length; k++) collAt[k] = true;
  }
  return parts.map((p, i) => {
    if (i % 2) return p;
    const base = offset[i];
    let out = '';
    let from = 0;
    for (let k = 1; k <= p.length; k++) {
      const a = base + from;
      const b = base + k;
      if (k < p.length && tipAt[b] === tipAt[a] && collAt[b] === collAt[a]) continue;
      let chunk = p.slice(from, k);
      if (tipAt[a]) chunk = `<span class="gloss" data-tip="${escapeAttr(tipAt[a])}">${chunk}</span>`;
      if (collAt[a]) chunk = `<span class="collocation">${chunk}</span>`;
      out += chunk;
      from = k;
    }
    return out;
  }).join('');
}
export function countWords(s) { return s.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length; }
