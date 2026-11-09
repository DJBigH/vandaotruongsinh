// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Procedural Pixel Art Sprite Generator
// High-detail 2D Cổ Phong Tiên Hiệp Spritesheets & Visual Assets
// ============================================================

import Phaser from 'phaser';

export type FacingDirection = 'down' | 'up' | 'left' | 'right';

export interface PaletteConfig {
  robeMain: string;
  robeShadow: string;
  robeTrim: string;
  hair: string;
  hairAccessory: string;
  skin: string;
  skinShadow: string;
  swordBlade: string;
  swordHilt: string;
  swordGlow: string;
}

export const KIEM_TU_PALETTE: PaletteConfig = {
  robeMain: '#0284c7',      // Lam bào thiên tiên (Deep celestial azure - Image 2)
  robeShadow: '#0369a1',    // Nếp gấp bóng lam sẫm
  robeTrim: '#f59e0b',      // Viền kim tuyến hoàng kim (Gold cloud embroidery - Image 2)
  hair: '#0f2b48',          // Tóc xanh đen huyền mặc
  hairAccessory: '#38bdf8', // Trâm cài ngọc lam / dải lụa
  skin: '#fed7aa',          // Da mặt tự nhiên
  skinShadow: '#fdba74',    // Bóng da
  swordBlade: '#10b981',    // Bích Ngọc Kiếm - xanh ngọc lục bảo (Jade blade - Image 2)
  swordHilt: '#f59e0b',     // Chuôi hoàng kim long đầu
  swordGlow: '#4ade80',     // Kiếm quang bích ngọc phát sáng
};

export class SpriteGenerator {
  /**
   * Tạo tất cả spritesheet và texture cho hệ thống đồ họa mới
   */
  public static generateAll(scene: Phaser.Scene) {
    this.generatePlayerSpriteSheets(scene);
    this.generateNPCSpriteSheets(scene);
    this.generateMonsterSpriteSheets(scene);
    this.generateBossSpriteSheets(scene);
    this.generateEnvironmentProps(scene);
    this.generateTerrainTiles(scene);
    this.generateVFXTextures(scene);
  }

  private static addSpriteSheetFromCanvas(
    scene: Phaser.Scene,
    key: string,
    canvas: HTMLCanvasElement,
    frameWidth: number,
    frameHeight: number
  ) {
    if (scene.textures.exists(key)) {
      scene.textures.remove(key);
    }
    (scene.textures as any).addSpriteSheet(key, canvas, { frameWidth, frameHeight });
  }

  // ============================================================
  // 1. NHÂN VẬT KIẾM TU (PLAYER) - 64x80 px per frame
  // ============================================================
  private static generatePlayerSpriteSheets(scene: Phaser.Scene) {
    const fw = 64;
    const fh = 80;
    const directions: FacingDirection[] = ['down', 'up', 'left', 'right'];

    // 1.1 IDLE SHEET (4 directions x 4 frames = 4x4 grid)
    const idleCanvas = document.createElement('canvas');
    idleCanvas.width = fw * 4;
    idleCanvas.height = fh * 4;
    const idleCtx = idleCanvas.getContext('2d')!;

    directions.forEach((dir, dirIdx) => {
      for (let f = 0; f < 4; f++) {
        const ox = f * fw;
        const oy = dirIdx * fh;
        this.drawPlayerFrame(idleCtx, ox, oy, fw, fh, dir, 'idle', f, KIEM_TU_PALETTE);
      }
    });
    this.addSpriteSheetFromCanvas(scene, 'player_kiem_tu_idle', idleCanvas, fw, fh);

    // 1.2 WALK SHEET (4 directions x 6 frames = 6x4 grid)
    const walkCanvas = document.createElement('canvas');
    walkCanvas.width = fw * 6;
    walkCanvas.height = fh * 4;
    const walkCtx = walkCanvas.getContext('2d')!;

    directions.forEach((dir, dirIdx) => {
      for (let f = 0; f < 6; f++) {
        const ox = f * fw;
        const oy = dirIdx * fh;
        this.drawPlayerFrame(walkCtx, ox, oy, fw, fh, dir, 'walk', f, KIEM_TU_PALETTE);
      }
    });
    this.addSpriteSheetFromCanvas(scene, 'player_kiem_tu_walk', walkCanvas, fw, fh);

    // 1.3 ATTACK SHEET (4 directions x 4 frames = 4x4 grid)
    const atkCanvas = document.createElement('canvas');
    atkCanvas.width = fw * 4;
    atkCanvas.height = fh * 4;
    const atkCtx = atkCanvas.getContext('2d')!;

    directions.forEach((dir, dirIdx) => {
      for (let f = 0; f < 4; f++) {
        const ox = f * fw;
        const oy = dirIdx * fh;
        this.drawPlayerFrame(atkCtx, ox, oy, fw, fh, dir, 'attack', f, KIEM_TU_PALETTE);
      }
    });
    this.addSpriteSheetFromCanvas(scene, 'player_kiem_tu_attack', atkCanvas, fw, fh);

    // 1.4 CAST SKILL SHEET (4 directions x 4 frames = 4x4 grid)
    const castCanvas = document.createElement('canvas');
    castCanvas.width = fw * 4;
    castCanvas.height = fh * 4;
    const castCtx = castCanvas.getContext('2d')!;

    directions.forEach((dir, dirIdx) => {
      for (let f = 0; f < 4; f++) {
        const ox = f * fw;
        const oy = dirIdx * fh;
        this.drawPlayerFrame(castCtx, ox, oy, fw, fh, dir, 'cast', f, KIEM_TU_PALETTE);
      }
    });
    this.addSpriteSheetFromCanvas(scene, 'player_kiem_tu_cast', castCanvas, fw, fh);

    // 1.5 DODGE SHEET (4 directions x 3 frames = 3x4 grid)
    const dodgeCanvas = document.createElement('canvas');
    dodgeCanvas.width = fw * 3;
    dodgeCanvas.height = fh * 4;
    const dodgeCtx = dodgeCanvas.getContext('2d')!;

    directions.forEach((dir, dirIdx) => {
      for (let f = 0; f < 3; f++) {
        const ox = f * fw;
        const oy = dirIdx * fh;
        this.drawPlayerFrame(dodgeCtx, ox, oy, fw, fh, dir, 'dodge', f, KIEM_TU_PALETTE);
      }
    });
    this.addSpriteSheetFromCanvas(scene, 'player_kiem_tu_dodge', dodgeCanvas, fw, fh);

    // 1.6 HURT SHEET (4 directions x 2 frames = 2x4 grid)
    const hurtCanvas = document.createElement('canvas');
    hurtCanvas.width = fw * 2;
    hurtCanvas.height = fh * 4;
    const hurtCtx = hurtCanvas.getContext('2d')!;

    directions.forEach((dir, dirIdx) => {
      for (let f = 0; f < 2; f++) {
        const ox = f * fw;
        const oy = dirIdx * fh;
        this.drawPlayerFrame(hurtCtx, ox, oy, fw, fh, dir, 'hurt', f, KIEM_TU_PALETTE);
      }
    });
    this.addSpriteSheetFromCanvas(scene, 'player_kiem_tu_hurt', hurtCanvas, fw, fh);

    // 1.7 DEATH SHEET (1 direction x 5 frames = 5x1 grid)
    const deathCanvas = document.createElement('canvas');
    deathCanvas.width = fw * 5;
    deathCanvas.height = fh;
    const deathCtx = deathCanvas.getContext('2d')!;

    for (let f = 0; f < 5; f++) {
      const ox = f * fw;
      this.drawPlayerFrame(deathCtx, ox, 0, fw, fh, 'down', 'death', f, KIEM_TU_PALETTE);
    }
    this.addSpriteSheetFromCanvas(scene, 'player_kiem_tu_death', deathCanvas, fw, fh);
  }

  /**
   * Vẽ 1 frame nhân vật kiếm tu với chi tiết trang phục, vũ khí và chuyển động
   */
  private static drawPlayerFrame(
    ctx: CanvasRenderingContext2D,
    ox: number,
    oy: number,
    w: number,
    h: number,
    dir: FacingDirection,
    action: 'idle' | 'walk' | 'attack' | 'cast' | 'dodge' | 'hurt' | 'death',
    frame: number,
    palette: PaletteConfig
  ) {
    ctx.save();
    ctx.translate(ox, oy);

    // Tính toán biến thiên tư thế (Offsets) theo frame và hành động
    let bobY = 0;
    let footL_X = -6;
    let footR_X = 6;
    let footL_Y = 0;
    let footR_Y = 0;
    let swordTilt = 0;
    let swordAngle = 0;
    let armL_Angle = 0;
    let armR_Angle = 0;
    let alpha = 1.0;

    if (action === 'idle') {
      // Thở nhẹ nhàng: 0, 1, 0, -1
      bobY = Math.sin((frame / 4) * Math.PI * 2) * 1.5;
    } else if (action === 'walk') {
      // Bước chân luân phiên
      const cycle = (frame / 6) * Math.PI * 2;
      bobY = Math.abs(Math.sin(cycle)) * 2;
      footL_Y = Math.sin(cycle) * 4;
      footR_Y = -Math.sin(cycle) * 4;
      armL_Angle = Math.sin(cycle) * 0.35;
      armR_Angle = -Math.sin(cycle) * 0.35;
    } else if (action === 'attack') {
      // Đòn đánh: 0 = tụ kiếm sau lưng, 1 = chém cực mạnh phóng kiếm quang, 2 = thu đà, 3 = hồi vị
      if (frame === 0) {
        bobY = 1;
        swordAngle = -0.8;
      } else if (frame === 1) {
        bobY = 2;
        swordAngle = 1.2;
      } else if (frame === 2) {
        bobY = 1;
        swordAngle = 0.6;
      } else {
        bobY = 0;
        swordAngle = 0.2;
      }
    } else if (action === 'cast') {
      // Tụ khí & phát chiêu
      bobY = -Math.sin((frame / 4) * Math.PI) * 3;
      armL_Angle = -0.6;
      swordAngle = -0.5;
    } else if (action === 'dodge') {
      // Lướt né: hạ thấp trọng tâm, bóng lướt
      bobY = 6;
      footL_X = -12;
      footR_X = 4;
    } else if (action === 'hurt') {
      // Giật lùi
      bobY = frame === 0 ? -3 : 0;
    } else if (action === 'death') {
      // Tan rã
      bobY = frame * 4;
      alpha = Math.max(0, 1 - frame * 0.22);
    }

    ctx.globalAlpha = alpha;

    const centerX = w / 2;
    const footBaseY = 72;

    // 1. Bóng tiếp đất (Drop Shadow)
    ctx.fillStyle = 'rgba(15, 23, 42, 0.4)';
    ctx.beginPath();
    const shadowScale = action === 'dodge' ? 1.4 : 1.0;
    ctx.ellipse(centerX, footBaseY, 14 * shadowScale, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Điểm neo thân dưới
    const waistY = footBaseY - 26 - bobY;
    const chestY = waistY - 14;
    const headY = chestY - 16;

    // 2. Chân & Ủng (Boots)
    const isFacingBack = dir === 'up';
    const isFacingSide = dir === 'left' || dir === 'right';

    ctx.fillStyle = '#0f172a'; // Hắc ủng
    // Chân trái
    ctx.fillRect(centerX + footL_X - 3, footBaseY - 10 + footL_Y, 6, 10);
    // Chân phải
    ctx.fillRect(centerX + footR_X - 3, footBaseY - 10 + footR_Y, 6, 10);

    // Đế ủng viền trắng
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(centerX + footL_X - 3, footBaseY - 2 + footL_Y, 6, 2);
    ctx.fillRect(centerX + footR_X - 3, footBaseY - 2 + footR_Y, 6, 2);

    // 3. Tà Áo Dưới (Robe Lower Hem)
    ctx.fillStyle = palette.robeMain;
    ctx.beginPath();
    ctx.moveTo(centerX - 10, waistY);
    ctx.lineTo(centerX + 10, waistY);
    ctx.lineTo(centerX + 13 + (action === 'walk' ? Math.sin(frame) * 2 : 0), footBaseY - 6 - bobY);
    ctx.lineTo(centerX - 13 - (action === 'walk' ? Math.sin(frame) * 2 : 0), footBaseY - 6 - bobY);
    ctx.closePath();
    ctx.fill();

    // Nếp gấp tà áo
    ctx.strokeStyle = palette.robeShadow;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(centerX - 4, waistY);
    ctx.lineTo(centerX - 6, footBaseY - 6 - bobY);
    ctx.moveTo(centerX + 4, waistY);
    ctx.lineTo(centerX + 6, footBaseY - 6 - bobY);
    ctx.stroke();

    // Viền tà áo dưới màu lam
    ctx.strokeStyle = palette.robeTrim;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX - 13, footBaseY - 6 - bobY);
    ctx.lineTo(centerX + 13, footBaseY - 6 - bobY);
    ctx.stroke();

    // 4. Thân Áo Trên (Tunic / Robe Torso)
    ctx.fillStyle = palette.robeMain;
    ctx.fillRect(centerX - 9, chestY, 18, 14);

    // Vạt áo chéo cổ phong (Lapels crossing - Bạch y lót trong)
    if (!isFacingBack) {
      // Lớp áo trắng lót trong
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(centerX - 5, chestY);
      ctx.lineTo(centerX, waistY);
      ctx.lineTo(centerX + 3, waistY);
      ctx.lineTo(centerX - 2, chestY);
      ctx.closePath();
      ctx.fill();

      // Viền kim tuyến hoàng kim
      ctx.fillStyle = palette.robeTrim;
      ctx.beginPath();
      ctx.moveTo(centerX - 6, chestY);
      ctx.lineTo(centerX + 2, waistY);
      ctx.lineTo(centerX + 5, waistY);
      ctx.lineTo(centerX - 3, chestY);
      ctx.closePath();
      ctx.fill();
    }

    // Đai lưng (Belt)
    ctx.fillStyle = palette.robeShadow;
    ctx.fillRect(centerX - 9, waistY - 3, 18, 4);
    // Khóa đai hoàng kim
    ctx.fillStyle = palette.hairAccessory;
    ctx.fillRect(centerX - 3, waistY - 4, 6, 6);
    // Dải lụa đỏ thắt đai (Red sash tassel - Image 2)
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(centerX + 3, waistY + 3, 2, 7);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(centerX + 2, waistY + 2, 4, 2);

    // 5. Tay Áo & Cánh Tay (Arms & Sleeves)
    ctx.save();
    // Tay trái
    ctx.translate(centerX - 10, chestY + 3);
    ctx.rotate(armL_Angle);
    ctx.fillStyle = palette.robeMain;
    ctx.fillRect(-4, 0, 6, 12);
    // Ống tay lót trắng & Cổ tay viền hoàng kim
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-4, 8, 6, 3);
    ctx.fillStyle = palette.robeTrim;
    ctx.fillRect(-4, 10, 6, 2);
    // Bàn tay
    ctx.fillStyle = palette.skin;
    ctx.fillRect(-3, 12, 4, 3);
    ctx.restore();

    // Tay phải cầm kiếm
    ctx.save();
    ctx.translate(centerX + 10, chestY + 3);
    ctx.rotate(armR_Angle + swordAngle);
    ctx.fillStyle = palette.robeMain;
    ctx.fillRect(-2, 0, 6, 12);
    // Cổ tay viền hoàng kim
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-2, 8, 6, 3);
    ctx.fillStyle = palette.robeTrim;
    ctx.fillRect(-2, 10, 6, 2);
    // Bàn tay cầm chuôi kiếm
    ctx.fillStyle = palette.skin;
    ctx.fillRect(-1, 12, 4, 3);

    // Bích Ngọc Tiên Kiếm (Jade Celestial Sword - Image 2)
    // Chuôi kiếm hoàng kim long đầu
    ctx.fillStyle = palette.swordHilt;
    ctx.fillRect(0, 15, 3, 5);
    // Đốc kiếm & Bao kiếm long lân
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(-4, 14, 10, 3);
    ctx.fillStyle = '#ef4444'; // Hạt châu đỏ trên đốc kiếm
    ctx.fillRect(0, 15, 2, 2);

    // Lưỡi kiếm Bích Ngọc xanh biếc
    ctx.fillStyle = palette.swordBlade;
    ctx.fillRect(0, -18, 3, 32);
    // Lưng kiếm ngọc sáng
    ctx.fillStyle = '#86efac';
    ctx.fillRect(1, -17, 1, 30);
    // Mũi kiếm nhọn
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(1.5, -22);
    ctx.lineTo(3, -18);
    ctx.closePath();
    ctx.fill();
    // Quang hoa bích ngọc phát sáng
    ctx.strokeStyle = palette.swordGlow;
    ctx.lineWidth = 1;
    ctx.strokeRect(-0.5, -19, 4, 34);

    // Nếu là đòn đánh frame 1 (Chém cực mạnh) -> vẽ đường kiếm quang bán nguyệt (Slash Arc)
    if (action === 'attack' && frame === 1) {
      const grad = ctx.createLinearGradient(0, -25, 35, 10);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      grad.addColorStop(0.5, 'rgba(74, 222, 128, 0.85)');
      grad.addColorStop(1, 'rgba(16, 185, 129, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(15, 0, 36, -Math.PI * 0.6, Math.PI * 0.4);
      ctx.arc(15, 0, 24, Math.PI * 0.4, -Math.PI * 0.6, true);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();

    // 6. Đầu, Tóc & Khuôn Mặt (Head, Hair, Face)
    // Tóc sau (Back hair)
    ctx.fillStyle = palette.hair;
    if (isFacingBack) {
      // Nhìn từ sau: tóc dài xanh đen xõa lưng
      ctx.fillRect(centerX - 8, headY - 4, 16, 22);
      // Quán ngọc / Búi tóc trên đỉnh
      ctx.fillStyle = palette.hairAccessory;
      ctx.fillRect(centerX - 4, headY - 9, 8, 5);
      // Dải lụa lam buộc tóc bay nhẹ
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(centerX - 2, headY - 4, 4, 12);
    } else {
      // Mặt trước hoặc nghiêng
      // Tóc phía sau nền
      ctx.fillRect(centerX - 8, headY - 4, 16, 16);

      // Khuôn mặt (Face skin)
      ctx.fillStyle = palette.skin;
      ctx.fillRect(centerX - 6, headY, 12, 12);

      // Cằm thon
      ctx.beginPath();
      ctx.moveTo(centerX - 6, headY + 8);
      ctx.lineTo(centerX, headY + 13);
      ctx.lineTo(centerX + 6, headY + 8);
      ctx.closePath();
      ctx.fill();

      // Mái tóc trước & Tóc mai hai bên
      ctx.fillStyle = palette.hair;
      ctx.fillRect(centerX - 8, headY - 5, 16, 6);
      ctx.fillRect(centerX - 8, headY, 3, 9);
      ctx.fillRect(centerX + 5, headY, 3, 9);

      // Quán ngọc tu tiên trên đỉnh đầu
      ctx.fillStyle = palette.hairAccessory;
      ctx.fillRect(centerX - 3, headY - 9, 6, 4);
      ctx.fillStyle = '#f59e0b'; // Viên hoàng ngọc đính trên quán
      ctx.fillRect(centerX - 1, headY - 8, 2, 2);

      // Mắt & Lông mày thần thái
      if (isFacingSide) {
        const eyeX = dir === 'right' ? centerX + 2 : centerX - 4;
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(eyeX, headY + 4, 2, 2);
        // Lông mày kiếm
        ctx.fillStyle = '#0f2b48';
        ctx.fillRect(eyeX - 1, headY + 2, 4, 1);
      } else {
        // Mắt hai bên
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(centerX - 4, headY + 4, 2, 2);
        ctx.fillRect(centerX + 2, headY + 4, 2, 2);
        // Lông mày
        ctx.fillStyle = '#0f2b48';
        ctx.fillRect(centerX - 5, headY + 2, 3, 1);
        ctx.fillRect(centerX + 2, headY + 2, 3, 1);
      }

      // Chòm râu trắng tiên phong đạo cốt (Long White Daoist Beard - Image 2)
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      if (isFacingSide) {
        const beardX = dir === 'right' ? centerX + 1 : centerX - 3;
        ctx.moveTo(beardX - 2, headY + 8);
        ctx.lineTo(beardX + 5, headY + 8);
        ctx.lineTo(beardX + 6, headY + 20);
        ctx.lineTo(beardX - 1, headY + 20);
      } else {
        ctx.moveTo(centerX - 4, headY + 8);
        ctx.lineTo(centerX + 4, headY + 8);
        ctx.lineTo(centerX + 3, headY + 20);
        ctx.lineTo(centerX - 3, headY + 20);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Tiên Khí Hộ Thể (Flickering Celestial Blue Qi Aura - Image 2)
    const auraWave = Math.sin((frame + 1) * 1.5) * 2;
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(centerX + (action === 'walk' ? Math.sin(frame) : 0), waistY, 20 + auraWave, 0, Math.PI * 2);
    ctx.stroke();

    // Hiệu ứng riêng: Trúng đòn (Hurt flash)
    if (action === 'hurt') {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.45)';
      ctx.fillRect(centerX - 16, headY - 10, 32, 80);
    }

    // Hiệu ứng riêng: Tụ lực phóng chiêu (Cast aura)
    if (action === 'cast') {
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(centerX, waistY, 22 + Math.sin(frame) * 4, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  // ============================================================
  // 2. NPC TRƯỞNG LÃO & ĐẠO HỮU (NPC) - 64x80 px per frame
  // ============================================================
  private static generateNPCSpriteSheets(scene: Phaser.Scene) {
    const fw = 64;
    const fh = 80;

    // NPC Trưởng Lão (npc_elder) - Áo tím đạo bào, râu bạc, gậy đào mộc
    const canvas = document.createElement('canvas');
    canvas.width = fw * 4;
    canvas.height = fh;
    const ctx = canvas.getContext('2d')!;

    for (let f = 0; f < 4; f++) {
      const ox = f * fw;
      ctx.save();
      ctx.translate(ox, 0);

      const bobY = Math.sin((f / 4) * Math.PI * 2) * 1.2;
      const centerX = fw / 2;
      const footBaseY = 72;

      // Bóng
      ctx.fillStyle = 'rgba(15, 23, 42, 0.4)';
      ctx.beginPath();
      ctx.ellipse(centerX, footBaseY, 14, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Đạo bào tím phong thái đại tông sư
      ctx.fillStyle = '#581c87';
      ctx.beginPath();
      ctx.moveTo(centerX - 10, footBaseY - 38 - bobY);
      ctx.lineTo(centerX + 10, footBaseY - 38 - bobY);
      ctx.lineTo(centerX + 14, footBaseY - 4);
      ctx.lineTo(centerX - 14, footBaseY - 4);
      ctx.closePath();
      ctx.fill();

      // Viền bào kim sắc
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Đai ngọc
      ctx.fillStyle = '#eab308';
      ctx.fillRect(centerX - 10, footBaseY - 26 - bobY, 20, 5);

      // Đầu & Khuôn mặt hiền hòa
      const headY = footBaseY - 54 - bobY;
      ctx.fillStyle = '#fed7aa';
      ctx.fillRect(centerX - 6, headY, 12, 12);

      // Chòm râu trắng dài tiên phong đạo cốt
      ctx.fillStyle = '#f1f5f9';
      ctx.beginPath();
      ctx.moveTo(centerX - 5, headY + 10);
      ctx.lineTo(centerX + 5, headY + 10);
      ctx.lineTo(centerX + 3, headY + 28);
      ctx.lineTo(centerX - 3, headY + 28);
      ctx.closePath();
      ctx.fill();

      // Mắt
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(centerX - 4, headY + 5, 2, 2);
      ctx.fillRect(centerX + 2, headY + 5, 2, 2);

      // Mũ đạo sĩ thái cực
      ctx.fillStyle = '#3b0764';
      ctx.fillRect(centerX - 8, headY - 8, 16, 8);
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(centerX, headY - 4, 3, 0, Math.PI * 2);
      ctx.fill();

      // Gậy đào mộc bên tay phải
      ctx.fillStyle = '#78350f';
      ctx.fillRect(centerX + 14, footBaseY - 46, 3, 46);
      // Hồ lô linh đan treo trên đầu gậy
      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.arc(centerX + 15, footBaseY - 48, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    this.addSpriteSheetFromCanvas(scene, 'npc_elder', canvas, fw, fh);
  }

  // ============================================================
  // 3. QUÁI VẬT SÓI XÍCH NHA (MONSTER) - 64x48 px per frame
  // ============================================================
  private static generateMonsterSpriteSheets(scene: Phaser.Scene) {
    const fw = 64;
    const fh = 48;

    // Sheet quái vật mon_001 (Sói Xích Nha)
    // 4 frames Idle/Walk + 4 frames Attack
    const canvas = document.createElement('canvas');
    canvas.width = fw * 4;
    canvas.height = fh * 2;
    const ctx = canvas.getContext('2d')!;

    // Row 0: Prowl / Run
    for (let f = 0; f < 4; f++) {
      const ox = f * fw;
      this.drawWolfFrame(ctx, ox, 0, fw, fh, 'prowl', f, false);
    }
    // Row 1: Attack / Bite
    for (let f = 0; f < 4; f++) {
      const ox = f * fw;
      this.drawWolfFrame(ctx, ox, fh, fw, fh, 'attack', f, false);
    }

    this.addSpriteSheetFromCanvas(scene, 'mon_001', canvas, fw, fh);
  }

  // ============================================================
  // 4. BOSS XÍCH NHA LANG VƯƠNG - 96x80 px per frame
  // ============================================================
  private static generateBossSpriteSheets(scene: Phaser.Scene) {
    const fw = 96;
    const fh = 80;

    // Sheet Boss boss_001
    // Row 0: Idle/Prowl (4 frames)
    // Row 1: Heavy Strike / Roar (4 frames)
    const canvas = document.createElement('canvas');
    canvas.width = fw * 4;
    canvas.height = fh * 2;
    const ctx = canvas.getContext('2d')!;

    // Row 0: Prowl
    for (let f = 0; f < 4; f++) {
      const ox = f * fw;
      this.drawWolfFrame(ctx, ox, 0, fw, fh, 'prowl', f, true);
    }
    // Row 1: Roar & Claw Strike
    for (let f = 0; f < 4; f++) {
      const ox = f * fw;
      this.drawWolfFrame(ctx, ox, fh, fw, fh, 'attack', f, true);
    }

    this.addSpriteSheetFromCanvas(scene, 'boss_001', canvas, fw, fh);
  }

  /**
   * Vẽ 1 frame hình thể lang yêu hoặc Lang Vương
   */
  private static drawWolfFrame(
    ctx: CanvasRenderingContext2D,
    ox: number,
    oy: number,
    w: number,
    h: number,
    action: 'prowl' | 'attack',
    frame: number,
    isBoss: boolean
  ) {
    ctx.save();
    ctx.translate(ox, oy);

    const scale = isBoss ? 1.4 : 1.0;
    const centerX = w / 2;
    const footBaseY = h - 6;

    // Bóng
    ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
    ctx.beginPath();
    ctx.ellipse(centerX, footBaseY, 18 * scale, 6 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    const bobY = Math.sin((frame / 4) * Math.PI * 2) * 2;
    const legPhase = Math.sin((frame / 4) * Math.PI * 2);

    // Chân sau & trước
    const furColor = isBoss ? '#18181b' : '#4b5563';
    const bellyColor = isBoss ? '#7f1d1d' : '#6b7280';
    const eyeColor = isBoss ? '#ef4444' : '#f87171';
    const flameColor = '#ea580c';

    ctx.fillStyle = furColor;
    // Chân sau
    ctx.fillRect(centerX - 16 * scale, footBaseY - 14 * scale + legPhase * 3, 5 * scale, 14 * scale);
    ctx.fillRect(centerX - 10 * scale, footBaseY - 14 * scale - legPhase * 3, 5 * scale, 14 * scale);
    // Chân trước
    ctx.fillRect(centerX + 8 * scale, footBaseY - 16 * scale - legPhase * 3, 5 * scale, 16 * scale);
    ctx.fillRect(centerX + 14 * scale, footBaseY - 16 * scale + legPhase * 3, 5 * scale, 16 * scale);

    // Thân sói cơ bắp
    ctx.fillStyle = furColor;
    ctx.beginPath();
    ctx.ellipse(centerX, footBaseY - 18 * scale - bobY, 18 * scale, 10 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    // Bụng sói
    ctx.fillStyle = bellyColor;
    ctx.beginPath();
    ctx.ellipse(centerX, footBaseY - 15 * scale - bobY, 14 * scale, 5 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    // Gai lưng ma khí / Lông gáy dựng ngược
    if (isBoss) {
      ctx.fillStyle = flameColor;
      for (let i = -12; i <= 6; i += 5) {
        ctx.beginPath();
        ctx.moveTo(centerX + i * scale, footBaseY - 28 * scale - bobY);
        ctx.lineTo(centerX + (i + 2) * scale, footBaseY - 36 * scale - bobY);
        ctx.lineTo(centerX + (i + 4) * scale, footBaseY - 28 * scale - bobY);
        ctx.closePath();
        ctx.fill();
      }
    }

    // Đuôi sói
    ctx.fillStyle = furColor;
    const tailWag = Math.sin(frame) * 4;
    ctx.beginPath();
    ctx.moveTo(centerX - 18 * scale, footBaseY - 20 * scale - bobY);
    ctx.quadraticCurveTo(
      centerX - 28 * scale,
      footBaseY - 28 * scale + tailWag,
      centerX - 24 * scale,
      footBaseY - 12 * scale + tailWag
    );
    ctx.fill();

    // Đầu sói
    const headX = centerX + 18 * scale + (action === 'attack' ? 4 : 0);
    const headY = footBaseY - 24 * scale - bobY;

    ctx.fillStyle = furColor;
    ctx.beginPath();
    ctx.arc(headX, headY, 9 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Mõm sói nhọn chĩa về phía trước
    ctx.beginPath();
    ctx.moveTo(headX, headY - 4 * scale);
    ctx.lineTo(headX + 12 * scale, headY + 3 * scale);
    ctx.lineTo(headX, headY + 7 * scale);
    ctx.closePath();
    ctx.fill();

    // Tai sói nhọn
    ctx.beginPath();
    ctx.moveTo(headX - 4 * scale, headY - 8 * scale);
    ctx.lineTo(headX, headY - 16 * scale);
    ctx.lineTo(headX + 4 * scale, headY - 8 * scale);
    ctx.closePath();
    ctx.fill();

    // Răng nanh xích nha đỏ ngòm
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(headX + 7 * scale, headY + 3 * scale, 3 * scale, 5 * scale);

    // Mắt yêu ma rực sáng
    ctx.fillStyle = eyeColor;
    ctx.fillRect(headX + 2 * scale, headY - 2 * scale, 3 * scale, 2 * scale);

    // Nếu là Boss: Vòng lửa ma đạo quanh thân
    if (isBoss) {
      ctx.strokeStyle = 'rgba(234, 88, 12, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(centerX, footBaseY - 18 * scale, 32 * scale, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  // ============================================================
  // 5. CẢNH VẬT CỔ PHONG (ENVIRONMENT PROPS)
  // ============================================================
  private static generateEnvironmentProps(scene: Phaser.Scene) {
    // 5.1 Cổ Tùng Cổ Thụ (96x128 px)
    const treeCanvas = document.createElement('canvas');
    treeCanvas.width = 96;
    treeCanvas.height = 128;
    const treeCtx = treeCanvas.getContext('2d')!;

    // Bóng cây lớn
    treeCtx.fillStyle = 'rgba(15, 23, 42, 0.4)';
    treeCtx.beginPath();
    treeCtx.ellipse(48, 120, 36, 10, 0, 0, Math.PI * 2);
    treeCtx.fill();

    // Gốc cây và thân gỗ già sần sùi phong sương
    treeCtx.fillStyle = '#451a03';
    treeCtx.beginPath();
    treeCtx.moveTo(40, 122);
    treeCtx.lineTo(34, 126);
    treeCtx.lineTo(60, 126);
    treeCtx.lineTo(54, 122);
    treeCtx.lineTo(52, 60);
    treeCtx.lineTo(44, 60);
    treeCtx.closePath();
    treeCtx.fill();

    // Vân gỗ
    treeCtx.strokeStyle = '#78350f';
    treeCtx.lineWidth = 2;
    treeCtx.beginPath();
    treeCtx.moveTo(46, 120);
    treeCtx.lineTo(47, 70);
    treeCtx.stroke();

    // 3 Tầng Tán Lá Kim Cổ Tùng (Layered Pine Foliage)
    const drawFoliageTier = (y: number, rX: number, rY: number, color1: string, color2: string) => {
      const grad = treeCtx.createRadialGradient(48, y - 5, 5, 48, y, rX);
      grad.addColorStop(0, color1);
      grad.addColorStop(1, color2);
      treeCtx.fillStyle = grad;
      treeCtx.beginPath();
      treeCtx.ellipse(48, y, rX, rY, 0, 0, Math.PI * 2);
      treeCtx.fill();
    };

    // Tầng dưới cùng
    drawFoliageTier(80, 42, 22, '#15803d', '#14532d');
    // Tầng giữa
    drawFoliageTier(55, 34, 18, '#16a34a', '#15803d');
    // Tầng đỉnh
    drawFoliageTier(30, 24, 14, '#22c55e', '#166534');

    scene.textures.addCanvas('prop_pine_tree', treeCanvas);

    // 5.2 Linh Miếu Cổ Phong (80x80 px)
    const shrineCanvas = document.createElement('canvas');
    shrineCanvas.width = 80;
    shrineCanvas.height = 80;
    const sCtx = shrineCanvas.getContext('2d')!;

    // Nền đá
    sCtx.fillStyle = '#475569';
    sCtx.fillRect(16, 60, 48, 16);
    sCtx.fillStyle = '#64748b';
    sCtx.fillRect(14, 56, 52, 5);

    // Cột trụ đình miếu
    sCtx.fillStyle = '#991b1b';
    sCtx.fillRect(20, 28, 6, 28);
    sCtx.fillRect(54, 28, 6, 28);

    // Bát hương đồng phát khói tiên
    sCtx.fillStyle = '#f59e0b';
    sCtx.fillRect(36, 48, 8, 8);
    sCtx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    sCtx.beginPath();
    sCtx.arc(40, 40, 4, 0, Math.PI * 2);
    sCtx.fill();

    // Mái ngói cong cổ kính
    sCtx.fillStyle = '#065f46';
    sCtx.beginPath();
    sCtx.moveTo(40, 10);
    sCtx.quadraticCurveTo(10, 22, 6, 28);
    sCtx.lineTo(74, 28);
    sCtx.quadraticCurveTo(70, 22, 40, 10);
    sCtx.closePath();
    sCtx.fill();

    // Đỉnh chóp hồ lô
    sCtx.fillStyle = '#f59e0b';
    sCtx.beginPath();
    sCtx.arc(40, 8, 3, 0, Math.PI * 2);
    sCtx.fill();

    scene.textures.addCanvas('prop_shrine', shrineCanvas);

    // 5.3 Tảng Đá Tiên Phong (64x64 px)
    const rockCanvas = document.createElement('canvas');
    rockCanvas.width = 64;
    rockCanvas.height = 64;
    const rCtx = rockCanvas.getContext('2d')!;

    // Bóng đá
    rCtx.fillStyle = 'rgba(15, 23, 42, 0.4)';
    rCtx.beginPath();
    rCtx.ellipse(32, 56, 24, 7, 0, 0, Math.PI * 2);
    rCtx.fill();

    // Thân khối đá phiến tự nhiên
    rCtx.fillStyle = '#475569';
    rCtx.beginPath();
    rCtx.moveTo(14, 54);
    rCtx.lineTo(10, 36);
    rCtx.lineTo(24, 18);
    rCtx.lineTo(46, 16);
    rCtx.lineTo(54, 32);
    rCtx.lineTo(50, 54);
    rCtx.closePath();
    rCtx.fill();

    // Diện sáng & Rêu phong cổ kính
    rCtx.fillStyle = '#64748b';
    rCtx.beginPath();
    rCtx.moveTo(24, 18);
    rCtx.lineTo(46, 16);
    rCtx.lineTo(38, 36);
    rCtx.lineTo(18, 38);
    rCtx.closePath();
    rCtx.fill();

    // Rêu xanh
    rCtx.fillStyle = '#15803d';
    rCtx.fillRect(16, 42, 8, 4);
    rCtx.fillRect(36, 46, 10, 4);

    scene.textures.addCanvas('prop_ancient_rock', rockCanvas);

    // 5.4 Cổng Không Gian Dịch Chuyển (Portal - 64x64 px)
    const portalCanvas = document.createElement('canvas');
    portalCanvas.width = 64;
    portalCanvas.height = 64;
    const pCtx = portalCanvas.getContext('2d')!;

    const grad = pCtx.createRadialGradient(32, 32, 4, 32, 32, 30);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    grad.addColorStop(0.3, 'rgba(6, 182, 212, 0.8)');
    grad.addColorStop(0.7, 'rgba(59, 130, 246, 0.5)');
    grad.addColorStop(1, 'rgba(30, 58, 138, 0)');

    pCtx.fillStyle = grad;
    pCtx.beginPath();
    pCtx.arc(32, 32, 30, 0, Math.PI * 2);
    pCtx.fill();

    // Cổ phù văn xoay quanh cổng
    pCtx.strokeStyle = '#e0f2fe';
    pCtx.lineWidth = 1.5;
    pCtx.strokeRect(20, 20, 24, 24);

    scene.textures.addCanvas('prop_portal', portalCanvas);

    // 5.5 Cụm Tinh Thể Linh Thạch (Spirit Crystal Cluster - Image 2)
    const crystalCanvas = document.createElement('canvas');
    crystalCanvas.width = 48;
    crystalCanvas.height = 48;
    const cCtx = crystalCanvas.getContext('2d')!;

    // Bóng tinh thể
    cCtx.fillStyle = 'rgba(15, 23, 42, 0.4)';
    cCtx.beginPath();
    cCtx.ellipse(24, 42, 16, 5, 0, 0, Math.PI * 2);
    cCtx.fill();

    const drawShard = (bx: number, by: number, w: number, h: number, tilt: number) => {
      cCtx.save();
      cCtx.translate(bx, by);
      cCtx.rotate(tilt);
      const sGrad = cCtx.createLinearGradient(0, -h, 0, 0);
      sGrad.addColorStop(0, '#bae6fd');
      sGrad.addColorStop(0.4, '#38bdf8');
      sGrad.addColorStop(1, '#0284c7');
      cCtx.fillStyle = sGrad;
      cCtx.beginPath();
      cCtx.moveTo(-w / 2, 0);
      cCtx.lineTo(-w / 3, -h * 0.7);
      cCtx.lineTo(0, -h);
      cCtx.lineTo(w / 3, -h * 0.7);
      cCtx.lineTo(w / 2, 0);
      cCtx.closePath();
      cCtx.fill();
      // Mặt phản chiếu ánh sáng trắng
      cCtx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      cCtx.beginPath();
      cCtx.moveTo(-w / 3, -h * 0.7);
      cCtx.lineTo(0, -h);
      cCtx.lineTo(0, 0);
      cCtx.closePath();
      cCtx.fill();
      cCtx.restore();
    };

    drawShard(16, 40, 10, 26, -0.2);
    drawShard(24, 42, 12, 34, 0.05);
    drawShard(32, 40, 9, 22, 0.25);
    scene.textures.addCanvas('prop_crystal_cluster', crystalCanvas);

    // 5.6 Bát Quái Tiên Trận Hoàng Kim (Bagua Celestial Array - Image 2)
    const baguaCanvas = document.createElement('canvas');
    baguaCanvas.width = 160;
    baguaCanvas.height = 160;
    const bgCtx = baguaCanvas.getContext('2d')!;

    const cx = 80;
    const cy = 80;

    // Vòng tròn hào quang nền
    bgCtx.fillStyle = 'rgba(245, 158, 11, 0.12)';
    bgCtx.beginPath();
    bgCtx.arc(cx, cy, 76, 0, Math.PI * 2);
    bgCtx.fill();

    // Vòng tròn ngoài viền kim quang
    bgCtx.strokeStyle = '#f59e0b';
    bgCtx.lineWidth = 2.5;
    bgCtx.beginPath();
    bgCtx.arc(cx, cy, 74, 0, Math.PI * 2);
    bgCtx.stroke();

    bgCtx.strokeStyle = 'rgba(251, 191, 36, 0.7)';
    bgCtx.lineWidth = 1.5;
    bgCtx.beginPath();
    bgCtx.arc(cx, cy, 66, 0, Math.PI * 2);
    bgCtx.stroke();

    // 8 Cung Bát Quái
    bgCtx.strokeStyle = '#fbbf24';
    bgCtx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      const x1 = cx + Math.cos(angle) * 52;
      const y1 = cy + Math.sin(angle) * 52;
      const x2 = cx + Math.cos(angle) * 64;
      const y2 = cy + Math.sin(angle) * 64;
      bgCtx.beginPath();
      bgCtx.moveTo(x1, y1);
      bgCtx.lineTo(x2, y2);
      bgCtx.stroke();
    }

    // Đồ hình Thái Cực Âm Dương ở trung tâm
    bgCtx.strokeStyle = '#fde047';
    bgCtx.lineWidth = 2;
    bgCtx.beginPath();
    bgCtx.arc(cx, cy, 32, 0, Math.PI * 2);
    bgCtx.stroke();

    scene.textures.addCanvas('prop_bagua_array', baguaCanvas);
  }

  // ============================================================
  // 6. TILE ĐỊA HÌNH TỰ NHIÊN (TERRAIN TILES) - 48x48 px
  // ============================================================
  private static generateTerrainTiles(scene: Phaser.Scene) {
    const size = 48;

    // 6.1 Thảm cỏ Thanh Khê (tile_grass_clean)
    const grass1 = document.createElement('canvas');
    grass1.width = size;
    grass1.height = size;
    const g1Ctx = grass1.getContext('2d')!;
    g1Ctx.fillStyle = '#2e7d32'; // Xanh lá đậm mướt
    g1Ctx.fillRect(0, 0, size, size);
    // Vài đốm cỏ sáng tự nhiên
    g1Ctx.fillStyle = '#388e3c';
    g1Ctx.fillRect(6, 8, 8, 4);
    g1Ctx.fillRect(26, 24, 10, 5);
    g1Ctx.fillRect(14, 36, 6, 4);
    scene.textures.addCanvas('tile_grass', grass1);

    // 6.2 Thảm cỏ điểm xuyết hoa dại linh thảo (tile_grass_flower)
    const grass2 = document.createElement('canvas');
    grass2.width = size;
    grass2.height = size;
    const g2Ctx = grass2.getContext('2d')!;
    g2Ctx.fillStyle = '#2e7d32';
    g2Ctx.fillRect(0, 0, size, size);
    // Bông hoa nhỏ trắng vàng
    g2Ctx.fillStyle = '#fef08a';
    g2Ctx.fillRect(12, 16, 3, 3);
    g2Ctx.fillRect(34, 30, 3, 3);
    g2Ctx.fillStyle = '#ffffff';
    g2Ctx.fillRect(11, 15, 2, 2);
    g2Ctx.fillRect(35, 29, 2, 2);
    scene.textures.addCanvas('tile_grass_flower', grass2);

    // 6.3 Lối đi lát đá phiến cổ kính (tile_path)
    const path = document.createElement('canvas');
    path.width = size;
    path.height = size;
    const pCtx = path.getContext('2d')!;
    pCtx.fillStyle = '#57534e'; // Nền đất sỏi
    pCtx.fillRect(0, 0, size, size);

    // Các viên đá phiến xếp tự nhiên
    const drawStone = (x: number, y: number, w: number, h: number) => {
      pCtx.fillStyle = '#78716c';
      pCtx.fillRect(x, y, w, h);
      pCtx.fillStyle = '#a8a29e';
      pCtx.fillRect(x + 1, y + 1, w - 2, 2);
      pCtx.fillStyle = '#44403c';
      pCtx.fillRect(x + 1, y + h - 2, w - 2, 2);
    };

    drawStone(4, 4, 18, 18);
    drawStone(26, 6, 18, 16);
    drawStone(6, 26, 16, 18);
    drawStone(26, 26, 18, 18);
    scene.textures.addCanvas('tile_path', path);

    // 6.4 Dòng suối Thanh Khê (tile_water)
    const water = document.createElement('canvas');
    water.width = size;
    water.height = size;
    const wCtx = water.getContext('2d')!;
    wCtx.fillStyle = '#0284c7';
    wCtx.fillRect(0, 0, size, size);
    // Gợn sóng lấp lánh ánh lam
    wCtx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    wCtx.fillRect(8, 12, 16, 2);
    wCtx.fillRect(24, 28, 18, 2);
    wCtx.fillStyle = '#38bdf8';
    wCtx.fillRect(12, 14, 12, 2);
    wCtx.fillRect(28, 30, 14, 2);
    scene.textures.addCanvas('tile_water', water);
  }

  // ============================================================
  // 7. HIỆU ỨNG CHIÊU THỨC & VẬT THỂ BAY (VFX)
  // ============================================================
  private static generateVFXTextures(scene: Phaser.Scene) {
    // 7.1 Phi Kiếm Khí (Flying Sword Qi Beam - 48x24 px)
    const beamCanvas = document.createElement('canvas');
    beamCanvas.width = 48;
    beamCanvas.height = 24;
    const bCtx = beamCanvas.getContext('2d')!;

    const grad = bCtx.createLinearGradient(0, 12, 48, 12);
    grad.addColorStop(0, 'rgba(56, 189, 248, 0)');
    grad.addColorStop(0.5, 'rgba(56, 189, 248, 0.8)');
    grad.addColorStop(0.85, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(1, 'rgba(224, 242, 254, 1)');

    bCtx.fillStyle = grad;
    bCtx.beginPath();
    bCtx.moveTo(0, 12);
    bCtx.lineTo(36, 4);
    bCtx.lineTo(48, 12);
    bCtx.lineTo(36, 20);
    bCtx.closePath();
    bCtx.fill();

    scene.textures.addCanvas('fx_sword_projectile', beamCanvas);

    // 7.2 Hoàng Kim Cự Kiếm (Giant Golden Sword Plunge - Image 2)
    const giantSwordCanvas = document.createElement('canvas');
    giantSwordCanvas.width = 48;
    giantSwordCanvas.height = 120;
    const gsCtx = giantSwordCanvas.getContext('2d')!;

    // Hào quang vàng rực
    const gGrad = gsCtx.createRadialGradient(24, 60, 5, 24, 60, 35);
    gGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    gGrad.addColorStop(0.4, 'rgba(251, 191, 36, 0.85)');
    gGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
    gsCtx.fillStyle = gGrad;
    gsCtx.fillRect(0, 0, 48, 120);

    // Chuôi kiếm
    gsCtx.fillStyle = '#b45309';
    gsCtx.fillRect(22, 10, 4, 16);
    // Đốc kiếm
    gsCtx.fillStyle = '#f59e0b';
    gsCtx.fillRect(10, 24, 28, 6);
    // Lưỡi kiếm hoàng kim khổng lồ
    gsCtx.fillStyle = '#fef08a';
    gsCtx.beginPath();
    gsCtx.moveTo(15, 30);
    gsCtx.lineTo(33, 30);
    gsCtx.lineTo(29, 104);
    gsCtx.lineTo(24, 116);
    gsCtx.lineTo(19, 104);
    gsCtx.closePath();
    gsCtx.fill();

    // Sống kiếm sáng chói
    gsCtx.fillStyle = '#ffffff';
    gsCtx.fillRect(23, 32, 2, 76);

    scene.textures.addCanvas('fx_giant_gold_sword', giantSwordCanvas);
  }
}
