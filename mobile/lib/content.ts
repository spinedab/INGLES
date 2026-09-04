// Contenido de estudio del idioma activo.
//
// La app nació para inglés y tenía el idioma cosido en cada pantalla: índices
// de lecturas escritos a mano, `vocab-${level}` como nombre de deck, 'en-US'
// en el TTS. Ahora todo pasa por aquí y por la tabla generada en
// contentRegistry.ts (tools/build_content.py la escribe a partir de los
// ficheros que existen, así que no hay lista que olvidar).
//
// El idioma activo se guarda en una variable de módulo que fija el
// LevelProvider. Así las pantallas siguen llamando `loadVocab(level)` o
// `readingIndex(level)` sin pasar el idioma a mano, y el cambio de idioma en
// el provider provoca el re-render que vuelve a leerlas.
//
// Compatibilidad con el progreso: el inglés conserva el deck `vocab-a1`; los
// demás idiomas usan `vocab-pt-a1`, etc. El estado SRS vive en
// `srs:<deck>:<id>` y renombrar el deck del inglés borraría de facto el
// progreso de quien ya estudia.
import type { CefrLevel, GrammarTopic, ListeningItem, ReadingText, VocabCard } from './types';
import { apiClient } from './api';
import { CONTENT, LANGUAGE_CODES, type LangMeta } from './contentRegistry';

export type LangCode = (typeof LANGUAGE_CODES)[number];
export const LANGUAGES: LangMeta[] = LANGUAGE_CODES.map((c) => CONTENT[c].meta);

let activeLang: LangCode = 'en';

export function setActiveLang(code: string): void {
  activeLang = (LANGUAGE_CODES as readonly string[]).includes(code) ? (code as LangCode) : 'en';
}

export function activeLanguage(): LangCode {
  return activeLang;
}

export function langMeta(): LangMeta {
  return CONTENT[activeLang].meta;
}

export function ttsLocale(): string {
  return CONTENT[activeLang].meta.tts;
}

export function deckName(level: CefrLevel): string {
  return activeLang === 'en' ? `vocab-${level}` : `vocab-${activeLang}-${level}`;
}

export function readingIndex(level: CefrLevel): string[] {
  return CONTENT[activeLang].readings[level] || [];
}

export function listeningIndex(level: CefrLevel): string[] {
  return CONTENT[activeLang].listening[level] || [];
}

export function grammarTopics(): GrammarTopic[] {
  return CONTENT[activeLang].grammar;
}

export function grammarById(id: string): GrammarTopic | undefined {
  return grammarTopics().find((t) => t.id === id);
}

// Primero backend (si hay uno configurado), después el bundle local, que es lo
// que garantiza el modo offline.
export async function loadVocab(level: CefrLevel): Promise<VocabCard[]> {
  try {
    const remote = await apiClient.getVocab(level, activeLang);
    if (remote && remote.length > 0) return remote;
  } catch {
    // backend no disponible → local
  }
  const loader = CONTENT[activeLang].vocab[level];
  if (!loader) return [];
  return loader();
}

export async function loadReading(id: string): Promise<ReadingText> {
  try {
    const remote = await apiClient.getReading(id, activeLang);
    if (remote) return remote;
  } catch {
    // local
  }
  const loader = CONTENT[activeLang].loadReading[id];
  if (!loader) throw new Error(`Lectura '${id}' no disponible.`);
  return loader();
}

export async function loadListening(id: string): Promise<ListeningItem> {
  try {
    const remote = await apiClient.getListening(id, activeLang);
    if (remote) return remote;
  } catch {
    // local
  }
  const loader = CONTENT[activeLang].loadListening[id];
  if (!loader) throw new Error(`Listening '${id}' no disponible.`);
  return loader();
}
