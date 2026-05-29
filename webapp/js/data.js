import * as storage from './storage.js';

export function renderData(view) {
  const dump = storage.exportAll();
  const json = JSON.stringify(dump, null, 2);

  view.innerHTML = `
    <h1>Tus datos</h1>
    <p class="muted">Todo tu progreso se guarda en este navegador. Aquí puedes exportarlo (para hacer copia o llevarlo a otro dispositivo) o importarlo.</p>

    <h2>Exportar</h2>
    <p>Copia este JSON y guárdalo en un archivo:</p>
    <textarea id="export" style="width:100%;min-height:200px;font-family:monospace;font-size:12px;padding:10px;border:1px solid var(--border);border-radius:6px;background:var(--card-bg);color:var(--fg)" readonly>${escapeHtml(json)}</textarea>
    <p><button class="btn btn-primary" id="copy">Copiar al portapapeles</button>
    <a class="btn" id="download-link">Descargar como ingles-data.json</a></p>

    <h2>Importar</h2>
    <p>Pega un JSON de exportación previa:</p>
    <textarea id="import" style="width:100%;min-height:120px;font-family:monospace;font-size:12px;padding:10px;border:1px solid var(--border);border-radius:6px;background:var(--card-bg);color:var(--fg)" placeholder='{"settings:level":"a1", ...}'></textarea>
    <p><button class="btn" id="import-btn">Importar (sobreescribe lo que tengas)</button></p>

    <h2>Borrar todo</h2>
    <p>Resetea progreso y configuración.</p>
    <p><button class="btn" id="reset" style="color:var(--bad)">Borrar todos mis datos</button></p>

    <div id="status" style="margin-top:20px"></div>
  `;

  const status = msg => { document.getElementById('status').textContent = msg; };

  document.getElementById('copy').addEventListener('click', async () => {
    await navigator.clipboard.writeText(json);
    status('✓ Copiado.');
  });

  const blob = new Blob([json], { type: 'application/json' });
  document.getElementById('download-link').href = URL.createObjectURL(blob);
  document.getElementById('download-link').download = 'ingles-data.json';

  document.getElementById('import-btn').addEventListener('click', () => {
    const txt = document.getElementById('import').value.trim();
    if (!txt) return status('Pega un JSON primero.');
    try {
      const obj = JSON.parse(txt);
      storage.importAll(obj);
      status('✓ Importado. Recarga la página para ver el efecto.');
    } catch (e) {
      status('Error: ' + e.message);
    }
  });

  document.getElementById('reset').addEventListener('click', () => {
    if (!confirm('¿Seguro que quieres borrar TODO tu progreso? Esta acción es irreversible.')) return;
    for (const k of storage.allKeys()) storage.del(k);
    status('✓ Todo borrado. Recarga la página.');
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
