// Wrapper de localStorage con namespacing y JSON automático.
const NS = 'ingles:';

export function get(key, fallback = null) {
  try {
    const raw = localStorage.getItem(NS + key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function set(key, value) {
  localStorage.setItem(NS + key, JSON.stringify(value));
}

export function del(key) {
  localStorage.removeItem(NS + key);
}

export function allKeys() {
  return Object.keys(localStorage).filter(k => k.startsWith(NS)).map(k => k.slice(NS.length));
}

export function exportAll() {
  const dump = {};
  for (const k of allKeys()) dump[k] = get(k);
  return dump;
}

export function importAll(obj) {
  for (const [k, v] of Object.entries(obj)) set(k, v);
}

export function level() {
  return get('settings:level', 'a1');
}

export function setLevel(l) {
  set('settings:level', l);
}
