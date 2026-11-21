export type HeroGender = 'MALE' | 'FEMALE';
export type HeroAlignment = 'IMMORTAL' | 'DEMONIC';
export type HeroPath = 'SWORD' | 'SPELL' | 'BODY';

export function heroRank(realmIndex: number): number {
  return Math.min(11, Math.max(0, Math.floor(realmIndex)));
}

export function heroVariantKey(path: HeroPath, gender: HeroGender, alignment: HeroAlignment, realmIndex: number): string {
  return `hero_${path.toLowerCase()}_${gender.toLowerCase()}_${alignment.toLowerCase()}_${heroRank(realmIndex)}`;
}

export function heroAvatarUrl(path: HeroPath, gender: HeroGender, alignment: HeroAlignment, realmIndex: number): string {
  return `/assets/v150/avatar_hero_${path.toLowerCase()}_${gender.toLowerCase()}_${alignment.toLowerCase()}_${String(heroRank(realmIndex)).padStart(2, '0')}.png`;
}

export function realmArtUrl(alignment: HeroAlignment, realmIndex: number, kind: 'crest' | 'breakthrough'): string {
  return `/assets/v150/realm_${alignment.toLowerCase()}_${String(heroRank(realmIndex)).padStart(2, '0')}_${kind}.png`;
}
