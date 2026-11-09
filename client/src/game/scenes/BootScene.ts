// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Boot Scene & Asset Generation
// ============================================================

import Phaser from 'phaser';
import { SpriteGenerator } from '../assets/SpriteGenerator';
import { AnimationManager } from '../animations/AnimationManager';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create() {
    // 1. Sinh các spritesheet và texture độ nét cao (Cổ Phong Tiên Hiệp)
    SpriteGenerator.generateAll(this);

    // 2. Đăng ký toàn bộ Animations vào hệ thống Phaser
    AnimationManager.registerAll(this);

    // 3. Giữ các texture phụ và fallback tương thích
    this.generateFallbackTextures();

    this.scene.start('ExplorationScene');
  }

  private generateFallbackTextures() {
    // 1. Tiles (32x32)
    this.createTile('tile_grass', '#2d5a27', '#38761d');
    this.createTile('tile_dirt', '#5c4033', '#795548');
    this.createTile('tile_path', '#bcaaa4', '#a1887f');
    this.createTile('tile_water', '#1976d2', '#2196f3');
    this.createTile('tile_tree', '#1b4d1b', '#0f2f0f');
    this.createTile('tile_rock', '#616161', '#424242');

    // 2. Player Sprites (32x32)
    this.createPlayerTexture('player_0', '#4fc3f7');
    this.createPlayerTexture('player_1', '#ab47bc');
    this.createPlayerTexture('player_2', '#66bb6a');
    this.createPlayerTexture('player_3', '#ffa726');
    this.createPlayerTexture('player_4', '#ef5350');
    this.createPlayerTexture('player_5', '#ffd700');

    // 3. NPC Sprites (32x32)
    this.createNPCTexture('npc_elder', '#ffffff', '#ffd700');
    this.createNPCTexture('npc_healer', '#81c784', '#388e3c');
    this.createNPCTexture('npc_guard', '#90a4ae', '#37474f');
    this.createNPCTexture('npc_mentor', '#ba68c8', '#4a148c');

    // 4. Monster Sprites (32x32)
    this.createMonsterTexture('mon_001', '#757575', '#e0e0e0'); // Sói Xám
    this.createMonsterTexture('mon_002', '#212121', '#b71c1c'); // Sói Đen
    this.createMonsterTexture('mon_003', '#2e7d32', '#aed581'); // Rắn Độc
    this.createMonsterTexture('mon_004', '#e65100', '#ffb74d'); // Yêu Hồ
    this.createMonsterTexture('mon_005', '#3e2723', '#d32f2f'); // Sói Tinh
    this.createMonsterTexture('mon_006', '#1565c0', '#90caf9'); // Kiếm Khí Khôi Lỗi
    this.createMonsterTexture('mon_007', '#b71c1c', '#ff8a80'); // Hỏa Viêm Mãng
    this.createMonsterTexture('mon_008', '#4a148c', '#ce93d8'); // Thi Khí Hủ Thi
    this.createMonsterTexture('mon_009', '#004d40', '#80cbc4'); // Hàn Đàm U Hồn
    this.createMonsterTexture('mon_010', '#880e4f', '#f48fb1'); // Xích Diễm Chu

    // 5. Boss Sprites (48x48)
    this.createBossTexture('boss_001', '#b71c1c', '#ffd700'); // Xích Nha Lang Vương
    this.createBossTexture('boss_002', '#1b5e20', '#a5d6a7'); // Cổ Thụ Yêu
    this.createBossTexture('boss_003', '#006064', '#80deea'); // Huyền Giáp Linh Quy
    this.createBossTexture('boss_004', '#283593', '#c5cae9'); // Thanh Vân Kiếm Si
    this.createBossTexture('boss_005', '#d84315', '#ffccbc'); // Xích Luyện Đan Sư
    this.createBossTexture('boss_006', '#4a148c', '#ea80fc'); // U Hỏa Huyết Hạt
    this.createBossTexture('boss_007', '#311b92', '#d1c4e9'); // Cổ Kiếm Tôn Giả
    this.createBossTexture('boss_008', '#212121', '#b71c1c'); // U Minh Quỷ Đế
    this.createBossTexture('boss_009', '#004d40', '#80deea'); // Kính Tâm Ma Hoàng
    this.createBossTexture('boss_010', '#bf360c', '#ffe0b2'); // Long Mạch Chân Long
    this.createBossTexture('boss_011', '#ffd700', '#ffffff'); // Thiên Khế Chấp Pháp Giả
    this.createBossTexture('boss_012', '#37474f', '#cfd8dc'); // Tàn Kiếm Tông Sư
    this.createBossTexture('boss_013', '#1b5e20', '#ffff00'); // Hoàng Tuyền Minh Xà
    this.createBossTexture('boss_014', '#0288d1', '#e1f5fe'); // Băng Sương Huyễn Phượng
    this.createBossTexture('boss_015', '#4e342e', '#ffcc80'); // Thái Cổ Hỗn Độn Ma Viên
    this.createBossTexture('boss_016', '#311b92', '#f48fb1'); // Cửu U Minh Hoàng
    this.createBossTexture('boss_017', '#1a237e', '#ffff00'); // Diệt Thế Lôi Long
    this.createBossTexture('boss_018', '#000000', '#7c4dff'); // Hư Không Thôn Thiên Thú
    this.createBossTexture('boss_019', '#ffffff', '#ffd700'); // Bất Diệt Kiếm Tổ
    this.createBossTexture('boss_020', '#ff1744', '#ffd700'); // Vạn Đạo Thiên Tôn (Chung Cực)

    // 6. Pet Sprites (32x32)
    this.createPetTexture('pet_thanh_loan', '#00bcd4', '#e0f7fa');
    this.createPetTexture('pet_hoa_lan', '#ff3d00', '#ffeb3b');
    this.createPetTexture('pet_huyen_quy', '#00796b', '#a7ffeb');
    this.createPetTexture('pet_nguyet_tho', '#f8bbd0', '#ffffff');
    this.createPetTexture('pet_loi_ung', '#304ffe', '#ffd600');
    this.createPetTexture('pet_u_ho', '#7c4dff', '#e040fb');

    // 7. World Objects (32x32)
    this.createHerbTexture('herb');
    this.createOreTexture('ore');
    this.createShrineTexture('shrine');
    this.createPortalTexture('portal');
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
    ctx.fillRect(2, 22, 6, 6);

    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.strokeRect(0, 0, 32, 32);

    this.textures.addCanvas(key, canvas);
  }

  private createPlayerTexture(key: string, auraColor: string) {
    if (this.textures.exists(key)) return;
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;

    // Robe / Body
    ctx.fillStyle = '#263238';
    ctx.fillRect(10, 12, 12, 16);

    // Belt / Trim
    ctx.fillStyle = auraColor;
    ctx.fillRect(10, 18, 12, 3);

    // Head
    ctx.fillStyle = '#ffcc80';
    ctx.fillRect(11, 4, 10, 8);

    // Hair / Bun
    ctx.fillStyle = '#212121';
    ctx.fillRect(9, 2, 14, 5);
    ctx.fillRect(13, 0, 6, 3);

    // Eyes
    ctx.fillStyle = '#000';
    ctx.fillRect(13, 7, 2, 2);
    ctx.fillRect(17, 7, 2, 2);

    // Sword on back
    ctx.fillStyle = '#cfd8dc';
    ctx.fillRect(22, 6, 2, 18);
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(21, 10, 4, 2);

    this.textures.addCanvas(key, canvas);
  }

  private createNPCTexture(key: string, robeColor: string, trimColor: string) {
    if (this.textures.exists(key)) return;
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;

    // Robe
    ctx.fillStyle = robeColor;
    ctx.fillRect(8, 10, 16, 18);

    // Trim
    ctx.fillStyle = trimColor;
    ctx.fillRect(8, 16, 16, 3);

    // Head
    ctx.fillStyle = '#ffe0b2';
    ctx.fillRect(10, 3, 12, 8);

    // Hat / Beard
    ctx.fillStyle = trimColor;
    ctx.fillRect(9, 1, 14, 3);

    this.textures.addCanvas(key, canvas);
  }

  private createMonsterTexture(key: string, bodyColor: string, eyeColor: string) {
    if (this.textures.exists(key)) return;
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;

    // Body
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.ellipse(16, 18, 12, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.beginPath();
    ctx.arc(22, 12, 6, 0, Math.PI * 2);
    ctx.fill();

    // Ears
    ctx.fillStyle = bodyColor;
    ctx.fillRect(20, 4, 3, 4);
    ctx.fillRect(24, 4, 3, 4);

    // Glowing Eyes
    ctx.fillStyle = eyeColor;
    ctx.fillRect(23, 11, 2, 2);

    this.textures.addCanvas(key, canvas);
  }

  private createBossTexture(key: string, bodyColor: string, glowColor: string) {
    if (this.textures.exists(key)) return;
    const canvas = document.createElement('canvas');
    canvas.width = 48;
    canvas.height = 48;
    const ctx = canvas.getContext('2d')!;

    // Aura
    ctx.fillStyle = 'rgba(239, 83, 80, 0.25)';
    ctx.beginPath();
    ctx.arc(24, 24, 22, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.ellipse(24, 26, 16, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.beginPath();
    ctx.arc(32, 18, 10, 0, Math.PI * 2);
    ctx.fill();

    // Horns / Ears
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(30, 6, 4, 6);
    ctx.fillRect(36, 8, 4, 5);

    // Glowing Red Eyes
    ctx.fillStyle = glowColor;
    ctx.fillRect(34, 16, 3, 3);

    // Sharp fangs
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(36, 22, 2, 4);
    ctx.fillRect(39, 22, 2, 4);

    this.textures.addCanvas(key, canvas);
  }

  private createHerbTexture(key: string) {
    if (this.textures.exists(key)) return;
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#00e676';
    ctx.beginPath();
    ctx.arc(16, 18, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#b9f6ca';
    ctx.fillRect(15, 8, 2, 10);
    ctx.fillRect(10, 12, 6, 4);
    ctx.fillRect(16, 14, 6, 4);

    this.textures.addCanvas(key, canvas);
  }

  private createOreTexture(key: string) {
    if (this.textures.exists(key)) return;
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#78909c';
    ctx.fillRect(8, 14, 16, 12);
    ctx.fillStyle = '#b0bec5';
    ctx.fillRect(10, 10, 10, 6);
    ctx.fillStyle = '#ffd54f';
    ctx.fillRect(12, 16, 4, 4);
    ctx.fillRect(18, 14, 3, 3);

    this.textures.addCanvas(key, canvas);
  }

  private createShrineTexture(key: string) {
    if (this.textures.exists(key)) return;
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#c5a059';
    ctx.fillRect(4, 22, 24, 6);
    ctx.fillStyle = '#8d6e63';
    ctx.fillRect(8, 12, 4, 10);
    ctx.fillRect(20, 12, 4, 10);
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(6, 6, 20, 6);

    this.textures.addCanvas(key, canvas);
  }

  private createPortalTexture(key: string) {
    if (this.textures.exists(key)) return;
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = 'rgba(38, 198, 218, 0.4)';
    ctx.beginPath();
    ctx.arc(16, 16, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(16, 16, 5, 0, Math.PI * 2);
    ctx.fill();

    this.textures.addCanvas(key, canvas);
  }

  private createPetTexture(key: string, primaryColor: string, accentColor: string) {
    if (this.textures.exists(key)) return;
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;

    // Spirit Aura glow
    ctx.fillStyle = primaryColor;
    ctx.beginPath();
    ctx.arc(16, 16, 12, 0, Math.PI * 2);
    ctx.fill();

    // Pet core / body
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.arc(16, 16, 7, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#000000';
    ctx.fillRect(13, 14, 2, 2);
    ctx.fillRect(17, 14, 2, 2);

    // Sparkle
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(15, 8, 2, 2);
    ctx.fillRect(22, 16, 2, 2);

    this.textures.addCanvas(key, canvas);
  }
}
