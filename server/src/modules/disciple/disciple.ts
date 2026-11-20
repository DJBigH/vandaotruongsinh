export const DISCIPLE_TEMPLATE_ID = 'disciple_liu_muoi';
export const DISCIPLE_NAME = 'Liễu Muội';
export const DISCIPLE_RECRUIT_QUEST = 'quest_main_03';
export const DISCIPLE_RECRUIT_COST = 100;
export const DISCIPLE_MAX_LEVEL = 10;

export function discipleUpgradeCost(level: number): number {
  return level >= DISCIPLE_MAX_LEVEL ? 0 : 80 * level;
}

export function discipleAttack(level: number): number {
  return 6 + 3 * level;
}
