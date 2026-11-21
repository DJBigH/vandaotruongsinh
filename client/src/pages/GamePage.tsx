// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Main Game Page
// ============================================================

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../stores/gameStore';
import { createPhaserGame } from '../game/PhaserGame';
import { eventBridge } from '../game/EventBridge';
import * as gameApi from '../api/game';

import HUD from '../components/game/HUD';
import DialogueModal from '../components/game/DialogueModal';
import InventoryPanel from '../components/game/InventoryPanel';
import CharacterPanel from '../components/game/CharacterPanel';
import CharacterSlotsModal from '../components/game/CharacterSlotsModal';
import QuestPanel from '../components/game/QuestPanel';
import CraftingPanel from '../components/game/CraftingPanel';
import MapPanel from '../components/game/MapPanel';
import SettingsPanel from '../components/game/SettingsPanel';
import SectPanel from '../components/game/SectPanel';
import CavePanel from '../components/game/CavePanel';
import PetPanel from '../components/game/PetPanel';
import DisciplePanel from '../components/game/DisciplePanel';
import OfflineModal from '../components/game/OfflineModal';
import StoryJournalPanel from '../components/game/StoryJournalPanel';
import TowerPanel from '../components/game/TowerPanel';
import GuidePanel from '../components/game/GuidePanel';
import EventsPanel from '../components/game/EventsPanel';
import MountPanel from '../components/game/MountPanel';
import SkillPanel from '../components/game/SkillPanel';

export default function GamePage() {
  const navigate = useNavigate();
  const [endedSession, setEndedSession] = useState('');
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const phaserGameRef = useRef<Phaser.Game | null>(null);

  const {
    loadCharacter,
    loadInventory,
    loadQuests,
    openDialogue,
    activePanel,
    character,
    currentMap,
    characterSlotsOpen,
    setCharacterSlotsOpen,
    addNotification,
  } = useGameStore();

  useEffect(() => {
    if (!character || !currentMap || activePanel || useGameStore.getState().dialogueState) return;
    if (!window.localStorage.getItem(`vandao-guide-v105:${character.id}`)) {
      useGameStore.getState().setActivePanel('guide');
    }
  }, [character?.id, currentMap?.id, activePanel]);

  useEffect(() => {
    let isMounted = true;

    async function initGameData() {
      await loadCharacter();
      if (!isMounted) return;
      if (!useGameStore.getState().character) {
        navigate('/create-character');
        return;
      }

      await Promise.all([loadInventory(), loadQuests()]);

      // Initialize Phaser canvas
      if (isMounted && gameContainerRef.current && !phaserGameRef.current) {
        phaserGameRef.current = createPhaserGame(gameContainerRef.current.id);
      }
    }

    initGameData();

    // EventBridge Listeners
    const handleStartCombat = async (monsterId: string) => {
      try {
        const res = await gameApi.startCombat(monsterId);
        if (isMounted && res.success && res.data && phaserGameRef.current) {
          phaserGameRef.current.scene.stop('ExplorationScene');
          phaserGameRef.current.scene.start('CombatScene', { combatState: res.data });
        }
      } catch (err: any) {
        if (isMounted) addNotification(err.response?.data?.error || 'Không thể bắt đầu trận đấu', 'error');
      }
    };

    const handleOpenDialogue = (data: { name: string; spriteKey: string; dialogueId: string; npcId?: string }) => {
      openDialogue(data.name, data.spriteKey, data.dialogueId, data.npcId);
    };

    const handleNotification = (msg: string) => {
      addNotification(msg, 'info');
    };

    let refreshQueued = false;
    let refreshing = false;
    const refreshProgress = async () => {
      refreshQueued = true;
      if (refreshing) return;
      refreshing = true;
      while (isMounted && refreshQueued) {
        refreshQueued = false;
        await Promise.all([loadCharacter(), loadInventory(), loadQuests()]);
      }
      refreshing = false;
    };

    eventBridge.on('worldSessionEnded', setEndedSession);
    eventBridge.on('startCombat', handleStartCombat);
    eventBridge.on('openDialogue', handleOpenDialogue);
    eventBridge.on('notification', handleNotification);
    eventBridge.on('combatEnded', refreshProgress);
    eventBridge.on('worldProgressCommitted', refreshProgress);

    return () => {
      isMounted = false;
      eventBridge.off('worldSessionEnded', setEndedSession);
      eventBridge.off('startCombat', handleStartCombat);
      eventBridge.off('openDialogue', handleOpenDialogue);
      eventBridge.off('notification', handleNotification);
      eventBridge.off('combatEnded', refreshProgress);
      eventBridge.off('worldProgressCommitted', refreshProgress);

      if (phaserGameRef.current) {
        phaserGameRef.current.destroy(true);
        phaserGameRef.current = null;
      }
      const state = useGameStore.getState();
      state.setActivePanel(null);
      state.setCharacterSlotsOpen(false);
      state.closeDialogue();
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

      {endedSession ? (
        <section role="alert" aria-label="Phiên chơi đã kết thúc" style={{
          position: 'absolute', inset: 0, display: 'grid', placeContent: 'center', justifyItems: 'center',
          padding: 24, textAlign: 'center', background: '#0a0e17', color: '#f0eadc',
        }}>
          <h2>Phiên chơi đã kết thúc</h2>
          <p>{endedSession}</p>
          <button type="button" onClick={() => window.location.reload()}>Tải lại nhân vật đang chọn</button>
        </section>
      ) : (
        <>
          <HUD />
          <DialogueModal />
          {characterSlotsOpen && <CharacterSlotsModal onClose={() => setCharacterSlotsOpen(false)} />}

          {activePanel === 'inventory' && <InventoryPanel />}
          {activePanel === 'character' && <CharacterPanel />}
          {activePanel === 'quest' && <QuestPanel />}
          {activePanel === 'crafting' && <CraftingPanel />}
          {activePanel === 'sect' && <SectPanel />}
          {activePanel === 'cave' && <CavePanel />}
          {activePanel === 'pets' && <PetPanel />}
          {activePanel === 'disciple' && <DisciplePanel />}
          {activePanel === 'offline' && <OfflineModal />}
          {activePanel === 'story' && <StoryJournalPanel />}
          {activePanel === 'tower' && <TowerPanel />}
          {activePanel === 'map' && <MapPanel />}
          {activePanel === 'settings' && <SettingsPanel />}
          {activePanel === 'guide' && character && <GuidePanel characterId={character.id} />}
          {activePanel === 'events' && <EventsPanel />}
          {activePanel === 'mount' && <MountPanel />}
          {activePanel === 'skills' && <SkillPanel />}
        </>
      )}
    </div>
  );
}
