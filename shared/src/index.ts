// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Shared Types & Constants
// ============================================================

// === Enums ===

export enum CultivationPath {
  SWORD = 'SWORD',     // Kiếm Tu
  SPELL = 'SPELL',     // Pháp Tu  
  BODY = 'BODY',       // Thể Tu
}

export enum RealmIndex {
  LUYEN_KHI = 0,    // Luyện Khí
  TRUC_CO = 1,      // Trúc Cơ
  KIM_DAN = 2,      // Kim Đan
  NGUYEN_ANH = 3,   // Nguyên Anh
  HOA_THAN = 4,     // Hóa Thần
  LUYEN_HU = 5,     // Luyện Hư
  HOP_THE = 6,      // Hợp Thể
  DAI_THUA = 7,     // Đại Thừa
  DO_KIEP = 8,      // Độ Kiếp
}

export const REALM_NAMES: Record<number, string> = {
  [RealmIndex.LUYEN_KHI]: 'Luyện Khí',
  [RealmIndex.TRUC_CO]: 'Trúc Cơ',
  [RealmIndex.KIM_DAN]: 'Kim Đan',
  [RealmIndex.NGUYEN_ANH]: 'Nguyên Anh',
  [RealmIndex.HOA_THAN]: 'Hóa Thần',
  [RealmIndex.LUYEN_HU]: 'Luyện Hư',
  [RealmIndex.HOP_THE]: 'Hợp Thể',
  [RealmIndex.DAI_THUA]: 'Đại Thừa',
  [RealmIndex.DO_KIEP]: 'Độ Kiếp',
};

export const REALM_TIERS = ['Sơ Kỳ', 'Trung Kỳ', 'Hậu Kỳ', 'Đại Viên Mãn'] as const;
export const MAX_REALM_TIER = 3; // 0-3

export enum ItemType {
  WEAPON = 'WEAPON',
  ARMOR = 'ARMOR',
  SHOES = 'SHOES',
  ACCESSORY = 'ACCESSORY',
  ARTIFACT = 'ARTIFACT',       // Pháp bảo
  TECHNIQUE = 'TECHNIQUE',     // Công pháp
  CONSUMABLE = 'CONSUMABLE',   // Đan dược
  MATERIAL = 'MATERIAL',       // Nguyên liệu
  SEED = 'SEED',               // Hạt giống linh thảo
  QUEST = 'QUEST',             // Vật phẩm nhiệm vụ
  COLLECTIBLE = 'COLLECTIBLE', // Đồ sưu tầm
}

export enum ItemQuality {
  COMMON = 'COMMON',       // Phàm
  SPIRITUAL = 'SPIRITUAL', // Linh
  MYSTIC = 'MYSTIC',       // Huyền
  EARTH = 'EARTH',         // Địa
  HEAVEN = 'HEAVEN',       // Thiên
  IMMORTAL = 'IMMORTAL',   // Tiên
  DIVINE = 'DIVINE',       // Thần
}

export const QUALITY_NAMES: Record<ItemQuality, string> = {
  [ItemQuality.COMMON]: 'Phàm',
  [ItemQuality.SPIRITUAL]: 'Linh',
  [ItemQuality.MYSTIC]: 'Huyền',
  [ItemQuality.EARTH]: 'Địa',
  [ItemQuality.HEAVEN]: 'Thiên',
  [ItemQuality.IMMORTAL]: 'Tiên',
  [ItemQuality.DIVINE]: 'Thần',
};

export const QUALITY_COLORS: Record<ItemQuality, string> = {
  [ItemQuality.COMMON]: '#aaaaaa',
  [ItemQuality.SPIRITUAL]: '#4fc3f7',
  [ItemQuality.MYSTIC]: '#ab47bc',
  [ItemQuality.EARTH]: '#ffa726',
  [ItemQuality.HEAVEN]: '#ef5350',
  [ItemQuality.IMMORTAL]: '#ffd700',
  [ItemQuality.DIVINE]: '#ff1744',
};

export enum AccountRole {
  PLAYER = 'PLAYER',
  CONTENT_EDITOR = 'CONTENT_EDITOR',
  GAME_MASTER = 'GAME_MASTER',
  OWNER = 'OWNER',
}

export enum QuestStatus {
  AVAILABLE = 'AVAILABLE',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  TURNED_IN = 'TURNED_IN',
}

export enum QuestType {
  MAIN = 'MAIN',
  SIDE = 'SIDE',
  HIDDEN = 'HIDDEN',
  SECT = 'SECT',
}

export enum CombatAction {
  ATTACK = 'ATTACK',
  SKILL = 'SKILL',
  DEFEND = 'DEFEND',
  ITEM = 'ITEM',
  FLEE = 'FLEE',
}

// === Interfaces ===

export interface CharacterStats {
  hp: number;
  maxHp: number;
  mp: number;       // Linh lực
  maxMp: number;
  atk: number;      // Công
  def: number;      // Thủ
  spd: number;      // Tốc độ
  critRate: number;  // Chí mạng (0-100)
  critDmg: number;   // Sát thương chí mạng (% bonus, default 50)
  resist: number;    // Kháng hiệu ứng (0-100)
}

export interface Position {
  x: number;
  y: number;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface CreateCharacterRequest {
  name: string;
  cultivationPath: CultivationPath;
  appearance: number; // 0-5 preset appearances
}

export interface CombatActionRequest {
  sessionId: string;
  action: CombatAction;
  skillId?: string;
  itemId?: string;
}

export interface CombatState {
  id: string;
  turn: number;
  playerState: CombatUnitState;
  enemies: CombatUnitState[];
  turnOrder: string[];
  currentActorId: string;
  log: CombatLogEntry[];
  isFinished: boolean;
  result?: 'WIN' | 'LOSE' | 'FLEE';
  rewards?: CombatRewards;
  petBonusText?: string;
}

export interface CombatUnitState {
  id: string;
  name: string;
  isPlayer: boolean;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  atk: number;
  def: number;
  spd: number;
  critRate: number;
  critDmg: number;
  resist: number;
  effects: StatusEffect[];
  isDefending: boolean;
  skills: CombatSkillState[];
}

export interface CombatSkillState {
  id: string;
  name: string;
  mpCost: number;
  cooldown: number;
  currentCooldown: number;
  description: string;
}

export interface StatusEffect {
  id: string;
  name: string;
  type: 'BUFF' | 'DEBUFF';
  stat?: keyof CharacterStats;
  value: number;
  duration: number;
  stackable: boolean;
}

export interface CombatLogEntry {
  turn: number;
  actorId: string;
  actorName: string;
  action: string;
  targetId?: string;
  targetName?: string;
  damage?: number;
  healing?: number;
  isCrit?: boolean;
  effectApplied?: string;
  message: string;
}

export interface CombatRewards {
  exp: number;
  gold: number;
  items: { itemTemplateId: string; quantity: number; name: string; quality: ItemQuality }[];
  cultivationExp: number;
}

export interface MapCollisionZone {
  x: number;      // tile x
  y: number;      // tile y
  w: number;      // width in tiles
  h: number;      // height in tiles
  label?: string; // optional debug label
}

export interface MapDecorativeProp {
  key: string;    // texture key
  x: number;      // tile x (center)
  y: number;      // tile y (bottom anchor)
  originY?: number; // default 0.9
  scale?: number;
  alpha?: number;
  spin?: boolean; // slow rotate (bagua, portal)
  tint?: number;
  depth?: number; // override depth
}

export interface MapSpawnZone {
  id: string;
  label: string;
  monsterId: string;
  level: number;
  respawnTime: number;
  count: number;      // number of instances in zone
  zone: { x: number; y: number; w: number; h: number }; // tile rect
}

export interface MapData {
  id: string;
  name: string;
  width: number;
  height: number;
  tileSize: number;
  layers: MapLayer[];
  npcs: MapNPC[];
  monsters: MapMonsterSpawn[];
  portals: MapPortal[];
  interactables: MapInteractable[];
  spawnPoint: Position;
  // Extended layout data
  collisionZones?: MapCollisionZone[];
  decorativeProps?: MapDecorativeProp[];
  spawnZones?: MapSpawnZone[];
  ambientTint?: number;   // 0xrrggbb, applied to camera post-fx
  fogDensity?: number;    // 0-1, for forest areas
}

export interface MapLayer {
  name: string;
  data: number[];
  collision?: boolean;
}

export interface MapNPC {
  id: string;
  name: string;
  position: Position;
  spriteKey: string;
  dialogueId?: string;
  shopId?: string;
  questIds?: string[];
}

export interface MapMonsterSpawn {
  id: string;
  monsterId: string;
  position: Position;
  respawnTime: number;
  level: number;
}

export interface MapPortal {
  id: string;
  position: Position;
  targetMapId: string;
  targetPosition: Position;
  requiredQuestId?: string;
  label: string;
}

export interface MapInteractable {
  id: string;
  type: 'CHEST' | 'HERB' | 'ORE' | 'SHRINE';
  position: Position;
  lootTableId?: string;
  requiredItemId?: string;
}

export interface DialogueLine {
  speaker: string;
  text: string;
  choices?: DialogueChoice[];
  nextId?: string;
}

export interface DialogueChoice {
  text: string;
  nextId: string;
  setFlag?: { key: string; value: string };
  requireFlag?: { key: string; value: string };
}

// === API Response Types ===

export interface ApiResponse<T = void> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CharacterSummary {
  id: string;
  name: string;
  cultivationPath: CultivationPath;
  realmIndex: number;
  realmTier: number;
  realmName: string;
  level: number;
  stats: CharacterStats;
  currentMapId: string;
  gold: number;
  sectId?: string | null;
  sectName?: string | null;
  sectContribution?: number;
  activePetName?: string | null;
}

export interface InventoryItem {
  id: string;
  templateId: string;
  name: string;
  description: string;
  type: ItemType;
  quality: ItemQuality;
  quantity: number;
  isEquipped: boolean;
  isLocked: boolean;
  stats?: Partial<CharacterStats>;
  effects?: string;
  slot?: string;
}

export interface QuestInfo {
  id: string;
  templateId: string;
  name: string;
  description: string;
  type: QuestType;
  chapter: number;
  status: QuestStatus;
  objectives: QuestObjective[];
  rewards: QuestRewardInfo;
}

export interface QuestObjective {
  id: string;
  description: string;
  type: 'KILL' | 'COLLECT' | 'TALK' | 'EXPLORE' | 'CRAFT' | 'REACH_REALM';
  targetId?: string;
  required: number;
  current: number;
}

export interface QuestRewardInfo {
  exp: number;
  gold: number;
  cultivationExp: number;
  items: { itemTemplateId: string; quantity: number; name: string }[];
}

// === Phase 2: Sect (Môn Phái) Types ===

export interface SectData {
  id: string;
  name: string;
  description: string;
  leaderName: string;
  specialization: string;
  buffDescription: string;
  shopItems: { itemId: string; name: string; priceContribution: number; quality: ItemQuality }[];
  missions: { id: string; name: string; description: string; contributionReward: number; goldReward: number }[];
}

export interface CharacterSectInfo {
  sectId: string | null;
  sectName: string | null;
  rankName: string;
  contribution: number;
  reputation: number;
  availableSects: SectData[];
}

// === Phase 2: Cave Abode (Động Phủ) Types ===

export interface FarmSlot {
  slotIndex: number;
  seedItemId: string | null;
  seedName: string | null;
  harvestItemId: string | null;
  harvestItemName: string | null;
  plantedAt: string | null;
  harvestAt: string | null;
  isReady: boolean;
}

export interface CaveAbodeInfo {
  id: string;
  spiritGatheringLevel: number; // Level Tụ Linh Trận
  herbFieldLevel: number;       // Level Linh Điền
  alchemyLabLevel: number;      // Level Đan Thất
  passiveExpPerHour: number;
  maxFarmSlots: number;
  farmSlots: FarmSlot[];
  upgradeCosts: {
    spiritGathering: { gold: number; materials: { itemId: string; name: string; count: number }[] };
    herbField: { gold: number; materials: { itemId: string; name: string; count: number }[] };
  };
}

// === Phase 2: Pet (Linh Thú) Types ===

export interface PetTemplate {
  id: string;
  name: string;
  description: string;
  quality: ItemQuality;
  spriteKey: string;
  statBonus: Partial<CharacterStats>;
  combatSkillDescription: string;
}

export interface CharacterPetDto {
  id: string;
  templateId: string;
  name: string;
  description: string;
  level: number;
  exp: number;
  maxExp: number;
  quality: ItemQuality;
  spriteKey: string;
  isActive: boolean;
  statBonus: Partial<CharacterStats>;
  combatSkillDescription: string;
}

// === Phase 2: Offline Cultivation (Tu Luyện Vắng Mặt) Types ===

export interface OfflineStatus {
  minutesElapsed: number;
  maxMinutes: number; // 480 mins = 8h max
  expEarned: number;
  goldEarned: number;
  cultivationExpEarned: number;
  lastClaimAt: string;
  canClaim: boolean;
}

export interface OfflineClaimResult {
  exp: number;
  gold: number;
  cultivationExp: number;
  message: string;
}

// === Phase 3: Story, Journal & Tower Types ===

export enum StoryEndingType {
  MAINTAIN_PACT = 'MAINTAIN_PACT', // Duy trì Thiên Khế
  DESTROY_PACT = 'DESTROY_PACT',   // Phá bỏ Thiên Khế
  REWRITE_PACT = 'REWRITE_PACT',   // Viết lại Thiên Khế
}

export interface StoryChapterInfo {
  chapter: number;
  title: string;
  location: string;
  summary: string;
  isCompleted: boolean;
  unlockedAt?: string;
  chosenEnding?: StoryEndingType;
}

export interface TowerFloorInfo {
  floor: number;
  name: string;
  bossId: string;
  bossName: string;
  recommendedRealm: string;
  isCleared: boolean;
  rewards: {
    exp: number;
    gold: number;
    cultivationExp: number;
    items: { itemTemplateId: string; quantity: number; name: string }[];
  };
}

// === Admin Types ===

export interface AdminDashboard {
  totalPlayers: number;
  activePlayers24h: number;
  realmDistribution: Record<string, number>;
  bossKills: { bossId: string; bossName: string; kills: number }[];
  recentErrors: { message: string; timestamp: string }[];
  sectDistribution?: Record<string, number>;
}

export interface AuditLogEntry {
  id: string;
  adminId: string;
  adminUsername: string;
  action: string;
  targetType: string;
  targetId: string;
  beforeData: any;
  afterData: any;
  reason: string;
  createdAt: string;
}

// === Game Constants ===

export const BASE_STATS: Record<CultivationPath, CharacterStats> = {
  [CultivationPath.SWORD]: {
    hp: 100, maxHp: 100, mp: 60, maxMp: 60,
    atk: 15, def: 8, spd: 12, critRate: 10, critDmg: 50, resist: 5,
  },
  [CultivationPath.SPELL]: {
    hp: 80, maxHp: 80, mp: 100, maxMp: 100,
    atk: 12, def: 6, spd: 10, critRate: 8, critDmg: 50, resist: 8,
  },
  [CultivationPath.BODY]: {
    hp: 130, maxHp: 130, mp: 50, maxMp: 50,
    atk: 10, def: 14, spd: 8, critRate: 5, critDmg: 50, resist: 12,
  },
};

export const REALM_STAT_MULTIPLIERS: Record<number, number> = {
  0: 1.0,   // Luyện Khí
  1: 1.5,   // Trúc Cơ
  2: 2.2,   // Kim Đan
  3: 3.0,   // Nguyên Anh
  4: 4.0,   // Hóa Thần
  5: 5.5,   // Luyện Hư
  6: 7.0,   // Hợp Thể
  7: 9.0,   // Đại Thừa
  8: 12.0,  // Độ Kiếp
};

export const TIER_STAT_BONUS = 0.1; // +10% per tier within realm

export const CULTIVATION_PATH_NAMES: Record<CultivationPath, string> = {
  [CultivationPath.SWORD]: 'Kiếm Tu',
  [CultivationPath.SPELL]: 'Pháp Tu',
  [CultivationPath.BODY]: 'Thể Tu',
};

export const CULTIVATION_PATH_DESCRIPTIONS: Record<CultivationPath, string> = {
  [CultivationPath.SWORD]: 'Tích kiếm ý, phá giáp, phản đòn và dồn sát thương. Con đường của những kiếm sĩ mạnh mẽ.',
  [CultivationPath.SPELL]: 'Phối hợp nguyên tố, khống chế, sát thương diện rộng. Con đường của pháp sư huyền bí.',
  [CultivationPath.BODY]: 'Chống chịu, khiêu chiến, phản kích. Con đường bất khả chiến bại của thể tu.',
};

// ============================================================
// REAL-TIME ARPG COMBAT & MULTI-SLOT SYSTEM TYPES
// ============================================================

export enum SkillTargetType {
  SELF = 'SELF',
  MELEE_ARC = 'MELEE_ARC',       // Vung kiếm hình quạt trước mặt
  PROJECTILE = 'PROJECTILE',     // Phóng đạn / kiếm khí bay theo hướng chuột
  AOE_TARGET = 'AOE_TARGET',     // Vùng sát thương hình tròn tại vị trí chỉ định
  DASH_ATTACK = 'DASH_ATTACK',   // Lướt tới gây sát thương và xô ngã
}

export interface SkillRealtimeData {
  cooldownSec: number;           // Thời gian hồi chiêu (giây)
  castTimeSec: number;           // Thời gian vung chiêu / niệm chú (giây)
  range: number;                 // Tầm thi triển (pixels)
  radius?: number;               // Bán kính vùng ảnh hưởng (pixels)
  projectileSpeed?: number;      // Tốc độ bay của đạn (pixels/giây)
  projectileDuration?: number;   // Thời gian tồn tại của đạn (giây)
  targetType: SkillTargetType;   // Kiểu mục tiêu
  mpCost: number;                // Linh lực tiêu hao
  dmgMultiplier: number;         // Hệ số sát thương (ví dụ 1.5 = 150% ATK)
  effectType?: string;           // FREEZE, BURN, ARMOR_BREAK, LIFESTEAL, KNOCKBACK...
  effectDurationSec?: number;    // Thời gian duy trì hiệu ứng (giây)
  effectValue?: number;          // Giá trị cường độ hiệu ứng
  telegraphDurationSec?: number; // Thời gian báo trước nguy hiểm (cho Boss/quái)
}

export interface SkillTemplate {
  id: string;
  name: string;
  description: string;
  path: CultivationPath;
  mpCost: number;
  cooldown: number;
  damageMultiplier: number;
  effect?: {
    type: 'ARMOR_BREAK' | 'COUNTER' | 'FREEZE' | 'DEF_BUFF' | 'RAGE' | 'DEF_SCALE' | 'STUN' | 'LIFESTEAL' | 'EXECUTE' | 'INVULN';
    value: number;
    duration?: number;
  };
  unlockRealmIndex: number;
  unlockRealmTier: number;
  realtime?: SkillRealtimeData;
}

export interface ArpgSkillTemplate extends SkillTemplate {
  realtime: SkillRealtimeData;
}

export interface DodgeConfig {
  distance: number;              // Khoảng cách lướt (pixels, mặc định 130)
  durationSec: number;           // Thời gian thực hiện lướt (0.2s)
  iframeSec: number;             // Khoảng miễn sát thương (0.2s)
  cooldownSec: number;           // Hồi chiêu lướt né (1.5s)
  mpCost: number;                // Tiêu hao MP khi né (5 MP)
}

export const DEFAULT_DODGE_CONFIG: DodgeConfig = {
  distance: 140,
  durationSec: 0.22,
  iframeSec: 0.22,
  cooldownSec: 1.2,
  mpCost: 5,
};

// --- WebSocket Protocol for Real-time ARPG ---

export interface PlayerInputPayload {
  seq: number;
  moveX: number;                 // -1 đến 1 (WASD)
  moveY: number;                 // -1 đến 1 (WASD)
  angle: number;                 // Góc chuột (radian)
  targetX?: number;              // Tọa độ x con trỏ chuột
  targetY?: number;              // Tọa độ y con trỏ chuột
  action?: 'NONE' | 'ATTACK' | 'SKILL_1' | 'SKILL_2' | 'SKILL_3' | 'SKILL_4' | 'DODGE' | 'INTERACT';
}

// Application close codes are terminal for the displaced scene, including its focus and retry handlers.
export const ARPG_CLOSE = { SLOT_CHANGED: 4001, WINDOW_REPLACED: 4002 } as const;

export interface WsClientMessage {
  type: 'AUTH' | 'INPUT' | 'HEARTBEAT' | 'USE_ITEM' | 'RESPAWN';
  token?: string;
  characterId?: string;
  input?: PlayerInputPayload;
  itemId?: string;
  timestamp: number;
}

export interface EntitySnapshot {
  id: string;
  name: string;
  type: 'PLAYER' | 'MONSTER' | 'BOSS' | 'NPC' | 'PET' | 'DISCIPLE';
  templateId?: string;
  stats?: { spd?: number };
  x: number;
  y: number;
  vx: number;
  vy: number;
  facingAngle: number;
  hp: number;
  maxHp: number;
  mp?: number;
  maxMp?: number;
  realm?: number;
  tier?: number;
  state: 'IDLE' | 'MOVING' | 'ATTACKING' | 'ATTACK' | 'WINDUP' | 'DODGING' | 'HURT' | 'DEAD' | 'ENRAGED' | 'PATROL' | 'CHASE' | 'RETURN';
  isInvulnerable?: boolean;      // Đang lướt né i-frame
  buffs?: { type: string; remainingSec: number }[];
  cultivationPath?: CultivationPath;
}

export interface DiscipleInfo {
  id: string;
  templateId: string;
  name: string;
  level: number;
  maxLevel: number;
  isActive: boolean;
  attack: number;
  upgradeCost: number;
}

export interface DiscipleOverview {
  eligible: boolean;
  requirement: string;
  recruitCost: number;
  disciple: DiscipleInfo | null;
}

export interface ProjectileSnapshot {
  id: string;
  ownerId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: number;
  type: string;
}

export interface TelegraphSnapshot {
  id: string;
  bossId: string;
  shape: 'CIRCLE' | 'RECTANGLE' | 'CONE';
  x: number;
  y: number;
  radius?: number;
  width?: number;
  height?: number;
  angle?: number;
  durationSec: number;
  remainingSec: number;
}

export interface FloatingTextEvent {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  isCrit?: boolean;
}

export interface WsServerMessage {
  type: 'INIT' | 'TICK' | 'HEARTBEAT_ACK' | 'EVENTS' | 'REWARDS' | 'ZONE_CHANGE' | 'DEATH' | 'ERROR';
  tick?: number;
  serverTime: number;
  currentMapId?: string;
  playerState?: EntitySnapshot;
  entities?: EntitySnapshot[];
  projectiles?: ProjectileSnapshot[];
  telegraphs?: TelegraphSnapshot[];
  events?: FloatingTextEvent[];
  cooldowns?: {
    dodgeRemainingSec: number;
    attackRemainingSec: number;
    skillsRemainingSec: number[];
  };
  rewards?: {
    exp: number;
    spiritStones: number;
    items: { itemId: string; name: string; quantity: number }[];
  };
  error?: string;
}

// --- 3 Character Slots Interface ---

export interface CharacterSlotSummary {
  slot: number; // 0, 1, 2
  id: string | null;
  name?: string;
  cultivationPath?: CultivationPath;
  realm?: number;
  tier?: number;
  level?: number;
  spiritStones?: number;
  updatedAt?: string;
}

export interface AccountCharactersResponse {
  slots: CharacterSlotSummary[];
  activeCharacterId: string | null;
}


export { isWorldPositionWalkable, resolveWorldMovement } from './world-collision';
