// Contexto global del nivel CEFR seleccionado. Persiste en storage.
import React, { createContext, useContext, useEffect, useState } from 'react';
import { get, set } from './storage';
import type { CefrLevel } from './types';

interface LevelCtx {
  level: CefrLevel;
  setLevel: (l: CefrLevel) => void;
  ready: boolean;
}

const Ctx = createContext<LevelCtx>({
  level: 'a2',
  setLevel: () => {},
  ready: false,
});

export function LevelProvider({ children }: { children: React.ReactNode }) {
  const [level, setLevelState] = useState<CefrLevel>('a2');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const stored = await get<CefrLevel>('settings:level', 'a2');
      setLevelState(stored);
      setReady(true);
    })();
  }, []);

  const setLevel = (l: CefrLevel) => {
    setLevelState(l);
    void set('settings:level', l);
  };

  return <Ctx.Provider value={{ level, setLevel, ready }}>{children}</Ctx.Provider>;
}

export function useLevel(): LevelCtx {
  return useContext(Ctx);
}
