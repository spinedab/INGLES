// Wrapper de AsyncStorage con namespacing y JSON automático.
// En web usa localStorage transparentemente (vía el shim de Expo).
import AsyncStorage from '@react-native-async-storage/async-storage';

const NS = 'ingles:';

export async function get<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(NS + key);
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export async function set<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(NS + key, JSON.stringify(value));
}

export async function del(key: string): Promise<void> {
  await AsyncStorage.removeItem(NS + key);
}

export async function allKeys(): Promise<string[]> {
  const keys = await AsyncStorage.getAllKeys();
  return keys.filter((k) => k.startsWith(NS)).map((k) => k.slice(NS.length));
}

export async function exportAll(): Promise<Record<string, unknown>> {
  const keys = await allKeys();
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    out[k] = await get(k, null);
  }
  return out;
}

export async function importAll(obj: Record<string, unknown>): Promise<void> {
  for (const [k, v] of Object.entries(obj)) {
    await set(k, v);
  }
}

export async function clear(): Promise<void> {
  const keys = await allKeys();
  await Promise.all(keys.map(del));
}
