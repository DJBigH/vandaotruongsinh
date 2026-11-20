// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Real-Time 2D ARPG Exploration Scene
// Top-Down Real-Time Movement, Combat, Telegraphs & WebSocket Sync
// ============================================================

import Phaser from 'phaser';
import { eventBridge } from '../EventBridge';
import * as gameApi from '../../api/game';
import { useGameStore } from '../../stores/gameStore';
import { AnimationManager, FacingDirection } from '../animations/AnimationManager';
import { ActionAnimationLock, ActionConfirmation, type Aim, type GameAction } from '../exploration/actions';
import { ExplorationConnection, EXPLORATION_RETRY_MS } from '../exploration/connection';
import { GameControls } from '../exploration/controls';
import { heroAnimation, healthReaction, creatureAppearance } from '../exploration/presentation';
import { WorldRenderer } from '../exploration/worldRenderer';
import { CombatFeedback } from '../exploration/combatFeedback';
import { usePresentationSettings } from '../exploration/settings';
import type { HeroPose } from '../assets/AssetManifest';
import { MapLoad } from '../exploration/mapLoad';
import { cameraFollowLerp, predictPosition } from '../exploration/prediction';
import {
  CultivationPath,
  type MapData,
  type Position,
  type MapNPC,
  type MapInteractable,
  type MapPortal,
  type WsServerMessage,
  type EntitySnapshot,
  type ProjectileSnapshot,
  type TelegraphSnapshot,
} from '@shared/index';

export default class ExplorationScene extends Phaser.Scene {
  private player: Phaser.GameObjects.Sprite | null = null;
  private readonly controls = new GameControls();
  private actorAction = new ActionAnimationLock();
  private readonly actionConfirmation = new ActionConfirmation();
  private pointerAttack: Aim | null = null;
  private currentFacing: FacingDirection = 'down';

  private worldRenderer: WorldRenderer | null = null;
  private feedback!: CombatFeedback;
  private ambientTweens: Phaser.Tweens.Tween[] = [];

  private savedMapId?: string;
  private mapData: MapData | null = null;
  private currentMapId: string | null = null;
  private mapLoader: MapLoad<MapData> | null = null;
  private mapLoading = false;
  private mapRetryAt = 0;
  private npcsGroup!: Phaser.Physics.Arcade.StaticGroup;
  private interactablesGroup!: Phaser.Physics.Arcade.StaticGroup;
  private portalsGroup!: Phaser.Physics.Arcade.StaticGroup;
  private currentInteractable: { type: string; id: string; target: MapNPC | MapPortal | MapInteractable } | null = null;
  private interactionPending = false;
  private interactionPrompt = '';

  private entitySprites = new Map<string, Phaser.GameObjects.Container>();
  private projectileGraphics!: Phaser.GameObjects.Graphics;
  private telegraphGraphics!: Phaser.GameObjects.Graphics;
  private lastFpsUpdate = 0;
  private lastProximityCheck = 0;
  private lastGhostTrailAt = 0;
  private pingMs = 0;

  private connection: ExplorationConnection | null = null;
  private sceneListeners: AbortController | null = null;
  private viewedCharacterId?: string;
  private initialized = false;
  private backgrounded = false;
  private inputSeq = 0;
  private lastInputSentTime = -Infinity;
  private lastMovement: Position = { x: 0, y: 0 };

  private latestServerPlayer: EntitySnapshot | null = null;
  private latestEntities: EntitySnapshot[] = [];
  private latestProjectiles: ProjectileSnapshot[] = [];
  private latestTelegraphs: TelegraphSnapshot[] = [];
  private snapshotReceivedAt = 0;

  constructor() {
    super({ key: 'ExplorationScene' });
  }

  init(data?: { mapId?: string }) {
    const viewed = useGameStore.getState().character;
    this.viewedCharacterId = viewed?.id;
    this.savedMapId = data?.mapId ?? viewed?.currentMapId;
  }

  create() {
    const listeners = new AbortController();
    this.sceneListeners = listeners;
    const { signal } = listeners;
    this.backgrounded = document.hidden || !document.hasFocus();
    this.lastFpsUpdate = 0;
    this.lastProximityCheck = 0;
    this.lastGhostTrailAt = 0;
    this.pingMs = 0;
    this.inputSeq = 0;
    this.initialized = false;
    this.lastInputSentTime = -Infinity;
    this.cameras.main.setBackgroundColor('#101b20');

    const mapLoader = new MapLoad(async (mapId: string) => {
      const res = await gameApi.getMap(mapId);
      if (!res.success || res.data?.id !== mapId) throw new Error('Lỗi khi tải bản đồ');
      return res.data;
    });
    this.mapLoader = mapLoader;
    if (this.savedMapId) mapLoader.prefetch(this.savedMapId);

    if (!this.viewedCharacterId) {
      eventBridge.emit('worldSessionEnded', 'Chưa có nhân vật để mở phiên chơi.');
      return;
    }
    this.connection = new ExplorationConnection({
      characterId: this.viewedCharacterId,
      isForeground: () => !this.backgrounded,
      createSocket: () => {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        // Khi chạy qua Vite dev server (cổng 5173), kết nối trực tiếp cổng 3001 của backend để tránh Vite dev proxy rớt gói
        const isViteDev = window.location.port === '5173';
        const targetHost = isViteDev ? `${window.location.hostname}:3001` : window.location.host;
        return new WebSocket(`${protocol}//${targetHost}/ws/game`);
      },
      scheduleRetry: retry => {
        const timer = window.setTimeout(retry, EXPLORATION_RETRY_MS);
        return () => window.clearTimeout(timer);
      },
      onClose: terminalMessage => this.handleDisconnect(terminalMessage),
      onMessage: data => this.handleMessage(data),
    });

    this.feedback = new CombatFeedback(this);
    const stopSettings = usePresentationSettings.subscribe((settings, previous) => {
      if (!settings.sfx && previous.sfx) this.feedback.silence();
      if (settings.reducedEffects === previous.reducedEffects) return;
      this.worldRenderer?.setReducedMotion(settings.reducedEffects);
      for (const tween of this.ambientTweens) settings.reducedEffects ? tween.pause() : tween.resume();
      if (settings.reducedEffects) {
        this.feedback.clear();
        this.cameras.main.shakeEffect.reset();
        this.cameras.main.flashEffect.reset();
      }
    });
    signal.addEventListener('abort', stopSettings, { once: true });
    this.installControls(signal);
    this.connection.observeVisibility(window, document, signal, value => this.setBackgrounded(value));

    const unsubscribe = useGameStore.subscribe((state, previous) => {
      if (this.hasBlockingUI(state) !== this.hasBlockingUI(previous)) this.releaseControls();
    });
    signal.addEventListener('abort', unsubscribe, { once: true });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdownWorld, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.shutdownWorld, this);

    eventBridge.emit('worldStatusUpdate', 'Đang kết nối…');
    this.connection.start();
  }

  private installControls(signal: AbortSignal) {
    window.addEventListener('keydown', (event) => {
      if (event.defaultPrevented || event.isComposing || event.ctrlKey || event.metaKey || event.altKey ||
        this.backgrounded || this.hasEditableFocus(event.target)) return;

      const state = useGameStore.getState();
      const isPanelShortcut = event.code === 'KeyI' || event.code === 'KeyM';
      if (isPanelShortcut && !state.characterSlotsOpen && !state.dialogueLoading && !state.dialogueState) {
        if (!event.repeat) state.setActivePanel(event.code === 'KeyI' ? 'inventory' : 'map');
        event.preventDefault();
        return;
      }

      if (this.isControlBlocked() ||
        (event.code === 'Space' && event.target instanceof Element && event.target.closest('button, a[href], [role="button"]'))) return;
      if (event.code === 'KeyE') {
        if (!event.repeat) void this.handleInteract();
        event.preventDefault();
      } else if (this.controls.keyDown(event.code, event.repeat)) {
        event.preventDefault();
      }
    }, { signal });
    window.addEventListener('keyup', (event) => this.controls.keyUp(event.code), { signal });
    document.addEventListener('focusin', (event) => {
      if (this.hasEditableFocus(event.target)) this.releaseControls();
    }, { signal });

    const attack = (pointer: Phaser.Input.Pointer) => {
      if (!this.player || !this.isGameClick(pointer)) return;
      const aim = this.getAim(pointer, this.player);
      const clickedNpc = this.npcsGroup.getChildren().some(child =>
        (child as Phaser.GameObjects.Sprite).getBounds().contains(aim.x, aim.y));
      if (!clickedNpc) this.pointerAttack = aim;
    };
    this.input.on('pointerdown', attack);
    signal.addEventListener('abort', () => this.input.off('pointerdown', attack), { once: true });
  }

  private hasEditableFocus(target: EventTarget | null): boolean {
    return target instanceof Element &&
      Boolean(target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"]'));
  }

  private hasBlockingUI(state: ReturnType<typeof useGameStore.getState>): boolean {
    return Boolean(state.activePanel || state.dialogueLoading || state.dialogueState || state.characterSlotsOpen);
  }

  private isControlBlocked(): boolean {
    return !this.initialized || !this.player || this.latestServerPlayer?.state === 'DEAD' ||
      this.backgrounded || this.interactionPending || this.hasBlockingUI(useGameStore.getState()) ||
      this.hasEditableFocus(document.activeElement);
  }

  private isGameClick(pointer: Phaser.Input.Pointer): boolean {
    return pointer.leftButtonDown() && pointer.downElement === this.game.canvas && !this.isControlBlocked();
  }

  private getAim(pointer: Phaser.Input.Pointer, player: Position): Aim {
    const { x, y } = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    return { x, y, angle: Math.atan2(y - player.y, x - player.x) };
  }

  private releaseControls() {
    this.controls.clear();
    this.pointerAttack = null;
    this.currentInteractable = null;
    this.setInteractionPrompt('');
    if (this.initialized && !this.backgrounded) this.sendInput({ x: 0, y: 0 });
  }

  private setBackgrounded(backgrounded: boolean) {
    if (this.backgrounded === backgrounded) return;
    if (backgrounded) this.releaseControls();
    this.backgrounded = backgrounded;
    this.actorAction.clear();
    if (!backgrounded) {
      this.lastInputSentTime = -Infinity;
      this.releaseControls();
    }
  }

  private handleDisconnect(terminalMessage?: string) {
    this.initialized = false;
    this.clearWorld();
    this.currentMapId = null;
    if (terminalMessage) {
      this.connection?.stop();
      this.sceneListeners?.abort();
      eventBridge.emit('worldSessionEnded', terminalMessage);
    } else {
      eventBridge.emit('worldStatusUpdate', 'Đang kết nối lại…');
    }
  }

  private handleMessage(data: string) {
    let message: WsServerMessage;
    try {
      message = JSON.parse(data);
    } catch {
      return;
    }
    if (message.type === 'ERROR') {
      if (message.error) eventBridge.emit('notification', message.error);
      if (!this.initialized || message.error === 'Phiên chơi đã được kết nối ở cửa sổ khác!') {
        this.handleDisconnect(message.error || 'Kết nối đã đóng.');
      }
      return;
    }

    const now = performance.now();
    if (message.type === 'INIT') {
      if (!message.currentMapId || !message.playerState) return;
      this.initialized = true;
      this.lastInputSentTime = -Infinity;
    } else if (!this.initialized) {
      return;
    }

    if (message.type === 'INIT' || message.type === 'TICK') {
      const mapId = message.currentMapId;
      if (!mapId) return;
      if (mapId !== this.currentMapId) {
        this.clearWorld(false);
        this.currentMapId = mapId;
        eventBridge.emit('worldStatusUpdate', 'Đang tải bản đồ…');
      }
      if (message.serverTime) this.pingMs = Math.max(1, Math.min(999, Date.now() - message.serverTime));
      this.snapshotReceivedAt = now;
      const reaction = message.playerState ? healthReaction(this.latestServerPlayer, message.playerState) : null;
      if (message.playerState) {
        if (reaction === 'death' || reaction === 'respawn') {
          this.releaseControls();
          this.actorAction.clear();
          this.actionConfirmation.reset();
          this.feedback.clear();
          if (reaction === 'respawn') this.player?.setPosition(message.playerState.x, message.playerState.y);
        }
        this.latestServerPlayer = message.playerState;
        const { hp, maxHp, mp = 100, maxMp = 100 } = message.playerState;
        eventBridge.emit('playerHpMpUpdate', { hp, maxHp, mp, maxMp });
      }

      this.latestEntities = message.entities ?? [];
      this.latestProjectiles = message.projectiles ?? [];
      this.latestTelegraphs = message.telegraphs ?? [];
      if (message.cooldowns) {
        const confirmed = this.actionConfirmation.update(message.cooldowns, now, this.latestServerPlayer?.facingAngle ?? 0);
        if (this.player && this.latestServerPlayer?.state !== 'DEAD') {
          for (const { action, angle } of confirmed) this.renderConfirmedAction(action, angle);
        }
        eventBridge.emit('cooldownsUpdate', message.cooldowns);
      }

      if (reaction && this.player) {
        this.playPose(reaction);
        if (reaction === 'hurt' || reaction === 'death') this.feedback.hit(this.player.x, this.player.y);
      }
      if (!this.mapData && !this.mapLoading && now >= this.mapRetryAt) this.loadWorld(mapId);
      if (this.mapData) {
        for (const ev of message.events ?? []) this.spawnFloatingText(ev.x, ev.y, ev.text, ev.color, ev.isCrit);
      }
    } else if (message.type === 'REWARDS' && message.rewards) {
      const { exp, spiritStones, items } = message.rewards;
      let text = `Chiến thắng! +${exp} EXP, +${spiritStones} Linh thạch!`;
      if (items.length > 0) {
        text += ` Rơi: ${items.map(i => `${i.name} x${i.quantity}`).join(', ')}`;
      }
      eventBridge.emit('notification', text);
      eventBridge.emit('worldProgressCommitted');
    } else if (message.type === 'DEATH') {
      if (!usePresentationSettings.getState().reducedEffects) this.cameras.main.flash(220, 108, 60, 50);
      eventBridge.emit('notification', message.error || 'Đạo thân trọng thương! Đã hồi sinh tại điểm an toàn.');
    }
  }

  private loadWorld(mapId: string) {
    this.mapLoading = true;
    void this.mapLoader?.show(mapId, (map) => {
      this.mapLoading = false;
      if (!this.latestServerPlayer) return;
      this.mapData = map;
      this.renderWorld(this.latestServerPlayer);
      useGameStore.setState({ currentMap: map });
      eventBridge.emit('worldStatusUpdate', '');
    }, () => {
      this.mapLoading = false;
      this.mapRetryAt = performance.now() + 1000;
      eventBridge.emit('worldStatusUpdate', 'Đang thử tải lại bản đồ…');
    });
  }

  private clearWorld(invalidateLoad = true) {
    if (invalidateLoad) this.mapLoader?.clear();
    this.mapLoading = false;
    this.mapRetryAt = 0;
    this.releaseControls();
    this.actorAction.clear();
    this.actionConfirmation.reset();
    this.latestServerPlayer = null;
    this.latestEntities = [];
    this.latestProjectiles = [];
    this.latestTelegraphs = [];
    this.interactionPending = false;
    if (this.mapData) {
      this.cameras.main.stopFollow();
      this.tweens.killAll();
      this.time.removeAllEvents();
      this.npcsGroup.destroy(true, true);
      this.interactablesGroup.destroy(true, true);
      this.portalsGroup.destroy(true, true);
      this.feedback.clear();
      for (const object of [...this.children.list]) object.destroy();
      this.worldRenderer?.dispose();
      this.worldRenderer = null;
      this.ambientTweens = [];
    }
    this.entitySprites.clear();
    this.player = null;
    this.mapData = null;
    useGameStore.setState({ currentMap: null });
  }

  private shutdownWorld() {
    this.events.off(Phaser.Scenes.Events.SHUTDOWN, this.shutdownWorld, this);
    this.events.off(Phaser.Scenes.Events.DESTROY, this.shutdownWorld, this);
    this.feedback.clear();
    this.worldRenderer?.dispose();
    this.worldRenderer = null;
    this.ambientTweens = [];
    this.sceneListeners?.abort();
    this.sceneListeners = null;
    this.initialized = false;
    this.connection?.stop();
    this.connection = null;
    this.mapLoader?.clear();
    this.mapLoader = null;
    this.releaseControls();
    this.actorAction.clear();
    this.actionConfirmation.reset();
    this.currentMapId = null;
    this.mapData = null;
    this.player = null;
    this.latestServerPlayer = null;
    this.latestEntities = [];
    this.latestProjectiles = [];
    this.latestTelegraphs = [];
    this.entitySprites.clear();
    this.mapLoading = false;
    this.mapRetryAt = 0;
    this.interactionPending = false;
    useGameStore.setState({ currentMap: null });
    eventBridge.emit('worldStatusUpdate', '');
    eventBridge.emit('worldDebugUpdate', '');
    eventBridge.emit('playerHpMpUpdate', null);
    eventBridge.emit('cooldownsUpdate', null);
  }

  private renderWorld(initialPlayer: EntitySnapshot) {
    const map = this.mapData;
    if (!map) return;

    const { width, height, tileSize } = map;
    const worldW = width * tileSize;
    const worldH = height * tileSize;
    this.physics.world.setBounds(0, 0, worldW, worldH);
    this.worldRenderer = new WorldRenderer(this, map);
    this.telegraphGraphics = this.add.graphics().setDepth(2);
    this.projectileGraphics = this.add.graphics().setDepth(2200);

    this.npcsGroup = this.physics.add.staticGroup();
    this.interactablesGroup = this.physics.add.staticGroup();
    this.portalsGroup = this.physics.add.staticGroup();

    // 6. Spawn NPCs với Chibi / Anime Spritesheets & Visual Clarity
    for (const npc of map.npcs) {
      const spriteKey = this.textures.exists(npc.spriteKey) ? npc.spriteKey : 'npc_elder';
      const animKey = `${spriteKey}_idle`;

      const sprite = this.npcsGroup.create(npc.position.x * tileSize, npc.position.y * tileSize, spriteKey) as Phaser.Physics.Arcade.Sprite;
      sprite.setData('npcData', npc);
      sprite.setOrigin(0.5, 0.875);
      this.worldRenderer.track(sprite);
      sprite.setDepth(sprite.y);
      sprite.setInteractive({ useHandCursor: true });

      // Click trực tiếp vào NPC để mở đàm thoại (chuẩn phong cách MMORPG Tu Tiên 2D / Ninja School)
      sprite.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        if (this.isGameClick(pointer)) {
          if (!this.player) return;
          const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, sprite.x, sprite.y);
          if (dist <= 115) {
            this.openNpcDialogue(npc);
          } else {
            this.spawnFloatingText(sprite.x, sprite.y - 70, '💬 Hãy lại gần hơn!', '#ffd700');
          }
        }
      });

      if (this.anims.exists(animKey)) {
        sprite.play(animKey);
      }

      // Tên NPC
      this.add.text(npc.position.x * tileSize, npc.position.y * tileSize - 54, npc.name, {
        fontSize: '12px',
        color: '#ffd700',
        backgroundColor: 'rgba(15, 23, 42, 0.8)',
        padding: { x: 6, y: 2 },
      }).setOrigin(0.5).setDepth(sprite.y + 10);

      // Biểu tượng đàm thoại nổi bật lơ lửng phía trên NPC
      const bubble = this.add.text(npc.position.x * tileSize, npc.position.y * tileSize - 72, '💬', {
        fontSize: '14px',
      }).setOrigin(0.5).setDepth(sprite.y + 15);

      this.ambientTweens.push(this.tweens.add({
        targets: bubble,
        y: npc.position.y * tileSize - 78,
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      }));
    }

    // 7. Spawn Interactables (Linh Miếu, Linh Dược, Khoáng Thạch, Rương Bí Cảnh)
    for (const item of map.interactables) {
      let texture = 'prop_ancient_rock';
      let label = 'Linh Thảo';
      let originY = 0.85;

      if (item.type === 'ORE') {
        texture = this.textures.exists('prop_ore') ? 'prop_ore' : 'prop_crystal_cluster';
        label = 'Tử Tinh Cương';
      } else if (item.type === 'HERB') {
        texture = this.textures.exists('prop_herb') ? 'prop_herb' : 'prop_ancient_rock';
        label = 'Cửu Diệp Linh Thảo';
      } else if (item.type === 'CHEST') {
        texture = this.textures.exists('prop_chest') ? 'prop_chest' : 'prop_ancient_rock';
        label = 'Rương Bí Cảnh';
        originY = 0.90;
      } else if (item.type === 'SHRINE') {
        texture = 'prop_shrine';
        label = 'Linh Miếu';
        originY = 0.88;
      }

      const sprite = this.interactablesGroup.create(item.position.x * tileSize, item.position.y * tileSize, texture) as Phaser.Physics.Arcade.Sprite;
      sprite.setData('interactableData', item);
      sprite.setOrigin(0.5, originY);
      sprite.setDepth(sprite.y);

      if (sprite.displayHeight >= 44) this.worldRenderer.track(sprite);
      this.add.text(sprite.x, sprite.y - sprite.displayHeight * originY - 9, label, {
        fontSize: '11px',
        color: '#b2dfdb',
        backgroundColor: 'rgba(15, 23, 42, 0.8)',
        padding: { x: 4, y: 2 },
      }).setOrigin(0.5).setDepth(sprite.y + 10);
    }

    // 8. Spawn Portals (Cổng Không Gian)
    for (const portal of map.portals) {
      const sprite = this.portalsGroup.create(portal.position.x * tileSize, portal.position.y * tileSize, 'prop_portal') as Phaser.Physics.Arcade.Sprite;
      sprite.setData('portalData', portal);
      sprite.setOrigin(0.5, 0.5);
      sprite.setDepth(sprite.y);

      this.ambientTweens.push(this.tweens.add({
        targets: sprite,
        angle: 360,
        duration: 16000,
        repeat: -1,
      }));

      const sign = this.worldRenderer.portalSign(sprite.x, sprite.y);
      this.add.text(sign.x, sign.y, portal.label, {
        fontSize: '12px',
        color: '#00e5ff',
        backgroundColor: 'rgba(15, 23, 42, 0.8)',
        padding: { x: 6, y: 2 },
      }).setOrigin(sign.originX, 0.5).setDepth(sprite.y + 10);
    }

    // Use the first authoritative world coordinates, including a saved mid-map position.
    const path = initialPlayer.cultivationPath ?? useGameStore.getState().character?.cultivationPath;
    const idleSheet = path === CultivationPath.SPELL ? 'player_magic_idle' : path === CultivationPath.BODY ? 'player_body_idle' : 'player_idle';
    this.player = this.add.sprite(initialPlayer.x, initialPlayer.y, idleSheet).setOrigin(0.5, 0.875);
    const reduced = usePresentationSettings.getState().reducedEffects;
    this.worldRenderer.setReducedMotion(reduced);
    if (reduced) for (const tween of this.ambientTweens) tween.pause();
    this.player.setDepth(initialPlayer.y);
    this.currentFacing = 'down';
    this.playLocomotion(this.player, { x: 0, y: 0 });

    const camera = this.cameras.main;
    camera.setBounds(0, 0, worldW, worldH);
    camera.setZoom(1.30);
    camera.startFollow(this.player);
  }

  update(_time: number, delta: number) {
    const now = performance.now();
    const player = this.player;
    const blocked = this.isControlBlocked();
    const move = blocked ? { x: 0, y: 0 } : this.controls.movement();
    const keyboardAction = blocked ? null : this.controls.takeAction();
    const clickedAim = blocked ? null : this.pointerAttack;
    this.pointerAttack = null;
    const action = clickedAim ? 'ATTACK' : keyboardAction;
    const aim = clickedAim ?? (player ? this.getAim(this.input.activePointer, player) : undefined);
    const actionToSend = action && aim && this.actionConfirmation.request(action, aim.angle, now) ? action : undefined;

    // Send neutral movement on the same cadence while a foreground panel or map load blocks controls.
    if (this.initialized && !this.backgrounded &&
      (actionToSend || move.x !== this.lastMovement.x || move.y !== this.lastMovement.y || now - this.lastInputSentTime >= 50)) {
      this.sendInput(move, aim, actionToSend);
    }

    if (player && this.mapData) {
      const magnitude = Math.hypot(move.x, move.y);
      const speed = (this.latestServerPlayer?.stats?.spd ?? 10) * 12;
      const velocity = magnitude ? { x: move.x * speed / magnitude, y: move.y * speed / magnitude } : move;
      const sample = this.latestServerPlayer
        ? { player: this.latestServerPlayer, receivedAt: this.snapshotReceivedAt }
        : null;
      const position = predictPosition(this.mapData, player, velocity, sample, now, delta);
      player.setPosition(position.x, position.y).setDepth(position.y);
      this.worldRenderer?.updateOcclusion(player);
      this.cameras.main.setLerp(cameraFollowLerp(this.game.loop.rawDelta));
      if (magnitude && !this.actorAction.active) {
        this.currentFacing = AnimationManager.getDirectionFromVelocity(move.x, move.y, this.currentFacing);
      }
      if (!this.actorAction.active) this.playLocomotion(player, move);
      if (sample?.player.state === 'DODGING' && now - this.lastGhostTrailAt >= 45) {
        this.feedback.trail(player);
        this.lastGhostTrailAt = now;
      }

      const snapshotAgeSec = Math.min(100, Math.max(0, now - this.snapshotReceivedAt)) / 1000;
      this.syncEntities(delta, snapshotAgeSec);
      this.renderProjectiles(snapshotAgeSec);
      this.renderTelegraphs(snapshotAgeSec);
      if (!blocked && now - this.lastProximityCheck >= 100) {
        this.checkProximity();
        this.lastProximityCheck = now;
      }
    }

    if (now - this.lastFpsUpdate >= 300) {
      eventBridge.emit('worldDebugUpdate',
        `FPS: ${Math.round(this.game.loop.actualFps)} | Ping: ${this.pingMs}ms | Quái: ${this.latestEntities.length}`);
      this.lastFpsUpdate = now;
    }
  }

  private playLocomotion(player: Phaser.GameObjects.Sprite, move: Position) {
    const pose = this.latestServerPlayer?.state === 'DEAD' ? 'death' : (move.x || move.y) ? 'walk' : 'idle';
    const key = heroAnimation(this.playerPath(), pose, this.currentFacing);
    if (this.anims.exists(key) && player.anims.currentAnim?.key !== key) player.play(key);
  }

  private playerPath() {
    return this.latestServerPlayer?.cultivationPath ?? useGameStore.getState().character?.cultivationPath;
  }

  private playPose(pose: HeroPose) {
    if (!this.player) return;
    const key = heroAnimation(this.playerPath(), pose, this.currentFacing);
    if (!this.anims.exists(key)) return;
    AnimationManager.playAction(this, this.player, this.actorAction, key, this.anims.get(key).duration + 100);
  }

  private renderConfirmedAction(action: GameAction, angle: number) {
    const player = this.player;
    if (!player) return;
    const dodge = action === 'DODGE';
    const attack = action === 'ATTACK';
    const server = this.latestServerPlayer;
    this.currentFacing = dodge && server
      ? AnimationManager.getDirectionFromVelocity(server.vx, server.vy, AnimationManager.getDirectionFromAngle(angle))
      : AnimationManager.getDirectionFromAngle(angle);
    const animation = dodge ? 'dodge' : attack ? 'attack' : 'cast';
    this.playPose(animation);
    this.feedback.sound(dodge ? 'dodge' : attack ? 'sword' : 'cast');
    if (attack) this.feedback.slash(player, angle, this.playerPath());
    else if (dodge) this.feedback.trail(player);
    else this.feedback.cast(player, this.playerPath());
  }

  private sendInput(move: Position, aim?: Aim, action: GameAction | 'NONE' = 'NONE') {
    const sent = this.connection?.send({
      type: 'INPUT',
      timestamp: Date.now(),
      input: {
        seq: ++this.inputSeq,
        moveX: move.x,
        moveY: move.y,
        angle: aim?.angle ?? 0,
        targetX: aim?.x,
        targetY: aim?.y,
        action,
      },
    });
    if (sent) {
      this.lastInputSentTime = performance.now();
      this.lastMovement = move;
    }
  }

  private syncEntities(delta: number, snapshotAgeSec: number) {
    const weight = 1 - Math.exp(-delta / 47);
    const activeIds = new Set<string>();

    for (const ent of this.latestEntities) {
      activeIds.add(ent.id);
      let container = this.entitySprites.get(ent.id);

      if (!container) {
        container = this.add.container(ent.x, ent.y);
        container.setDepth(ent.y);

        // Disciple position and actions come only from the server snapshot.
        const isBoss = ent.type === 'BOSS';
        const isDisciple = ent.type === 'DISCIPLE';
        const look = isDisciple
          ? { texture: 'disciple_lieu_muoi_idle', walk: '', scale: 1 }
          : creatureAppearance(ent);
        const fallback = isBoss ? 'boss_lang_vuong' : 'monster_wolf';
        const texture = this.textures.exists(look.texture) ? look.texture : fallback;
        const sprite = this.add.sprite(0, 0, texture).setOrigin(0.5, 0.875).setScale(look.scale);
        if (look.tint) sprite.setTint(look.tint);
        container.add(sprite);
        container.setData('monsterSprite', sprite);
        container.setData('walk', look.walk);
        container.setData('templateId', ent.templateId);

        // Name text
        const barY = isDisciple ? -49 : look.walk === 'wolf_walk' ? -39 : isBoss ? -70 : -54;
        container.setData('barY', barY);
        const nameOffsetY = barY - 12;
        const nameText = this.add.text(0, nameOffsetY, ent.name, {
          fontSize: isBoss ? '12px' : '11px',
          color: isDisciple ? '#86efac' : isBoss ? '#f87171' : '#ffffff',
          backgroundColor: 'rgba(0,0,0,0.75)',
          padding: { x: 4, y: 2 },
        }).setOrigin(0.5);
        container.add(nameText);

        // Health bar graphics
        if (!isDisciple) {
          const hpBar = this.add.graphics();
          container.add(hpBar);
          container.setData('hpBar', hpBar);
        }

        this.entitySprites.set(ent.id, container);
      }

      // Smooth position interpolation
      container.x = Phaser.Math.Linear(container.x, ent.x + ent.vx * snapshotAgeSec, weight);
      container.y = Phaser.Math.Linear(container.y, ent.y + ent.vy * snapshotAgeSec, weight);
      container.setDepth(container.y);

      container.setVisible(ent.state !== 'DEAD');

      // Update Sprite Animation & Flip Direction
      const sprite = container.getData('monsterSprite') as Phaser.GameObjects.Sprite;
      if (sprite) {
        if (ent.type === 'DISCIPLE') {
          const dx = Math.cos(ent.facingAngle);
          const facing: FacingDirection = Math.abs(Math.sin(ent.facingAngle)) > Math.abs(dx)
            ? (Math.sin(ent.facingAngle) > 0 ? 'down' : 'up')
            : (dx > 0 ? 'right' : 'left');
          const pose = ent.state === 'ATTACKING' ? 'attack' : ent.state === 'MOVING' ? 'walk' : 'idle';
          const animation = `disciple_lieu_muoi_${pose}_${facing}`;
          const casting = sprite.anims.isPlaying && sprite.anims.currentAnim?.key.startsWith('disciple_lieu_muoi_attack_');
          if (this.anims.exists(animation)) {
            if (pose === 'attack' || !casting) sprite.play(animation, true);
          } else if (this.anims.exists('disciple_lieu_muoi_idle_down')) sprite.play('disciple_lieu_muoi_idle_down', true);
          continue;
        }
        const walk = container.getData('walk') as string;
        if (walk === 'ghost_float') {
          sprite.play(walk, true);
        } else if (walk) {
          const horizontal = Math.cos(ent.facingAngle);
          if (Math.abs(horizontal) > 0.1) sprite.setFlipX(horizontal > 0);
          const is6Frame = ['turtle_walk', 'puppet_walk', 'boss_wolf_walk', 'wolf_walk', 'snake_walk', 'fox_walk', 'treant_walk'].includes(walk);
          const frame = is6Frame
            ? (ent.state === 'WINDUP' ? 4 : ent.state === 'ATTACK' ? 5 : ent.state === 'IDLE' ? 0 : null)
            : (ent.state === 'IDLE' ? 0 : null);
          if (frame !== null) {
            if (sprite.anims.isPlaying) sprite.stop();
            sprite.setFrame(frame);
          } else {
            sprite.play(walk, true);
          }
        }
      }

      // Update Health Bar (Chỉ vẽ lại khi HP thay đổi để tiết kiệm draw calls & CPU)
      const prevHp = container.getData('prevHp');
      if (typeof prevHp === 'number' && ent.hp < prevHp) this.feedback.hit(container.x, container.y);
      if (prevHp !== ent.hp) {
        container.setData('prevHp', ent.hp);
        const hpBar = container.getData('hpBar') as Phaser.GameObjects.Graphics;
        if (hpBar) {
          hpBar.clear();
          const isBoss = ent.type === 'BOSS';
          const barW = isBoss ? 58 : 36;
          const barH = 5;
          const barY = container.getData('barY') as number;
          const pct = Math.max(0, ent.hp / ent.maxHp);

          hpBar.fillStyle(0x1e293b, 0.85);
          hpBar.fillRect(-barW / 2, barY, barW, barH);

          const hpColor = isBoss ? 0xef4444 : 0x22c55e;
          hpBar.fillStyle(hpColor, 1);
          hpBar.fillRect(-barW / 2, barY, barW * pct, barH);

          hpBar.lineStyle(1, 0x000000, 0.5);
          hpBar.strokeRect(-barW / 2, barY, barW, barH);
        }
      }
    }

    for (const [id, container] of this.entitySprites.entries()) {
      if (!activeIds.has(id)) {
        container.destroy();
        this.entitySprites.delete(id);
      }
    }
  }

  private renderProjectiles(snapshotAgeSec: number) {
    this.projectileGraphics.clear();
    for (const p of this.latestProjectiles) {
      const angle = Math.atan2(p.vy, p.vx);
      const radius = p.radius || 12;
      const ptype = p.type === 'MAGIC_BOLT' ? 'spell' : 'sword';
      const x = p.x + p.vx * snapshotAgeSec;
      const y = p.y + p.vy * snapshotAgeSec;

      if (usePresentationSettings.getState().reducedEffects) {
        this.projectileGraphics.fillStyle(p.color ?? 0xd3eadf, 0.95);
        this.projectileGraphics.fillCircle(x, y, radius);
        continue;
      }
      if (ptype === 'spell') {
        // ── Pháp cầu (spell ball): tím #9b59b6 với aura ──
        // Outer aura
        this.projectileGraphics.fillStyle(0x9b59b6, 0.18);
        this.projectileGraphics.fillCircle(x, y, radius * 2.2);
        // Mid glow
        this.projectileGraphics.fillStyle(0xd198f5, 0.45);
        this.projectileGraphics.fillCircle(x, y, radius * 1.4);
        // Core
        this.projectileGraphics.fillStyle(0x9b59b6, 1.0);
        this.projectileGraphics.fillCircle(x, y, radius);
        // Bright center
        this.projectileGraphics.fillStyle(0xffffff, 0.85);
        this.projectileGraphics.fillCircle(x, y, radius * 0.38);
        // Small orbiting dot for aura feel
        const orbitA = (Date.now() / 300) % (Math.PI * 2);
        this.projectileGraphics.fillStyle(0xd198f5, 0.9);
        this.projectileGraphics.fillCircle(
          x + Math.cos(orbitA) * radius * 1.6,
          y + Math.sin(orbitA) * radius * 1.6,
          3
        );
      } else {
        // ── Kiếm khí (sword beam): ellipse trắng-xanh #89cff0 với glow ──
        // Glow rings: lớn → nhỏ dần
        this.projectileGraphics.fillStyle(0x89cff0, 0.08);
        this.projectileGraphics.fillCircle(x, y, radius * 2.8);
        this.projectileGraphics.fillStyle(0x89cff0, 0.18);
        this.projectileGraphics.fillCircle(x, y, radius * 2.0);
        this.projectileGraphics.fillStyle(0xc8eeff, 0.40);
        this.projectileGraphics.fillCircle(x, y, radius * 1.4);
        // Vẽ ellipse dài theo hướng bay (simulate với scale + clipping trick in graphics)
        // Dùng line trail để thể hiện hình dạng kiếm khí
        const trailLen = radius * 2.8;
        this.projectileGraphics.lineStyle(radius * 1.1, 0x89cff0, 0.55);
        this.projectileGraphics.beginPath();
        this.projectileGraphics.moveTo(
          x - Math.cos(angle) * trailLen,
          y - Math.sin(angle) * trailLen
        );
        this.projectileGraphics.lineTo(x, y);
        this.projectileGraphics.strokePath();

        this.projectileGraphics.lineStyle(radius * 0.5, 0xffffff, 0.9);
        this.projectileGraphics.beginPath();
        this.projectileGraphics.moveTo(
          x - Math.cos(angle) * trailLen * 0.65,
          y - Math.sin(angle) * trailLen * 0.65
        );
        this.projectileGraphics.lineTo(
          x + Math.cos(angle) * radius * 0.8,
          y + Math.sin(angle) * radius * 0.8
        );
        this.projectileGraphics.strokePath();
        // Bright tip
        this.projectileGraphics.fillStyle(0xffffff, 1.0);
        this.projectileGraphics.fillCircle(x, y, radius * 0.38);
      }
    }
  }

  private renderTelegraphs(snapshotAgeSec: number) {
    this.telegraphGraphics.clear();
    for (const tg of this.latestTelegraphs) {
      const radius = tg.radius || 80;

      this.telegraphGraphics.fillStyle(0xef4444, 0.22);
      this.telegraphGraphics.fillCircle(tg.x, tg.y, radius);

      this.telegraphGraphics.lineStyle(2, 0xf43f5e, 0.9);
      this.telegraphGraphics.strokeCircle(tg.x, tg.y, radius);

      const progress = Phaser.Math.Clamp(1 - (tg.remainingSec - snapshotAgeSec) / tg.durationSec, 0, 1);
      this.telegraphGraphics.fillStyle(0xdc2626, 0.45);
      this.telegraphGraphics.fillCircle(tg.x, tg.y, radius * progress);

      this.telegraphGraphics.fillStyle(0xffffff, 0.7);
      this.telegraphGraphics.fillCircle(tg.x, tg.y, 4);
    }
  }

  private spawnFloatingText(x: number, y: number, text: string, color: string, isCrit?: boolean) {
    const floating = this.add.text(x, y, text, {
      fontSize: isCrit ? '20px' : '15px',
      color: color || (isCrit ? '#facc15' : '#ffffff'),
      fontStyle: isCrit ? 'bold' : 'normal',
      stroke: '#0f172a',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(2500);

    if (isCrit && !usePresentationSettings.getState().reducedEffects) {
      this.cameras.main.shake(120, 0.004);
    }

    this.tweens.add({
      targets: floating,
      y: y - 48,
      alpha: 0,
      duration: 850,
      ease: 'Power2',
      onComplete: () => floating.destroy(),
    });
  }

  // Skill 1: Thanh Phong Kiếm Khí (Flying Piercing Sword Beam)
  private checkProximity() {
    const interactDistance = 90; // Generous 3-tile proximity
    let foundPrompt = '';
    this.currentInteractable = null;

    // Check NPCs
    this.npcsGroup.children.iterate((child: any) => {
      if (child && this.player) {
        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, child.x, child.y);
        if (dist < interactDistance) {
          const npc = child.getData('npcData') as MapNPC;
          this.currentInteractable = { type: 'NPC', id: npc.id, target: npc };
          foundPrompt = `💬 [E] hoặc Click chuột để đàm thoại với ${npc.name}`;
        }
      }
      return true;
    });

    // Check Portals
    if (!this.currentInteractable) {
      this.portalsGroup.children.iterate((child: any) => {
        if (child && this.player) {
          const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, child.x, child.y);
          if (dist < interactDistance) {
            const portal = child.getData('portalData') as MapPortal;
            this.currentInteractable = { type: 'PORTAL', id: portal.id, target: portal };
            foundPrompt = `🌀 [E] Tiến vào: ${portal.label}`;
          }
        }
        return true;
      });
    }

    // Check Interactables
    if (!this.currentInteractable) {
      this.interactablesGroup.children.iterate((child: any) => {
        if (child && this.player) {
          const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, child.x, child.y);
          if (dist < interactDistance) {
            const obj = child.getData('interactableData') as MapInteractable;
            this.currentInteractable = { type: 'OBJECT', id: obj.id, target: obj };
            if (obj.type === 'CHEST') {
              foundPrompt = `🎁 [E] Mở Rương Bí Cảnh`;
            } else if (obj.type === 'HERB') {
              foundPrompt = `🌿 [E] Hái Cửu Diệp Linh Thảo`;
            } else if (obj.type === 'ORE') {
              foundPrompt = `⛏️ [E] Khai Thác Linh Khoáng`;
            } else if (obj.type === 'SHRINE') {
              foundPrompt = `⛩️ [E] Tham Bái Linh Miếu`;
            } else {
              foundPrompt = `✨ [E] Thu thập / Kích hoạt`;
            }
          }
        }
        return true;
      });
    }

    this.setInteractionPrompt(foundPrompt);
  }

  private openNpcDialogue(npc: MapNPC) {
    eventBridge.emit('openDialogue', {
      name: npc.name,
      spriteKey: npc.spriteKey,
      dialogueId: npc.dialogueId || 'dlg_elder_01',
      npcId: npc.id,
    });
  }

  private setInteractionPrompt(prompt: string) {
    if (this.interactionPrompt === prompt) return;
    this.interactionPrompt = prompt;
    eventBridge.emit('worldPromptUpdate', prompt);
  }

  private async handleInteract() {
    if (this.isControlBlocked() || !this.currentInteractable) return;
    const { type, id, target } = this.currentInteractable;
    if (type === 'NPC') {
      this.openNpcDialogue(target as MapNPC);
      return;
    }

    const lifetime = this.sceneListeners;
    const mapId = this.currentMapId;
    this.interactionPending = true;
    this.releaseControls();
    try {
      if (type === 'PORTAL') {
        // The server moves this same session. The next TICK announces the committed map and spawn.
        const portal = target as MapPortal;
        await gameApi.teleport(portal.targetMapId, portal.id);
      } else {
        const res = await gameApi.interact(id);
        if (res.success && this.sceneListeners === lifetime) {
          eventBridge.emit('notification', res.data?.message || 'Tương tác thành công');
          eventBridge.emit('worldProgressCommitted');
        }
      }
    } catch (err: any) {
      if (this.sceneListeners === lifetime && this.currentMapId === mapId) {
        eventBridge.emit('notification', err.response?.data?.error || 'Không thể tương tác');
      }
    } finally {
      if (this.sceneListeners === lifetime && this.currentMapId === mapId) this.interactionPending = false;
    }
  }
}
