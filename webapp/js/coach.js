import * as storage from './storage.js';
import * as srs from './srs.js';
import {
  buildDailyMission,
  eventTitle,
  getDailyGoal,
  logActivity,
  setDailyGoal,
  skillLabel,
  summarizeActivity,
} from './insights.js';
import { loadVocab } from './flashcards.js';
import { lexiconEntries } from './notebook.js';

const SHADOW_PROMPTS = {
  a1: [
    'I usually study English after breakfast.',
    'My city is busy, but I like walking in quiet streets.',
    'Can you help me find the nearest bus stop?',
  ],
  a2: [
    'I have been learning English because I want better opportunities.',
    'Yesterday I cooked dinner, cleaned my room, and watched a short video.',
    'If the weather is good tomorrow, I will go for a long walk.',
  ],
  b1: [
    'One habit that changed my learning was reviewing small chunks every day.',
    'Although speaking feels uncomfortable at first, regular practice makes it easier.',
    'I used to translate every sentence, but now I try to think in English first.',
  ],
  b2: [
    'A strong learning system balances deliberate practice with meaningful input.',
    'The most useful feedback is specific, timely, and connected to a learner’s current goal.',
    'Fluency improves when attention shifts from individual words to complete thought groups.',
  ],
};

const WRITING_RULES = [
  {
    title: 'Edad en inglés',
    detail: 'Usa "I am 25 years old", no "I have 25 years".',
    re: /\bI have\s+\d+\s+years?\b/i,
  },
  {
    title: 'Agree no lleva be',
    detail: 'La forma natural es "I agree", no "I am agree".',
    re: /\bI am agree\b/i,
  },
  {
    title: 'People es plural',
    detail: 'Escribe "people are", no "people is".',
    re: /\bpeople\s+is\b/i,
  },
  {
    title: 'Depend on',
    detail: 'En inglés estándar se dice "depend on", no "depend of".',
    re: /\bdepend(s|ed|ing)?\s+of\b/i,
  },
  {
    title: 'Listen to',
    detail: 'Cuando hay objeto, usa "listen to music / listen to a podcast".',
    re: /\blisten(?:ed|ing)?\s+(music|podcasts?|songs?|the radio)\b/i,
  },
  {
    title: 'Explain it to me',
    detail: 'Evita "explain me"; usa "explain it to me" o "explain the idea to me".',
    re: /\bexplain\s+me\b/i,
  },
  {
    title: 'Married to',
    detail: 'La colocación correcta es "married to", no "married with".',
    re: /\bmarried\s+with\b/i,
  },
  {
    title: 'Evita doble comparativo',
    detail: 'Usa "better" o "more useful", no "more better".',
    re: /\bmore\s+better\b/i,
  },
  {
    title: 'Important to',
    detail: 'Después de "important" suele venir infinitivo: "important to practice".',
    re: /\bimportant\s+(learn|study|practice|improve|speak|write|read)\b/i,
  },
  {
    title: 'Take a photo',
    detail: 'La colocación natural es "take a photo", no "make a photo".',
    re: /\bmake\s+a\s+photo\b/i,
  },
];

export async function renderCoach(view, level) {
  const vocab = await loadVocab(level);
  const stats = srs.statsForDeck(`vocab-${level}`, vocab);
  const summary = summarizeActivity();
  const mission = buildDailyMission({ level, srsStats: stats, summary });
  const draft = storage.get('coach:writingDraft', '');
  const targetWords = pickTargetWords(vocab, 10);
  const savedWords = lexiconEntries().filter(entry => !entry.mastered).slice(0, 6);
  const promptIndex = storage.get(`coach:shadowPrompt:${level}`, 0);
  const shadowPrompt = promptFor(level, promptIndex);
  const timerMinutes = storage.get('coach:timerMinutes', 25);

  view.innerHTML = `
    <h1>Coach avanzado</h1>
    <p class="muted">Plan diario, analítica local, writing coach y shadowing para convertir el contenido en práctica deliberada.</p>

    <div class="coach-hero">
      <section class="hero-panel">
        <div class="eyebrow">Misión de hoy · ${level.toUpperCase()}</div>
        <div class="mission-list">
          ${mission.map((item, i) => `
            <a class="mission-item" href="${item.href}">
              <span class="mission-step">${i + 1}</span>
              <span>
                <strong>${escapeHtml(item.label)}</strong>
                <small>${escapeHtml(item.detail)}</small>
              </span>
            </a>
          `).join('')}
        </div>
      </section>

      <section class="hero-panel progress-panel">
        <div class="eyebrow">Progreso diario</div>
        <div class="progress-ring" style="--value:${summary.completion}">
          <strong>${summary.completion}%</strong>
          <span>${Math.round(summary.totals.todayMinutes)}/${summary.goal} min</span>
        </div>
        <div class="mini-stats">
          <div><strong>${summary.streak}</strong><span>racha</span></div>
          <div><strong>${Math.round(summary.totals.weekMinutes)}</strong><span>min semana</span></div>
          <div><strong>${stats.dueToday}</strong><span>SRS hoy</span></div>
        </div>
      </section>
    </div>

    <div class="tools-grid">
      <section class="tool-panel">
        <div class="panel-head">
          <div>
            <h2>Temporizador de foco</h2>
            <p class="muted">Bloques cortos con registro automático de minutos.</p>
          </div>
          <label class="compact-field">Min
            <input id="timer-minutes" type="number" min="5" max="90" step="5" value="${timerMinutes}">
          </label>
        </div>
        <div class="timer-display" id="timer-display">25:00</div>
        <div class="button-row">
          <button class="btn btn-primary" id="timer-start">Iniciar</button>
          <button class="btn" id="timer-pause">Pausar</button>
          <button class="btn" id="timer-reset">Reset</button>
          <button class="btn" id="timer-log">Registrar 10 min</button>
        </div>
        <div id="timer-status" class="status-line"></div>
      </section>

      <section class="tool-panel">
        <div class="panel-head">
          <div>
            <h2>Writing coach</h2>
            <p class="muted">Feedback inmediato para errores frecuentes de hispanohablantes.</p>
          </div>
          <button class="btn" id="use-prompt">Consigna</button>
        </div>
        <div class="chip-row" aria-label="Vocabulario objetivo">
          ${targetWords.map(w => `<button class="chip" data-word="${escapeAttr(headword(w.front))}">${escapeHtml(headword(w.front))}</button>`).join('')}
        </div>
        ${savedWords.length ? `
          <div class="chip-row" aria-label="Cuaderno léxico">
            ${savedWords.map(entry => `<button class="chip notebook-chip" data-word="${escapeAttr(entry.term)}">${escapeHtml(entry.term)}</button>`).join('')}
          </div>
        ` : ''}
        <textarea id="writing-input" class="coach-textarea" placeholder="Write 80-120 words in English. Try to use 3 target words.">${escapeHtml(draft)}</textarea>
        <div class="button-row">
          <button class="btn btn-primary" id="analyze-writing">Analizar</button>
          <button class="btn" id="save-writing">Guardar borrador</button>
          <button class="btn" id="clear-writing">Limpiar</button>
        </div>
        <div id="writing-result" class="analysis-output"></div>
      </section>

      <section class="tool-panel">
        <div class="panel-head">
          <div>
            <h2>Shadowing lab</h2>
            <p class="muted">Repite, graba o escribe lo que dijiste y compara contra el modelo.</p>
          </div>
          <button class="btn" id="next-shadow">Cambiar frase</button>
        </div>
        <blockquote class="shadow-prompt" id="shadow-prompt">${escapeHtml(shadowPrompt)}</blockquote>
        <div class="button-row">
          <button class="btn btn-primary" id="speak-model">Escuchar modelo</button>
          <button class="btn" id="record-shadow">Grabar</button>
        </div>
        <textarea id="shadow-input" class="coach-textarea small" placeholder="Tu transcripción aparece aquí, o escríbela manualmente."></textarea>
        <div class="button-row">
          <button class="btn" id="compare-shadow">Comparar</button>
        </div>
        <div id="shadow-result" class="analysis-output"></div>
      </section>

      <section class="tool-panel">
        <div class="panel-head">
          <div>
            <h2>Analítica local</h2>
            <p class="muted">Actividad, balance de destrezas y objetivo diario.</p>
          </div>
          <label class="compact-field">Meta
            <input id="daily-goal" type="number" min="10" max="180" step="5" value="${getDailyGoal()}">
          </label>
        </div>
        <div class="week-bars">
          ${summary.week.map(day => `
            <div class="week-day">
              <div class="week-bar"><span style="height:${Math.min(100, Math.round((day.minutes / summary.goal) * 100))}%"></span></div>
              <small>${day.key.slice(5)}</small>
            </div>
          `).join('')}
        </div>
        <div class="skill-grid">
          ${Object.entries(summary.totals.skills).filter(([, minutes]) => minutes > 0).map(([skill, minutes]) => `
            <div><strong>${Math.round(minutes)}</strong><span>${skillLabel(skill)}</span></div>
          `).join('') || '<p class="muted">Aún sin actividad registrada esta semana.</p>'}
        </div>
        <h3>Última actividad</h3>
        <ul class="activity-list">
          ${summary.lastEvents.map(e => `<li><span>${escapeHtml(eventTitle(e))}</span><small>${escapeHtml(e.day)}</small></li>`).join('') || '<li><span>Sin registros todavía</span><small>Hoy puede ser el primero</small></li>'}
        </ul>
      </section>
    </div>
  `;

  wireTimer(view, timerMinutes);
  wireWriting(vocab, targetWords);
  wireShadowing(level, promptIndex);
  wireAnalytics();
}

function wireTimer(view, initialMinutes) {
  let timer = null;
  let running = false;
  let duration = Number(initialMinutes) * 60;
  let remaining = duration;
  const display = document.getElementById('timer-display');
  const status = document.getElementById('timer-status');
  const minutesInput = document.getElementById('timer-minutes');

  const render = () => {
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    display.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const finish = (minutes) => {
    clearInterval(timer);
    timer = null;
    running = false;
    remaining = duration;
    render();
    logActivity('focus_timer', { skill: 'focus', minutes });
    status.textContent = `Registrados ${minutes} minutos de foco.`;
  };

  minutesInput.addEventListener('change', () => {
    const minutes = Math.max(5, Math.min(90, Number(minutesInput.value) || 25));
    storage.set('coach:timerMinutes', minutes);
    duration = minutes * 60;
    remaining = duration;
    render();
  });

  document.getElementById('timer-start').addEventListener('click', () => {
    if (running) return;
    running = true;
    status.textContent = '';
    timer = setInterval(() => {
      remaining -= 1;
      render();
      if (remaining <= 0) finish(Math.round(duration / 60));
    }, 1000);
  });
  document.getElementById('timer-pause').addEventListener('click', () => {
    running = false;
    clearInterval(timer);
    timer = null;
    status.textContent = 'Pausado.';
  });
  document.getElementById('timer-reset').addEventListener('click', () => {
    running = false;
    clearInterval(timer);
    timer = null;
    remaining = duration;
    render();
    status.textContent = '';
  });
  document.getElementById('timer-log').addEventListener('click', () => finish(10));

  render();
  view._cleanup = () => clearInterval(timer);
}

function wireWriting(vocab, targetWords) {
  const input = document.getElementById('writing-input');
  const result = document.getElementById('writing-result');

  input.addEventListener('input', () => storage.set('coach:writingDraft', input.value));
  document.querySelectorAll('.chip[data-word]').forEach(chip => {
    chip.addEventListener('click', () => {
      input.value = `${input.value}${input.value.trim() ? ' ' : ''}${chip.dataset.word}`;
      storage.set('coach:writingDraft', input.value);
      input.focus();
    });
  });

  document.getElementById('use-prompt').addEventListener('click', () => {
    const prompt = writingPrompt(targetWords);
    input.value = input.value.trim() ? `${input.value.trim()}\n\n${prompt}` : prompt;
    storage.set('coach:writingDraft', input.value);
    input.focus();
  });

  document.getElementById('save-writing').addEventListener('click', () => {
    storage.set('coach:writingDraft', input.value);
    result.innerHTML = '<p class="status-line">Borrador guardado.</p>';
  });
  document.getElementById('clear-writing').addEventListener('click', () => {
    input.value = '';
    storage.set('coach:writingDraft', '');
    result.innerHTML = '';
  });
  document.getElementById('analyze-writing').addEventListener('click', () => {
    const analysis = analyzeWriting(input.value, vocab);
    result.innerHTML = renderWritingAnalysis(analysis);
    logActivity('writing_analysis', {
      skill: 'writing',
      words: analysis.wordCount,
      issues: analysis.issues.length,
      targetUsed: analysis.targetUsed.length,
    });
  });
}

function wireShadowing(level, promptIndex) {
  let index = promptIndex;
  let recognition = null;
  const promptEl = document.getElementById('shadow-prompt');
  const input = document.getElementById('shadow-input');
  const result = document.getElementById('shadow-result');

  const setPrompt = () => {
    storage.set(`coach:shadowPrompt:${level}`, index);
    promptEl.textContent = promptFor(level, index);
    input.value = '';
    result.innerHTML = '';
  };

  document.getElementById('next-shadow').addEventListener('click', () => {
    index = (index + 1) % SHADOW_PROMPTS[level].length;
    setPrompt();
  });

  document.getElementById('speak-model').addEventListener('click', () => {
    if (!('speechSynthesis' in window)) {
      result.innerHTML = '<p class="status-line">Este navegador no expone voz sintética.</p>';
      return;
    }
    const utterance = new SpeechSynthesisUtterance(promptEl.textContent);
    utterance.lang = 'en-US';
    utterance.rate = 0.88;
    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
  });

  document.getElementById('record-shadow').addEventListener('click', () => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      result.innerHTML = '<p class="status-line">Reconocimiento de voz no disponible; escribe tu intento y pulsa Comparar.</p>';
      return;
    }
    recognition = new Recognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => { result.innerHTML = '<p class="status-line">Escuchando...</p>'; };
    recognition.onerror = () => { result.innerHTML = '<p class="status-line">No pude capturar audio. Puedes escribir tu intento manualmente.</p>'; };
    recognition.onresult = (event) => {
      input.value = event.results[0][0].transcript;
      renderShadowComparison(promptEl.textContent, input.value, result);
    };
    recognition.start();
  });

  document.getElementById('compare-shadow').addEventListener('click', () => {
    renderShadowComparison(promptEl.textContent, input.value, result);
  });

  const prevCleanup = document.getElementById('view')._cleanup;
  document.getElementById('view')._cleanup = () => {
    if (typeof prevCleanup === 'function') prevCleanup();
    if (recognition) {
      try { recognition.stop(); } catch {}
    }
  };
}

function wireAnalytics() {
  document.getElementById('daily-goal').addEventListener('change', (event) => {
    setDailyGoal(event.target.value);
    event.target.value = getDailyGoal();
  });
}

function renderShadowComparison(target, spoken, result) {
  const comparison = compareSpeech(target, spoken);
  result.innerHTML = `
    <div class="score-card">
      <strong>${comparison.match}%</strong>
      <span>coincidencia</span>
    </div>
    ${comparison.missing.length ? `<p><strong>Faltó:</strong> ${comparison.missing.map(escapeHtml).join(', ')}</p>` : '<p>Muy bien: cubriste todas las palabras clave.</p>'}
    ${comparison.extra.length ? `<p><strong>Extra:</strong> ${comparison.extra.slice(0, 8).map(escapeHtml).join(', ')}</p>` : ''}
  `;
  logActivity('speaking_shadow', {
    skill: 'speaking',
    match: comparison.match,
    minutes: 4,
  });
}

function analyzeWriting(text, vocab) {
  const clean = text.trim();
  const words = tokenize(clean);
  const sentences = clean.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
  const issues = WRITING_RULES.filter(rule => rule.re.test(clean));
  const longSentences = sentences.filter(s => tokenize(s).length > 26).length;
  const targetUsed = vocab
    .filter(card => wordAppears(clean, headword(card.front)))
    .slice(0, 12)
    .map(card => headword(card.front));
  const repeated = repeatedWords(words);
  const lexicalVariety = words.length ? new Set(words.map(w => w.toLowerCase())).size / words.length : 0;
  const levelEstimate = estimateLevel(words.length, lexicalVariety, sentences.length);
  const score = Math.round(Math.max(0, Math.min(100,
    48 +
    Math.min(18, words.length / 5) +
    Math.min(12, targetUsed.length * 3) +
    Math.round(lexicalVariety * 14) -
    issues.length * 9 -
    longSentences * 4
  )));

  return {
    wordCount: words.length,
    sentenceCount: sentences.length,
    issues,
    longSentences,
    targetUsed,
    repeated,
    lexicalVariety,
    levelEstimate,
    score,
  };
}

function renderWritingAnalysis(a) {
  return `
    <div class="analysis-grid">
      <div class="score-card"><strong>${a.score}</strong><span>claridad</span></div>
      <div class="score-card"><strong>${a.wordCount}</strong><span>palabras</span></div>
      <div class="score-card"><strong>${a.levelEstimate}</strong><span>estimado</span></div>
      <div class="score-card"><strong>${a.targetUsed.length}</strong><span>targets</span></div>
    </div>
    ${a.issues.length ? `
      <h3>Correcciones prioritarias</h3>
      <ul class="analysis-list">
        ${a.issues.map(issue => `<li><strong>${escapeHtml(issue.title)}</strong><span>${escapeHtml(issue.detail)}</span></li>`).join('')}
      </ul>
    ` : '<p class="status-line">Sin interferencias típicas detectadas. Revisa precisión fina y naturalidad.</p>'}
    ${a.longSentences ? `<p class="status-line">${a.longSentences} oración(es) muy largas: divide ideas para sonar más claro.</p>` : ''}
    ${a.repeated.length ? `<p><strong>Repeticiones:</strong> ${a.repeated.map(escapeHtml).join(', ')}</p>` : ''}
    ${a.targetUsed.length ? `<p><strong>Vocabulario usado:</strong> ${a.targetUsed.map(escapeHtml).join(', ')}</p>` : ''}
  `;
}

function compareSpeech(target, spoken) {
  const targetWords = tokenize(target).map(w => w.toLowerCase());
  const spokenWords = tokenize(spoken).map(w => w.toLowerCase());
  const spokenSet = new Set(spokenWords);
  const targetSet = new Set(targetWords);
  const missing = [...targetSet].filter(w => !spokenSet.has(w));
  const extra = [...new Set(spokenWords)].filter(w => !targetSet.has(w));
  const matched = [...targetSet].filter(w => spokenSet.has(w)).length;
  const match = targetSet.size ? Math.round((matched / targetSet.size) * 100) : 0;
  return { match, missing, extra };
}

function pickTargetWords(vocab, count) {
  return vocab
    .filter(card => card.front.length > 2)
    .slice(0, count);
}

function promptFor(level, index) {
  const prompts = SHADOW_PROMPTS[level] || SHADOW_PROMPTS.a1;
  return prompts[index % prompts.length];
}

function writingPrompt(words) {
  const selected = words.slice(0, 3).map(w => headword(w.front)).join(', ');
  return `Write about your week in English. Include these words naturally: ${selected}.`;
}

function headword(front) {
  return String(front).replace(/\s*\([^)]*\)\s*$/, '').trim();
}

function tokenize(text) {
  return String(text).toLowerCase().match(/[a-z']+/g) || [];
}

function wordAppears(text, word) {
  const re = new RegExp(`\\b${escapeRe(word.toLowerCase())}\\b`, 'i');
  return re.test(text);
}

function repeatedWords(words) {
  const counts = new Map();
  for (const word of words) {
    if (word.length < 5) continue;
    counts.set(word, (counts.get(word) || 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);
}

function estimateLevel(wordCount, lexicalVariety, sentenceCount) {
  if (wordCount < 50 || sentenceCount < 4) return 'A1-A2';
  if (wordCount < 120 || lexicalVariety < 0.58) return 'A2-B1';
  if (wordCount < 220 || lexicalVariety < 0.68) return 'B1-B2';
  return 'B2+';
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
