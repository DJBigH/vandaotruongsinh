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
  dialogueLoading: boolean;
  dialogueState: {
    isOpen: boolean;
    npcName: string;
    npcSpriteKey: string;
    lines: DialogueLine[];
    currentIndex: number;
    dialogueId: string;
  } | null;
  openDialogue: (npcName: string, npcSpriteKey: string, dialogueId: string, npcId?: string) => Promise<void>;
  advanceDialogue: () => void;
  selectChoice: (choiceIndex: number) => Promise<void>;
  closeDialogue: () => void;

  // UI Panel states
  activePanel: 'inventory' | 'character' | 'quest' | 'map' | 'crafting' | 'settings' | 'sect' | 'cave' | 'pets' | 'disciple' | 'offline' | 'story' | 'tower' | 'guide' | 'events' | 'mount' | 'skills' | null;
  setActivePanel: (panel: GameState['activePanel']) => void;
  characterSlotsOpen: boolean;
  setCharacterSlotsOpen: (open: boolean) => void;

  // Notifications
  notifications: { id: number; message: string; type: 'info' | 'success' | 'warning' | 'error' }[];
  addNotification: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  removeNotification: (id: number) => void;
}

let notifId = 0;
let dialogueRequest = 0;

export const useGameStore = create<GameState>((set, get) => ({
  character: null,
  inventory: [],
  quests: [],
  activeQuestId: null,
  combatState: null,
  currentMap: null,
  dialogueState: null,
  dialogueLoading: false,
  activePanel: null,
  characterSlotsOpen: false,
  notifications: [],

  loadCharacter: async () => {
    try {
      const res = await gameApi.getCharacter();
      if (res.success) {
        set({ character: res.data ?? null });
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

  openDialogue: async (npcName, npcSpriteKey, dialogueId, npcId) => {
    const request = ++dialogueRequest;
    set({ dialogueLoading: true });
    const open = (lines: DialogueLine[]) => {
      if (request !== dialogueRequest) return;
      set({
        dialogueLoading: false,
        dialogueState: {
          isOpen: true,
          npcName,
          npcSpriteKey,
          lines,
          currentIndex: 0,
          dialogueId,
        },
      });
    };

    try {
      const res = await gameApi.getDialogue(dialogueId, npcId);
      if (res.success && res.data?.length) {
        open(res.data);
        if (request === dialogueRequest) void get().loadQuests();
      } else {
        open([{ speaker: npcName, text: 'Chào đạo hữu, con đường tu tiên đầy trắc trở, hãy bảo trọng!' }]);
      }
    } catch {
      open([{ speaker: npcName, text: 'Chào đạo hữu, ta không có gì để nói lúc này.' }]);
    }
  },

  advanceDialogue: () => {
    const state = get().dialogueState;
    if (!state) return;
    if (state.currentIndex < state.lines.length - 1) {
      set({ dialogueState: { ...state, currentIndex: state.currentIndex + 1 } });
    } else {
      get().closeDialogue();
    }
  },

  selectChoice: async (choiceIndex) => {
    const state = get().dialogueState;
    if (!state) return;
    const request = dialogueRequest;
    try {
      const res = await gameApi.dialogueChoice(state.dialogueId, choiceIndex);
      if (request === dialogueRequest && res.success && res.data) {
        set({
          dialogueState: {
            ...state,
            lines: [...state.lines, res.data],
            currentIndex: state.lines.length,
          },
        });
      }
    } catch {
      if (request === dialogueRequest) get().closeDialogue();
    }
  },

  closeDialogue: () => {
    dialogueRequest++;
    set({ dialogueState: null, dialogueLoading: false });
  },

  setActivePanel: (panel) => {
    const current = get().activePanel;
    set({ activePanel: current === panel ? null : panel });
  },

  setCharacterSlotsOpen: (open) => set({ characterSlotsOpen: open }),

  addNotification: (message, type = 'info') => {
    const id = ++notifId;
    set((s) => ({ notifications: [...s.notifications, { id, message, type }] }));
    setTimeout(() => get().removeNotification(id), 4000);
  },

  removeNotification: (id) => {
    set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) }));
  },
}));
