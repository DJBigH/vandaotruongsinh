// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Real-Time 2D ARPG Exploration Scene
// Top-Down Real-Time Movement, Combat, Telegraphs & WebSocket Sync
// ============================================================

import Phaser from 'phaser';
import { eventBridge } from '../EventBridge';
import * as gameApi from '../../api/game';
import type {
  MapData,
  MapNPC,
  MapInteractable,
  MapPortal,
  WsServerMessage,
  EntitySnapshot,
  ProjectileSnapshot,
  TelegraphSnapshot,
} from '@shared/index';

export default class ExplorationScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    interact: Phaser.Input.Keyboard.Key;
    dodge: Phaser.Input.Keyboard.Key;
    skill1: Phaser.Input.Keyboard.Key;
    skill2: Phaser.Input.Keyboard.Key;
    skill3: Phaser.Input.Keyboard.Key;
    skill4: Phaser.Input.Keyboard.Key;
    inv: Phaser.Input.Keyboard.Key;
    map: Phaser.Input.Keyboard.Key;
  };

  private mapData: MapData | null = null;
  private currentMapId: string = 'map_thanh_khe';

  private npcsGroup!: Phaser.Physics.Arcade.StaticGroup;
  private interactablesGroup!: Phaser.Physics.Arcade.StaticGroup;
  private portalsGroup!: Phaser.Physics.Arcade.StaticGroup;

  // Real-time entity maps
  private entitySprites: Map<string, Phaser.GameObjects.Container> = new Map();
  private projectileGraphics!: Phaser.GameObjects.Graphics;
  private telegraphGraphics!: Phaser.GameObjects.Graphics;

  private promptText!: Phaser.GameObjects.Text;
  private currentInteractable: { type: string; id: string; target: any } | null = null;
  private isMovementDisabled: boolean = false;

  // WebSocket Connection
  private ws: WebSocket | null = null;
  private inputSeq: number = 0;
  private lastInputSentTime: number = 0;
  private lastActionIntent: 'NONE' | 'ATTACK' | 'SKILL_1' | 'SKILL_2' | 'SKILL_3' | 'SKILL_4' | 'DODGE' = 'NONE';
  private targetPointerWorldX: number = 0;
  private targetPointerWorldY: number = 0;

  // Server state buffers
  private latestServerPlayer: EntitySnapshot | null = null;
  private latestEntities: EntitySnapshot[] = [];
  private latestProjectiles: ProjectileSnapshot[] = [];
  private latestTelegraphs: TelegraphSnapshot[] = [];

  constructor() {
    super({ key: 'ExplorationScene' });
  }

  init(data: { mapId?: string }) {
    if (data.mapId) {
      this.currentMapId = data.mapId;
    }
  }

  async create() {
    this.physics.world.setBounds(0, 0, 1600, 1200);

    // Setup input keys
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      up: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      interact: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E),
      dodge: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      skill1: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ONE),
      skill2: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.TWO),
      skill3: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.THREE),
      skill4: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.FOUR),
      inv: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.I),
      map: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.M),
    };

    // Hotkey toggle events for React HUD
    this.wasd.inv.on('down', () => eventBridge.emit('toggleInventory'));
    this.wasd.map.on('down', () => eventBridge.emit('toggleMap'));

    // Mouse input for attacks
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown() && !this.isPointerOverUI(pointer)) {
        this.lastActionIntent = 'ATTACK';
        this.targetPointerWorldX = pointer.worldX;
        this.targetPointerWorldY = pointer.worldY;
      }
    });

    // Dedicated graphic layers for real-time visual effects
    this.telegraphGraphics = this.add.graphics().setDepth(3);
    this.projectileGraphics = this.add.graphics().setDepth(15);

    // Prompt HUD text
    this.promptText = this.add.text(480, 560, '', {
      fontSize: '15px',
      color: '#ffd700',
      backgroundColor: 'rgba(0,0,0,0.75)',
      padding: { x: 12, y: 6 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100);

    // Load Map data from API
    await this.loadMap(this.currentMapId);

    // Connect to WebSocket Server for Real-Time ARPG
    this.connectWebSocket();

    // Listen for external bridge events
    eventBridge.on('disableMovement', () => {
      this.isMovementDisabled = true;
    });
    eventBridge.on('enableMovement', () => {
      this.isMovementDisabled = false;
    });
    eventBridge.on('teleportMap', (targetMapId: string) => {
      if (this.ws) {
        this.ws.close();
      }
      this.scene.restart({ mapId: targetMapId });
    });
  }

  private isPointerOverUI(pointer: Phaser.Input.Pointer): boolean {
    // Check if clicked element is part of React overlay
    const target = document.elementFromPoint(pointer.x, pointer.y);
    if (target && !target.closest('canvas')) {
      return true;
    }
    return false;
  }

  private connectWebSocket() {
    try {
      const isHttps = window.location.protocol === 'https:';
      const wsProtocol = isHttps ? 'wss:' : 'ws:';
      // In dev Vite proxies /ws to backend port 3001
      const wsUrl = `${wsProtocol}//${window.location.host}/ws/game`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        // Send initial AUTH message
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({
            type: 'AUTH',
            timestamp: Date.now(),
          }));
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const msg: WsServerMessage = JSON.parse(event.data);
          this.handleServerMessage(msg);
        } catch (e) {
          console.error('Lỗi phân tích cú pháp gói tin WS:', e);
        }
      };

      this.ws.onclose = () => {
        // Reconnect after 3s if disconnected
        setTimeout(() => {
          if (this.scene.isActive('ExplorationScene')) {
            this.connectWebSocket();
          }
        }, 3000);
      };
    } catch (err) {
      console.error('Không thể kết nối WebSocket:', err);
    }
  }

  private handleServerMessage(msg: WsServerMessage) {
    if (msg.type === 'TICK') {
      if (msg.playerState) {
        this.latestServerPlayer = msg.playerState;
        // Sync HP/MP with React HUD
        eventBridge.emit('playerHpMpUpdate', {
          hp: msg.playerState.hp,
          maxHp: msg.playerState.maxHp,
          mp: msg.playerState.mp ?? 100,
          maxMp: msg.playerState.maxMp ?? 100,
        });
      }

      this.latestEntities = msg.entities || [];
      this.latestProjectiles = msg.projectiles || [];
      this.latestTelegraphs = msg.telegraphs || [];

      // Forward cooldown status to React HUD
      if (msg.cooldowns) {
        eventBridge.emit('cooldownsUpdate', msg.cooldowns);
      }

      // Render floating combat texts from server
      if (msg.events && msg.events.length > 0) {
        for (const ev of msg.events) {
          this.spawnFloatingText(ev.x, ev.y, ev.text, ev.color, ev.isCrit);
        }
      }
    } else if (msg.type === 'REWARDS' && msg.rewards) {
      const { exp, spiritStones, items } = msg.rewards;
      let text = `Chiến thắng! +${exp} EXP, +${spiritStones} Linh thạch!`;
      if (items.length > 0) {
        text += ` Rơi: ${items.map(i => `${i.name} x${i.quantity}`).join(', ')}`;
      }
      eventBridge.emit('notification', text);
    } else if (msg.type === 'DEATH') {
      this.cameras.main.flash(800, 255, 0, 0);
      eventBridge.emit('notification', msg.error || 'Đạo thân trọng thương! Đã hồi sinh tại điểm an toàn.');
    }
  }

  private async loadMap(mapId: string) {
    try {
      const res = await gameApi.getMap(mapId);
      if (res.success && res.data) {
        this.mapData = res.data;
        this.renderWorld();
      }
    } catch (err) {
      console.error('Lỗi khi tải bản đồ:', err);
    }
  }

  private renderWorld() {
    if (!this.mapData) return;

    const { width, height, tileSize } = this.mapData;
    this.physics.world.setBounds(0, 0, width * tileSize, height * tileSize);

    // 1. Render Terrain Tiles
    const isForest = this.currentMapId.includes('rung');
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        let tileKey = isForest ? 'tile_grass' : 'tile_path';
        if (!isForest && (x < 3 || x > width - 4 || y < 3 || y > height - 4)) {
          tileKey = 'tile_grass';
        }
        if (isForest && (x === 0 || y === 0 || x === width - 1 || y === height - 1)) {
          tileKey = 'tile_tree';
        }

        const tile = this.add.image(x * tileSize + tileSize / 2, y * tileSize + tileSize / 2, tileKey);
        tile.setDepth(0);
      }
    }

    // 2. Setup Static Groups for NPCs, Portals, Interactables
    this.npcsGroup = this.physics.add.staticGroup();
    this.interactablesGroup = this.physics.add.staticGroup();
    this.portalsGroup = this.physics.add.staticGroup();

    // 3. Spawn NPCs
    for (const npc of this.mapData.npcs || []) {
      const sprite = this.npcsGroup.create(npc.position.x * tileSize, npc.position.y * tileSize, npc.spriteKey || 'npc_elder') as Phaser.Physics.Arcade.Sprite;
      sprite.setData('npcData', npc);
      sprite.setDepth(5);

      this.add.text(npc.position.x * tileSize, npc.position.y * tileSize - 24, npc.name, {
        fontSize: '12px',
        color: '#ffd700',
        backgroundColor: 'rgba(0,0,0,0.6)',
        padding: { x: 4, y: 2 },
      }).setOrigin(0.5).setDepth(6);
    }

    // 4. Spawn Interactables
    for (const item of this.mapData.interactables || []) {
      let texture = 'tile_grass';
      let label = 'Linh Thảo';
      if (item.type === 'ORE') {
        texture = 'tile_rock';
        label = 'Thiết Khoáng';
      } else if (item.type === 'SHRINE') {
        texture = 'tile_path';
        label = 'Linh Miếu';
      }

      const sprite = this.interactablesGroup.create(item.position.x * tileSize, item.position.y * tileSize, texture) as Phaser.Physics.Arcade.Sprite;
      sprite.setData('interactableData', item);
      sprite.setDepth(4);

      this.add.text(item.position.x * tileSize, item.position.y * tileSize - 20, label, {
        fontSize: '10px',
        color: '#b2dfdb',
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: { x: 3, y: 1 },
      }).setOrigin(0.5).setDepth(5);
    }

    // 5. Spawn Portals
    for (const portal of this.mapData.portals || []) {
      const sprite = this.portalsGroup.create(portal.position.x * tileSize, portal.position.y * tileSize, 'tile_water') as Phaser.Physics.Arcade.Sprite;
      sprite.setData('portalData', portal);
      sprite.setDepth(4);

      this.add.text(portal.position.x * tileSize, portal.position.y * tileSize - 24, portal.label, {
        fontSize: '12px',
        color: '#00e5ff',
        backgroundColor: 'rgba(0,0,0,0.7)',
        padding: { x: 6, y: 2 },
      }).setOrigin(0.5).setDepth(5);
    }

    // 6. Spawn Local Player
    const spawnX = (this.mapData.spawnPoint?.x || 10) * tileSize;
    const spawnY = (this.mapData.spawnPoint?.y || 10) * tileSize;
    this.player = this.physics.add.sprite(spawnX, spawnY, 'player_0');
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(10);
    this.player.setSize(22, 26);

    // Camera follow smoothly
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setBounds(0, 0, width * tileSize, height * tileSize);
  }

  update(_time: number, delta: number) {
    if (!this.player || this.isMovementDisabled) {
      if (this.player?.body) this.player.setVelocity(0, 0);
      return;
    }

    // 1. Calculate Input Vector (WASD / Arrows)
    let moveX = 0;
    let moveY = 0;
    if (this.cursors.left?.isDown || this.wasd.left?.isDown) moveX -= 1;
    if (this.cursors.right?.isDown || this.wasd.right?.isDown) moveX += 1;
    if (this.cursors.up?.isDown || this.wasd.up?.isDown) moveY -= 1;
    if (this.cursors.down?.isDown || this.wasd.down?.isDown) moveY += 1;

    // 2. Check Action keys (Space = Dodge, 1-4 = Skills)
    if (Phaser.Input.Keyboard.JustDown(this.wasd.dodge)) {
      this.lastActionIntent = 'DODGE';
    } else if (Phaser.Input.Keyboard.JustDown(this.wasd.skill1)) {
      this.lastActionIntent = 'SKILL_1';
    } else if (Phaser.Input.Keyboard.JustDown(this.wasd.skill2)) {
      this.lastActionIntent = 'SKILL_2';
    } else if (Phaser.Input.Keyboard.JustDown(this.wasd.skill3)) {
      this.lastActionIntent = 'SKILL_3';
    } else if (Phaser.Input.Keyboard.JustDown(this.wasd.skill4)) {
      this.lastActionIntent = 'SKILL_4';
    }

    // 3. Pointer Aim Angle
    const pointer = this.input.activePointer;
    const aimAngle = Phaser.Math.Angle.Between(this.player.x, this.player.y, pointer.worldX, pointer.worldY);

    // 4. Send Input to Server (at 20 Hz = every 50ms, or immediately on action)
    const now = Date.now();
    const hasAction = this.lastActionIntent !== 'NONE';
    if (hasAction || now - this.lastInputSentTime >= 50) {
      this.sendPlayerInput(moveX, moveY, aimAngle, pointer.worldX, pointer.worldY, this.lastActionIntent);
      this.lastActionIntent = 'NONE';
      this.lastInputSentTime = now;
    }

    // 5. Client Prediction & Reconciliation
    if (this.latestServerPlayer) {
      // Smoothly interpolate towards server position
      const lerpSpeed = 0.25;
      this.player.x = Phaser.Math.Linear(this.player.x, this.latestServerPlayer.x, lerpSpeed);
      this.player.y = Phaser.Math.Linear(this.player.y, this.latestServerPlayer.y, lerpSpeed);

      // Dodge Ghost trail effect
      if (this.latestServerPlayer.state === 'DODGING') {
        this.spawnGhostTrail(this.player.x, this.player.y);
      }
    }

    // 6. Synchronize Entities (Monsters & Bosses)
    this.syncEntities();

    // 7. Render Projectiles
    this.renderProjectiles();

    // 8. Render Boss Telegraphs (Red Warning Zones)
    this.renderTelegraphs();

    // 9. Check Proximity for Interactions
    this.checkProximity();

    // 10. Handle E Key Press
    if (Phaser.Input.Keyboard.JustDown(this.wasd.interact)) {
      this.handleInteract();
    }
  }

  private sendPlayerInput(
    moveX: number,
    moveY: number,
    angle: number,
    targetX: number,
    targetY: number,
    action: 'NONE' | 'ATTACK' | 'SKILL_1' | 'SKILL_2' | 'SKILL_3' | 'SKILL_4' | 'DODGE'
  ) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'INPUT',
        timestamp: Date.now(),
        input: {
          seq: ++this.inputSeq,
          moveX,
          moveY,
          angle,
          targetX,
          targetY,
          action,
        },
      }));
    }
  }

  private syncEntities() {
    const activeIds = new Set<string>();

    for (const ent of this.latestEntities) {
      activeIds.add(ent.id);
      let container = this.entitySprites.get(ent.id);

      if (!container) {
        // Create new container for monster
        container = this.add.container(ent.x, ent.y);
        container.setDepth(6);

        // Monster sprite
        const spriteKey = ent.type === 'BOSS' ? 'boss_001' : 'mon_001';
        const sprite = this.add.sprite(0, 0, spriteKey);
        container.add(sprite);

        // Name text
        const nameText = this.add.text(0, -28, ent.name, {
          fontSize: '11px',
          color: ent.type === 'BOSS' ? '#ff4444' : '#ffffff',
          backgroundColor: 'rgba(0,0,0,0.7)',
          padding: { x: 3, y: 1 },
        }).setOrigin(0.5);
        container.add(nameText);

        // Health bar graphics
        const hpBar = this.add.graphics();
        container.add(hpBar);
        container.setData('hpBar', hpBar);

        this.entitySprites.set(ent.id, container);
      }

      // Smooth position interpolation
      container.x = Phaser.Math.Linear(container.x, ent.x, 0.3);
      container.y = Phaser.Math.Linear(container.y, ent.y, 0.3);

      // Visibility based on state
      container.setVisible(ent.state !== 'DEAD');

      // Update Health Bar
      const hpBar = container.getData('hpBar') as Phaser.GameObjects.Graphics;
      if (hpBar) {
        hpBar.clear();
        const barW = ent.type === 'BOSS' ? 50 : 32;
        const barH = 4;
        const pct = Math.max(0, ent.hp / ent.maxHp);

        // Background
        hpBar.fillStyle(0x333333, 0.8);
        hpBar.fillRect(-barW / 2, -20, barW, barH);

        // Health fill
        const hpColor = ent.type === 'BOSS' ? 0xff2222 : 0x00e676;
        hpBar.fillStyle(hpColor, 1);
        hpBar.fillRect(-barW / 2, -20, barW * pct, barH);
      }
    }

    // Remove deleted entities
    for (const [id, container] of this.entitySprites.entries()) {
      if (!activeIds.has(id)) {
        container.destroy();
        this.entitySprites.delete(id);
      }
    }
  }

  private renderProjectiles() {
    this.projectileGraphics.clear();
    for (const p of this.latestProjectiles) {
      this.projectileGraphics.fillStyle(p.color || 0x00e5ff, 0.9);
      this.projectileGraphics.fillCircle(p.x, p.y, p.radius || 12);

      // Glow outline
      this.projectileGraphics.lineStyle(2, 0xffffff, 0.8);
      this.projectileGraphics.strokeCircle(p.x, p.y, p.radius || 12);
    }
  }

  private renderTelegraphs() {
    this.telegraphGraphics.clear();
    for (const tg of this.latestTelegraphs) {
      const radius = tg.radius || 80;

      // Outer Red Danger Warning Zone
      this.telegraphGraphics.fillStyle(0xff0000, 0.25);
      this.telegraphGraphics.fillCircle(tg.x, tg.y, radius);

      this.telegraphGraphics.lineStyle(2, 0xff0000, 0.9);
      this.telegraphGraphics.strokeCircle(tg.x, tg.y, radius);

      // Inner shrinking countdown ring indicating explosion impact
      const progress = Math.max(0, 1 - (tg.remainingSec / tg.durationSec));
      this.telegraphGraphics.fillStyle(0xff3333, 0.4);
      this.telegraphGraphics.fillCircle(tg.x, tg.y, radius * progress);
    }
  }

  private spawnGhostTrail(x: number, y: number) {
    const ghost = this.add.sprite(x, y, 'player_0');
    ghost.setDepth(9);
    ghost.setAlpha(0.5);
    ghost.setTint(0x00ffff);

    this.tweens.add({
      targets: ghost,
      alpha: 0,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 250,
      onComplete: () => ghost.destroy(),
    });
  }

  private spawnFloatingText(x: number, y: number, text: string, color: string, isCrit?: boolean) {
    const floating = this.add.text(x, y, text, {
      fontSize: isCrit ? '18px' : '14px',
      color: color || '#ffffff',
      fontStyle: isCrit ? 'bold' : 'normal',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(30);

    this.tweens.add({
      targets: floating,
      y: y - 40,
      alpha: 0,
      duration: 800,
      ease: 'Power1',
      onComplete: () => floating.destroy(),
    });
  }

  private checkProximity() {
    const interactDistance = 50;
    let foundPrompt = '';
    this.currentInteractable = null;

    // Check NPCs
    this.npcsGroup.children.iterate((child: any) => {
      if (child && this.player) {
        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, child.x, child.y);
        if (dist < interactDistance) {
          const npc = child.getData('npcData') as MapNPC;
          this.currentInteractable = { type: 'NPC', id: npc.id, target: npc };
          foundPrompt = `[E] Đàm thoại với ${npc.name}`;
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
            foundPrompt = `[E] Tiến vào: ${portal.label}`;
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
            foundPrompt = `[E] Thu thập / Kích hoạt`;
          }
        }
        return true;
      });
    }

    this.promptText.setText(foundPrompt);
    this.promptText.setVisible(Boolean(foundPrompt));
  }

  private async handleInteract() {
    if (!this.currentInteractable) return;

    const { type, id, target } = this.currentInteractable;

    if (type === 'NPC') {
      const npc = target as MapNPC;
      eventBridge.emit('openDialogue', {
        name: npc.name,
        spriteKey: npc.spriteKey,
        dialogueId: npc.dialogueId || 'dialogue_elder_default',
      });
    } else if (type === 'PORTAL') {
      const portal = target as MapPortal;
      try {
        const res = await gameApi.teleport(portal.targetMapId);
        if (res.success) {
          if (this.ws) {
            this.ws.close();
          }
          this.scene.restart({ mapId: portal.targetMapId });
        }
      } catch (err) {
        console.error('Lỗi dịch chuyển:', err);
      }
    } else if (type === 'OBJECT') {
      try {
        const res = await gameApi.interact(id);
        if (res.success) {
          eventBridge.emit('notification', (res.data as any)?.message || 'Tương tác thành công');
        }
      } catch (err: any) {
        eventBridge.emit('notification', err.response?.data?.error || 'Không thể tương tác');
      }
    }
  }
}
