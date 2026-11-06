// Idioma de estudio actual y todo lo que depende de él.
//
// La app nació para inglés y lo tenía cosido en cada módulo: rutas de
// contenido, nombres de deck, locale del TTS, titulares. Este módulo es el
// único sitio que sabe qué idioma se estudia; los demás le preguntan.
//
// Compatibilidad con el progreso existente: el inglés conserva sus rutas
// lógicas y sobre todo sus decks (`vocab-a1`), porque el estado SRS vive en
// localStorage bajo `srs:<deck>:<id>` y renombrar el deck haría que miles de
// repasos parecieran no haber ocurrido. Los idiomas nuevos llevan su código en
// el deck (`vocab-pt-a1`) y en los ids de tarjeta (`pt-a1-001`), así que no
// pueden pisarse entre sí ni pisar al inglés.
import * as storage from './storage.js';

const DEFAULT = 'en';
let _languages = null;
const _indexCache = new Map();

export function current() {
  return storage.get('settings:lang', DEFAULT);
}

export function setCurrent(code) {
  storage.set('settings:lang', code);
  _indexCache.clear();
}

export async function languages() {
  if (_languages) return _languages;
  const r = await fetch('content/languages.json');
  if (!r.ok) throw new Error(`No se pudo cargar la lista de idiomas (HTTP ${r.status})`);
  _languages = await r.json();
  return _languages;
}

export async function meta(code = current()) {
  const all = await languages();
  return all.find(l => l.code === code) || all[0];
}

/** Ruta relativa a un fichero de contenido del idioma actual. */
export function path(rel, code = current()) {
  return `content/${code}/${rel}`;
}

/** Nombre del deck SRS. El inglés no lleva código: compatibilidad (ver arriba). */
export function deck(level, code = current()) {
  return code === 'en' ? `vocab-${level}` : `vocab-${code}-${level}`;
}

/** Índice del idioma: qué lecturas, listenings y tamaños de deck hay por nivel.
 *  Lo genera tools/build_content.py a partir de los ficheros que existen, así
 *  que no hay lista que mantener a mano (se olvidó al menos una vez). */
export async function index(code = current()) {
  if (_indexCache.has(code)) return _indexCache.get(code);
  const r = await fetch(path('index.json', code));
  if (!r.ok) throw new Error(`Sin contenido para «${code}» (HTTP ${r.status})`);
  const data = await r.json();
  _indexCache.set(code, data);
  return data;
}

/** Locale para speechSynthesis / expo-speech. */
export async function ttsLocale() {
  return (await meta()).tts || 'en-US';
}

/** «inglés», «portugués»… para los textos de la interfaz. */
export async function name() {
  return (await meta()).name;
}
