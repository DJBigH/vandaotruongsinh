import type { ApiResponse, CharacterSummary } from '@shared/index';

export type CharacterLoadResult =
  | { kind: 'loaded'; character: CharacterSummary }
  | { kind: 'missing' }
  | { kind: 'error' };

export async function getStartupCharacter(request: () => Promise<ApiResponse<CharacterSummary | null>>): Promise<CharacterLoadResult> {
  try {
    const response = await request();
    if (!response.success) return { kind: 'error' };
    return response.data ? { kind: 'loaded', character: response.data } : { kind: 'missing' };
  } catch {
    return { kind: 'error' };
  }
}
