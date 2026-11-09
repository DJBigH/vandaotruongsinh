// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Main Game Page
// ============================================================

import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../stores/gameStore';
import { createPhaserGame } from '../game/PhaserGame';
import { eventBridge } from '../game/EventBridge';
import * as gameApi from '../api/game';

import HUD from '../components/game/HUD';
import DialogueModal from '../components/game/DialogueModal';
import InventoryPanel from '../components/game/InventoryPanel';
import CharacterPanel from '../components/game/CharacterPanel';
import QuestPanel from '../components/game/QuestPanel';
import CraftingPanel from '../components/game/CraftingPanel';
import MapPanel from '../components/game/MapPanel';
import SettingsPanel from '../components/game/SettingsPanel';
import SectPanel from '../components/game/SectPanel';
import CavePanel from '../components/game/CavePanel';
import PetPanel from '../components/game/PetPanel';
import OfflineModal from '../components/game/OfflineModal';
import StoryJournalPanel from '../components/game/StoryJournalPanel';
import TowerPanel from '../components/game/TowerPanel';

export default function GamePage() {
  const navigate = useNavigate();
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const phaserGameRef = useRef<Phaser.Game | null>(null);

  const {
    character,
    loadCharacter,
    loadInventory,
    loadQuests,
    openDialogue,
    activePanel,
    addNotification,
  } = useGameStore();

  useEffect(() => {
    let isMounted = true;

    async function initGameData() {
      await loadCharacter();
      const currentChar = useGameStore.getState().character;

      if (!currentChar && isMounted) {
        navigate('/create-character');
        return;
      }

      await Promise.all([loadInventory(), loadQuests()]);

      // Initialize Phaser canvas
      if (gameContainerRef.current && !phaserGameRef.current) {
        phaserGameRef.current = createPhaserGame(gameContainerRef.current.id);
      }
    }

    initGameData();

    // EventBridge Listeners
    const handleStartCombat = async (monsterId: string) => {
      try {
        const res = await gameApi.startCombat(monsterId);
        if (res.success && res.data && phaserGameRef.current) {
          phaserGameRef.current.scene.stop('ExplorationScene');
          phaserGameRef.current.scene.start('CombatScene', { combatState: res.data });
        }
      } catch (err: any) {
        addNotification(err.response?.data?.error || 'Không thể bắt đầu trận đấu', 'error');
      }
    };

    const handleOpenDialogue = (data: { name: string; spriteKey: string; dialogueId: string }) => {
      openDialogue(data.name, data.spriteKey, data.dialogueId);
    };

    const handleNotification = (msg: string) => {
      addNotification(msg, 'info');
    };

    const handleCombatEnded = async () => {
      await Promise.all([loadCharacter(), loadInventory(), loadQuests()]);
    };

    eventBridge.on('startCombat', handleStartCombat);
    eventBridge.on('openDialogue', handleOpenDialogue);
    eventBridge.on('notification', handleNotification);
    eventBridge.on('combatEnded', handleCombatEnded);

    return () => {
      isMounted = false;
      eventBridge.off('startCombat', handleStartCombat);
      eventBridge.off('openDialogue', handleOpenDialogue);
      eventBridge.off('notification', handleNotification);
      eventBridge.off('combatEnded', handleCombatEnded);

      if (phaserGameRef.current) {
        phaserGameRef.current.destroy(true);
        phaserGameRef.current = null;
      }
    };
  }, [navigate]);

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: '#0a0e17',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      {/* Phaser Canvas Container - Chiếm trọn màn hình không còn viền đen */}
      <div
        id="phaser-game-container"
        ref={gameContainerRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
        }}
      />

      {/* HUD and Modals */}
      <HUD />
      <DialogueModal />

      {activePanel === 'inventory' && <InventoryPanel />}
      {activePanel === 'character' && <CharacterPanel />}
      {activePanel === 'quest' && <QuestPanel />}
      {activePanel === 'crafting' && <CraftingPanel />}
      {activePanel === 'sect' && <SectPanel />}
      {activePanel === 'cave' && <CavePanel />}
      {activePanel === 'pets' && <PetPanel />}
      {activePanel === 'offline' && <OfflineModal />}
      {activePanel === 'story' && <StoryJournalPanel />}
      {activePanel === 'tower' && <TowerPanel />}
      {activePanel === 'map' && <MapPanel />}
      {activePanel === 'settings' && <SettingsPanel />}
    </div>
  );
}
