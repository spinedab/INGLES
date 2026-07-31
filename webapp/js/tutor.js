// Vista "Tutor IA": chat con streaming contra el servicio api/ (FastAPI).
// Sigue el patrón del resto de vistas: export render*(view, level) que pinta
// dentro de #view y engancha listeners; reutiliza el CSS existente.
import * as storage from './storage.js';
import { logActivity } from './insights.js';
import * as tutorApi from './tutor-client.js';

const MODES = [
  ['conversation', 'Conversación libre'],
  ['roleplay', 'Roleplay (escenario)'],
  ['grammar', 'Foco en gramática'],
];

const LEVEL_ORDER = ['a1', 'a2', 'b1', 'b2'];

export async function renderTutor(view, level) {
  const savedMode = storage.get('tutor:mode', 'conversation');
  const savedLevel = storage.get('tutor:level', level);

  view.innerHTML = `
    <h1>Tutor IA</h1>
    <p class="muted">Interacción negociada (Long, 1996) con un tutor que hace recasts y
      feedback correctivo. Corre sobre IA local en el servicio <code>api/</code>; el
      historial de la sesión vive en el servidor y no se guarda en este navegador.</p>

    <div class="coach-hero compact">
      <section class="hero-panel">
        <div class="eyebrow">Configuración de la sesión</div>
        <div class="chip-row">
          <label class="compact-field">Nivel
            <select id="tutor-level">
              ${LEVEL_ORDER.map(l => `<option value="${l}" ${l === savedLevel ? 'selected' : ''}>${l.toUpperCase()}</option>`).join('')}
            </select>
          </label>
          <label class="compact-field">Modo
            <select id="tutor-mode">
              ${MODES.map(([id, label]) => `<option value="${id}" ${id === savedMode ? 'selected' : ''}>${label}</option>`).join('')}
            </select>
          </label>
          <label class="compact-field" id="tutor-scenario-field" hidden>Escenario
            <select id="tutor-scenario"><option value="">Cargando…</option></select>
          </label>
        </div>
        <div class="button-row">
          <button class="btn btn-primary" id="tutor-start">Empezar sesión</button>
          <button class="btn danger" id="tutor-end" hidden>Terminar sesión</button>
          <button class="btn" id="tutor-config-toggle">Servidor</button>
        </div>
        <div id="tutor-status" class="status-line"></div>
        <div id="tutor-scenario-brief" class="muted"></div>
      </section>

      <section class="hero-panel" id="tutor-config" hidden>
        <div class="eyebrow">Servidor del tutor</div>
        <div class="stack-form">
          <label>Base URL
            <input id="tutor-base-url" type="url" value="${escapeAttr(tutorApi.baseUrl())}"
                   placeholder="${escapeAttr(tutorApi.DEFAULT_BASE_URL)}">
          </label>
          <label>Token (opcional, solo si el servicio lo exige)
            <input id="tutor-token" type="password" value="${escapeAttr(tutorApi.token())}" placeholder="vacío = sin auth">
          </label>
        </div>
        <div class="button-row">
          <button class="btn btn-primary" id="tutor-save-config">Guardar</button>
          <button class="btn" id="tutor-check-health">Probar conexión</button>
        </div>
        <div id="tutor-health" class="status-line"></div>
      </section>
    </div>

    <section class="tool-panel" id="tutor-chat-panel" hidden>
      <div class="panel-head">
        <div>
          <h2>Conversación</h2>
          <p class="muted" id="tutor-session-meta"></p>
        </div>
        <button class="btn" id="tutor-refresh">Recargar historial</button>
      </div>
      <div class="tutor-chat" id="tutor-chat"></div>
      <textarea id="tutor-input" class="coach-textarea small"
        placeholder="Escribe en inglés y pulsa Enter (Shift+Enter = salto de línea)."></textarea>
      <div class="button-row">
        <button class="btn btn-primary" id="tutor-send">Enviar</button>
        <button class="btn" id="tutor-stop" hidden>Detener</button>
      </div>
      <div id="tutor-turn-info" class="status-line"></div>
    </section>
  `;

  const el = (id) => document.getElementById(id);
  const levelSel = el('tutor-level');
  const modeSel = el('tutor-mode');
  const scenarioField = el('tutor-scenario-field');
  const scenarioSel = el('tutor-scenario');
  const scenarioBrief = el('tutor-scenario-brief');
  const statusEl = el('tutor-status');
  const chatPanel = el('tutor-chat-panel');
  const chatEl = el('tutor-chat');
  const inputEl = el('tutor-input');
  const sendBtn = el('tutor-send');
  const stopBtn = el('tutor-stop');
  const startBtn = el('tutor-start');
  const endBtn = el('tutor-end');
  const turnInfo = el('tutor-turn-info');
  const metaEl = el('tutor-session-meta');

  let session = null;      // {sessionId, level, mode, scenario}
  let allScenarios = {};
  let controller = null;
  let busy = false;

  // Un solo AbortController por vista: al cambiar de ruta cancelamos el fetch
  // en vuelo (patrón de _cleanup que ya usa el router en app.js).
  view._cleanup = () => { if (controller) controller.abort(); };

  function setStatus(msg, kind = '') {
    statusEl.textContent = msg;
    statusEl.className = `status-line${kind ? ' ' + kind : ''}`;
  }

  // ── Escenarios ──
  async function loadScenarios() {
    try {
      allScenarios = await tutorApi.scenarios();
    } catch (e) {
      allScenarios = {};
      setStatus(`No se pudieron cargar los escenarios: ${e.message}`, 'danger');
      return;
    }
    paintScenarioOptions();
  }

  function paintScenarioOptions() {
    const lvl = levelSel.value;
    const maxIdx = LEVEL_ORDER.indexOf(lvl);
    const entries = Object.entries(allScenarios);
    // El backend valida el escenario, no el nivel mínimo; avisamos si está por
    // encima del nivel elegido en lugar de esconderlo.
    scenarioSel.innerHTML = entries.map(([id, s]) => {
      const tooHigh = LEVEL_ORDER.indexOf(s.min_level) > maxIdx;
      return `<option value="${escapeAttr(id)}">${escapeHtml(s.title)}${tooHigh ? ` (min ${s.min_level.toUpperCase()})` : ''}</option>`;
    }).join('') || '<option value="">Sin escenarios</option>';
    const saved = storage.get('tutor:scenario', '');
    if (saved && allScenarios[saved]) scenarioSel.value = saved;
    paintScenarioBrief();
  }

  function paintScenarioBrief() {
    const s = allScenarios[scenarioSel.value];
    if (modeSel.value !== 'roleplay' || !s) { scenarioBrief.innerHTML = ''; return; }
    scenarioBrief.innerHTML = `<strong>${escapeHtml(s.title)}</strong> — objetivos: ${
      (s.objectives || []).map(o => escapeHtml(o)).join(' · ')}`;
  }

  function syncModeUI() {
    const isRoleplay = modeSel.value === 'roleplay';
    scenarioField.hidden = !isRoleplay;
    paintScenarioBrief();
  }

  modeSel.addEventListener('change', () => {
    storage.set('tutor:mode', modeSel.value);
    syncModeUI();
    if (modeSel.value === 'roleplay' && !Object.keys(allScenarios).length) loadScenarios();
  });
  levelSel.addEventListener('change', () => {
    storage.set('tutor:level', levelSel.value);
    paintScenarioOptions();
  });
  scenarioSel.addEventListener('change', () => {
    storage.set('tutor:scenario', scenarioSel.value);
    paintScenarioBrief();
  });

  // ── Config del servidor ──
  el('tutor-config-toggle').addEventListener('click', () => {
    const panel = el('tutor-config');
    panel.hidden = !panel.hidden;
  });
  el('tutor-save-config').addEventListener('click', () => {
    tutorApi.setBaseUrl(el('tutor-base-url').value || tutorApi.DEFAULT_BASE_URL);
    tutorApi.setToken(el('tutor-token').value);
    el('tutor-health').textContent = `Guardado. Base URL: ${tutorApi.baseUrl()}`;
  });
  el('tutor-check-health').addEventListener('click', async () => {
    const out = el('tutor-health');
    out.textContent = 'Comprobando…';
    try {
      const h = await tutorApi.health();
      out.textContent = `OK — provider ${h.provider}, modelo ${h.model}, ${h.scenarios_loaded} escenarios.`;
    } catch (e) {
      out.textContent = `Error: ${e.message}`;
    }
  });

  // ── Chat ──
  function bubble(role, text, { pending = false } = {}) {
    const div = document.createElement('div');
    div.className = `tutor-msg ${role === 'user' ? 'from-user' : 'from-tutor'}${pending ? ' pending' : ''}`;
    div.innerHTML = `<span class="who">${role === 'user' ? 'Tú' : 'Tutor'}</span><div class="body">${
      text ? escapeHtml(text).replace(/\n/g, '<br>') : '<em>…</em>'}</div>`;
    chatEl.appendChild(div);
    chatEl.scrollTop = chatEl.scrollHeight;
    return div;
  }

  function paintTurns(turns) {
    chatEl.innerHTML = '';
    (turns || []).forEach(t => bubble(t.role, t.content));
    if (!turns || !turns.length) {
      chatEl.innerHTML = '<div class="empty">Escribe tu primer mensaje en inglés para empezar.</div>';
    }
  }

  function setBusy(v) {
    busy = v;
    sendBtn.disabled = v;
    stopBtn.hidden = !v;
    inputEl.disabled = v;
  }

  startBtn.addEventListener('click', async () => {
    startBtn.disabled = true;
    setStatus('Creando sesión…');
    try {
      const mode = modeSel.value;
      const scenario = mode === 'roleplay' ? scenarioSel.value : null;
      if (mode === 'roleplay' && !scenario) throw new Error('Elige un escenario para el roleplay.');
      session = await tutorApi.startSession({ level: levelSel.value, mode, scenario });
      chatPanel.hidden = false;
      endBtn.hidden = false;
      paintTurns([]);
      metaEl.textContent = `Sesión ${session.sessionId} · ${session.level.toUpperCase()} · ${session.mode}${
        session.scenario ? ` · ${session.scenario}` : ''}`;
      setStatus('Sesión activa.', 'good');
      inputEl.focus();
      logActivity('tutor_session_start', {
        skill: 'speaking',
        id: session.sessionId,
        title: `Tutor IA · ${session.mode}`,
      });
    } catch (e) {
      setStatus(`No se pudo iniciar: ${e.message}`, 'danger');
    } finally {
      startBtn.disabled = false;
    }
  });

  endBtn.addEventListener('click', async () => {
    if (!session) return;
    const id = session.sessionId;
    session = null;
    chatPanel.hidden = true;
    endBtn.hidden = true;
    setStatus('Cerrando sesión…');
    try {
      await tutorApi.deleteSession(id);
      setStatus('Sesión terminada.');
    } catch (e) {
      setStatus(`Sesión cerrada localmente (el servidor respondió: ${e.message}).`);
    }
  });

  el('tutor-refresh').addEventListener('click', async () => {
    if (!session) return;
    try {
      const full = await tutorApi.getSession(session.sessionId);
      paintTurns(full.turns);
      turnInfo.textContent = `${plural(full.learnerTurns, 'turno del aprendiz', 'turnos del aprendiz')} · ${plural(full.turns.length, 'mensaje', 'mensajes')} en total.`;
    } catch (e) {
      turnInfo.textContent = `No se pudo recargar: ${e.message}`;
    }
  });

  stopBtn.addEventListener('click', () => { if (controller) controller.abort(); });

  async function send() {
    if (!session || busy) return;
    const text = inputEl.value.trim();
    if (!text) return;
    if (chatEl.querySelector('.empty')) chatEl.innerHTML = '';
    inputEl.value = '';
    bubble('user', text);
    const reply = bubble('assistant', '', { pending: true });
    const body = reply.querySelector('.body');
    setBusy(true);
    turnInfo.textContent = 'El tutor está escribiendo…';
    controller = new AbortController();
    try {
      const { meta } = await tutorApi.streamRespond(session.sessionId, text, {
        grammarTopic: modeSel.value === 'grammar' ? storage.get('tutor:grammarTopic', null) : null,
        signal: controller.signal,
        onDelta: (_chunk, acc) => {
          body.innerHTML = escapeHtml(acc).replace(/\n/g, '<br>');
          chatEl.scrollTop = chatEl.scrollHeight;
        },
      });
      reply.classList.remove('pending');
      turnInfo.textContent = meta
        ? `Turno ${meta.turnIndex} · ${plural(meta.learnerTurns, 'turno tuyo', 'turnos tuyos')} · modelo ${meta.model || '?'} (${meta.provider || '?'}).`
        : 'Respuesta recibida.';
      logActivity('tutor_turn', {
        skill: 'speaking',
        id: session.sessionId,
        title: `Tutor IA · ${session.mode}`,
      });
    } catch (e) {
      reply.classList.remove('pending');
      if (e?.name === 'AbortError') {
        turnInfo.textContent = 'Respuesta detenida. El turno ya quedó registrado en el servidor.';
      } else {
        body.innerHTML = `<em>Error: ${escapeHtml(e.message)}</em>`;
        turnInfo.textContent = 'Fallo al hablar con el tutor. Revisa "Servidor" y reintenta.';
      }
    } finally {
      controller = null;
      setBusy(false);
      inputEl.focus();
    }
  }

  sendBtn.addEventListener('click', send);
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  });

  // Arranque: health + escenarios en paralelo.
  syncModeUI();
  setStatus('Comprobando el servicio…');
  const [h] = await Promise.all([
    tutorApi.health().catch(e => ({ error: e.message })),
    loadScenarios(),
  ]);
  if (h.error) {
    setStatus(`El tutor no responde (${tutorApi.baseUrl()}): ${h.error}. Configúralo en "Servidor".`, 'danger');
  } else {
    setStatus(`Servicio listo — ${h.provider} / ${h.model}.`, 'good');
  }
}

function plural(n, one, many) {
  return `${n} ${n === 1 ? one : many}`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function escapeAttr(s) {
  return escapeHtml(s).replace(/`/g, '&#96;');
}
