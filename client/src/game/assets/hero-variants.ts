export type HeroGender = 'MALE' | 'FEMALE';
export type HeroAlignment = 'IMMORTAL' | 'DEMONIC';
export type HeroPath = 'SWORD' | 'SPELL' | 'BODY';

export function heroRank(realmIndex: number): number {
  return Math.min(3, Math.max(0, Math.floor(realmIndex / 2)));
}

export function heroVariantKey(path: HeroPath, gender: HeroGender, alignment: HeroAlignment, realmIndex: number): string {
  return `hero_${path.toLowerCase()}_${gender.toLowerCase()}_${alignment.toLowerCase()}_${heroRank(realmIndex)}`;
}
