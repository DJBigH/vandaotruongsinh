// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Boot Scene & Real 2D Asset Loader
// ============================================================

import Phaser from 'phaser';
import { bootAssets } from '../assets/loadPlan';
import { queueAsset } from '../assets/sceneAssetLoader';
import { useGameStore } from '../../stores/gameStore';
import { AnimationManager } from '../animations/AnimationManager';
import { heroVariantKey } from '../assets/hero-variants';
import { eventBridge } from '../EventBridge';

export default class BootScene extends Phaser.Scene {
  private failed: string[] = [];
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    this.failed = [];
    const character = useGameStore.getState().character;
    const identity = character ? heroVariantKey(character.cultivationPath, character.gender,
      character.alignment, 0).replace(/_0$/, '_') : 'hero_sword_male_immortal_';
    eventBridge.emit('gameLoadProgress', { label: 'Đang tải hình nhân vật và kỹ năng', progress: 0 });
    this.load.on(Phaser.Loader.Events.PROGRESS, (progress: number) =>
      eventBridge.emit('gameLoadProgress', { label: 'Đang tải hình nhân vật và kỹ năng', progress: Math.round(progress * 100) }));
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => this.failed.push(file.key));
    for (const asset of bootAssets(identity)) queueAsset(this, asset);
  }

  create() {
    if (this.failed.length) {
      eventBridge.emit('gameLoadFailed', `Không tải được hình: ${this.failed.slice(0, 3).join(', ')}`);
      return;
    }
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

}
