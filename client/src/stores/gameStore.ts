import { create } from 'zustand';
import * as gameApi from '../api/game';
import type { CharacterSummary, InventoryItem, QuestInfo, CombatState, MapData, DialogueLine } from '@shared/index';

interface GameState {
  // Character
  character: CharacterSummary | null;
  loadCharacter: () => Promise<void>;

  // Inventory
  inventory: InventoryItem[];
  loadInventory: () => Promise<void>;

  // Quests
  quests: QuestInfo[];
  activeQuestId: string | null;
  loadQuests: () => Promise<void>;
  setActiveQuest: (id: string | null) => void;

  // Combat
  combatState: CombatState | null;
  setCombatState: (state: CombatState | null) => void;

  // Map
  currentMap: MapData | null;
  loadMap: (mapId: string) => Promise<void>;

  // Dialogue
  dialogueState: {
    isOpen: boolean;
    npcName: string;
    npcSpriteKey: string;
    lines: DialogueLine[];
    currentIndex: number;
    dialogueId: string;
  } | null;
  openDialogue: (npcName: string, npcSpriteKey: string, dialogueId: string) => Promise<void>;
  advanceDialogue: () => void;
  selectChoice: (choiceIndex: number) => Promise<void>;
  closeDialogue: () => void;

  // UI Panel states
  activePanel: 'inventory' | 'character' | 'quest' | 'map' | 'crafting' | 'settings' | 'sect' | 'cave' | 'pets' | 'offline' | 'story' | 'tower' | null;
  setActivePanel: (panel: GameState['activePanel']) => void;

  // Notifications
  notifications: { id: number; message: string; type: 'info' | 'success' | 'warning' | 'error' }[];
  addNotification: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  removeNotification: (id: number) => void;
}

let notifId = 0;

export const useGameStore = create<GameState>((set, get) => ({
  character: null,
  inventory: [],
  quests: [],
  activeQuestId: null,
  combatState: null,
  currentMap: null,
  dialogueState: null,
  activePanel: null,
  notifications: [],

  loadCharacter: async () => {
    try {
      const res = await gameApi.getCharacter();
      if (res.success && res.data) {
        set({ character: res.data });
      }
    } catch (err) {
      console.error('Failed to load character:', err);
    }
  },

  loadInventory: async () => {
    try {
      const res = await gameApi.getInventory();
      if (res.success && res.data) {
        set({ inventory: res.data });
      }
    } catch (err) {
      console.error('Failed to load inventory:', err);
    }
  },

  loadQuests: async () => {
    try {
      const res = await gameApi.getQuests();
      if (res.success && res.data) {
        set({ quests: res.data });
      }
    } catch (err) {
      console.error('Failed to load quests:', err);
    }
  },

  setActiveQuest: (id) => set({ activeQuestId: id }),

  setCombatState: (state) => set({ combatState: state }),

  loadMap: async (mapId) => {
    try {
      const res = await gameApi.getMap(mapId);
      if (res.success && res.data) {
        set({ currentMap: res.data });
      }
    } catch (err) {
      console.error('Failed to load map:', err);
    }
  },

  openDialogue: async (npcName, npcSpriteKey, dialogueId) => {
    try {
      const res = await gameApi.getDialogue(dialogueId);
      if (res.success && res.data) {
        set({
          dialogueState: {
            isOpen: true,
            npcName,
            npcSpriteKey,
            lines: res.data,
            currentIndex: 0,
            dialogueId,
          },
        });
      }
    } catch {
      // Fallback dialogue if API not available
      set({
        dialogueState: {
          isOpen: true,
          npcName,
          npcSpriteKey,
          lines: [{ speaker: npcName, text: 'Chào đạo hữu, ta không có gì để nói lúc này.' }],
          currentIndex: 0,
          dialogueId,
        },
      });
    }
  },

  advanceDialogue: () => {
    const state = get().dialogueState;
    if (!state) return;
    if (state.currentIndex < state.lines.length - 1) {
      set({ dialogueState: { ...state, currentIndex: state.currentIndex + 1 } });
    } else {
      set({ dialogueState: null });
    }
  },

  selectChoice: async (choiceIndex) => {
    const state = get().dialogueState;
    if (!state) return;
    try {
      const res = await gameApi.dialogueChoice(state.dialogueId, choiceIndex);
      if (res.success && res.data) {
        set({
          dialogueState: {
            ...state,
            lines: [...state.lines, res.data],
            currentIndex: state.lines.length,
          },
        });
      }
    } catch {
      set({ dialogueState: null });
    }
  },

  closeDialogue: () => set({ dialogueState: null }),

  setActivePanel: (panel) => {
    const current = get().activePanel;
    set({ activePanel: current === panel ? null : panel });
  },

  addNotification: (message, type = 'info') => {
    const id = ++notifId;
    set((s) => ({ notifications: [...s.notifications, { id, message, type }] }));
    setTimeout(() => get().removeNotification(id), 4000);
  },

  removeNotification: (id) => {
    set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) }));
  },
}));
