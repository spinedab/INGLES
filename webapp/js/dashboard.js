import * as srs from './srs.js';
import { buildDailyMission, eventTitle, summarizeActivity } from './insights.js';
import { loadVocab } from './flashcards.js';

export async function renderDashboard(view, level) {
  let vocab = [];
  try { vocab = await loadVocab(level); } catch {}
  const stats = srs.statsForDeck(`vocab-${level}`, vocab);
  const summary = summarizeActivity();
  const mission = buildDailyMission({ level, srsStats: stats, summary });

  view.innerHTML = `
    <div class="dashboard-top">
      <div>
        <h1>Aprende inglés, basado en evidencia.</h1>
        <p class="muted">Plan adaptativo, SRS, input graduado, output guiado y progreso privado en este navegador.</p>
      </div>
      <a class="btn btn-primary" href="${mission[0]?.href || '#/flashcards'}">Continuar sesión</a>
    </div>

    <div class="coach-hero compact">
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
        <div class="eyebrow">Meta diaria</div>
        <div class="progress-ring" style="--value:${summary.completion}">
          <strong>${summary.completion}%</strong>
          <span>${Math.round(summary.totals.todayMinutes)}/${summary.goal} min</span>
        </div>
        <div class="mini-stats">
          <div><strong>${summary.streak}</strong><span>racha</span></div>
          <div><strong>${Math.round(summary.totals.weekMinutes)}</strong><span>min semana</span></div>
        </div>
      </section>
    </div>

    <div class="stats-row">
      <div class="stat-block"><div class="label">Cards aprendidas</div><div class="value">${stats.learned}</div></div>
      <div class="stat-block"><div class="label">Para repasar hoy</div><div class="value">${stats.dueToday}</div></div>
      <div class="stat-block"><div class="label">Nuevas disponibles</div><div class="value">${stats.fresh}</div></div>
      <div class="stat-block"><div class="label">Total deck ${level.toUpperCase()}</div><div class="value">${stats.total}</div></div>
    </div>

    <div class="dashboard-grid">
      <a class="module-card" href="#/flashcards">
        <h2>Flashcards SRS</h2>
        <div class="desc">Vocabulario de alta frecuencia con algoritmo SuperMemo-2. Repaso espaciado científico.</div>
        <div class="stat">${stats.dueToday} para repasar · ${stats.fresh} nuevas</div>
      </a>
      <a class="module-card" href="#/reading">
        <h2>Lectura graduada</h2>
        <div class="desc">Textos i+1 con glosario al pasar el cursor y preguntas de comprensión.</div>
        <div class="stat">Nivel ${level.toUpperCase()}</div>
      </a>
      <a class="module-card" href="#/listening">
        <h2>Listening</h2>
        <div class="desc">Audio + script revelado tras la escucha. Practica chunking y weak forms.</div>
        <div class="stat">Nivel ${level.toUpperCase()}</div>
      </a>
      <a class="module-card" href="#/grammar">
        <h2>Gramática focalizada</h2>
        <div class="desc">Puntos críticos para hispanohablantes con instrucción explícita + práctica.</div>
        <div class="stat">Norris &amp; Ortega d=0.96</div>
      </a>
      <a class="module-card" href="#/coach">
        <h2>Coach avanzado</h2>
        <div class="desc">Writing coach, shadowing lab, temporizador, analítica semanal y misión diaria.</div>
        <div class="stat">${summary.lastEvents.length ? escapeHtml(eventTitle(summary.lastEvents[0])) : 'Listo para empezar'}</div>
      </a>
      <a class="module-card" href="#/search">
        <h2>Búsqueda global</h2>
        <div class="desc">Encuentra vocabulario, chunks, lecturas, listening y gramática desde un solo índice.</div>
        <div class="stat">Contenido conectado</div>
      </a>
      <a class="module-card" href="#/notebook">
        <h2>Cuaderno léxico</h2>
        <div class="desc">Guarda frases útiles, ejemplos y colocaciones para practicarlas con recuperación activa.</div>
        <div class="stat">Output reutilizable</div>
      </a>
    </div>

    <p class="muted">Recomendación pedagógica: 30 minutos diarios consistentes &gt;&gt; 3 horas el domingo. La consolidación requiere sueño entre sesiones.</p>
  `;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
