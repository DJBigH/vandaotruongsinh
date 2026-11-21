import type { DaoAlignment } from '@shared/index';

export function alignmentSlug(alignment?: DaoAlignment | string): 'immortal' | 'demonic' {
  return alignment === 'DEMONIC' || alignment === 'demonic' ? 'demonic' : 'immortal';
}

export function lineageKey(key: string, alignment?: DaoAlignment | string): string {
  return `${key}_${alignmentSlug(alignment)}`;
}
