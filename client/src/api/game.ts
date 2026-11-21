import apiClient from './client';
import type {
  ApiResponse,
  CharacterSummary,
  CreateCharacterRequest,
  InventoryItem,
  QuestInfo,
  CombatState,
  CombatActionRequest,
  MapData,
  DialogueLine,
  DiscipleOverview,
} from '@shared/index';

// === Character ===
export async function getCharacter(): Promise<ApiResponse<CharacterSummary>> {
  const res = await apiClient.get('/game/character');
  return res.data;
}

export interface TimedEvent {
  id: 'noon-meditation' | 'world-boss' | 'night-hunt';
  title: string;
  startAt: string;
  endAt: string;
  claimed?: boolean;
}

export async function getEvents(): Promise<ApiResponse<{ serverTime: string; timeZone: string; active: TimedEvent | null; upcoming: TimedEvent[] }>> {
  const res = await apiClient.get('/game/events');
  return res.data;
}

export async function claimMeditation(): Promise<ApiResponse<{ cultivationExp: number }>> {
  const res = await apiClient.post('/game/events/meditate');
  return res.data;
}

export interface MountInfo { id: string; name: string; description: string; speedBonus: number; alignment: 'IMMORTAL' | 'DEMONIC' | 'BOTH'; realmIndex: number; mapId: string; mapName: string; preyId: string; preyName: string; requiredKills: number; denPosition: { x: number; y: number }; huntProgress: number; realmReady: boolean; owned: boolean }
export async function getMounts(): Promise<ApiResponse<{ mounts: MountInfo[]; activeMount: string | null }>> {
  const res = await apiClient.get('/game/mounts'); return res.data;
}
export async function tameMount(mountId: string): Promise<ApiResponse<{ mountId: string; name: string }>> {
  const res = await apiClient.post('/game/mounts/tame', { mountId }); return res.data;
}
export async function equipMount(mountId: string | null): Promise<ApiResponse<{ activeMount: string | null }>> {
  const res = await apiClient.post('/game/mounts/equip', { mountId }); return res.data;
}

export interface SkillInfo { id: string; name: string; description: string; path: 'SWORD' | 'SPELL' | 'BODY'; mpCost: number; cooldown: number; damageMultiplier: number; unlockRealmIndex: number; unlockRealmTier: number; cost: number; eligible: boolean; learned: boolean; level: number; equipSlot: number | null }
export async function getSkills(): Promise<ApiResponse<{ skills: SkillInfo[]; gold: number }>> {
  const res = await apiClient.get('/game/skills'); return res.data;
}
export async function learnSkill(skillId: string): Promise<ApiResponse<{ skillId: string; equipSlot: number | null; gold: number }>> {
  const res = await apiClient.post('/game/skills/learn', { skillId }); return res.data;
}
export async function equipSkill(skillId: string | null, slot: number): Promise<ApiResponse<{ skillId: string | null; slot: number }>> {
  const res = await apiClient.post('/game/skills/equip', { skillId, slot }); return res.data;
}

export async function createCharacter(data: CreateCharacterRequest): Promise<ApiResponse<CharacterSummary>> {
  const res = await apiClient.post('/game/character', data);
  return res.data;
}

export async function attemptBreakthrough(character: Pick<CharacterSummary, 'id' | 'realmIndex' | 'realmTier'>): Promise<ApiResponse<{ success: boolean; newRealm?: string; message: string; chance: number; expSpent: number }>> {
  const res = await apiClient.post('/game/character/breakthrough', {
    characterId: character.id, realmIndex: character.realmIndex, realmTier: character.realmTier,
    requestId: crypto.randomUUID(),
  });
  return res.data;
}

export interface BreakthroughInfo {
  canBreakthrough: boolean;
  currentRealmName: string;
  nextRealmName: string;
  requiredExp: number;
  currentExp: number;
  message: string;
  chance: number;
  cooldownSeconds: number;
  stages: { name: string; reached: boolean }[];
  requiredItems: { itemId: string; name: string; quantity: number; owned: number }[];
}

export async function getBreakthroughInfo(): Promise<ApiResponse<BreakthroughInfo>> {
  const res = await apiClient.get('/game/character/breakthrough-info');
  return res.data;
}

// === Inventory ===
export async function getInventory(): Promise<ApiResponse<InventoryItem[]>> {
  const res = await apiClient.get('/game/inventory');
  return res.data;
}

export async function equipItem(itemId: string): Promise<ApiResponse<CharacterSummary>> {
  const res = await apiClient.post(`/game/inventory/${itemId}/equip`);
  return res.data;
}

export async function unequipItem(itemId: string): Promise<ApiResponse<CharacterSummary>> {
  const res = await apiClient.post(`/game/inventory/${itemId}/unequip`);
  return res.data;
}

export async function enhanceItem(itemId: string): Promise<ApiResponse<{ enhanceLevel: number; goldSpent: number; oreSpent: number }>> {
  const res = await apiClient.post(`/game/inventory/${itemId}/enhance`);
  return res.data;
}

export async function enchantItem(itemId: string, type: 'FURY' | 'WARD' | 'SWIFT'): Promise<ApiResponse<{ enchantType: string }>> {
  const res = await apiClient.post(`/game/inventory/${itemId}/enchant`, { type });
  return res.data;
}

export async function useItem(itemId: string): Promise<ApiResponse<{ message: string }>> {
  const res = await apiClient.post(`/game/inventory/${itemId}/use`);
  return res.data;
}

export async function lockItem(itemId: string, locked: boolean): Promise<ApiResponse> {
  const res = await apiClient.post(`/game/inventory/${itemId}/lock`, { locked });
  return res.data;
}

export async function sellItem(itemId: string, quantity: number): Promise<ApiResponse<{ gold: number }>> {
  const res = await apiClient.post(`/game/inventory/${itemId}/sell`, { quantity });
  return res.data;
}

// === Combat ===
export async function startCombat(monsterId: string): Promise<ApiResponse<CombatState>> {
  const res = await apiClient.post('/game/combat/start', { monsterId });
  return res.data;
}

export async function combatAction(data: CombatActionRequest): Promise<ApiResponse<CombatState>> {
  const res = await apiClient.post('/game/combat/action', data);
  return res.data;
}

// === Quests ===
export async function getQuests(): Promise<ApiResponse<QuestInfo[]>> {
  const res = await apiClient.get('/game/quests');
  return res.data;
}

export async function acceptQuest(questId: string): Promise<ApiResponse<QuestInfo>> {
  const res = await apiClient.post(`/game/quests/${questId}/accept`);
  return res.data;
}

export async function turnInQuest(questId: string): Promise<ApiResponse<{ rewards: any; message: string }>> {
  const res = await apiClient.post(`/game/quests/${questId}/turnin`);
  return res.data;
}

// === Crafting ===
export interface CraftingRecipe {
  id: string;
  name: string;
  ingredients: { itemTemplateId: string; name: string; quantity: number }[];
  result: { itemTemplateId: string; name: string; quality: string; quantity: number; stats?: Record<string, number>; description?: string };
  minRealmIndex?: number;
  sourceHint?: string;
}

export async function getRecipes(): Promise<ApiResponse<CraftingRecipe[]>> {
  const res = await apiClient.get('/game/crafting/recipes');
  return res.data;
}

export async function craftItem(recipeId: string, quantity: number): Promise<ApiResponse<{ item: InventoryItem; message: string }>> {
  const res = await apiClient.post('/game/crafting/craft', { recipeId, quantity });
  return res.data;
}

// === World / Maps ===
export async function getMap(mapId: string): Promise<ApiResponse<MapData>> {
  const res = await apiClient.get(`/game/maps/${mapId}`);
  return res.data;
}

export async function getWorldMaps(): Promise<ApiResponse<{ id: string; name: string; discovered: boolean; clueFound: boolean; clue?: string; clueSite?: { x: number; y: number } }[]>> {
  const res = await apiClient.get('/game/maps');
  return res.data;
}

export async function teleport(targetMapId: string, portalId?: string): Promise<ApiResponse<{ mapId: string; position: { x: number; y: number } }>> {
  const res = await apiClient.post('/game/maps/teleport', { targetMapId, portalId });
  return res.data;
}

export async function interact(interactableId: string): Promise<ApiResponse<{ type?: string; message?: string }>> {
  const res = await apiClient.post('/game/interact', { interactableId });
  return res.data;
}

// === Dialogue ===
export async function getDialogue(dialogueId: string, npcId?: string): Promise<ApiResponse<DialogueLine[]>> {
  const url = npcId ? `/game/dialogue/${dialogueId}?npcId=${encodeURIComponent(npcId)}` : `/game/dialogue/${dialogueId}`;
  const res = await apiClient.get(url);
  return res.data;
}

export async function dialogueChoice(dialogueId: string, choiceIndex: number): Promise<ApiResponse<DialogueLine>> {
  const res = await apiClient.post(`/game/dialogue/${dialogueId}/choice`, { choiceIndex });
  return res.data;
}

// === Save position ===
export async function savePosition(): Promise<ApiResponse> {
  const res = await apiClient.post('/game/position');
  return res.data;
}

// === Phase 2: Sect (Môn Phái) ===
export async function getSectInfo(): Promise<ApiResponse<any>> {
  const res = await apiClient.get('/game/sect');
  return res.data;
}

export async function joinSect(sectId: string): Promise<ApiResponse<any>> {
  const res = await apiClient.post('/game/sect/join', { sectId });
  return res.data;
}

export async function completeSectMission(missionId: string): Promise<ApiResponse<any>> {
  const res = await apiClient.post(`/game/sect/mission/${missionId}/complete`);
  return res.data;
}

export async function buySectShop(itemId: string, quantity: number = 1): Promise<ApiResponse<any>> {
  const res = await apiClient.post('/game/sect/shop/buy', { itemId, quantity });
  return res.data;
}

// === Phase 2: Cave Abode (Động Phủ) ===
export async function getCaveInfo(): Promise<ApiResponse<any>> {
  const res = await apiClient.get('/game/cave');
  return res.data;
}

export async function plantSeed(slotIndex: number, seedItemId: string): Promise<ApiResponse<any>> {
  const res = await apiClient.post('/game/cave/plant', { slotIndex, seedItemId });
  return res.data;
}

export async function harvestCrop(slotIndex: number): Promise<ApiResponse<any>> {
  const res = await apiClient.post('/game/cave/harvest', { slotIndex });
  return res.data;
}

export async function upgradeCave(facility: 'spiritGathering' | 'herbField'): Promise<ApiResponse<any>> {
  const res = await apiClient.post('/game/cave/upgrade', { facility });
  return res.data;
}

// === Phase 2: Pets (Linh Thú) ===
export async function getPets(): Promise<ApiResponse<any>> {
  const res = await apiClient.get('/game/pets');
  return res.data;
}

// === Disciple companion ===
export async function getDisciple(): Promise<ApiResponse<DiscipleOverview>> {
  const res = await apiClient.get('/game/disciple');
  return res.data;
}

export async function recruitDisciple(): Promise<ApiResponse> {
  const res = await apiClient.post('/game/disciple/recruit');
  return res.data;
}

export async function upgradeDisciple(): Promise<ApiResponse> {
  const res = await apiClient.post('/game/disciple/upgrade');
  return res.data;
}

export async function setDiscipleActive(active: boolean): Promise<ApiResponse> {
  const res = await apiClient.post('/game/disciple/active', { active });
  return res.data;
}

export async function unlockPet(templateId: string): Promise<ApiResponse<any>> {
  const res = await apiClient.post('/game/pets/unlock', { templateId });
  return res.data;
}

export async function activatePet(petId: string): Promise<ApiResponse<any>> {
  const res = await apiClient.post(`/game/pets/${petId}/activate`);
  return res.data;
}

export async function feedPet(petId: string, itemId: string = 'item_060', quantity: number = 1): Promise<ApiResponse<any>> {
  const res = await apiClient.post(`/game/pets/${petId}/feed`, { itemId, quantity });
  return res.data;
}

// === Phase 2: Offline Cultivation (Tu Luyện Vắng Mặt) ===
export async function getOfflineStatus(): Promise<ApiResponse<any>> {
  const res = await apiClient.get('/game/offline/status');
  return res.data;
}

export async function claimOfflineRewards(): Promise<ApiResponse<any>> {
  const res = await apiClient.post('/game/offline/claim');
  return res.data;
}

// === Phase 3: Story & Narrative Journal ===
export async function getStoryChapters(): Promise<ApiResponse<any>> {
  const res = await apiClient.get('/game/story/chapters');
  return res.data;
}

export async function getStoryJournal(): Promise<ApiResponse<any>> {
  const res = await apiClient.get('/game/story/journal');
  return res.data;
}

export async function chooseStoryEnding(ending: string): Promise<ApiResponse<any>> {
  const res = await apiClient.post('/game/story/end', { ending });
  return res.data;
}

// === Phase 3: Demon Subduing Tower (Trấn Yêu Tháp) ===
export async function getTowerFloors(): Promise<ApiResponse<any>> {
  const res = await apiClient.get('/game/tower/floors');
  return res.data;
}

export async function challengeTowerFloor(floor: number): Promise<ApiResponse<any>> {
  const res = await apiClient.post(`/game/tower/floor/${floor}/challenge`);
  return res.data;
}

export async function claimTowerFloor(floor: number): Promise<ApiResponse<any>> {
  const res = await apiClient.post(`/game/tower/floor/${floor}/claim`);
  return res.data;
}

// === 3 Character Slots & Multi-Character System ===
export async function getCharacterSlots(): Promise<ApiResponse<any>> {
  const res = await apiClient.get('/game/character/slots');
  return res.data;
}

export async function switchCharacter(characterId?: string, slot?: number): Promise<ApiResponse<any>> {
  const res = await apiClient.post('/game/character/switch', { characterId, slot });
  return res.data;
}

export async function deleteCharacter(characterId: string): Promise<ApiResponse<any>> {
  const res = await apiClient.delete(`/game/character/${characterId}`);
  return res.data;
}
