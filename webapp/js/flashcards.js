import * as srs from './srs.js';
import { logActivity } from './insights.js';

const cache = new Map();

export async function loadVocab(level) {
  if (cache.has(level)) return cache.get(level);
  const r = await fetch(`content/vocab/${level}.json`);
  if (!r.ok) throw new Error(`No vocab for ${level}`);
  const data = await r.json();
  cache.set(level, data);
  return data;
}

export async function renderFlashcards(view, level) {
  const vocab = await loadVocab(level);
  const deck = `vocab-${level}`;
  let queue = srs.selectQueue(deck, vocab, { newPerDay: 20 });
  let idx = 0;
  let revealed = false;
  let sessionLogged = false;
  let sessionStats = { again: 0, hard: 0, good: 0, easy: 0 };

  function showCard() {
    if (idx >= queue.length) {
      if (!sessionLogged) {
        sessionLogged = true;
        logActivity('flashcards_session', {
          skill: 'flashcards',
          level,
          count: queue.length,
          ...sessionStats,
        });
      }
      view.innerHTML = `
        <h1>Sesión completada</h1>
        <p class="muted">Has revisado ${queue.length} cards.</p>
        <div class="stats-row">
          <div class="stat-block"><div class="label">Again</div><div class="value">${sessionStats.again}</div></div>
          <div class="stat-block"><div class="label">Hard</div><div class="value">${sessionStats.hard}</div></div>
          <div class="stat-block"><div class="label">Good</div><div class="value">${sessionStats.good}</div></div>
          <div class="stat-block"><div class="label">Easy</div><div class="value">${sessionStats.easy}</div></div>
        </div>
        <p>Vuelve mañana para tus siguientes repasos.</p>
        <a class="btn" href="#/">Volver al inicio</a>
      `;
      return;
    }

    const { card, st } = queue[idx];
    revealed = false;
    view.innerHTML = `
      <div class="muted">Card ${idx + 1} de ${queue.length} · Deck ${level.toUpperCase()}</div>
      <div class="progress-bar"><div style="width:${(idx / queue.length) * 100}%"></div></div>

      <div class="flashcard">
        <div class="front">${escapeHtml(card.front)}</div>
        <div id="back" style="display:none">
          <div class="back">${escapeHtml(card.definition)}</div>
          <div class="example">"${escapeHtml(card.example)}"</div>
          <div class="translation">ES: ${escapeHtml(card.translation)}</div>
          <div class="tags">${card.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>
        </div>
        <button id="reveal" class="btn btn-primary">Mostrar respuesta · barra espaciadora</button>
        <div id="rating" class="rating-row" style="display:none">
          <button class="rating-btn again" data-q="1">Again<br><small>&lt;1 día</small></button>
          <button class="rating-btn hard" data-q="3">Hard<br><small>corta</small></button>
          <button class="rating-btn good" data-q="4">Good<br><small>normal</small></button>
          <button class="rating-btn easy" data-q="5">Easy<br><small>larga</small></button>
        </div>
      </div>
      <p class="muted">Atajos: <kbd>Space</kbd> revelar · <kbd>1</kbd> again · <kbd>2</kbd> hard · <kbd>3</kbd> good · <kbd>4</kbd> easy</p>
    `;

    const revealBtn = document.getElementById('reveal');
    const ratingRow = document.getElementById('rating');
    const back = document.getElementById('back');

    revealBtn.addEventListener('click', reveal);
    ratingRow.querySelectorAll('.rating-btn').forEach(b => {
      b.addEventListener('click', () => grade(parseInt(b.dataset.q, 10)));
    });

    function reveal() {
      if (revealed) return;
      revealed = true;
      back.style.display = 'block';
      revealBtn.style.display = 'none';
      ratingRow.style.display = 'grid';
    }

    function grade(q) {
      if (!revealed) reveal();
      const newSt = srs.review(st, q);
      srs.saveCardState(deck, card.id, newSt);
      if (q < 3) sessionStats.again++;
      else if (q === 3) sessionStats.hard++;
      else if (q === 4) sessionStats.good++;
      else sessionStats.easy++;
      // If failed (again), push card to end of queue for re-review this session.
      if (q < 3) queue.push({ card, st: newSt });
      idx++;
      showCard();
    }

    // Keyboard shortcuts
    function onKey(e) {
      if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); reveal(); }
      else if (revealed) {
        if (e.key === '1') grade(1);
        else if (e.key === '2') grade(3);
        else if (e.key === '3') grade(4);
        else if (e.key === '4') grade(5);
      }
    }
    document.addEventListener('keydown', onKey);
    view._cleanup = () => document.removeEventListener('keydown', onKey);
  }

  if (queue.length === 0) {
    view.innerHTML = `
      <h1>Sin cards pendientes</h1>
      <p>No hay nada para repasar ahora mismo en el deck ${level.toUpperCase()}.</p>
      <p class="muted">Esto puede pasar si ya repasaste todo lo del día. Vuelve mañana o sube de nivel.</p>
      <a class="btn" href="#/">Volver</a>
    `;
    return;
  }

  showCard();
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
