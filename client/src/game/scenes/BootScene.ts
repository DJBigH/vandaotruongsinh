// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Boot Scene & Real 2D Asset Loader
// ============================================================

import Phaser from 'phaser';
import { AnimationManager } from '../animations/AnimationManager';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // 1. Tải Sprite Sheet thật cho Nhân Vật Chính (Kiếm Tu - Đạo Bào Cổ Phong)
    this.load.spritesheet('player_walk', 'assets/player_walk.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('player_idle', 'assets/player_idle.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('player_slash', 'assets/player_slash.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('player_cast', 'assets/player_cast.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('player_hurt', 'assets/player_hurt.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('player_death', 'assets/player_death.png', { frameWidth: 64, frameHeight: 64 });

    // 1.1 Tải Sprite Sheet cho Pháp Tu & Thể Tu
    this.load.spritesheet('player_magic_idle', 'assets/player_magic_idle.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('player_body_idle', 'assets/player_body_idle.png', { frameWidth: 64, frameHeight: 64 });

    // 2. Tải Sprite Sheet thật cho NPC
    this.load.spritesheet('npc_elder', 'assets/npc_elder.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('npc_healer', 'assets/npc_healer.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('npc_guard', 'assets/npc_guard.png', { frameWidth: 64, frameHeight: 64 });

    // 3. Tải Sprite Sheet thật cho Quái Vật & Boss
    this.load.spritesheet('monster_wolf', 'assets/monster_wolf.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('boss_lang_vuong', 'assets/boss_lang_vuong.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('monster_snake', 'assets/monster_snake.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('monster_ghost', 'assets/monster_ghost.png', { frameWidth: 32, frameHeight: 32 });

    // 4. Tải Texture Địa Hình & Bản Đồ Master Toàn Cảnh (Zero Draw Call Spikes)
    this.load.image('map_thanh_khe_bg', 'assets/map_thanh_khe_bg.png');
    this.load.image('map_rung_bg', 'assets/map_rung_bg.png');
    this.load.image('tile_grass', 'assets/tile_grass.png');
    this.load.image('tile_grass_flower', 'assets/tile_grass_flower.png');
    this.load.image('tile_path', 'assets/tile_path.png');
    this.load.image('tile_water', 'assets/tile_water.png');
    this.load.image('tile_dirt', 'assets/tile_dirt.png');

    // 5. Tải Vật Thể Cảnh Quan Cổ Phong (Props)
    this.load.image('prop_sect_gate', 'assets/prop_sect_gate.png');
    this.load.image('prop_stone_lantern', 'assets/prop_stone_lantern.png');
    this.load.image('prop_dummy', 'assets/prop_dummy.png');
    this.load.image('prop_weapon_rack', 'assets/prop_weapon_rack.png');
    this.load.image('prop_pine_tree', 'assets/prop_pine_tree.png');
    this.load.image('prop_ancient_rock', 'assets/prop_ancient_rock.png');
    this.load.image('prop_crystal_cluster', 'assets/prop_crystal_cluster.png');
    this.load.image('prop_shrine', 'assets/prop_shrine.png');
    this.load.image('prop_portal', 'assets/prop_portal.png');
    this.load.image('prop_bagua_array', 'assets/prop_bagua_array.png');
    this.load.image('prop_chest', 'assets/prop_chest.png');
    this.load.image('prop_herb', 'assets/prop_herb.png');
    this.load.image('prop_ore', 'assets/prop_ore.png');

    // 6. Tải Hiệu Ứng Chiến Đấu (VFX)
    this.load.image('vfx_sword_slash', 'assets/vfx_sword_slash.png');
    this.load.image('vfx_sword_beam', 'assets/vfx_sword_beam.png');
    this.load.image('vfx_shield', 'assets/vfx_shield.png');
    this.load.image('vfx_giant_sword', 'assets/vfx_giant_sword.png');
    this.load.image('vfx_fire_orb', 'assets/vfx_fire_orb.png');
    this.load.image('vfx_shockwave', 'assets/vfx_shockwave.png');
    this.load.image('vfx_talisman', 'assets/vfx_talisman.png');
  }

  create() {
    // 1. Đăng ký toàn bộ Animations vào hệ thống Phaser
    AnimationManager.registerAll(this);

    // 2. Tạo các fallback textures để tương thích với các ID quái hoặc vật thể phụ
    this.generateFallbackTextures();

    // 3. Khởi động màn chơi thám hiểm ARPG
    this.scene.start('ExplorationScene');
  }

  private generateFallbackTextures() {
    // Fallback cho cây và đá phụ
    this.createTile('tile_tree', '#1b4d1b', '#0f2f0f');
    this.createTile('tile_rock', '#616161', '#424242');

    // Fallback cho các phái khác nếu chưa có asset riêng
    this.createPlayerTexture('player_0', '#4fc3f7');
    this.createPlayerTexture('player_1', '#ab47bc');
    this.createPlayerTexture('player_2', '#66bb6a');
    this.createPlayerTexture('player_3', '#ffa726');
    this.createPlayerTexture('player_4', '#ef5350');
    this.createPlayerTexture('player_5', '#ffd700');

    // Fallback cho NPC phụ
    this.createNPCTexture('npc_mentor', '#ba68c8', '#4a148c');

    // Fallback cho quái vật ID phụ
    this.createMonsterTexture('mon_004', '#e65100', '#ffb74d'); // Yêu Hồ
    this.createMonsterTexture('mon_005', '#3e2723', '#d32f2f'); // Sói Tinh
    this.createMonsterTexture('mon_006', '#1565c0', '#90caf9'); // Kiếm Khí Khôi Lỗi
    this.createMonsterTexture('mon_007', '#b71c1c', '#ff8a80'); // Hỏa Viêm Mãng
    this.createMonsterTexture('mon_010', '#880e4f', '#f48fb1'); // Xích Diễm Chu

    // Boss phụ
    this.createBossTexture('boss_002', '#1b5e20', '#a5d6a7');
    this.createBossTexture('boss_003', '#006064', '#80deea');
    this.createBossTexture('boss_004', '#283593', '#c5cae9');
  }

  private createTile(key: string, primary: string, secondary: string) {
    if (this.textures.exists(key)) return;
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = primary;
    ctx.fillRect(0, 0, 32, 32);
    ctx.fillStyle = secondary;
    ctx.fillRect(4, 4, 8, 8);
    ctx.fillRect(18, 16, 10, 10);
    this.textures.addCanvas(key, canvas);
  }

  private createPlayerTexture(key: string, auraColor: string) {
    if (this.textures.exists(key)) return;
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#263238';
    ctx.fillRect(10, 12, 12, 16);
    ctx.fillStyle = auraColor;
    ctx.fillRect(10, 18, 12, 3);
    ctx.fillStyle = '#ffcc80';
    ctx.fillRect(11, 4, 10, 8);
    this.textures.addCanvas(key, canvas);
  }

  private createNPCTexture(key: string, bodyColor: string, accentColor: string) {
    if (this.textures.exists(key)) return;
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = bodyColor;
    ctx.fillRect(8, 10, 16, 18);
    ctx.fillStyle = accentColor;
    ctx.fillRect(6, 8, 20, 3);
    this.textures.addCanvas(key, canvas);
  }

  private createMonsterTexture(key: string, bodyColor: string, eyeColor: string) {
    if (this.textures.exists(key)) return;
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = bodyColor;
    ctx.fillRect(6, 10, 20, 16);
    ctx.fillStyle = eyeColor;
    ctx.fillRect(10, 12, 3, 3);
    ctx.fillRect(19, 12, 3, 3);
    this.textures.addCanvas(key, canvas);
  }

  private createBossTexture(key: string, bodyColor: string, auraColor: string) {
    if (this.textures.exists(key)) return;
    const canvas = document.createElement('canvas');
    canvas.width = 48;
    canvas.height = 48;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = auraColor;
    ctx.fillRect(4, 4, 40, 40);
    ctx.fillStyle = bodyColor;
    ctx.fillRect(8, 8, 32, 32);
    this.textures.addCanvas(key, canvas);
  }
}
