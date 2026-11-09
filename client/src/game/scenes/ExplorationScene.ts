// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Real-Time 2D ARPG Exploration Scene
// Top-Down Real-Time Movement, Combat, Telegraphs & WebSocket Sync
// ============================================================

import Phaser from 'phaser';
import { eventBridge } from '../EventBridge';
import * as gameApi from '../../api/game';
import { AnimationManager, FacingDirection } from '../animations/AnimationManager';
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
  private decorProps: Phaser.GameObjects.Sprite[] = [];

  // Animation & Direction State
  private currentFacing: FacingDirection = 'down';
  private isActionLocked: boolean = false;
  private actionLockTimer: Phaser.Time.TimerEvent | null = null;

  // Real-time entity maps
  private entitySprites: Map<string, Phaser.GameObjects.Container> = new Map();
  private projectileGraphics!: Phaser.GameObjects.Graphics;
  private telegraphGraphics!: Phaser.GameObjects.Graphics;

  private promptText!: Phaser.GameObjects.Text;
  private fpsText!: Phaser.GameObjects.Text;
  private currentInteractable: { type: string; id: string; target: any } | null = null;
  private isMovementDisabled: boolean = false;

  // Profiler & Performance
  private lastFpsUpdate: number = 0;
  private lastProximityCheck: number = 0;
  private pingMs: number = 0;

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
    // Input keys setup
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
    this.telegraphGraphics = this.add.graphics().setDepth(2);
    this.projectileGraphics = this.add.graphics().setDepth(2200);

    // Prompt HUD text
    this.promptText = this.add.text(480, 560, '', {
      fontSize: '15px',
      color: '#ffd700',
      backgroundColor: 'rgba(0,0,0,0.8)',
      padding: { x: 12, y: 6 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(3500);

    // Performance & FPS Profiler HUD
    this.fpsText = this.add.text(16, 75, 'FPS: 60 | Ping: 0ms | Entity: 0', {
      fontSize: '12px',
      color: '#38bdf8',
      fontFamily: 'monospace',
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      padding: { x: 8, y: 4 },
    }).setScrollFactor(0).setDepth(3500);

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
      const wsUrl = `${wsProtocol}//${window.location.host}/ws/game`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
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
    if (msg.serverTime) {
      this.pingMs = Math.max(1, Math.min(999, Date.now() - msg.serverTime));
    }

    if (msg.type === 'TICK') {
      if (msg.playerState) {
        this.latestServerPlayer = msg.playerState;
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

      if (msg.cooldowns) {
        eventBridge.emit('cooldownsUpdate', msg.cooldowns);
      }

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
    const worldW = width * tileSize;
    const worldH = height * tileSize;

    // Set world physics and camera to full map dimensions
    this.physics.world.setBounds(0, 0, worldW, worldH);
    this.decorProps = [];

    // 1. Render Master Map Background (Single draw call, 100% solid, zero black gaps)
    const isForest = this.currentMapId.includes('rung');
    const bgKey = isForest ? 'map_rung_bg' : 'map_thanh_khe_bg';

    if (this.textures.exists(bgKey)) {
      const bg = this.add.image(0, 0, bgKey);
      bg.setOrigin(0, 0);
      bg.setDepth(0);
    } else {
      // Fallback: Solid Terrain Tiles Grid
      for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
          const tileKey = (x === 0 || y === 0 || x === width - 1 || y === height - 1)
            ? 'tile_water'
            : ((x * 37 + y * 19) % 100 < 16 ? 'tile_grass_flower' : 'tile_grass');
          this.add.image(x * tileSize + tileSize / 2, y * tileSize + tileSize / 2, tileKey).setDepth(0);
        }
      }
    }

    // 2. Setup Static Groups
    this.npcsGroup = this.physics.add.staticGroup();
    this.interactablesGroup = this.physics.add.staticGroup();
    this.portalsGroup = this.physics.add.staticGroup();

    // 3. Render Sect Architecture & Props (Sơn Môn, Thạch Đăng, Binh Khí Giá, Bát Quái)
    if (!isForest) {
      // Sơn Môn (North Sect Archway Gate at x: 30, y: 3)
      if (this.textures.exists('prop_sect_gate')) {
        const gate = this.add.sprite(30 * tileSize, 3 * tileSize, 'prop_sect_gate');
        gate.setOrigin(0.5, 0.92);
        gate.setDepth(gate.y);
        this.decorProps.push(gate);
      }

      // Thạch Đăng Lung (Daoist Stone Lanterns flanking the Central Plaza)
      const lanternCoords = [
        { x: 22, y: 16 }, { x: 38, y: 16 },
        { x: 22, y: 28 }, { x: 38, y: 28 },
        { x: 28, y: 35 }, { x: 32, y: 35 }
      ];
      for (const pos of lanternCoords) {
        if (this.textures.exists('prop_stone_lantern')) {
          const lantern = this.add.sprite(pos.x * tileSize + tileSize / 2, pos.y * tileSize + tileSize / 2, 'prop_stone_lantern');
          lantern.setOrigin(0.5, 0.88);
          lantern.setDepth(lantern.y);
          this.decorProps.push(lantern);
        }
      }

      // Diễn Võ Trường: Mộc Nhân & Binh Khí Giá (Training Ground Props in West Wing)
      if (this.textures.exists('prop_dummy')) {
        const dummy1 = this.add.sprite(10 * tileSize, 18 * tileSize, 'prop_dummy').setOrigin(0.5, 0.90);
        dummy1.setDepth(dummy1.y);
        const dummy2 = this.add.sprite(10 * tileSize, 24 * tileSize, 'prop_dummy').setOrigin(0.5, 0.90);
        dummy2.setDepth(dummy2.y);
        this.decorProps.push(dummy1, dummy2);
      }
      if (this.textures.exists('prop_weapon_rack')) {
        const rack = this.add.sprite(16 * tileSize, 18 * tileSize, 'prop_weapon_rack').setOrigin(0.5, 0.85);
        rack.setDepth(rack.y);
        this.decorProps.push(rack);
      }

      // Bát Quái Tiên Trận Hoàng Kim ở quảng trường trung tâm (x: 30, y: 22)
      const midX = 30;
      const midY = 22;
      const bagua = this.add.sprite(midX * tileSize, midY * tileSize, 'prop_bagua_array');
      bagua.setOrigin(0.5, 0.5);
      bagua.setDepth(1);
      bagua.setAlpha(0.85);
      this.tweens.add({
        targets: bagua,
        angle: 360,
        duration: 36000,
        repeat: -1,
      });
    }

    // 4. Render Ancient Pine Trees (Thanh Tùng Cổ Thụ) clustered along natural borders
    const treeCoords = [
      { x: 5, y: 8 }, { x: 8, y: 12 }, { x: 52, y: 8 }, { x: 55, y: 12 },
      { x: 4, y: 32 }, { x: 8, y: 36 }, { x: 52, y: 32 }, { x: 55, y: 36 },
      { x: 18, y: 6 }, { x: 42, y: 6 }, { x: 18, y: 40 }, { x: 42, y: 40 }
    ];
    for (const pos of treeCoords) {
      if (pos.x < width && pos.y < height) {
        const tree = this.add.sprite(pos.x * tileSize + tileSize / 2, pos.y * tileSize + tileSize / 2, 'prop_pine_tree');
        tree.setOrigin(0.5, 0.92);
        tree.setDepth(tree.y);
        this.decorProps.push(tree);
      }
    }

    // 5. Render Weathered Spirit Rocks (Linh Thạch) & Crystals
    const rockCoords = [
      { x: 12, y: 32 }, { x: 48, y: 32 }, { x: 20, y: 35 }, { x: 40, y: 35 }
    ];
    for (const pos of rockCoords) {
      if (pos.x < width && pos.y < height) {
        const rock = this.add.sprite(pos.x * tileSize + tileSize / 2, pos.y * tileSize + tileSize / 2, 'prop_ancient_rock');
        rock.setOrigin(0.5, 0.85);
        rock.setDepth(rock.y);
        this.decorProps.push(rock);
      }
    }

    // 6. Spawn NPCs với Chibi / Anime Spritesheets & Visual Clarity
    for (const npc of this.mapData.npcs || []) {
      const spriteKey = npc.spriteKey === 'npc_healer' ? 'npc_healer' :
                        npc.spriteKey === 'npc_guard' ? 'npc_guard' : 'npc_elder';
      const animKey = `${spriteKey}_idle`;

      const sprite = this.npcsGroup.create(npc.position.x * tileSize, npc.position.y * tileSize, spriteKey) as Phaser.Physics.Arcade.Sprite;
      sprite.setData('npcData', npc);
      sprite.setOrigin(0.5, 0.90);
      sprite.setDepth(sprite.y);
      if (this.anims.exists(animKey)) {
        sprite.play(animKey);
      }

      this.add.text(npc.position.x * tileSize, npc.position.y * tileSize - 54, npc.name, {
        fontSize: '12px',
        color: '#ffd700',
        backgroundColor: 'rgba(15, 23, 42, 0.8)',
        padding: { x: 6, y: 2 },
      }).setOrigin(0.5).setDepth(sprite.y + 10);
    }

    // 7. Spawn Interactables (Linh Miếu, Linh Dược, Khoáng Thạch)
    for (const item of this.mapData.interactables || []) {
      let texture = 'prop_ancient_rock';
      let label = 'Linh Thảo';
      let originY = 0.85;

      if (item.type === 'ORE') {
        texture = 'prop_crystal_cluster';
        label = 'Linh Tinh Cương';
      } else if (item.type === 'SHRINE') {
        texture = 'prop_shrine';
        label = 'Linh Miếu';
        originY = 0.88;
      }

      const sprite = this.interactablesGroup.create(item.position.x * tileSize, item.position.y * tileSize, texture) as Phaser.Physics.Arcade.Sprite;
      sprite.setData('interactableData', item);
      sprite.setOrigin(0.5, originY);
      sprite.setDepth(sprite.y);
      this.decorProps.push(sprite);

      this.add.text(item.position.x * tileSize, item.position.y * tileSize - 48, label, {
        fontSize: '11px',
        color: '#b2dfdb',
        backgroundColor: 'rgba(15, 23, 42, 0.8)',
        padding: { x: 4, y: 2 },
      }).setOrigin(0.5).setDepth(sprite.y + 10);
    }

    // 8. Spawn Portals (Cổng Không Gian)
    for (const portal of this.mapData.portals || []) {
      const sprite = this.portalsGroup.create(portal.position.x * tileSize, portal.position.y * tileSize, 'prop_portal') as Phaser.Physics.Arcade.Sprite;
      sprite.setData('portalData', portal);
      sprite.setOrigin(0.5, 0.5);
      sprite.setDepth(sprite.y);

      this.tweens.add({
        targets: sprite,
        angle: 360,
        duration: 16000,
        repeat: -1,
      });

      this.add.text(portal.position.x * tileSize, portal.position.y * tileSize - 42, portal.label, {
        fontSize: '12px',
        color: '#00e5ff',
        backgroundColor: 'rgba(15, 23, 42, 0.8)',
        padding: { x: 6, y: 2 },
      }).setOrigin(0.5).setDepth(sprite.y + 10);
    }

    // 9. Spawn Local Player - Kiếm Tu Chibi Chuẩn Tỷ Lệ (64x64 px)
    const spawnX = (this.mapData.spawnPoint?.x || 30) * tileSize;
    const spawnY = (this.mapData.spawnPoint?.y || 22) * tileSize;
    this.player = this.physics.add.sprite(spawnX, spawnY, 'player_idle');
    this.player.setCollideWorldBounds(true);
    this.player.setOrigin(0.5, 0.90);
    this.player.setSize(22, 18);
    this.player.setOffset(21, 44);
    this.player.setDepth(spawnY);
    this.currentFacing = 'down';
    if (this.anims.exists('player_idle_down')) {
      this.player.play('player_idle_down');
    }

    // Camera follow mượt mà và zoom tối ưu cho màn hình 1920x1080 / 1366x768
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setBounds(0, 0, worldW, worldH);
    this.cameras.main.setZoom(1.30);
  }

  update(_time: number, _delta: number) {
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

    // Phản hồi vận tốc vật lý ngay lập tức trên client (Đồng bộ tuyệt đối hệ số 12 với Server)
    const spdStat = this.latestServerPlayer?.stats?.spd ?? 10;
    const moveSpeed = spdStat * 12;
    if (moveX !== 0 || moveY !== 0) {
      const len = Math.hypot(moveX, moveY);
      this.player.setVelocity((moveX / len) * moveSpeed, (moveY / len) * moveSpeed);
      this.currentFacing = AnimationManager.getDirectionFromVelocity(moveX, moveY, this.currentFacing);
    } else {
      this.player.setVelocity(0, 0);
    }

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

    if (this.lastActionIntent === 'ATTACK' || this.lastActionIntent.startsWith('SKILL')) {
      this.currentFacing = AnimationManager.getDirectionFromAngle(aimAngle);
    }

    // Kích hoạt Animation tương ứng cho hành động
    if (this.lastActionIntent === 'ATTACK') {
      this.playPlayerActionAnim('attack');
    } else if (this.lastActionIntent.startsWith('SKILL')) {
      this.playPlayerActionAnim('cast');
      if (this.lastActionIntent === 'SKILL_4') {
        this.spawnGiantSwordPlunge(pointer.worldX, pointer.worldY);
      } else if (this.lastActionIntent === 'SKILL_3') {
        this.spawnShieldAura();
      }
    } else if (this.lastActionIntent === 'DODGE') {
      this.playPlayerActionAnim('dodge');
      this.spawnGhostTrail(this.player.x, this.player.y);
    }

    // 4. Send Input to Server (at 20 Hz = every 50ms, or immediately on action)
    const now = Date.now();
    const hasAction = this.lastActionIntent !== 'NONE';
    if (hasAction || now - this.lastInputSentTime >= 50) {
      this.sendPlayerInput(moveX, moveY, aimAngle, pointer.worldX, pointer.worldY, this.lastActionIntent);
      this.lastActionIntent = 'NONE';
      this.lastInputSentTime = now;
    }

    // 5. Client Prediction & Smooth Exponential Reconciliation (Hoàn toàn triệt tiêu giật lùi/rubberband)
    if (this.latestServerPlayer) {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.latestServerPlayer.x, this.latestServerPlayer.y);
      if (dist > 72) {
        // Chỉ snap khi dịch chuyển tức thời hoặc độ lệch vượt ngưỡng an toàn
        this.player.x = this.latestServerPlayer.x;
        this.player.y = this.latestServerPlayer.y;
      } else if (dist > 2) {
        // Nội suy mượt mà không khựng giật
        const lerpFactor = (moveX === 0 && moveY === 0) ? 0.35 : 0.08;
        this.player.x = Phaser.Math.Linear(this.player.x, this.latestServerPlayer.x, lerpFactor);
        this.player.y = Phaser.Math.Linear(this.player.y, this.latestServerPlayer.y, lerpFactor);
      }

      if (this.latestServerPlayer.state === 'DODGING') {
        this.spawnGhostTrail(this.player.x, this.player.y);
      }
    }

    // 6. Cập nhật Animation cơ bản khi không bị khóa hành động
    if (!this.isActionLocked) {
      if (this.latestServerPlayer?.state === 'DEAD') {
        if (this.anims.exists('player_death')) {
          this.player.play('player_death', true);
        }
      } else if (this.latestServerPlayer?.state === 'HURT') {
        const hurtKey = `player_hurt_${this.currentFacing}`;
        if (this.anims.exists(hurtKey)) {
          this.player.play(hurtKey, true);
        }
      } else if (moveX !== 0 || moveY !== 0) {
        const walkKey = `player_walk_${this.currentFacing}`;
        if (this.anims.exists(walkKey)) {
          this.player.play(walkKey, true);
        }
      } else {
        const idleKey = `player_idle_${this.currentFacing}`;
        if (this.anims.exists(idleKey)) {
          this.player.play(idleKey, true);
        }
      }
    }

    // 7. Dynamic Y-Sorting
    this.player.setDepth(this.player.y);
    for (const prop of this.decorProps) {
      if (prop && prop.active) {
        prop.setDepth(prop.y);
      }
    }
    this.npcsGroup.children.iterate((c: any) => {
      if (c && c.active) {
        c.setDepth(c.y);
      }
      return true;
    });

    // 8. Synchronize Entities (Monsters & Bosses)
    this.syncEntities();

    // 9. Render Projectiles (Lưỡi Kiếm Khí Tiên Đạo)
    this.renderProjectiles();

    // 10. Render Boss Telegraphs (Red Warning Zones)
    this.renderTelegraphs();

    // 11. Throttled Proximity Check for Interactions (10Hz thay vì 60Hz để tối ưu FPS)
    if (now - this.lastProximityCheck >= 100) {
      this.checkProximity();
      this.lastProximityCheck = now;
    }

    // 12. Profiler HUD (Cập nhật FPS và Ping mỗi 300ms)
    if (now - this.lastFpsUpdate >= 300) {
      const currentFps = Math.round(this.game.loop.actualFps);
      const entityCount = this.latestEntities.length;
      this.fpsText.setText(`FPS: ${currentFps} | Ping: ${this.pingMs}ms | Quái: ${entityCount}`);
      this.lastFpsUpdate = now;
    }

    // 13. Handle E Key Press
    if (Phaser.Input.Keyboard.JustDown(this.wasd.interact)) {
      this.handleInteract();
    }
  }

  private playPlayerActionAnim(action: 'attack' | 'cast' | 'dodge') {
    const key = `player_${action}_${this.currentFacing}`;
    if (this.anims.exists(key)) {
      this.isActionLocked = true;
      this.player.play(key, true);

      if (action === 'attack') {
        this.spawnSlashWave();
      }

      this.player.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        this.isActionLocked = false;
      });

      // Bộ đếm an toàn phòng ngừa animation bị gián đoạn
      if (this.actionLockTimer) this.actionLockTimer.remove();
      const safetyDuration = action === 'attack' ? 360 : action === 'cast' ? 420 : 280;
      this.actionLockTimer = this.time.delayedCall(safetyDuration, () => {
        this.isActionLocked = false;
      });
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
        container = this.add.container(ent.x, ent.y);
        container.setDepth(ent.y);

        // Monster sprite with Genuine 2D Assets
        const isBoss = ent.type === 'BOSS';
        let spriteKey = isBoss ? 'boss_lang_vuong' : 'monster_wolf';
        let animKey = isBoss ? 'boss_wolf_walk' : 'wolf_walk';

        if (ent.templateId === 'mon_003') {
          spriteKey = 'monster_snake';
          animKey = 'snake_walk';
        } else if (ent.templateId === 'mon_008' || ent.templateId === 'mon_009') {
          spriteKey = 'monster_ghost';
          animKey = 'ghost_float';
        }

        const sprite = this.add.sprite(0, 0, spriteKey);
        sprite.setOrigin(0.5, 0.85);
        if (isBoss) {
          sprite.setScale(1.25);
        }
        container.add(sprite);
        container.setData('monsterSprite', sprite);
        container.setData('templateId', ent.templateId);

        if (this.anims.exists(animKey)) {
          sprite.play(animKey);
        }

        // Name text
        const nameOffsetY = isBoss ? -54 : -38;
        const nameText = this.add.text(0, nameOffsetY, ent.name, {
          fontSize: isBoss ? '12px' : '11px',
          color: isBoss ? '#f87171' : '#ffffff',
          backgroundColor: 'rgba(0,0,0,0.75)',
          padding: { x: 4, y: 2 },
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
      container.setDepth(container.y);

      container.setVisible(ent.state !== 'DEAD');

      // Update Sprite Animation & Flip Direction
      const sprite = container.getData('monsterSprite') as Phaser.GameObjects.Sprite;
      if (sprite) {
        if (ent.vx !== 0) {
          sprite.setFlipX(ent.vx < 0);
        }

        const isAttacking = ent.state === 'ATTACK' || ent.state === 'WINDUP';
        const isBoss = ent.type === 'BOSS';

        let targetAnim = isBoss
          ? (isAttacking ? 'boss_wolf_attack' : 'boss_wolf_walk')
          : (isAttacking ? 'wolf_attack' : 'wolf_walk');

        if (ent.templateId === 'mon_003') targetAnim = 'snake_walk';
        if (ent.templateId === 'mon_008' || ent.templateId === 'mon_009') targetAnim = 'ghost_float';

        if (this.anims.exists(targetAnim) && sprite.anims.currentAnim?.key !== targetAnim) {
          sprite.play(targetAnim, true);
        }
      }

      // Update Health Bar (Chỉ vẽ lại khi HP thay đổi để tiết kiệm draw calls & CPU)
      const prevHp = container.getData('prevHp');
      if (prevHp !== ent.hp) {
        container.setData('prevHp', ent.hp);
        const hpBar = container.getData('hpBar') as Phaser.GameObjects.Graphics;
        if (hpBar) {
          hpBar.clear();
          const isBoss = ent.type === 'BOSS';
          const barW = isBoss ? 58 : 36;
          const barH = 5;
          const barY = isBoss ? -42 : -30;
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

  private renderProjectiles() {
    this.projectileGraphics.clear();
    for (const p of this.latestProjectiles) {
      const angle = Math.atan2(p.vy, p.vx);
      const radius = p.radius || 12;

      this.projectileGraphics.fillStyle(0x0284c7, 0.35);
      this.projectileGraphics.fillCircle(p.x, p.y, radius * 1.5);

      this.projectileGraphics.fillStyle(0x38bdf8, 0.9);
      this.projectileGraphics.fillCircle(p.x, p.y, radius);

      this.projectileGraphics.fillStyle(0xffffff, 1.0);
      this.projectileGraphics.fillCircle(p.x, p.y, radius * 0.45);

      this.projectileGraphics.lineStyle(3, 0x38bdf8, 0.8);
      this.projectileGraphics.beginPath();
      this.projectileGraphics.moveTo(p.x - Math.cos(angle) * 22, p.y - Math.sin(angle) * 22);
      this.projectileGraphics.lineTo(p.x + Math.cos(angle) * 10, p.y + Math.sin(angle) * 10);
      this.projectileGraphics.strokePath();
    }
  }

  private renderTelegraphs() {
    this.telegraphGraphics.clear();
    for (const tg of this.latestTelegraphs) {
      const radius = tg.radius || 80;

      this.telegraphGraphics.fillStyle(0xef4444, 0.22);
      this.telegraphGraphics.fillCircle(tg.x, tg.y, radius);

      this.telegraphGraphics.lineStyle(2, 0xf43f5e, 0.9);
      this.telegraphGraphics.strokeCircle(tg.x, tg.y, radius);

      const progress = Math.max(0, 1 - (tg.remainingSec / tg.durationSec));
      this.telegraphGraphics.fillStyle(0xdc2626, 0.45);
      this.telegraphGraphics.fillCircle(tg.x, tg.y, radius * progress);

      this.telegraphGraphics.fillStyle(0xffffff, 0.7);
      this.telegraphGraphics.fillCircle(tg.x, tg.y, 4);
    }
  }

  private spawnSlashWave() {
    if (!this.textures.exists('vfx_sword_slash')) return;
    const offsets = {
      down: { x: 0, y: 16, angle: 90 },
      up: { x: 0, y: -24, angle: -90 },
      left: { x: -24, y: 0, angle: 180 },
      right: { x: 24, y: 0, angle: 0 },
    };
    const off = offsets[this.currentFacing] || offsets.down;
    const slash = this.add.sprite(this.player.x + off.x, this.player.y + off.y, 'vfx_sword_slash');
    slash.setOrigin(0.5, 0.5);
    slash.setAngle(off.angle);
    slash.setDepth(this.player.y + 10);

    this.tweens.add({
      targets: slash,
      scaleX: 1.35,
      scaleY: 1.35,
      alpha: 0,
      duration: 200,
      onComplete: () => slash.destroy(),
    });
  }

  private spawnShieldAura() {
    if (!this.textures.exists('vfx_shield')) return;
    const shield = this.add.sprite(this.player.x, this.player.y - 12, 'vfx_shield');
    shield.setOrigin(0.5, 0.5);
    shield.setDepth(this.player.y + 10);
    shield.setAlpha(0.85);

    this.tweens.add({
      targets: shield,
      angle: 360,
      duration: 3000,
      repeat: 0,
    });

    this.tweens.add({
      targets: shield,
      alpha: 0,
      duration: 1500,
      delay: 1500,
      onComplete: () => shield.destroy(),
    });
  }

  private spawnGhostTrail(x: number, y: number) {
    const ghost = this.add.sprite(x, y, 'player_idle');
    ghost.setOrigin(0.5, 0.90);
    ghost.setDepth(y - 1);
    ghost.setAlpha(0.65);
    ghost.setTint(0x00e5ff);

    this.tweens.add({
      targets: ghost,
      alpha: 0,
      scaleX: 1.15,
      scaleY: 1.15,
      duration: 240,
      onComplete: () => ghost.destroy(),
    });
  }

  private spawnFloatingText(x: number, y: number, text: string, color: string, isCrit?: boolean) {
    const floating = this.add.text(x, y, text, {
      fontSize: isCrit ? '20px' : '15px',
      color: color || (isCrit ? '#facc15' : '#ffffff'),
      fontStyle: isCrit ? 'bold' : 'normal',
      stroke: '#0f172a',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(2500);

    if (isCrit) {
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

  private spawnGiantSwordPlunge(x: number, y: number) {
    if (!this.textures.exists('vfx_giant_sword')) return;
    const sword = this.add.sprite(x, y - 240, 'vfx_giant_sword');
    sword.setOrigin(0.5, 0.95);
    sword.setDepth(2400);
    sword.setAlpha(0);

    this.tweens.add({
      targets: sword,
      y: y,
      alpha: 1,
      duration: 220,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        this.cameras.main.shake(220, 0.009);

        const shockwave = this.add.graphics().setDepth(2350);
        shockwave.lineStyle(3, 0x00e5ff, 0.9);
        shockwave.strokeCircle(x, y, 20);

        this.tweens.add({
          targets: sword,
          alpha: 0,
          scaleY: 1.25,
          scaleX: 1.15,
          duration: 400,
          onComplete: () => {
            sword.destroy();
            shockwave.destroy();
          },
        });
      },
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
