// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Real-Time ARPG Engine (Server-Authoritative)
// Tick rate: 20 ticks / sec (50ms timestep)
// ============================================================

import {
  CultivationPath,
  CharacterStats,
  EntitySnapshot,
  ProjectileSnapshot,
  TelegraphSnapshot,
  FloatingTextEvent,
  PlayerInputPayload,
  WsServerMessage,
  DEFAULT_DODGE_CONFIG,
  SkillTargetType,
} from '@shared';
import { MAP_TEMPLATES } from '../data/maps';
import { MONSTER_TEMPLATES, MonsterTemplate } from '../data/monsters';
import { BOSS_TEMPLATES, BossTemplate } from '../data/bosses';
import { SKILL_TEMPLATES, getSkillRealtimeData } from '../data/skills';
import { computeCharacterStats } from '../modules/character/stats';
import { prisma } from '../index';
import { updateQuestProgress } from '../modules/quest/quest-engine';

export interface ArpgMonsterEntity {
  id: string;
  spawnId: string;
  templateId: string;
  name: string;
  isBoss: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  spawnX: number;
  spawnY: number;
  facingAngle: number;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  spd: number;
  state: 'IDLE' | 'PATROL' | 'CHASE' | 'WINDUP' | 'ATTACK' | 'RETURN' | 'DEAD' | 'ENRAGED';
  targetId: string | null;
  lastAttackTime: number;
  windupEndTime: number;
  currentPhase: number;
  respawnAt: number;
  template: MonsterTemplate | BossTemplate;
  hasBeenRewarded?: boolean;
}

export interface ArpgProjectile {
  id: string;
  ownerId: string;
  isPlayer: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  color: number;
  type: string;
  expiresAt: number;
  piercedTargetIds: Set<string>;
}

export interface ArpgTelegraph {
  id: string;
  bossId: string;
  shape: 'CIRCLE' | 'RECTANGLE';
  x: number;
  y: number;
  radius?: number;
  width?: number;
  height?: number;
  angle?: number;
  damage: number;
  durationSec: number;
  triggersAt: number;
  expiresAt: number;
}

export interface ArpgPlayerState {
  id: string;
  characterId: string;
  name: string;
  cultivationPath: CultivationPath;
  realmIndex: number;
  realmTier: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facingAngle: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  stats: CharacterStats;
  state: 'IDLE' | 'MOVING' | 'ATTACKING' | 'WINDUP' | 'DODGING' | 'HURT' | 'DEAD';
  isInvulnerable: boolean;
  dodgeEndTime: number;
  dodgeIframeEndTime: number;
  lastDodgeTime: number;
  lastAttackTime: number;
  skillCooldowns: Map<string, number>; // skillId -> readyAt timestamp
  equippedSkillIds: string[];
  lastHeartbeat: number;
}

export class ArpgGameSession {
  public characterId: string;
  public mapId: string;
  public player: ArpgPlayerState;
  public monsters: ArpgMonsterEntity[] = [];
  public projectiles: ArpgProjectile[] = [];
  public telegraphs: ArpgTelegraph[] = [];
  public floatingTexts: FloatingTextEvent[] = [];

  public tickCount: number = 0;
  public isPaused: boolean = false;
  public isTerminated: boolean = false;
  private nextEntityId: number = 1000;

  // Simultaneous death tracking and reward queuing per tick
  public pendingKillsInTick: ArpgMonsterEntity[] = [];
  public playerDiedInTick: boolean = false;
  public lastKillerName: string = 'Địch thủ';

  // Callback to broadcast to the player's WebSocket
  public sendSnapshotCallback: ((msg: WsServerMessage) => void) | null = null;

  constructor(character: any, mapId: string = 'map_thanh_khe_rung') {
    this.characterId = character.id;
    this.mapId = mapId;

    // 1. Calculate effective stats
    const equippedItems = character.inventory?.filter((i: any) => i.isEquipped).map((i: any) => ({ templateId: i.templateId })) || [];
    const stats = computeCharacterStats(
      character.cultivationPath as CultivationPath,
      character.realmIndex,
      character.realmTier,
      equippedItems
    );

    // 2. Equipped skills
    const equippedSkills = character.skills?.filter((s: any) => s.isEquipped).map((s: any) => s.skillId) || [];
    if (equippedSkills.length === 0) {
      if (character.cultivationPath === CultivationPath.SWORD) equippedSkills.push('skill_sword_01');
      else if (character.cultivationPath === CultivationPath.SPELL) equippedSkills.push('skill_spell_01');
      else equippedSkills.push('skill_body_01');
    }

    // 3. Spawn Coordinates from map
    const map = MAP_TEMPLATES[mapId] || MAP_TEMPLATES['map_thanh_khe'];
    const spawnX = (map.spawnPoint?.x ?? 3) * map.tileSize;
    const spawnY = (map.spawnPoint?.y ?? 3) * map.tileSize;

    this.player = {
      id: character.id,
      characterId: character.id,
      name: character.name,
      cultivationPath: character.cultivationPath as CultivationPath,
      realmIndex: character.realmIndex,
      realmTier: character.realmTier,
      x: spawnX,
      y: spawnY,
      vx: 0,
      vy: 0,
      facingAngle: 0,
      hp: stats.maxHp,
      maxHp: stats.maxHp,
      mp: stats.maxMp,
      maxMp: stats.maxMp,
      stats,
      state: 'IDLE',
      isInvulnerable: false,
      dodgeEndTime: 0,
      dodgeIframeEndTime: 0,
      lastDodgeTime: 0,
      lastAttackTime: 0,
      skillCooldowns: new Map(),
      equippedSkillIds: equippedSkills.slice(0, 4),
      lastHeartbeat: Date.now(),
    };

    // 4. Initialize monsters from map
    this.initMonstersForMap(map);
  }

  private initMonstersForMap(map: any) {
    this.monsters = [];
    if (!map.monsters || map.monsters.length === 0) return;

    for (const spawn of map.monsters) {
      const isBoss = spawn.monsterId.startsWith('boss_');
      const template = isBoss ? BOSS_TEMPLATES[spawn.monsterId] : MONSTER_TEMPLATES[spawn.monsterId];
      if (!template) continue;

      const sx = spawn.position.x * map.tileSize;
      const sy = spawn.position.y * map.tileSize;

      this.monsters.push({
        id: `m_${this.nextEntityId++}`,
        spawnId: spawn.id,
        templateId: spawn.monsterId,
        name: template.name,
        isBoss,
        x: sx,
        y: sy,
        vx: 0,
        vy: 0,
        spawnX: sx,
        spawnY: sy,
        facingAngle: 0,
        hp: template.stats.maxHp,
        maxHp: template.stats.maxHp,
        atk: template.stats.atk,
        def: template.stats.def,
        spd: template.stats.spd,
        state: 'IDLE',
        targetId: null,
        lastAttackTime: 0,
        windupEndTime: 0,
        currentPhase: 1,
        respawnAt: 0,
        template,
      });
    }
  }

  // --- Input Processing ---
  public handleInput(input: PlayerInputPayload) {
    if (this.isPaused || this.player.hp <= 0) return;
    const now = Date.now();

    // 1. Angle & Facing
    if (typeof input.angle === 'number') {
      this.player.facingAngle = input.angle;
    }

    // 2. Movement (unless dodging or in attack windup)
    if (this.player.state !== 'DODGING') {
      const speed = this.player.stats.spd * 12; // Base movement speed
      const len = Math.hypot(input.moveX, input.moveY);
      if (len > 0.05) {
        this.player.vx = (input.moveX / len) * speed;
        this.player.vy = (input.moveY / len) * speed;
        if (this.player.state === 'IDLE') this.player.state = 'MOVING';
      } else {
        this.player.vx = 0;
        this.player.vy = 0;
        if (this.player.state === 'MOVING') this.player.state = 'IDLE';
      }
    }

    // 3. Actions
    if (input.action && input.action !== 'NONE') {
      if (input.action === 'DODGE') {
        this.tryDodge(now, input.moveX, input.moveY);
      } else if (input.action === 'ATTACK') {
        this.tryBasicAttack(now);
      } else if (input.action.startsWith('SKILL_')) {
        const skillIndex = parseInt(input.action.replace('SKILL_', ''), 10) - 1;
        this.trySkill(now, skillIndex, input.targetX, input.targetY);
      }
    }
  }

  // --- Dodge Action ---
  private tryDodge(now: number, moveX: number, moveY: number) {
    const dodgeCfg = DEFAULT_DODGE_CONFIG;
    if (now - this.player.lastDodgeTime < dodgeCfg.cooldownSec * 1000) return;
    if (this.player.mp < dodgeCfg.mpCost) return;

    this.player.mp -= dodgeCfg.mpCost;
    this.player.lastDodgeTime = now;
    this.player.dodgeEndTime = now + dodgeCfg.durationSec * 1000;
    this.player.dodgeIframeEndTime = now + dodgeCfg.iframeSec * 1000;
    this.player.isInvulnerable = true;
    this.player.state = 'DODGING';

    // Dash vector
    let dx = moveX;
    let dy = moveY;
    if (Math.hypot(dx, dy) < 0.1) {
      dx = Math.cos(this.player.facingAngle);
      dy = Math.sin(this.player.facingAngle);
    }
    const len = Math.hypot(dx, dy) || 1;
    const dashSpeed = (dodgeCfg.distance / dodgeCfg.durationSec);
    this.player.vx = (dx / len) * dashSpeed;
    this.player.vy = (dy / len) * dashSpeed;

    this.addFloatingText(this.player.x, this.player.y - 20, 'LƯỚT NÉ!', '#00ffff');
  }

  // --- Basic Attack Action ---
  private tryBasicAttack(now: number) {
    if (now - this.player.lastAttackTime < 400) return; // 0.4s cooldown
    this.player.lastAttackTime = now;

    if (this.player.cultivationPath === CultivationPath.SPELL) {
      // Pháp Tu basic attack: projectile magic dart
      const speed = 440;
      this.projectiles.push({
        id: `p_${this.nextEntityId++}`,
        ownerId: this.player.id,
        isPlayer: true,
        x: this.player.x,
        y: this.player.y,
        vx: Math.cos(this.player.facingAngle) * speed,
        vy: Math.sin(this.player.facingAngle) * speed,
        radius: 12,
        damage: Math.max(1, this.player.stats.atk),
        color: 0x44aaff,
        type: 'MAGIC_BOLT',
        expiresAt: now + 1200,
        piercedTargetIds: new Set(),
      });
    } else {
      // Kiếm Tu & Thể Tu: Melee slash cone in front
      const range = 85;
      const angle = this.player.facingAngle;

      for (const m of this.monsters) {
        if (m.state === 'DEAD') continue;
        const dist = Math.hypot(m.x - this.player.x, m.y - this.player.y);
        if (dist <= range) {
          const toMonsterAngle = Math.atan2(m.y - this.player.y, m.x - this.player.x);
          let diff = Math.abs(angle - toMonsterAngle);
          while (diff > Math.PI) diff = Math.abs(diff - 2 * Math.PI);
          if (diff < Math.PI / 2.5) {
            this.applyDamageToMonster(m, this.player.stats.atk, 1.0, false);
          }
        }
      }
    }
  }

  // --- Skill Action ---
  private trySkill(now: number, index: number, targetX?: number, targetY?: number) {
    const skillId = this.player.equippedSkillIds[index];
    if (!skillId) return;

    const template = SKILL_TEMPLATES[skillId];
    if (!template) return;

    const rt = getSkillRealtimeData(template);
    const readyAt = this.player.skillCooldowns.get(skillId) || 0;
    if (now < readyAt) return;
    if (this.player.mp < rt.mpCost) {
      this.addFloatingText(this.player.x, this.player.y - 20, 'Không đủ Linh Lực!', '#ff5555');
      return;
    }

    // Deduct MP & apply cooldown
    this.player.mp -= rt.mpCost;
    this.player.skillCooldowns.set(skillId, now + rt.cooldownSec * 1000);

    const dmg = this.player.stats.atk * rt.dmgMultiplier;

    if (rt.targetType === SkillTargetType.PROJECTILE) {
      const speed = rt.projectileSpeed || 420;
      this.projectiles.push({
        id: `p_${this.nextEntityId++}`,
        ownerId: this.player.id,
        isPlayer: true,
        x: this.player.x,
        y: this.player.y,
        vx: Math.cos(this.player.facingAngle) * speed,
        vy: Math.sin(this.player.facingAngle) * speed,
        radius: rt.radius || 24,
        damage: dmg,
        color: 0xffaa00,
        type: 'SKILL_BEAM',
        expiresAt: now + (rt.projectileDuration || 1.2) * 1000,
        piercedTargetIds: new Set(),
      });
      this.addFloatingText(this.player.x, this.player.y - 25, template.name, '#ffd700');
    } else if (rt.targetType === SkillTargetType.AOE_TARGET) {
      const tx = targetX ?? this.player.x + Math.cos(this.player.facingAngle) * rt.range;
      const ty = targetY ?? this.player.y + Math.sin(this.player.facingAngle) * rt.range;
      const radius = rt.radius || 90;

      for (const m of this.monsters) {
        if (m.state === 'DEAD') continue;
        if (Math.hypot(m.x - tx, m.y - ty) <= radius) {
          this.applyDamageToMonster(m, dmg, 1.2, true);
        }
      }
      this.addFloatingText(tx, ty, `💥 ${template.name}`, '#ffaa33');
    } else if (rt.targetType === SkillTargetType.DASH_ATTACK) {
      // Dash forward dealing damage
      const dashDist = rt.range || 150;
      const nx = this.player.x + Math.cos(this.player.facingAngle) * dashDist;
      const ny = this.player.y + Math.sin(this.player.facingAngle) * dashDist;
      this.player.x = nx;
      this.player.y = ny;

      for (const m of this.monsters) {
        if (m.state === 'DEAD') continue;
        if (Math.hypot(m.x - nx, m.y - ny) <= (rt.radius || 60)) {
          this.applyDamageToMonster(m, dmg, 1.3, true);
        }
      }
      this.addFloatingText(nx, ny, `⚡ ${template.name}`, '#ff44ff');
    } else if (rt.targetType === SkillTargetType.SELF) {
      // Buff
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + Math.round(this.player.maxHp * 0.25));
      this.addFloatingText(this.player.x, this.player.y - 30, `🛡️ ${template.name}`, '#44ff44');
    } else {
      // Melee arc
      for (const m of this.monsters) {
        if (m.state === 'DEAD') continue;
        if (Math.hypot(m.x - this.player.x, m.y - this.player.y) <= rt.range) {
          this.applyDamageToMonster(m, dmg, 1.0, false);
        }
      }
      this.addFloatingText(this.player.x, this.player.y - 25, template.name, '#ffff44');
    }
  }

  // --- Damage Calculations ---
  private applyDamageToMonster(monster: ArpgMonsterEntity, rawAtk: number, multiplier: number, isSkill: boolean) {
    const isCrit = Math.random() * 100 < this.player.stats.critRate;
    const critMult = isCrit ? (1 + this.player.stats.critDmg / 100) : 1;
    const effectiveAtk = rawAtk * multiplier * critMult;
    const damage = Math.max(1, Math.round(effectiveAtk - monster.def * 0.5));

    monster.hp = Math.max(0, monster.hp - damage);
    this.addFloatingText(monster.x, monster.y - 20, `${damage}${isCrit ? ' 💥' : ''}`, isCrit ? '#ff2222' : '#ffffff', isCrit);

    // Boss Enrage check
    if (monster.isBoss && monster.hp > 0 && monster.currentPhase === 1) {
      const boss = monster.template as BossTemplate;
      const phase2 = boss.phases?.[0];
      if (phase2 && monster.hp / monster.maxHp <= phase2.triggerHpPercent) {
        monster.currentPhase = 2;
        monster.state = 'ENRAGED';
        monster.atk = Math.round(monster.atk * 1.35);
        monster.spd = Math.round(monster.spd * 1.25);
        this.addFloatingText(monster.x, monster.y - 40, `🔥 CUỒNG BẠO: ${phase2.dialogue}`, '#ff0000', true);
      }
    }

    if (monster.hp <= 0 && monster.state !== 'DEAD') {
      monster.state = 'DEAD';
      monster.respawnAt = Date.now() + 25000;
      this.pendingKillsInTick.push(monster);
      this.addFloatingText(monster.x, monster.y - 30, '💀 BỊ TIÊU DIỆT!', '#ffdd44');
    }
  }

  private applyDamageToPlayer(rawAtk: number, sourceName: string) {
    if (this.player.isInvulnerable || this.player.state === 'DEAD') return;

    const damage = Math.max(1, Math.round(rawAtk - this.player.stats.def * 0.4));
    this.player.hp = Math.max(0, this.player.hp - damage);
    this.addFloatingText(this.player.x, this.player.y - 20, `-${damage}`, '#ff3333');

    if (this.player.hp <= 0) {
      this.player.state = 'DEAD';
      this.player.vx = 0;
      this.player.vy = 0;
      this.playerDiedInTick = true;
      this.lastKillerName = sourceName;
    }
  }

  // --- Death & Reward Resolvers ---
  private async commitMonsterDeathRewards(monster: ArpgMonsterEntity) {
    const exp = monster.template.expReward;
    const gold = monster.template.goldReward;
    const itemsGained: { itemId: string; name: string; quantity: number }[] = [];

    // Drop generation
    for (const drop of monster.template.drops) {
      if (Math.random() <= drop.chance) {
        const qty = Math.floor(Math.random() * (drop.maxQuantity - drop.minQuantity + 1)) + drop.minQuantity;
        itemsGained.push({ itemId: drop.itemTemplateId, name: drop.itemTemplateId, quantity: qty });
      }
    }

    // Persist to Database asynchronously via Transaction
    try {
      await prisma.$transaction(async (tx) => {
        // Add EXP & Gold
        await tx.character.update({
          where: { id: this.characterId },
          data: {
            exp: { increment: exp },
            gold: { increment: gold },
            cultivationExp: { increment: monster.template.cultivationExpReward },
          },
        });

        // Add items
        for (const it of itemsGained) {
          const existing = await tx.inventoryItem.findFirst({
            where: { characterId: this.characterId, templateId: it.itemId, isEquipped: false },
          });
          if (existing) {
            await tx.inventoryItem.update({
              where: { id: existing.id },
              data: { quantity: { increment: it.quantity } },
            });
          } else {
            await tx.inventoryItem.create({
              data: {
                characterId: this.characterId,
                templateId: it.itemId,
                quantity: it.quantity,
              },
            });
          }
        }

        // Advance Quest Progress
        await updateQuestProgress(tx as any, this.characterId, 'KILL', monster.templateId, 1);
      });
    } catch (err) {
      console.error('Lỗi khi quyết toán phần thưởng diệt quái:', err);
    }

    // Notify player
    if (this.sendSnapshotCallback) {
      this.sendSnapshotCallback({
        type: 'REWARDS',
        serverTime: Date.now(),
        rewards: {
          exp,
          spiritStones: gold,
          items: itemsGained,
        },
      });
    }
  }

  private handlePlayerDeath(killerName: string) {
    this.player.state = 'DEAD';
    this.player.vx = 0;
    this.player.vy = 0;

    // Check simultaneous death rule
    // "Mặc định: nếu nhân vật chính và boss cùng chết trong một bước xử lý, trận tính thất bại và không cấp thưởng thắng boss."
    const deadBoss = this.monsters.find(m => m.isBoss && m.hp <= 0 && m.state === 'DEAD');
    if (deadBoss) {
      this.addFloatingText(this.player.x, this.player.y - 45, 'CÙNG CHẾT! TRẬN ĐẤU THẤT BẠI!', '#ff0000', true);
    }

    // Respawn player after 2 seconds at safe point
    setTimeout(() => {
      this.player.hp = this.player.maxHp;
      this.player.mp = this.player.maxMp;
      this.player.state = 'IDLE';

      const map = MAP_TEMPLATES[this.mapId] || MAP_TEMPLATES['map_thanh_khe'];
      this.player.x = (map.spawnPoint?.x ?? 3) * map.tileSize;
      this.player.y = (map.spawnPoint?.y ?? 3) * map.tileSize;

      // Reset any active boss
      for (const m of this.monsters) {
        if (m.isBoss) {
          m.hp = m.maxHp;
          m.state = 'IDLE';
          m.currentPhase = 1;
        }
      }

      if (this.sendSnapshotCallback) {
        this.sendSnapshotCallback({
          type: 'DEATH',
          serverTime: Date.now(),
          error: `Đạo thân trọng thương bởi ${killerName}! Đã hồi sinh tại điểm an toàn.`,
        });
      }
    }, 2000);
  }

  // --- Fixed Simulation Tick (50ms) ---
  public tick(dt: number) {
    if (this.isPaused || this.isTerminated) return;
    const now = Date.now();
    this.tickCount++;

    // 1. Update Player State
    if (this.player.state === 'DODGING' && now >= this.player.dodgeEndTime) {
      this.player.state = 'IDLE';
      this.player.vx = 0;
      this.player.vy = 0;
    }
    if (this.player.isInvulnerable && now >= this.player.dodgeIframeEndTime) {
      this.player.isInvulnerable = false;
    }

    // Move player
    this.player.x += this.player.vx * dt;
    this.player.y += this.player.vy * dt;

    // Clamp to map bounds
    const map = MAP_TEMPLATES[this.mapId] || { width: 30, height: 25, tileSize: 32 };
    const maxX = (map.width - 1) * map.tileSize;
    const maxY = (map.height - 1) * map.tileSize;
    this.player.x = Math.max(map.tileSize, Math.min(maxX, this.player.x));
    this.player.y = Math.max(map.tileSize, Math.min(maxY, this.player.y));

    // Passive MP regen (1% per second)
    if (this.tickCount % 20 === 0 && this.player.mp < this.player.maxMp) {
      this.player.mp = Math.min(this.player.maxMp, this.player.mp + Math.max(1, Math.round(this.player.maxMp * 0.02)));
    }

    // 2. Update Projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (now >= p.expiresAt || p.x < 0 || p.x > maxX || p.y < 0 || p.y > maxY) {
        this.projectiles.splice(i, 1);
        continue;
      }

      // Hit checks
      if (p.isPlayer) {
        for (const m of this.monsters) {
          if (m.state === 'DEAD' || p.piercedTargetIds.has(m.id)) continue;
          if (Math.hypot(m.x - p.x, m.y - p.y) <= p.radius + 18) {
            this.applyDamageToMonster(m, p.damage, 1.0, true);
            p.piercedTargetIds.add(m.id);
            if (p.type !== 'SKILL_BEAM' || p.piercedTargetIds.size >= 2) {
              this.projectiles.splice(i, 1);
              break;
            }
          }
        }
      } else {
        // Monster projectile hitting player
        if (!this.player.isInvulnerable && Math.hypot(this.player.x - p.x, this.player.y - p.y) <= p.radius + 16) {
          this.applyDamageToPlayer(p.damage, 'Đạn ma pháp');
          this.projectiles.splice(i, 1);
        }
      }
    }

    // 3. Update Telegraphs (Red Warning AoE Zones)
    for (let i = this.telegraphs.length - 1; i >= 0; i--) {
      const tg = this.telegraphs[i];
      if (now >= tg.triggersAt) {
        // Strike now!
        const dist = Math.hypot(this.player.x - tg.x, this.player.y - tg.y);
        const radius = tg.radius || 90;
        if (dist <= radius) {
          this.applyDamageToPlayer(tg.damage, 'Đòn Tuyệt Kỹ Báo Trước');
        }
        this.telegraphs.splice(i, 1);
      }
    }

    // 4. Update Monsters & Boss AI
    for (const m of this.monsters) {
      if (m.state === 'DEAD') {
        if (now >= m.respawnAt) {
          m.hp = m.maxHp;
          m.x = m.spawnX;
          m.y = m.spawnY;
          m.state = 'IDLE';
          m.hasBeenRewarded = false;
        }
        continue;
      }

      const distToPlayer = Math.hypot(this.player.x - m.x, this.player.y - m.y);
      const aggroRange = m.isBoss ? 350 : 200;
      const attackRange = m.isBoss ? 75 : 45;

      if (distToPlayer <= aggroRange && this.player.state !== 'DEAD') {
        m.targetId = this.player.id;
        m.facingAngle = Math.atan2(this.player.y - m.y, this.player.x - m.x);

        if (distToPlayer > attackRange) {
          // Chase player
          const speed = m.spd * 8;
          m.vx = Math.cos(m.facingAngle) * speed;
          m.vy = Math.sin(m.facingAngle) * speed;
          m.x += m.vx * dt;
          m.y += m.vy * dt;
          m.state = 'CHASE';
        } else {
          // In attack range
          m.vx = 0;
          m.vy = 0;

          if (m.state !== 'WINDUP' && now - m.lastAttackTime >= (m.isBoss ? 2000 : 1600)) {
            m.state = 'WINDUP';
            const windupDuration = m.isBoss ? 800 : 400;
            m.windupEndTime = now + windupDuration;

            // Boss spawns telegraph red circle!
            if (m.isBoss) {
              this.telegraphs.push({
                id: `tg_${this.nextEntityId++}`,
                bossId: m.id,
                shape: 'CIRCLE',
                x: this.player.x,
                y: this.player.y,
                radius: 80,
                damage: Math.round(m.atk * 1.5),
                durationSec: windupDuration / 1000,
                triggersAt: m.windupEndTime,
                expiresAt: m.windupEndTime + 100,
              });
            }
          } else if (m.state === 'WINDUP' && now >= m.windupEndTime) {
            // Strike execution
            m.state = 'ATTACK';
            m.lastAttackTime = now;
            if (!m.isBoss) {
              if (distToPlayer <= attackRange + 15) {
                this.applyDamageToPlayer(m.atk, m.name);
              }
            }
          }
        }
      } else {
        // Return to spawn point
        const distToSpawn = Math.hypot(m.spawnX - m.x, m.spawnY - m.y);
        if (distToSpawn > 10) {
          const angle = Math.atan2(m.spawnY - m.y, m.spawnX - m.x);
          const speed = m.spd * 5;
          m.x += Math.cos(angle) * speed * dt;
          m.y += Math.sin(angle) * speed * dt;
          m.state = 'RETURN';
        } else {
          m.state = 'IDLE';
        }
      }
    }

    // 5. Resolve Deaths, Simultaneous Death Rules & Reward Commitments
    if (this.playerDiedInTick || this.player.state === 'DEAD') {
      const hadBossInTick = this.pendingKillsInTick.some(m => m.isBoss);
      if (hadBossInTick) {
        // CÙNG CHẾT: Nhân vật và Boss cùng chết trong một bước xử lý -> Thất bại! Không cấp thưởng thắng boss.
        this.addFloatingText(this.player.x, this.player.y - 45, 'CÙNG CHẾT! TRẬN ĐẤU THẤT BẠI!', '#ff0000', true);
      }
      // Khi người chơi chết, huỷ bỏ toàn bộ phần thưởng giết quái/boss chưa cam kết trong tick này
      this.pendingKillsInTick = [];
      if (this.playerDiedInTick) {
        this.handlePlayerDeath(this.lastKillerName);
        this.playerDiedInTick = false;
      }
    } else {
      // Người chơi còn sống -> Trao thưởng hợp lệ cho các quái bị hạ gục
      for (const m of this.pendingKillsInTick) {
        if (!m.hasBeenRewarded) {
          m.hasBeenRewarded = true;
          this.commitMonsterDeathRewards(m);
        }
      }
      this.pendingKillsInTick = [];
    }

    // 6. Send Snapshot to WebSocket
    if (this.sendSnapshotCallback) {
      this.sendSnapshotCallback(this.createSnapshot(now));
    }

    // Clear one-time floating texts
    this.floatingTexts = [];
  }

  private addFloatingText(x: number, y: number, text: string, color: string, isCrit?: boolean) {
    this.floatingTexts.push({
      id: `ft_${this.nextEntityId++}`,
      x,
      y,
      text,
      color,
      isCrit,
    });
  }

  public createSnapshot(now: number): WsServerMessage {
    const playerSnapshot: EntitySnapshot = {
      id: this.player.id,
      name: this.player.name,
      type: 'PLAYER',
      x: Math.round(this.player.x),
      y: Math.round(this.player.y),
      vx: Math.round(this.player.vx),
      vy: Math.round(this.player.vy),
      facingAngle: Number(this.player.facingAngle.toFixed(3)),
      hp: this.player.hp,
      maxHp: this.player.maxHp,
      mp: this.player.mp,
      maxMp: this.player.maxMp,
      realm: this.player.realmIndex,
      tier: this.player.realmTier,
      state: this.player.state,
      isInvulnerable: this.player.isInvulnerable,
      cultivationPath: this.player.cultivationPath,
    };

    const entitySnapshots: EntitySnapshot[] = this.monsters.map(m => ({
      id: m.id,
      name: m.name,
      type: m.isBoss ? 'BOSS' : 'MONSTER',
      x: Math.round(m.x),
      y: Math.round(m.y),
      vx: Math.round(m.vx),
      vy: Math.round(m.vy),
      facingAngle: Number(m.facingAngle.toFixed(3)),
      hp: m.hp,
      maxHp: m.maxHp,
      state: m.state,
    }));

    const projectileSnapshots: ProjectileSnapshot[] = this.projectiles.map(p => ({
      id: p.id,
      ownerId: p.ownerId,
      x: Math.round(p.x),
      y: Math.round(p.y),
      vx: Math.round(p.vx),
      vy: Math.round(p.vy),
      radius: p.radius,
      color: p.color,
      type: p.type,
    }));

    const telegraphSnapshots: TelegraphSnapshot[] = this.telegraphs.map(t => ({
      id: t.id,
      bossId: t.bossId,
      shape: t.shape,
      x: Math.round(t.x),
      y: Math.round(t.y),
      radius: t.radius,
      durationSec: t.durationSec,
      remainingSec: Math.max(0, Number(((t.triggersAt - now) / 1000).toFixed(2))),
    }));

    // Cooldown status
    const dodgeRemSec = Math.max(0, (DEFAULT_DODGE_CONFIG.cooldownSec * 1000 - (now - this.player.lastDodgeTime)) / 1000);
    const attackRemSec = Math.max(0, (400 - (now - this.player.lastAttackTime)) / 1000);
    const skillsRemSec = this.player.equippedSkillIds.map(skId => {
      const readyAt = this.player.skillCooldowns.get(skId) || 0;
      return Math.max(0, Number(((readyAt - now) / 1000).toFixed(1)));
    });

    return {
      type: 'TICK',
      tick: this.tickCount,
      serverTime: now,
      currentMapId: this.mapId,
      playerState: playerSnapshot,
      entities: entitySnapshots,
      projectiles: projectileSnapshots,
      telegraphs: telegraphSnapshots,
      events: this.floatingTexts,
      cooldowns: {
        dodgeRemainingSec: Number(dodgeRemSec.toFixed(1)),
        attackRemainingSec: Number(attackRemSec.toFixed(1)),
        skillsRemainingSec: skillsRemSec,
      },
    };
  }
}

// Global Manager for active ARPG PvE sessions
export class ArpgSessionManager {
  private static instance: ArpgSessionManager;
  private sessions: Map<string, ArpgGameSession> = new Map(); // characterId -> session
  private intervalId: NodeJS.Timeout | null = null;

  public static getInstance(): ArpgSessionManager {
    if (!ArpgSessionManager.instance) {
      ArpgSessionManager.instance = new ArpgSessionManager();
    }
    return ArpgSessionManager.instance;
  }

  private constructor() {
    this.startGlobalLoop();
  }

  private startGlobalLoop() {
    if (this.intervalId) return;
    const dt = 0.05; // 50ms = 20 ticks/sec

    this.intervalId = setInterval(() => {
      const now = Date.now();
      for (const [charId, session] of this.sessions.entries()) {
        // Heartbeat timeout check: 5 seconds of silence -> pause session
        if (now - session.player.lastHeartbeat > 5000) {
          if (!session.isPaused) {
            session.isPaused = true;
          }
        }

        if (!session.isPaused && !session.isTerminated) {
          session.tick(dt);
        }
      }
    }, 50);
  }

  public getOrCreateSession(character: any, mapId: string): ArpgGameSession {
    let session = this.sessions.get(character.id);
    if (!session || session.isTerminated) {
      session = new ArpgGameSession(character, mapId);
      this.sessions.set(character.id, session);
    } else {
      session.isPaused = false;
      session.player.lastHeartbeat = Date.now();
      if (session.mapId !== mapId) {
        session.mapId = mapId;
      }
    }
    return session;
  }

  public getSession(characterId: string): ArpgGameSession | undefined {
    return this.sessions.get(characterId);
  }

  public removeSession(characterId: string) {
    const session = this.sessions.get(characterId);
    if (session) {
      session.isTerminated = true;
      this.sessions.delete(characterId);
    }
  }
}
