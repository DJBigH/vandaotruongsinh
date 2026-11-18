import { create } from 'zustand';

type Preferences = { sfx: boolean; reducedEffects: boolean };
type StorageAccess = Pick<Storage, 'getItem' | 'setItem'>;
const key = 'vandao.presentation.v1';

export function createPresentationSettings(storage: StorageAccess | undefined, preferReduced: boolean) {
  const defaults: Preferences = { sfx: true, reducedEffects: preferReduced };
  try {
    const saved = JSON.parse(storage?.getItem(key) ?? '{}');
    for (const field of ['sfx', 'reducedEffects'] as const) {
      if (typeof saved?.[field] === 'boolean') defaults[field] = saved[field];
    }
  } catch { /* Private browsing and malformed saves still allow in-session settings. */ }
  return create<Preferences & { change: (update: Partial<Preferences>) => void }>((set, get) => ({
    ...defaults,
    change(update) {
      set(update);
      const { sfx, reducedEffects } = get();
      try { storage?.setItem(key, JSON.stringify({ sfx, reducedEffects })); } catch { /* Keep the active choice. */ }
    },
  }));
}

function localPreferences() {
  try { return window.localStorage; } catch { return undefined; }
}
export const usePresentationSettings = createPresentationSettings(
  localPreferences(), typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches),
);
