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
  isWorldPositionWalkable,
  resolveWorldMovement,
  type MapData,
} from '@shared';
import { isWorldPathWalkable } from '@shared/world-collision';
import type { Character, CharacterDisciple, InventoryItem, Prisma } from '@prisma/client';
import { MAP_TEMPLATES } from '../data/maps';
import { MONSTER_TEMPLATES, MonsterTemplate } from '../data/monsters';
import { BOSS_TEMPLATES, BossTemplate } from '../data/bosses';
import { SKILL_TEMPLATES, getSkillRealtimeData } from '../data/skills';
import { computeCharacterStats } from '../modules/character/stats';
import { prisma } from '../index';
import { updateQuestProgressBatch } from '../modules/quest/quest-engine';
import { DISCIPLE_NAME, DISCIPLE_TEMPLATE_ID, discipleAttack } from '../modules/disciple/disciple';
import { TOWER_FLOORS } from '../data/tower';

interface SessionCharacter {
  id: string;
  name: string;
  cultivationPath: string;
  realmIndex: number;
  realmTier: number;
  sectId?: string | null;
  currentMapId?: string;
  positionX?: number;
  positionY?: number;
  inventory?: { templateId: string; isEquipped: boolean }[];
  skills?: { skillId: string; isEquipped: boolean }[];
  disciple?: CharacterDisciple | null;
  storyFlags?: { flagKey: string; flagValue: string }[];
}

function getMapTemplate(mapId: string) {
  return Object.hasOwn(MAP_TEMPLATES, mapId) ? MAP_TEMPLATES[mapId] : MAP_TEMPLATES.map_thanh_khe;
}

function getMapSpawn(map: MapData) {
  const { tileSize, spawnPoint } = map;
  const spawn = { x: spawnPoint.x * tileSize, y: spawnPoint.y * tileSize };
  if (isWorldPositionWalkable(map, spawn)) return spawn;

  let safePosition: { x: number; y: number } | undefined;
  let bestDistance = Infinity;
  for (let y = tileSize / 2; y < map.height * tileSize; y += tileSize) {
    for (let x = tileSize / 2; x < map.width * tileSize; x += tileSize) {
      const distance = Math.hypot(x - spawn.x, y - spawn.y);
      if (distance < bestDistance && isWorldPositionWalkable(map, { x, y })) {
        safePosition = { x, y };
        bestDistance = distance;
      }
    }
  }
  if (!safePosition) throw new Error(`No walkable spawn in ${map.id}`);
  return safePosition;
}

function selectSpawn(map: MapData, position?: { x: number; y: number }) {
  return position && isWorldPositionWalkable(map, position) ? position : getMapSpawn(map);
}

function getSavedPosition(character: SessionCharacter, map: MapData) {
  const { currentMapId, positionX, positionY } = character;
  if (currentMapId === map.id && positionX !== undefined && positionY !== undefined) {
    return { x: positionX, y: positionY };
  }
}

function getCombatConfiguration(character: SessionCharacter) {
  const path = character.cultivationPath as CultivationPath;
  const stats = computeCharacterStats(
    path, character.realmIndex, character.realmTier,
    character.inventory?.filter((item) => item.isEquipped) ?? [],
    character.sectId,
  );
  const skills = character.skills?.filter((skill) => skill.isEquipped).map((skill) => skill.skillId) ?? [];
  if (skills.length === 0) {
    if (path === CultivationPath.SWORD) skills.push('skill_sword_01');
    else if (path === CultivationPath.SPELL) skills.push('skill_spell_01');
    else skills.push('skill_body_01');
  }
  return { path, stats, skills: skills.slice(0, 4) };
}

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

interface ArpgDiscipleState {
  id: string;
  level: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facingAngle: number;
  state: 'IDLE' | 'MOVING' | 'ATTACKING';
  lastAttackTime: number;
}

export class RestorationConflict extends Error {
  constructor() { super('Không thể hồi phục khi phiên chơi hoặc sinh mệnh đã thay đổi'); }
}

export class ArpgGameSession {
  public characterId: string;
  public mapId: string;
  public player: ArpgPlayerState;
  public disciple: ArpgDiscipleState | null = null;
  public monsters: ArpgMonsterEntity[] = [];
  public projectiles: ArpgProjectile[] = [];
  public telegraphs: ArpgTelegraph[] = [];
  public floatingTexts: FloatingTextEvent[] = [];

  public tickCount: number = 0;
  public isPaused: boolean = false;
  public isTerminated: boolean = false;
  private nextEntityId: number = 1000;
  private activeTowerFloor = 1;

  // Simultaneous death tracking and reward queuing per tick
  public pendingKillsInTick: ArpgMonsterEntity[] = [];
  public playerDiedInTick: boolean = false;
  public lifeSequence = 0;
  private pendingCombatSteps?: Array<() => void>;
  private revival?: { at: number; finish: () => void };
  public lastKillerName: string = 'Địch thủ';
  public lastInputTime: number = Date.now();

  // Callback to broadcast to the player's WebSocket
  public sendSnapshotCallback: ((msg: WsServerMessage) => void) | null = null;

  constructor(character: SessionCharacter | null, mapId = character?.currentMapId ?? 'map_thanh_khe_rung') {
    if (!character) throw new Error('A character is required to open an ARPG session');
    this.characterId = character.id;
    this.activeTowerFloor = Number(character.storyFlags?.find((flag) => flag.flagKey === 'TOWER_ACTIVE_FLOOR')?.flagValue) || 1;
    const map = getMapTemplate(mapId);
    this.mapId = map.id;
    const { path, stats, skills } = getCombatConfiguration(character);
    const position = selectSpawn(map, getSavedPosition(character, map));

    this.player = {
      id: character.id,
      characterId: character.id,
      name: character.name,
      cultivationPath: path,
      realmIndex: character.realmIndex,
      realmTier: character.realmTier,
      ...position,
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
      equippedSkillIds: skills,
      lastHeartbeat: Date.now(),
    };

    this.initMonstersForMap(map);
    this.refreshDisciple(character.disciple);
  }

  public transitionToMap(map: MapData, position?: { x: number; y: number }) {
    const spawn = selectSpawn(map, position);
    this.mapId = map.id;
    Object.assign(this.player, spawn, {
      vx: 0, vy: 0,
      state: this.player.hp > 0 ? 'IDLE' : 'DEAD',
      isInvulnerable: false,
      dodgeEndTime: 0,
      dodgeIframeEndTime: 0,
    });
    this.projectiles = [];
    this.telegraphs = [];
    this.floatingTexts = [];
    this.pendingKillsInTick = [];
    this.playerDiedInTick = false;
    this.initMonstersForMap(map);
    this.resetDisciplePosition(map);
  }

  public refreshStats(stats: CharacterStats) {
    const player = this.player;
    if (player.hp > 0) player.hp = Math.max(1, Math.floor(player.hp * stats.maxHp / player.maxHp));
    player.mp = Math.floor(player.mp * stats.maxMp / player.maxMp);
    player.maxHp = stats.maxHp;
    player.maxMp = stats.maxMp;
    player.stats = stats;
  }

  public canRestoreResources(): boolean {
    return !this.isTerminated && this.player.hp > 0 && this.player.state !== 'DEAD';
  }

  // Reserve only at the end of the transaction, after row waits and writes. Simulation
  // arriving during commit acknowledgement is replayed in receipt order on either outcome.
  public reserveRestoration(life: number | undefined, restore: () => void): (committed: boolean) => void {
    if (life !== this.lifeSequence || !this.canRestoreResources()) throw new RestorationConflict();
    const steps: Array<() => void> = [];
    this.pendingCombatSteps = steps;
    return (committed) => {
      this.pendingCombatSteps = undefined;
      if (committed) restore();
      for (const step of steps) step();
    };
  }

  public refreshCharacter(character: SessionCharacter) {
    const { path, stats, skills } = getCombatConfiguration(character);
    this.refreshStats(stats);
    this.player.name = character.name;
    this.player.cultivationPath = path;
    this.player.realmIndex = character.realmIndex;
    this.player.realmTier = character.realmTier;
    this.player.equippedSkillIds = skills;
    this.refreshDisciple(character.disciple);
    const selectedFloor = Number(character.storyFlags?.find((flag) => flag.flagKey === 'TOWER_ACTIVE_FLOOR')?.flagValue);
    if (selectedFloor) this.setTowerFloor(selectedFloor);
  }

  public setTowerFloor(floor: number) {
    if (!TOWER_FLOORS.some((entry) => entry.floor === floor) || this.activeTowerFloor === floor) return;
    this.activeTowerFloor = floor;
    if (this.mapId === 'map_tran_yeu_thap') this.transitionToMap(getMapTemplate(this.mapId));
  }

  public refreshDisciple(record?: Pick<CharacterDisciple, 'id' | 'level' | 'isActive'> | null) {
    if (!record?.isActive) {
      this.disciple = null;
      return;
    }
    if (this.disciple?.id === record.id) {
      this.disciple.level = record.level;
      return;
    }
    this.disciple = {
      id: record.id, level: record.level,
      x: this.player.x, y: this.player.y,
      vx: 0, vy: 0, facingAngle: 0, state: 'IDLE', lastAttackTime: 0,
    };
  }

  private resetDisciplePosition(map: MapData) {
    const disciple = this.disciple;
    if (!disciple) return;
    const preferred = { x: this.player.x - 28, y: this.player.y + 24 };
    const position = isWorldPositionWalkable(map, preferred) ? preferred : { x: this.player.x, y: this.player.y };
    Object.assign(disciple, position, { vx: 0, vy: 0, state: 'IDLE' });
  }

  private tickDisciple(map: MapData, dt: number, now: number) {
    const disciple = this.disciple;
    if (!disciple) return;
    if (this.player.state === 'DEAD') {
      disciple.vx = 0;
      disciple.vy = 0;
      disciple.state = 'IDLE';
      return;
    }

    const distanceToPlayer = Math.hypot(this.player.x - disciple.x, this.player.y - disciple.y);
    if (distanceToPlayer > 320 || !isWorldPositionWalkable(map, disciple) ||
        (distanceToPlayer > 120 && !isWorldPathWalkable(map, disciple, this.player, 8))) {
      this.resetDisciplePosition(map);
    }

    let target: ArpgMonsterEntity | undefined;
    let nearest = Infinity;
    for (const monster of this.monsters) {
      if (monster.state === 'DEAD' || Math.hypot(monster.x - this.player.x, monster.y - this.player.y) > 190) continue;
      const distance = Math.hypot(monster.x - disciple.x, monster.y - disciple.y);
      if (distance < nearest && isWorldPathWalkable(map, disciple, monster, 8)) {
        target = monster;
        nearest = distance;
      }
    }

    const follow = { x: this.player.x - 32, y: this.player.y + 28 };
    const goal = target && nearest > 78
      ? { x: target.x - Math.cos(Math.atan2(target.y - disciple.y, target.x - disciple.x)) * 66,
          y: target.y - Math.sin(Math.atan2(target.y - disciple.y, target.x - disciple.x)) * 66 }
      : follow;
    const dx = goal.x - disciple.x;
    const dy = goal.y - disciple.y;
    const distance = Math.hypot(dx, dy);
    if (distance > 18 && isWorldPathWalkable(map, disciple, goal, 8)) {
      const speed = Math.min(170, distance * 4);
      disciple.vx = dx / distance * speed;
      disciple.vy = dy / distance * speed;
      Object.assign(disciple, resolveWorldMovement(map, disciple, { x: disciple.vx * dt, y: disciple.vy * dt }));
      disciple.state = 'MOVING';
      disciple.facingAngle = Math.atan2(dy, dx);
    } else {
      disciple.vx = 0;
      disciple.vy = 0;
      disciple.state = 'IDLE';
    }

    if (target && target.state !== 'DEAD' && Math.hypot(target.x - disciple.x, target.y - disciple.y) <= 105 &&
        now - disciple.lastAttackTime >= 1800 && isWorldPathWalkable(map, disciple, target, 8)) {
      disciple.facingAngle = Math.atan2(target.y - disciple.y, target.x - disciple.x);
      disciple.lastAttackTime = now;
      disciple.state = 'ATTACKING';
      this.addFloatingText(disciple.x, disciple.y - 36, '✦ Liễu Muội', '#86efac');
      this.applyDamageToMonster(target, discipleAttack(disciple.level), 1, false, now, false);
    }
  }

  public receiveHeartbeat(now = Date.now()) {
    if (this.pendingCombatSteps) {
      this.pendingCombatSteps.push(() => this.receiveHeartbeat(now));
      return;
    }
    this.player.lastHeartbeat = now;
    this.isPaused = false;
  }

  public pause() {
    if (this.pendingCombatSteps) {
      this.pendingCombatSteps.push(() => this.pause());
      return;
    }
    this.isPaused = true;
    this.player.vx = 0;
    this.player.vy = 0;
    if (this.player.state === 'MOVING') this.player.state = 'IDLE';
  }

  private initMonstersForMap(map: MapData) {
    this.monsters = [];
    if (!map.monsters || map.monsters.length === 0) return;

    for (const spawn of map.monsters) {
      if (map.id === 'map_tran_yeu_thap' && spawn.monsterId !== TOWER_FLOORS[this.activeTowerFloor - 1]?.bossId) continue;
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
  public handleInput(input: PlayerInputPayload, now = Date.now()) {
    if (this.pendingCombatSteps) {
      this.pendingCombatSteps.push(() => this.handleInput(input, now));
      return;
    }
    this.reviveIfDue(now);
    if (this.isTerminated || !Number.isFinite(input.moveX) ||
        !Number.isFinite(input.moveY) || !Number.isFinite(input.angle)) return;
    this.receiveHeartbeat(now);
    if (this.player.hp <= 0) return;
    this.lastInputTime = now;

    // 1. Angle & Facing
    this.player.facingAngle = Math.abs(input.angle) <= Math.PI
      ? input.angle
      : Math.atan2(Math.sin(input.angle), Math.cos(input.angle));

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
            this.applyDamageToMonster(m, this.player.stats.atk, 1.0, false, now);
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
      const { x, y, facingAngle } = this.player;
      let tx = targetX !== undefined && Number.isFinite(targetX) ? targetX : x + Math.cos(facingAngle) * rt.range;
      let ty = targetY !== undefined && Number.isFinite(targetY) ? targetY : y + Math.sin(facingAngle) * rt.range;
      const dx = tx - x;
      const dy = ty - y;
      if (Math.hypot(dx, dy) > rt.range) {
        // Scale first so even very large finite inputs retain their direction.
        const scale = Math.max(Math.abs(dx), Math.abs(dy));
        const nx = dx / scale;
        const ny = dy / scale;
        const length = Math.hypot(nx, ny);
        tx = x + rt.range * nx / length;
        ty = y + rt.range * ny / length;
      }
      const radius = rt.radius || 90;

      for (const m of this.monsters) {
        if (m.state === 'DEAD') continue;
        if (Math.hypot(m.x - tx, m.y - ty) <= radius) {
          this.applyDamageToMonster(m, dmg, 1.2, true, now);
        }
      }
      this.addFloatingText(tx, ty, `💥 ${template.name}`, '#ffaa33');
    } else if (rt.targetType === SkillTargetType.DASH_ATTACK) {
      const dashDist = rt.range || 150;
      const landing = resolveWorldMovement(getMapTemplate(this.mapId), this.player, {
        x: Math.cos(this.player.facingAngle) * dashDist,
        y: Math.sin(this.player.facingAngle) * dashDist,
      });
      Object.assign(this.player, landing);

      for (const m of this.monsters) {
        if (m.state === 'DEAD') continue;
        if (Math.hypot(m.x - landing.x, m.y - landing.y) <= (rt.radius || 60)) {
          this.applyDamageToMonster(m, dmg, 1.3, true, now);
        }
      }
      this.addFloatingText(landing.x, landing.y, `⚡ ${template.name}`, '#ff44ff');
    } else if (rt.targetType === SkillTargetType.SELF) {
      // Buff
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + Math.round(this.player.maxHp * 0.25));
      this.addFloatingText(this.player.x, this.player.y - 30, `🛡️ ${template.name}`, '#44ff44');
    } else {
      // Melee arc
      for (const m of this.monsters) {
        if (m.state === 'DEAD') continue;
        if (Math.hypot(m.x - this.player.x, m.y - this.player.y) <= rt.range) {
          this.applyDamageToMonster(m, dmg, 1.0, false, now);
        }
      }
      this.addFloatingText(this.player.x, this.player.y - 25, template.name, '#ffff44');
    }
  }

  // --- Damage Calculations ---
  private applyDamageToMonster(monster: ArpgMonsterEntity, rawAtk: number, multiplier: number, isSkill: boolean, now = Date.now(), canCrit = true) {
    const isCrit = canCrit && Math.random() * 100 < this.player.stats.critRate;
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
        if (!monster.windupEndTime) monster.state = 'ENRAGED';
        monster.atk = Math.round(boss.stats.atk * 1.35);
        monster.spd = Math.round(boss.stats.spd * 1.25);
        this.addFloatingText(monster.x, monster.y - 40, `🔥 CUỒNG BẠO: ${phase2.dialogue}`, '#ff0000', true);
      }
    }

    if (monster.hp <= 0 && monster.state !== 'DEAD') {
      monster.state = 'DEAD';
      monster.respawnAt = now + 25000;
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
      this.lifeSequence++;
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

        await updateQuestProgressBatch(tx, this.characterId, [
          { type: 'KILL', targetId: monster.templateId, amount: 1 },
          ...itemsGained.map((item) => ({ type: 'COLLECT' as const, targetId: item.itemId, amount: item.quantity })),
        ]);
        if (this.mapId === 'map_tran_yeu_thap') {
          const floor = TOWER_FLOORS.find((entry) => entry.bossId === monster.templateId);
          if (floor) await tx.storyFlag.upsert({
            where: { characterId_flagKey: { characterId: this.characterId, flagKey: `TOWER_FLOOR_${floor.floor}` } },
            create: { characterId: this.characterId, flagKey: `TOWER_FLOOR_${floor.floor}`, flagValue: 'CLEARED' },
            update: {},
          });
        }
      });
    } catch (err) {
      console.error('Lỗi khi quyết toán phần thưởng diệt quái:', err);
      return;
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

  private resetBossEncounter(boss: ArpgMonsterEntity) {
    Object.assign(boss, {
      hp: boss.maxHp,
      atk: boss.template.stats.atk,
      spd: boss.template.stats.spd,
      vx: 0,
      vy: 0,
      state: 'IDLE',
      targetId: null,
      lastAttackTime: 0,
      windupEndTime: 0,
      currentPhase: 1,
      respawnAt: 0,
    });
    this.telegraphs = this.telegraphs.filter((warning) => warning.bossId !== boss.id);
  }

  private handlePlayerDeath(killerName: string, now: number) {
    this.player.state = 'DEAD';
    this.player.vx = 0;
    this.player.vy = 0;

    // Retire warnings from the defeated attempt even if no ticks run before revival.
    this.telegraphs = [];
    for (const boss of this.monsters) {
      if (!boss.isBoss) continue;
      boss.windupEndTime = 0;
      if (boss.state === 'WINDUP') boss.state = 'IDLE';
    }

    // Respawn player after 2 seconds at safe point
    const defeatedMapMonsters = this.monsters;
    const at = now + 2000;
    const finish = () => {
      if (this.isTerminated) return;
      this.player.hp = this.player.maxHp;
      this.player.mp = this.player.maxMp;
      this.player.state = 'IDLE';

      const map = getMapTemplate(this.mapId);
      Object.assign(this.player, getMapSpawn(map));

      if (this.monsters === defeatedMapMonsters) {
        for (const m of this.monsters) {
          if (m.isBoss && !m.hasBeenRewarded) this.resetBossEncounter(m);
        }
      }

      if (this.sendSnapshotCallback) {
        this.sendSnapshotCallback({
          type: 'DEATH',
          serverTime: Date.now(),
          error: `Đạo thân trọng thương bởi ${killerName}! Đã hồi sinh tại điểm an toàn.`,
        });
      }
    };
    this.revival = { at, finish };
    setTimeout(() => this.reviveIfDue(at), Math.max(0, at - Date.now()));
  }

  private reviveIfDue(now: number) {
    const revival = this.revival;
    if (revival && now >= revival.at) {
      this.revival = undefined;
      revival.finish();
    }
  }

  // --- Fixed Simulation Tick (50ms) ---
  public tick(dt: number, now = Date.now()) {
    if (this.pendingCombatSteps) {
      this.pendingCombatSteps.push(() => this.tick(dt, now));
      return;
    }
    this.reviveIfDue(now);
    if (this.isPaused || this.isTerminated) return;
    this.tickCount++;

    // 0. Tab switch / background sleep watchdog: stop moving if no client input for > 350ms
    if (this.player.state !== 'DODGING' && (now - this.lastInputTime > 350)) {
      if (this.player.vx !== 0 || this.player.vy !== 0) {
        this.player.vx = 0;
        this.player.vy = 0;
        if (this.player.state === 'MOVING') {
          this.player.state = 'IDLE';
        }
      }
    }

    // 1. Update Player State
    if (this.player.state === 'DODGING' && now >= this.player.dodgeEndTime) {
      this.player.state = 'IDLE';
      this.player.vx = 0;
      this.player.vy = 0;
    }
    if (this.player.isInvulnerable && now >= this.player.dodgeIframeEndTime) {
      this.player.isInvulnerable = false;
    }

    const map = getMapTemplate(this.mapId);
    if (this.player.vx !== 0 || this.player.vy !== 0) {
      Object.assign(this.player, resolveWorldMovement(map, this.player, {
        x: this.player.vx * dt,
        y: this.player.vy * dt,
      }));
    }

    // Passive MP regen (1% per second)
    if (this.tickCount % 20 === 0 && this.player.mp < this.player.maxMp) {
      this.player.mp = Math.min(this.player.maxMp, this.player.mp + Math.max(1, Math.round(this.player.maxMp * 0.02)));
    }

    // 2. Update Projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      const next = { x: p.x + p.vx * dt, y: p.y + p.vy * dt };
      if (now >= p.expiresAt || !isWorldPathWalkable(map, p, next, p.radius)) {
        this.projectiles.splice(i, 1);
        continue;
      }
      Object.assign(p, next);

      // Hit checks
      if (p.isPlayer) {
        for (const m of this.monsters) {
          if (m.state === 'DEAD' || p.piercedTargetIds.has(m.id)) continue;
          if (Math.hypot(m.x - p.x, m.y - p.y) <= p.radius + 18) {
            this.applyDamageToMonster(m, p.damage, 1.0, true, now);
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

    // 3. Resolve boss attacks at their committed warning locations.
    for (let i = this.telegraphs.length - 1; i >= 0; i--) {
      const tg = this.telegraphs[i];
      if (now < tg.triggersAt) continue;
      this.telegraphs.splice(i, 1);
      const boss = this.monsters.find((monster) => monster.id === tg.bossId);
      if (!boss || boss.windupEndTime !== tg.triggersAt ||
          (boss.state === 'DEAD' && now >= boss.respawnAt)) continue;

      boss.windupEndTime = 0;
      if (boss.state !== 'DEAD') {
        boss.state = 'ATTACK';
        boss.lastAttackTime = now;
      }

      const dist = Math.hypot(this.player.x - tg.x, this.player.y - tg.y);
      const radius = tg.radius || 90;
      if (dist <= radius) {
        this.applyDamageToPlayer(tg.damage, 'Đòn Tuyệt Kỹ Báo Trước');
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
          if (m.isBoss) this.resetBossEncounter(m);
        }
        continue;
      }

      if (m.isBoss && (m.windupEndTime > 0 || (m.state === 'ATTACK' && m.lastAttackTime === now))) continue;

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
          } else if (!m.isBoss && m.state === 'WINDUP' && now >= m.windupEndTime) {
            // Normal monster strike execution
            m.state = 'ATTACK';
            m.lastAttackTime = now;
            if (distToPlayer <= attackRange + 15) {
              this.applyDamageToPlayer(m.atk, m.name);
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

    this.tickDisciple(map, dt, now);

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
        this.handlePlayerDeath(this.lastKillerName, now);
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
      stats: { spd: this.player.stats.spd },
    };

    const entitySnapshots: EntitySnapshot[] = this.monsters.map(m => ({
      id: m.id,
      name: m.name,
      type: m.isBoss ? 'BOSS' : 'MONSTER',
      templateId: m.templateId,
      x: Math.round(m.x),
      y: Math.round(m.y),
      vx: Math.round(m.vx),
      vy: Math.round(m.vy),
      facingAngle: Number(m.facingAngle.toFixed(3)),
      hp: m.hp,
      maxHp: m.maxHp,
      state: m.state,
    }));
    if (this.disciple) entitySnapshots.push({
      id: this.disciple.id,
      name: DISCIPLE_NAME,
      type: 'DISCIPLE',
      templateId: DISCIPLE_TEMPLATE_ID,
      x: Math.round(this.disciple.x),
      y: Math.round(this.disciple.y),
      vx: Math.round(this.disciple.vx),
      vy: Math.round(this.disciple.vy),
      facingAngle: Number(this.disciple.facingAngle.toFixed(3)),
      hp: 1,
      maxHp: 1,
      state: this.disciple.state,
    });

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
  private characterWrites = new Map<string, Promise<unknown>>();
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
          if (!session.isPaused) session.pause();
        }

        if (!session.isPaused && !session.isTerminated) {
          session.tick(dt);
          if (session.sendSnapshotCallback && session.tickCount % 200 === 0) {
            void this.persistPosition(charId).catch((err) => console.error('Lỗi khi lưu vị trí ARPG:', err));
          }
        }
      }
    }, 50).unref();
  }

  public getOrCreateSession(character: SessionCharacter, mapId: string): ArpgGameSession {
    let session = this.sessions.get(character.id);
    if (!session || session.isTerminated) {
      session = new ArpgGameSession(character, mapId);
      this.sessions.set(character.id, session);
    } else {
      const map = getMapTemplate(mapId);
      if (session.mapId !== map.id) {
        session.transitionToMap(map, getSavedPosition(character, map));
      }
      session.refreshCharacter(character);
    }
    session.receiveHeartbeat();
    return session;
  }

  public openSession(characterId: string, accountId: string): Promise<ArpgGameSession | undefined> {
    // Loading the position and transitioning the map share the same per-character queue.
    return this.withCharacterWrite(characterId, async () => {
      const character = await prisma.character.findFirst({
        where: { id: characterId, accountId, isActive: true },
        include: {
          inventory: { where: { isEquipped: true } },
          skills: { where: { isEquipped: true } },
          disciple: true,
          storyFlags: { where: { flagKey: 'TOWER_ACTIVE_FLOOR' } },
        },
      });
      if (!character) return undefined;
      return this.getOrCreateSession(character, character.currentMapId);
    });
  }

  public persistPosition(characterId: string): Promise<boolean> {
    return this.withCharacterWrite(characterId, async () => {
      const session = this.sessions.get(characterId);
      if (!session || session.isTerminated) return false;
      const { mapId, player: { x, y } } = session;
      if (!isWorldPositionWalkable(getMapTemplate(mapId), { x, y })) return false;
      const result = await prisma.character.updateMany({
        where: { id: characterId },
        data: { currentMapId: mapId, positionX: x, positionY: y },
      });
      return result.count === 1;
    });
  }

  public teleportCharacter(characterId: string, map: MapData, position?: { x: number; y: number }) {
    return this.withCharacterWrite(characterId, async () => {
      const session = this.sessions.get(characterId);
      if (session?.mapId === map.id) {
        return { x: session.player.x, y: session.player.y };
      }
      if (!session) {
        const saved = await prisma.character.findUniqueOrThrow({
          where: { id: characterId },
          select: { currentMapId: true, positionX: true, positionY: true },
        });
        const currentPosition = { x: saved.positionX, y: saved.positionY };
        if (saved.currentMapId === map.id && isWorldPositionWalkable(map, currentPosition)) return currentPosition;
      }

      const spawn = selectSpawn(map, position);
      await prisma.character.update({
        where: { id: characterId },
        data: { currentMapId: map.id, positionX: spawn.x, positionY: spawn.y },
      });
      session?.transitionToMap(map, spawn);
      return spawn;
    });
  }

  public updateCharacterCombat<T extends { success: boolean; refreshCombat?: boolean }>(
    characterId: string,
    update: (
      tx: Prisma.TransactionClient,
      current: Character & { inventory: InventoryItem[] },
      session: ArpgGameSession | undefined,
    ) => Promise<T>,
    prepareEffect?: (session: ArpgGameSession, result: T, life: number | undefined) =>
      ((committed: boolean) => void) | undefined,
  ): Promise<T> {
    const startingSession = this.sessions.get(characterId);
    const startingLife = startingSession?.canRestoreResources() ? startingSession.lifeSequence : undefined;
    return this.withCharacterWrite(characterId, async () => {
      let finishEffect: ((committed: boolean) => void) | undefined;
      const { result, refreshed, session } = await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM characters WHERE id = ${characterId}::uuid FOR NO KEY UPDATE`;
        const current = await tx.character.findUniqueOrThrow({
          where: { id: characterId }, include: { inventory: true },
        });
        const session = this.sessions.get(characterId);
        if (prepareEffect && startingSession && session !== startingSession) throw new RestorationConflict();
        const result = await update(tx, current, session);
        if (result.success && session && prepareEffect) {
          finishEffect = prepareEffect(session, result, session === startingSession ? startingLife : undefined);
        }
        const refreshed = result.success && result.refreshCombat !== false && session && !prepareEffect
          ? await tx.character.findUniqueOrThrow({
              where: { id: characterId },
              include: {
                inventory: { where: { isEquipped: true } },
                skills: { where: { isEquipped: true } },
                disciple: true,
              },
            })
          : undefined;
        return { result, refreshed, session };
      }).catch((error) => {
        finishEffect?.(false);
        throw error;
      });
      finishEffect?.(true);
      if (refreshed && session && this.sessions.get(characterId) === session) session.refreshCharacter(refreshed);
      return result;
    });
  }

  private withCharacterWrite<T>(characterId: string, operation: () => Promise<T>): Promise<T> {
    const pending = this.characterWrites.get(characterId);
    const result = pending ? pending.then(operation, operation) : operation();
    this.characterWrites.set(characterId, result);
    const clear = () => {
      if (this.characterWrites.get(characterId) === result) this.characterWrites.delete(characterId);
    };
    void result.then(clear, clear);
    return result;
  }

  public getSession(characterId: string): ArpgGameSession | undefined {
    return this.sessions.get(characterId);
  }

  public removeSession(characterId: string) {
    return this.withCharacterWrite(characterId, async () => {
      const session = this.sessions.get(characterId);
      if (session) {
        session.isTerminated = true;
        this.sessions.delete(characterId);
      }
    });
  }
}
