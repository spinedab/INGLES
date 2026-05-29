// Búsqueda client-side simple. Carga search-index.json y filtra por substring.
(async function() {
  const input = document.getElementById('search-input');
  const results = document.getElementById('search-results');
  if (!input || !results) return;

  let index = null;
  async function loadIndex() {
    if (index) return index;
    try {
      const url = (location.pathname.includes('/secciones/') ? '../' : './') + 'search-index.json';
      const r = await fetch(url);
      index = await r.json();
    } catch (e) {
      index = [];
    }
    return index;
  }

  function render(hits) {
    if (!hits.length) {
      results.innerHTML = '<div style="padding:10px 14px;color:var(--muted)">Sin resultados.</div>';
      results.classList.add('open');
      return;
    }
    const base = location.pathname.includes('/secciones/') ? './' : 'secciones/';
    results.innerHTML = hits.slice(0, 20).map(h => `
      <a href="${base}${h.file}#${h.id}">
        <div class="hit-section">${h.section}</div>
        <div>${h.title}</div>
      </a>
    `).join('');
    results.classList.add('open');
  }

  input.addEventListener('input', async () => {
    const q = input.value.trim().toLowerCase();
    if (q.length < 2) { results.classList.remove('open'); return; }
    const idx = await loadIndex();
    const hits = idx.filter(item =>
      item.title.toLowerCase().includes(q) ||
      (item.body && item.body.toLowerCase().includes(q))
    ).map(item => ({
      ...item,
      score: (item.title.toLowerCase().includes(q) ? 10 : 0) + (item.body || '').toLowerCase().split(q).length - 1
    }));
    hits.sort((a, b) => b.score - a.score);
    render(hits);
  });

  document.addEventListener('click', (e) => {
    if (!results.contains(e.target) && e.target !== input) results.classList.remove('open');
  });

  input.addEventListener('focus', () => {
    if (input.value.trim().length >= 2) results.classList.add('open');
  });
})();
