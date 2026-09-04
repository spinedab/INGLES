import * as storage from './storage.js';
import * as lang from './lang.js';
import { logActivity } from './insights.js';

export async function listeningIndex() {
  return (await lang.index()).listening;
}

export async function loadListen(id) {
  const r = await fetch(lang.path(`listening/${id}.json`));
  return r.json();
}

export async function renderListening(view, level) {
  const route = location.hash.replace(/^#\/listening\/?/, '');
  if (!route) return renderIndex(view, level);
  return renderItem(view, route);
}

async function renderIndex(view, level) {
  const ids = (await listeningIndex())[level] || [];
  const items = await Promise.all(ids.map(async id => {
    const it = await loadListen(id).catch(() => null);
    return { id, it };
  }));
  view.innerHTML = `
    <h1>Listening — ${level.toUpperCase()}</h1>
    <p class="muted">Estrategia recomendada: (1) escucha sin script, (2) anota lo que captes, (3) revela el script, (4) escucha de nuevo con script, (5) escucha final sin script.</p>
    ${items.length === 0 ? '<p>Sin ejercicios todavía.</p>' :
      '<ul class="section-list">' + items.filter(x => x.it).map(({ id, it }) => `
        <li class="section-card"><a href="#/listening/${id}">
          <div class="num">${id}</div>
          <div class="title">${escapeHtml(it.title)}</div>
          <div class="desc">${escapeHtml(it.summary)} · ${it.duration}</div>
        </a></li>
      `).join('') + '</ul>'}
  `;
}

async function renderItem(view, id) {
  const it = await loadListen(id);
  view.innerHTML = `
    <p><a href="#/listening">← Volver al índice</a></p>
    <h1>${escapeHtml(it.title)}</h1>
    <p class="muted">${escapeHtml(it.summary)} · Duración ${it.duration}</p>

    ${it.audio ? `<audio class="audio-player" controls src="${it.audio}"></audio>` : `
      <p>
        <button id="tts-play" class="btn btn-primary">Escuchar</button>
        <button id="tts-slow" class="btn">Escuchar despacio</button>
        ${it.externalUrl ? `<a class="btn" href="${it.externalUrl}" target="_blank" rel="noopener">Material original</a>` : ''}
      </p>
      <p class="muted" id="tts-note" style="font-size:14px"></p>`}

    <p style="margin-top:14px">
      <button id="reveal-script" class="btn btn-primary">Revelar script (tras la primera escucha)</button>
    </p>
    <div id="script" class="script hidden">${escapeHtml(it.script).split('\n').map(l => `<p>${l}</p>`).join('')}</div>

    <h2>Preguntas de comprensión</h2>
    <div id="questions"></div>
    <div id="score" style="display:none"></div>

    <h3>Vocabulario clave</h3>
    <ul>${(it.vocabulary || []).map(v => `<li><strong>${escapeHtml(v.word)}</strong> — ${escapeHtml(v.meaning)}</li>`).join('')}</ul>
  `;

  wireTts(it);

  const revealBtn = document.getElementById('reveal-script');
  const script = document.getElementById('script');
  revealBtn.addEventListener('click', () => {
    script.classList.remove('hidden');
    revealBtn.style.display = 'none';
    storage.set(`listening:revealed:${id}`, Date.now());
  });

  const qs = document.getElementById('questions');
  const answers = new Array(it.questions.length).fill(null);
  it.questions.forEach((q, qi) => {
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
        checkAll();
      });
    });
    qs.appendChild(el);
  });

  function checkAll() {
    if (answers.every(a => a != null)) {
      const correct = answers.filter((a, i) => a === it.questions[i].answer).length;
      document.getElementById('score').innerHTML =
        `<div class="stat-block"><div class="label">Tu puntuación</div><div class="value">${correct}/${it.questions.length}</div></div>`;
      document.getElementById('score').style.display = 'block';
      logActivity('listening_score', {
        skill: 'listening',
        id,
        title: it.title,
        correct,
        total: it.questions.length,
      });
    }
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// Ningún ejercicio trae `audio`: los enlaces originales a VOA/BBC no servían (uno
// daba 404, dos apuntaban a la portada). El TTS del navegador lo resuelve sin
// depender de terceros y funciona sin conexión.
function wireTts(it) {
  const play = document.getElementById('tts-play');
  if (!play) return;
  const slow = document.getElementById('tts-slow');
  const note = document.getElementById('tts-note');

  if (!('speechSynthesis' in window)) {
    play.disabled = true;
    if (slow) slow.disabled = true;
    note.textContent = 'Este navegador no soporta síntesis de voz. Usa el material original.';
    return;
  }

  // Se quitan las etiquetas de hablante ("Server:", "Customer:") para que no las lea.
  const text = it.script.split('\n')
    .map(l => l.replace(/^\s*[A-Z][A-Za-z ]{0,18}:\s*/, ''))
    .join('. ');

  const speak = async (rate) => {
    if (speechSynthesis.speaking) { speechSynthesis.cancel(); return; }
    const u = new SpeechSynthesisUtterance(text);
    // El locale decide qué voz elige el navegador: con en-US un texto en
    // portugués suena a un anglófono leyendo fonéticamente.
    u.lang = await lang.ttsLocale();
    u.rate = rate;
    u.onend = () => { play.textContent = 'Escuchar'; };
    play.textContent = 'Detener';
    speechSynthesis.speak(u);
  };

  play.addEventListener('click', () => speak(1.0));
  if (slow) slow.addEventListener('click', () => speak(0.65));
  // Si se navega a otra vista el habla seguiría sonando.
  window.addEventListener('hashchange', () => speechSynthesis.cancel(), { once: true });
}
