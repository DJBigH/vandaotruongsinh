// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Boot Scene & Real 2D Asset Loader
// ============================================================

import Phaser from 'phaser';
import { ASSET_MANIFEST } from '../assets/AssetManifest';
import { useGameStore } from '../../stores/gameStore';
import { AnimationManager } from '../animations/AnimationManager';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    for (const asset of ASSET_MANIFEST.assets) {
      if (asset.type === 'spritesheet') {
        this.load.spritesheet(asset.key, asset.file, { frameWidth: asset.frameWidth, frameHeight: asset.frameHeight });
      } else if (asset.type === 'audio') {
        this.load.audio(asset.key, asset.file);
      } else {
        this.load.image(asset.key, asset.file);
      }
    }
  }

  create() {
    // 1. Đăng ký toàn bộ Animations vào hệ thống Phaser
    AnimationManager.registerAll(this);

    // 2. Tạo các fallback textures để tương thích với các ID quái hoặc vật thể phụ
    this.generateFallbackTextures();

    // 3. Khởi động màn chơi thám hiểm ARPG
    this.scene.start('ExplorationScene', { mapId: useGameStore.getState().character?.currentMapId });
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

    // Fallback cho NPC phụ nếu chưa có asset
    // (npc_mentor và npc_elder đã có sprite vNext chính thức)

    // Fallback cho quái vật ID phụ (các quái chưa có sheet vNext riêng)
    this.createMonsterTexture('mon_004', '#e65100', '#ffb74d'); // Yêu Hồ
    this.createMonsterTexture('mon_005', '#3e2723', '#d32f2f'); // Sói Tinh
    this.createMonsterTexture('mon_007', '#b71c1c', '#ff8a80'); // Hỏa Viêm Mãng
    this.createMonsterTexture('mon_010', '#880e4f', '#f48fb1'); // Xích Diễm Chu

    // Boss phụ
    this.createBossTexture('boss_002', '#1b5e20', '#a5d6a7');
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
