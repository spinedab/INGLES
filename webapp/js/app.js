// Router y bootstrap de la SPA.
import * as storage from './storage.js';
import { renderDashboard } from './dashboard.js';
import { renderFlashcards } from './flashcards.js';
import { renderReading } from './reading.js';
import { renderListening } from './listening.js';
import { renderGrammar } from './grammar.js';
import { renderCoach } from './coach.js';
import { renderSearch } from './search.js';
import { renderNotebook } from './notebook.js';
import { renderData } from './data.js';

const routes = {
  '': renderDashboard,
  '/': renderDashboard,
  '/flashcards': renderFlashcards,
  '/reading': renderReading,
  '/listening': renderListening,
  '/grammar': renderGrammar,
  '/coach': renderCoach,
  '/search': renderSearch,
  '/notebook': renderNotebook,
  '/data': renderData,
};

let installPrompt = null;

function currentRoute() {
  const hash = location.hash.replace(/^#/, '');
  return hash || '/';
}

function routeBase(route) {
  route = route.split('?')[0];
  if (route === '/' || route === '') return '/';
  const [, first] = route.split('/');
  return first ? `/${first}` : '/';
}

function resolveRoute(route) {
  return routes[route] || routes[routeBase(route)] || renderDashboard;
}

function setNavActive(route) {
  const activeBase = routeBase(route);
  document.querySelectorAll('.appbar nav a').forEach(a => {
    const href = a.getAttribute('href');
    const matches = href === '#' + activeBase ||
      (activeBase === '/' && href === '#/');
    a.classList.toggle('active', matches);
  });
}

async function render() {
  const view = document.getElementById('view');
  if (typeof view._cleanup === 'function') view._cleanup();
  view._cleanup = null;
  view.innerHTML = '';
  const route = currentRoute();
  setNavActive(route);
  const handler = resolveRoute(route);
  try {
    await handler(view, storage.level());
  } catch (e) {
    view.innerHTML = `<div class="empty">Error: ${e.message}</div>`;
    console.error(e);
  }
}

window.addEventListener('hashchange', render);
document.addEventListener('DOMContentLoaded', () => {
  const select = document.getElementById('level-select');
  select.value = storage.level();
  select.addEventListener('change', () => {
    storage.setLevel(select.value);
    render();
  });
  setupAppShell();
  render();
});

function setupAppShell() {
  setupInstallPrompt();
  updateConnectionStatus();
  window.addEventListener('online', updateConnectionStatus);
  window.addEventListener('offline', updateConnectionStatus);

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(err => {
      console.warn('Service worker no registrado:', err);
    });
  }
}

function setupInstallPrompt() {
  const btn = document.getElementById('install-app');
  if (!btn) return;
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    installPrompt = event;
    btn.hidden = false;
  });
  btn.addEventListener('click', async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice.catch(() => null);
    installPrompt = null;
    btn.hidden = true;
  });
}

function updateConnectionStatus() {
  const el = document.getElementById('connection-status');
  if (!el) return;
  const online = navigator.onLine;
  el.textContent = online ? 'Online' : 'Offline';
  el.classList.toggle('offline', !online);
}
