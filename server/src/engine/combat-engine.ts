// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Server-Authoritative Combat Engine
// ============================================================

import {
  CombatState,
  CombatUnitState,
  CombatAction,
  CombatRewards,
  CombatSkillState,
  ItemQuality,
  CharacterStats,
} from '@shared';
import {
  MONSTER_TEMPLATES,
  BOSS_TEMPLATES,
  SKILL_TEMPLATES,
  ITEM_TEMPLATES,
  BossTemplate,
  MonsterTemplate,
} from '../data/game-content';

/**
 * Initializes a combat state against a monster or boss
 */
export function initCombatSession(
  sessionId: string,
  character: {
    id: string;
    name: string;
    stats: CharacterStats;
    skills: { skillId: string; level: number }[];
  },
  targetId: string,
  isBoss: boolean = false,
  petBonus?: { name: string; statBonus: Partial<CharacterStats>; combatSkillDescription: string },
  sectBonus?: { name: string; statBonus: Partial<CharacterStats>; buffDescription: string },
): CombatState {
  // Setup player combat unit
  const playerSkills: CombatSkillState[] = character.skills
    .map((s) => {
      const template = SKILL_TEMPLATES[s.skillId];
      if (!template) return null;
      return {
        id: template.id,
        name: template.name,
        mpCost: template.mpCost,
        cooldown: template.cooldown,
        currentCooldown: 0,
        description: template.description,
      };
    })
    .filter(Boolean) as CombatSkillState[];

  const playerUnit: CombatUnitState = {
    id: character.id,
    name: character.name,
    isPlayer: true,
    hp: character.stats.hp,
    maxHp: character.stats.maxHp,
    mp: character.stats.mp,
    maxMp: character.stats.maxMp,
    atk: character.stats.atk,
    def: character.stats.def,
    spd: character.stats.spd,
    critRate: character.stats.critRate,
    critDmg: character.stats.critDmg,
    resist: character.stats.resist,
    effects: [],
    isDefending: false,
    skills: playerSkills,
  };

  // Apply Pet Stat Bonus
  if (petBonus?.statBonus) {
    if (petBonus.statBonus.hp) {
      playerUnit.hp += petBonus.statBonus.hp;
      playerUnit.maxHp += petBonus.statBonus.hp;
    }
    if (petBonus.statBonus.mp) {
      playerUnit.mp += petBonus.statBonus.mp;
      playerUnit.maxMp += petBonus.statBonus.mp;
    }
    if (petBonus.statBonus.atk) playerUnit.atk += petBonus.statBonus.atk;
    if (petBonus.statBonus.def) playerUnit.def += petBonus.statBonus.def;
    if (petBonus.statBonus.spd) playerUnit.spd += petBonus.statBonus.spd;
    if (petBonus.statBonus.critRate) playerUnit.critRate += petBonus.statBonus.critRate;
    if (petBonus.statBonus.critDmg) playerUnit.critDmg += petBonus.statBonus.critDmg;
    if (petBonus.statBonus.resist) playerUnit.resist += petBonus.statBonus.resist;
  }

  // Apply Sect Stat Bonus
  if (sectBonus?.statBonus) {
    if (sectBonus.statBonus.hp) {
      playerUnit.hp += sectBonus.statBonus.hp;
      playerUnit.maxHp += sectBonus.statBonus.hp;
    }
    if (sectBonus.statBonus.mp) {
      playerUnit.mp += sectBonus.statBonus.mp;
      playerUnit.maxMp += sectBonus.statBonus.mp;
    }
    if (sectBonus.statBonus.atk) playerUnit.atk += sectBonus.statBonus.atk;
    if (sectBonus.statBonus.def) playerUnit.def += sectBonus.statBonus.def;
    if (sectBonus.statBonus.spd) playerUnit.spd += sectBonus.statBonus.spd;
  }

  // Setup enemies
  const enemies: CombatUnitState[] = [];

  if (isBoss || BOSS_TEMPLATES[targetId]) {
    const boss = BOSS_TEMPLATES[targetId];
    enemies.push(createUnitFromBoss(boss));
  } else {
    const monster = MONSTER_TEMPLATES[targetId] || Object.values(MONSTER_TEMPLATES)[0];
    enemies.push(createUnitFromMonster(monster, 'enemy_1'));
  }

  // Turn order: sorted by speed descending
  const turnOrder = [playerUnit.id, ...enemies.map((e) => e.id)].sort((a, b) => {
    const spdA = a === playerUnit.id ? playerUnit.spd : enemies.find((e) => e.id === a)?.spd || 0;
    const spdB = b === playerUnit.id ? playerUnit.spd : enemies.find((e) => e.id === b)?.spd || 0;
    return spdB - spdA;
  });

  const state: CombatState = {
    id: sessionId,
    turn: 1,
    playerState: playerUnit,
    enemies,
    turnOrder,
    currentActorId: turnOrder[0],
    petBonusText: petBonus ? `Linh thú [${petBonus.name}] trợ chiến: ${petBonus.combatSkillDescription}` : undefined,
    log: [
      {
        turn: 1,
        actorId: 'system',
        actorName: 'Hệ Thống',
        action: 'START',
        message: `Trận chiến bắt đầu! Đối đầu với [${enemies[0].name}]!`,
      },
    ],
    isFinished: false,
  };

  if (petBonus) {
    state.log.push({
      turn: 1,
      actorId: 'pet',
      actorName: petBonus.name,
      action: 'PET_SUPPORT',
      message: `Linh thú [${petBonus.name}] xuất trận! Hỗ trợ: ${petBonus.combatSkillDescription}`,
    });
  }

  if (sectBonus) {
    state.log.push({
      turn: 1,
      actorId: 'sect',
      actorName: sectBonus.name,
      action: 'SECT_BUFF',
      message: `Huy hiệu môn phái [${sectBonus.name}] phát huy uy lực: ${sectBonus.buffDescription}!`,
    });
  }

  // If enemy goes first, execute enemy turns until it is player's turn
  processEnemyTurnsIfApplicable(state);

  return state;
}

function createUnitFromMonster(monster: MonsterTemplate, instanceId: string): CombatUnitState {
  return {
    id: instanceId,
    name: monster.name,
    isPlayer: false,
    hp: monster.stats.hp,
    maxHp: monster.stats.maxHp,
    mp: monster.stats.mp,
    maxMp: monster.stats.maxMp,
    atk: monster.stats.atk,
    def: monster.stats.def,
    spd: monster.stats.spd,
    critRate: monster.stats.critRate,
    critDmg: monster.stats.critDmg,
    resist: monster.stats.resist,
    effects: [],
    isDefending: false,
    skills: (monster.skills || []).map((s, idx) => ({
      id: `mon_skill_${idx}`,
      name: s.skillName,
      mpCost: s.mpCost,
      cooldown: 0,
      currentCooldown: 0,
      description: '',
    })),
  };
}

function createUnitFromBoss(boss: BossTemplate): CombatUnitState {
  const bossSkills: CombatSkillState[] = (boss.phases || []).map((p: any, idx: number) => ({
    id: `boss_skill_${idx}`,
    name: p.specialSkill || p.name || 'Tuyệt Chiêu',
    mpCost: 20,
    cooldown: 0,
    currentCooldown: 0,
    description: p.name || '',
  }));

  return {
    id: boss.id,
    name: boss.name,
    isPlayer: false,
    hp: boss.stats.hp,
    maxHp: boss.stats.maxHp,
    mp: boss.stats.mp,
    maxMp: boss.stats.maxMp,
    atk: boss.stats.atk,
    def: boss.stats.def,
    spd: boss.stats.spd,
    critRate: boss.stats.critRate,
    critDmg: boss.stats.critDmg,
    resist: boss.stats.resist,
    effects: [],
    isDefending: false,
    skills: bossSkills,
  };
}

/**
 * Calculates raw and mitigated damage
 */
export function calculateDamage(
  attacker: CombatUnitState,
  target: CombatUnitState,
  skillMultiplier: number = 1.0,
  ignoreDefPercent: number = 0,
): { damage: number; isCrit: boolean } {
  const isCrit = Math.random() * 100 < attacker.critRate;
  const critMult = isCrit ? 1.0 + (attacker.critDmg / 100) : 1.0;

  // Def reduction
  const effectiveDef = Math.max(0, target.def * (1 - ignoreDefPercent) * (target.isDefending ? 1.5 : 1.0));
  // Standard RPG formula: damage = atk * (100 / (100 + def))
  const mitigation = 100 / (100 + effectiveDef);
  const variance = 0.9 + Math.random() * 0.2; // 0.9 to 1.1

  let damage = Math.round(attacker.atk * skillMultiplier * mitigation * critMult * variance);
  damage = Math.max(1, damage); // Minimum 1 damage

  return { damage, isCrit };
}

/**
 * Executes a player action and continues enemy turns
 */
export function executePlayerAction(
  state: CombatState,
  action: CombatAction,
  skillId?: string,
  itemId?: string,
): { state: CombatState; error?: string } {
  if (state.isFinished) {
    return { state, error: 'Trận chiến đã kết thúc!' };
  }

  const player = state.playerState;
  const target = state.enemies.find((e) => e.hp > 0);

  if (!target) {
    state.isFinished = true;
    state.result = 'WIN';
    return { state };
  }

  // Reset player defend stance from previous turn
  player.isDefending = false;

  // Decrement player skill cooldowns
  for (const s of player.skills) {
    if (s.currentCooldown > 0) s.currentCooldown -= 1;
  }

  // Handle Action
  if (action === CombatAction.ATTACK) {
    const { damage, isCrit } = calculateDamage(player, target, 1.0);
    target.hp = Math.max(0, target.hp - damage);

    state.log.push({
      turn: state.turn,
      actorId: player.id,
      actorName: player.name,
      action: 'ATTACK',
      targetId: target.id,
      targetName: target.name,
      damage,
      isCrit,
      message: `${player.name} vung vũ khí tấn công ${target.name}, gây ${damage} sát thương!${isCrit ? ' (Chí mạng!)' : ''}`,
    });
  } else if (action === CombatAction.SKILL) {
    if (!skillId) return { state, error: 'Chưa chọn kỹ năng!' };
    const skill = player.skills.find((s) => s.id === skillId);
    if (!skill) return { state, error: 'Không tìm thấy kỹ năng này!' };
    if (skill.currentCooldown > 0) {
      return { state, error: `Kỹ năng đang hồi chiêu (${skill.currentCooldown} lượt nữa)!` };
    }
    if (player.mp < skill.mpCost) {
      return { state, error: 'Linh lực không đủ để thi triển chiêu thức!' };
    }

    const template = SKILL_TEMPLATES[skillId];
    player.mp -= skill.mpCost;
    skill.currentCooldown = skill.cooldown;

    let ignoreDef = 0;
    if (template?.effect?.type === 'ARMOR_BREAK') {
      ignoreDef = template.effect.value;
    }

    let multiplier = template ? template.damageMultiplier : 1.2;
    if (template?.effect?.type === 'RAGE' && player.hp / player.maxHp < 0.3) {
      multiplier *= template.effect.value;
    }

    // Special: defense buff skill
    if (template?.effect?.type === 'DEF_BUFF') {
      player.def = Math.round(player.def * (1 + template.effect.value));
      state.log.push({
        turn: state.turn,
        actorId: player.id,
        actorName: player.name,
        action: 'SKILL',
        message: `${player.name} thi triển [${skill.name}], hộ thể thần quang tăng 50% phòng ngự!`,
      });
    } else {
      const { damage, isCrit } = calculateDamage(player, target, multiplier, ignoreDef);
      target.hp = Math.max(0, target.hp - damage);

      state.log.push({
        turn: state.turn,
        actorId: player.id,
        actorName: player.name,
        action: 'SKILL',
        targetId: target.id,
        targetName: target.name,
        damage,
        isCrit,
        message: `${player.name} thi triển [${skill.name}] vào ${target.name}, gây ${damage} sát thương!${isCrit ? ' (Chí mạng!)' : ''}`,
      });
    }
  } else if (action === CombatAction.DEFEND) {
    player.isDefending = true;
    player.mp = Math.min(player.maxMp, player.mp + 10); // Defending restores 10 MP
    state.log.push({
      turn: state.turn,
      actorId: player.id,
      actorName: player.name,
      action: 'DEFEND',
      message: `${player.name} vào thế thủ kiên cố, tăng phòng ngự và hồi 10 linh lực!`,
    });
  } else if (action === CombatAction.ITEM) {
    if (!itemId) return { state, error: 'Chưa chọn vật phẩm!' };
    const template = ITEM_TEMPLATES[itemId];
    if (!template || !template.usable || !template.useEffect) {
      return { state, error: 'Vật phẩm này không thể dùng trong trận!' };
    }

    if (template.useEffect.type === 'HEAL_HP') {
      const healAmount = Math.min(template.useEffect.value, player.maxHp - player.hp);
      player.hp += healAmount;
      state.log.push({
        turn: state.turn,
        actorId: player.id,
        actorName: player.name,
        action: 'ITEM',
        healing: healAmount,
        message: `${player.name} dùng [${template.name}], hồi phục ${healAmount} sinh lực!`,
      });
    } else if (template.useEffect.type === 'HEAL_MP') {
      const healAmount = Math.min(template.useEffect.value, player.maxMp - player.mp);
      player.mp += healAmount;
      state.log.push({
        turn: state.turn,
        actorId: player.id,
        actorName: player.name,
        action: 'ITEM',
        healing: healAmount,
        message: `${player.name} dùng [${template.name}], hồi phục ${healAmount} linh lực!`,
      });
    }
  } else if (action === CombatAction.FLEE) {
    const isBossFight = state.enemies.some((e) => BOSS_TEMPLATES[e.id] !== undefined);
    if (isBossFight) {
      return { state, error: 'Không thể đào tẩu trước mặt Boss đầu lĩnh!' };
    }
    const fleeChance = 0.6;
    if (Math.random() < fleeChance) {
      state.isFinished = true;
      state.result = 'FLEE';
      state.log.push({
        turn: state.turn,
        actorId: player.id,
        actorName: player.name,
        action: 'FLEE',
        message: `${player.name} thi triển thuật độn thổ đào tẩu thành công!`,
      });
      return { state };
    } else {
      state.log.push({
        turn: state.turn,
        actorId: player.id,
        actorName: player.name,
        action: 'FLEE',
        message: `${player.name} tìm đường đào tẩu nhưng bị kẻ địch chặn lại!`,
      });
    }
  }

  // Check victory condition
  if (state.enemies.every((e) => e.hp <= 0)) {
    state.isFinished = true;
    state.result = 'WIN';
    state.rewards = generateCombatRewards(state.enemies);
    state.log.push({
      turn: state.turn,
      actorId: 'system',
      actorName: 'Hệ Thống',
      action: 'WIN',
      message: `Chiến thắng rực rỡ! Nhận được ${state.rewards.exp} kinh nghiệm, ${state.rewards.gold} linh thạch!`,
    });
    return { state };
  }

  // Increment turn and execute enemy actions
  state.turn += 1;
  processEnemyTurnsIfApplicable(state);

  // Check defeat condition
  if (state.playerState.hp <= 0) {
    state.isFinished = true;
    state.result = 'LOSE';
    state.log.push({
      turn: state.turn,
      actorId: 'system',
      actorName: 'Hệ Thống',
      action: 'LOSE',
      message: `${player.name} kiệt sức ngã xuống, được linh khí đại địa bảo vệ trở về điểm an toàn.`,
    });
  }

  return { state };
}

/**
 * Handles all alive enemies performing their attacks
 */
function processEnemyTurnsIfApplicable(state: CombatState) {
  const player = state.playerState;

  for (const enemy of state.enemies) {
    if (enemy.hp <= 0 || state.isFinished) continue;

    // Check if enemy is a boss
    const bossTemplate = BOSS_TEMPLATES[enemy.id];
    if (bossTemplate) {
      executeBossAI(state, enemy, bossTemplate, player);
    } else {
      // Normal monster AI
      const { damage, isCrit } = calculateDamage(enemy, player, 1.0);
      player.hp = Math.max(0, player.hp - damage);

      state.log.push({
        turn: state.turn,
        actorId: enemy.id,
        actorName: enemy.name,
        action: 'ATTACK',
        targetId: player.id,
        targetName: player.name,
        damage,
        isCrit,
        message: `${enemy.name} hung hãn lao tới cắn xé ${player.name}, gây ${damage} sát thương!`,
      });
    }

    if (player.hp <= 0) break;
  }
}

/**
 * Executes Boss phase-based AI mechanics
 */
function executeBossAI(
  state: CombatState,
  bossUnit: CombatUnitState,
  template: BossTemplate,
  player: CombatUnitState,
) {
  const hpPercent = bossUnit.hp / bossUnit.maxHp;

  // Xích Nha Lang Vương mechanics
  if (template.id === 'boss_001') {
    if (hpPercent < 0.5 && !bossUnit.effects.some((e) => e.name === 'Cuồng Nộ')) {
      // Phase 2 Enrage
      bossUnit.atk = Math.round(bossUnit.atk * 1.3);
      bossUnit.effects.push({
        id: 'enrage',
        name: 'Cuồng Nộ',
        type: 'BUFF',
        value: 0.3,
        duration: 99,
        stackable: false,
      });
      state.log.push({
        turn: state.turn,
        actorId: bossUnit.id,
        actorName: bossUnit.name,
        action: 'PHASE_CHANGE',
        message: `⚠️ [${bossUnit.name}] gầm lên kinh thiên động địa, rơi vào trạng thái CUỒNG NỘ! Công kích tăng 30%!`,
      });
    }

    // Boss attack selection
    const rand = Math.random();
    if (rand < 0.3) {
      // Sang Huyết Trảm / Huyết Nhận
      const { damage } = calculateDamage(bossUnit, player, 1.4);
      player.hp = Math.max(0, player.hp - damage);
      state.log.push({
        turn: state.turn,
        actorId: bossUnit.id,
        actorName: bossUnit.name,
        action: 'SKILL',
        damage,
        message: `🐺 ${bossUnit.name} phóng ra Huyết Trảm đỏ rực, gây ${damage} sát thương và làm rách giáp!`,
      });
    } else {
      // Normal attack
      const { damage, isCrit } = calculateDamage(bossUnit, player, 1.0);
      player.hp = Math.max(0, player.hp - damage);
      state.log.push({
        turn: state.turn,
        actorId: bossUnit.id,
        actorName: bossUnit.name,
        action: 'ATTACK',
        damage,
        isCrit,
        message: `${bossUnit.name} vung vuốt sói sắc lẹm chém vào ${player.name}, gây ${damage} sát thương!`,
      });
    }
  } else {
    // Generic boss behavior
    const { damage } = calculateDamage(bossUnit, player, 1.1);
    player.hp = Math.max(0, player.hp - damage);
    state.log.push({
      turn: state.turn,
      actorId: bossUnit.id,
      actorName: bossUnit.name,
      action: 'ATTACK',
      damage,
      message: `${bossUnit.name} thi triển đại pháp uy chấn, gây ${damage} sát thương lên ${player.name}!`,
    });
  }
}

/**
 * Calculates drop loot, exp, gold from defeated enemies
 */
function generateCombatRewards(enemies: CombatUnitState[]): CombatRewards {
  let totalExp = 0;
  let totalGold = 0;
  let totalCultivationExp = 0;
  const items: { itemTemplateId: string; quantity: number; name: string; quality: ItemQuality }[] = [];

  for (const enemy of enemies) {
    const boss = BOSS_TEMPLATES[enemy.id];
    const monster = MONSTER_TEMPLATES[enemy.id] || Object.values(MONSTER_TEMPLATES).find((m) => m.name === enemy.name);

    if (boss) {
      totalExp += boss.expReward || 150;
      const goldAmt = typeof boss.goldReward === 'number' ? boss.goldReward : (boss.goldReward as any)?.min || 80;
      totalGold += goldAmt;
      totalCultivationExp += boss.cultivationExpReward || 120;

      if (boss.drops) {
        for (const drop of boss.drops) {
          const chance = (drop as any).chance ?? (drop as any).rate ?? 0.5;
          const itemId = (drop as any).itemTemplateId ?? (drop as any).itemId;
          const minQ = (drop as any).minQuantity ?? (drop as any).minQty ?? 1;
          const maxQ = (drop as any).maxQuantity ?? (drop as any).maxQty ?? 1;

          if (Math.random() <= chance) {
            const tmpl = ITEM_TEMPLATES[itemId];
            if (tmpl) {
              const qty = Math.floor(Math.random() * (maxQ - minQ + 1)) + minQ;
              items.push({
                itemTemplateId: tmpl.id,
                quantity: qty,
                name: tmpl.name,
                quality: tmpl.quality,
              });
            }
          }
        }
      }
    } else if (monster) {
      totalExp += monster.expReward || 20;
      const goldAmt = typeof monster.goldReward === 'number' ? monster.goldReward : (monster.goldReward as any)?.min || 10;
      totalGold += goldAmt;
      totalCultivationExp += monster.cultivationExpReward || 15;

      if (monster.drops) {
        for (const drop of monster.drops) {
          const chance = (drop as any).chance ?? (drop as any).rate ?? 0.5;
          const itemId = (drop as any).itemTemplateId ?? (drop as any).itemId;
          const minQ = (drop as any).minQuantity ?? (drop as any).minQty ?? 1;
          const maxQ = (drop as any).maxQuantity ?? (drop as any).maxQty ?? 1;

          if (Math.random() <= chance) {
            const tmpl = ITEM_TEMPLATES[itemId];
            if (tmpl) {
              const qty = Math.floor(Math.random() * (maxQ - minQ + 1)) + minQ;
              items.push({
                itemTemplateId: tmpl.id,
                quantity: qty,
                name: tmpl.name,
                quality: tmpl.quality,
              });
            }
          }
        }
      }
    } else {
      totalExp += 25;
      totalGold += 10;
      totalCultivationExp += 10;
    }
  }

  return {
    exp: totalExp,
    gold: totalGold,
    cultivationExp: totalCultivationExp,
    items,
  };
}
