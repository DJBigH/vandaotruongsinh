// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Realm & Cultivation Engine
// ============================================================

import {
  RealmIndex,
  REALM_NAMES,
  REALM_TIERS,
  MAX_REALM_TIER,
  CultivationPath,
} from '@shared';
import { BREAKTHROUGH_REQUIREMENTS, SKILL_TEMPLATES } from '../data/game-content';

export interface BreakthroughStatus {
  canBreakthrough: boolean;
  currentRealmName: string;
  nextRealmName: string;
  requiredExp: number;
  currentExp: number;
  currentLevel: number;
  requiredLevel: number;
  currentGold: number;
  requiredGold: number;
  missingItems: { itemId: string; name: string; quantity: number }[];
  message: string;
}

export function getBreakthroughRequirement(realmIndex: number, realmTier: number) {
  if (realmIndex === RealmIndex.DO_KIEP && realmTier === MAX_REALM_TIER) return undefined;
  return BREAKTHROUGH_REQUIREMENTS.find(
    (r) => r.realmIndex === realmIndex && r.tier === realmTier,
  );
}

export function breakthroughGoldCost(realmIndex: number, realmTier: number): number {
  if (!getBreakthroughRequirement(realmIndex, realmTier)) return 0;
  const requiredLevel = 2 + realmIndex * (MAX_REALM_TIER + 1) + realmTier;
  return 30 * requiredLevel * requiredLevel;
}

export function checkBreakthroughEligibility(
  realmIndex: number,
  realmTier: number,
  cultivationExp: bigint | number,
  inventoryItems: { templateId: string; quantity: number }[],
  level: number,
  gold: number,
): BreakthroughStatus {
  const req = getBreakthroughRequirement(realmIndex, realmTier);
  const currentExp = Number(cultivationExp);
  const currentRealmName = `${REALM_NAMES[realmIndex]} - ${REALM_TIERS[realmTier]}`;

  if (!req) {
    return {
      canBreakthrough: false,
      currentRealmName,
      nextRealmName: 'Đỉnh phong thế giới',
      requiredExp: 0,
      currentExp,
      currentLevel: level,
      requiredLevel: 0,
      currentGold: gold,
      requiredGold: 0,
      missingItems: [],
      message: 'Đã đạt đến cực hạn tu vi hiện tại!',
    };
  }

  // Next realm info
  let nextRealm = realmIndex;
  let nextTier = realmTier + 1;
  if (nextTier > MAX_REALM_TIER) {
    nextRealm += 1;
    nextTier = 0;
  }
  const nextRealmName = `${REALM_NAMES[nextRealm] || 'Đại Viên Mãn'} - ${REALM_TIERS[nextTier] || 'Sơ Kỳ'}`;

  // Check required items
  const missingItems: { itemId: string; name: string; quantity: number }[] = [];
  if (req.requiredItems) {
    for (const reqItem of req.requiredItems) {
      const owned = inventoryItems
        .filter((i) => i.templateId === reqItem.itemId)
        .reduce((sum, i) => sum + i.quantity, 0);

      if (owned < reqItem.quantity) {
        missingItems.push({
          itemId: reqItem.itemId,
          name: reqItem.itemId, // Will be formatted by caller
          quantity: reqItem.quantity - owned,
        });
      }
    }
  }

  const expMet = currentExp >= req.cultivationExp;
  const requiredLevel = 2 + realmIndex * (MAX_REALM_TIER + 1) + realmTier;
  const requiredGold = breakthroughGoldCost(realmIndex, realmTier);
  const levelMet = level >= requiredLevel;
  const goldMet = gold >= requiredGold;
  const itemsMet = missingItems.length === 0;
  const canBreakthrough = expMet && levelMet && goldMet && itemsMet;

  let message = 'Có thể tiến hành đột phá!';
  if (!levelMet) {
    message = `Cần đạt cấp ${requiredLevel} để đột phá.`;
  } else if (!goldMet) {
    message = `Cần thêm ${requiredGold - gold} linh thạch để đột phá.`;
  } else if (!expMet) {
    message = `Chưa đủ tu vi! Cần thêm ${req.cultivationExp - currentExp} điểm tu vi.`;
  } else if (!itemsMet) {
    message = `Thiếu đan dược/vật phẩm phụ trợ để đột phá an toàn!`;
  }

  return {
    canBreakthrough,
    currentRealmName,
    nextRealmName,
    requiredExp: req.cultivationExp,
    currentExp,
    currentLevel: level,
    requiredLevel,
    currentGold: gold,
    requiredGold,
    missingItems,
    message,
  };
}

export function getNewlyUnlockedSkills(
  path: CultivationPath,
  newRealmIndex: number,
  newRealmTier: number,
): string[] {
  return Object.values(SKILL_TEMPLATES)
    .filter(
      (s) =>
        s.path === path &&
        s.unlockRealmIndex === newRealmIndex &&
        s.unlockRealmTier === newRealmTier,
    )
    .map((s) => s.id);
}
