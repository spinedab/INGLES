// Shadowing — prompts modelo + comparación textual.
// El TTS usa expo-speech; la comparación es pura JS y funciona en todas las plataformas.
import * as Speech from 'expo-speech';
import { Platform } from 'react-native';
import type { CefrLevel } from './types';
import { tokenize } from './writingCoach';

export const SHADOW_PROMPTS: Record<CefrLevel, string[]> = {
  a1: [
    'I usually study English after breakfast.',
    'My city is busy, but I like walking in quiet streets.',
    'Can you help me find the nearest bus stop?',
  ],
  a2: [
    'I have been learning English because I want better opportunities.',
    'Yesterday I cooked dinner, cleaned my room, and watched a short video.',
    'If the weather is good tomorrow, I will go for a long walk.',
  ],
  b1: [
    'One habit that changed my learning was reviewing small chunks every day.',
    'Although speaking feels uncomfortable at first, regular practice makes it easier.',
    'I used to translate every sentence, but now I try to think in English first.',
  ],
  b2: [
    'A strong learning system balances deliberate practice with meaningful input.',
    'The most useful feedback is specific, timely, and connected to a learner\'s current goal.',
    'Fluency improves when attention shifts from individual words to complete thought groups.',
  ],
};

export function promptFor(level: CefrLevel, index: number): string {
  const prompts = SHADOW_PROMPTS[level] || SHADOW_PROMPTS.a1;
  return prompts[index % prompts.length];
}

export function nextPromptIndex(level: CefrLevel, current: number): number {
  const prompts = SHADOW_PROMPTS[level] || SHADOW_PROMPTS.a1;
  return (current + 1) % prompts.length;
}

export interface ShadowComparison {
  match: number;
  missing: string[];
  extra: string[];
}

export function compareSpeech(target: string, spoken: string): ShadowComparison {
  const targetWords = tokenize(target).map((w) => w.toLowerCase());
  const spokenWords = tokenize(spoken).map((w) => w.toLowerCase());
  const spokenSet = new Set(spokenWords);
  const targetSet = new Set(targetWords);
  const missing = [...targetSet].filter((w) => !spokenSet.has(w));
  const extra = [...new Set(spokenWords)].filter((w) => !targetSet.has(w));
  const matched = [...targetSet].filter((w) => spokenSet.has(w)).length;
  const match = targetSet.size ? Math.round((matched / targetSet.size) * 100) : 0;
  return { match, missing, extra };
}

/**
 * Reproduce el prompt con TTS.
 * - iOS/Android: expo-speech (voz del sistema).
 * - Web: expo-speech delega en window.speechSynthesis cuando está disponible.
 */
export async function speakModel(text: string): Promise<void> {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
    const utterance = new (window as any).SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.88;
    (window as any).speechSynthesis.cancel();
    (window as any).speechSynthesis.speak(utterance);
    return;
  }
  try {
    Speech.stop();
    Speech.speak(text, { language: 'en-US', rate: 0.88 });
  } catch {
    // silently ignore — no TTS available
  }
}
