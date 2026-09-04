// Contexto global de nivel CEFR e idioma de estudio. Persiste en storage.
import React, { createContext, useContext, useEffect, useState } from 'react';
import { get, set } from './storage';
import type { CefrLevel } from './types';
import { setActiveLang, type LangCode } from './content';

interface LevelCtx {
  level: CefrLevel;
  setLevel: (l: CefrLevel) => void;
  lang: LangCode;
  setLang: (c: LangCode) => void;
  ready: boolean;
}

const Ctx = createContext<LevelCtx>({
  level: 'a2',
  setLevel: () => {},
  lang: 'en',
  setLang: () => {},
  ready: false,
});

export function LevelProvider({ children }: { children: React.ReactNode }) {
  const [level, setLevelState] = useState<CefrLevel>('a2');
  const [lang, setLangState] = useState<LangCode>('en');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const storedLevel = await get<CefrLevel>('settings:level', 'a2');
      // Quien ya usaba la app no tiene 'settings:lang': sigue en inglés.
      const storedLang = await get<LangCode>('settings:lang', 'en');
      setActiveLang(storedLang);
      setLangState(storedLang);
      setLevelState(storedLevel);
      setReady(true);
    })();
  }, []);

  const setLevel = (l: CefrLevel) => {
    setLevelState(l);
    void set('settings:level', l);
  };

  const setLang = (c: LangCode) => {
    // Primero la variable de módulo, luego el estado: así el re-render que
    // dispara setState ya lee el contenido del idioma nuevo.
    setActiveLang(c);
    setLangState(c);
    void set('settings:lang', c);
  };

  return <Ctx.Provider value={{ level, setLevel, lang, setLang, ready }}>{children}</Ctx.Provider>;
}

export function useLevel(): LevelCtx {
  return useContext(Ctx);
}
