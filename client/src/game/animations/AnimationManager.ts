// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Animation Manager
// Registration & State Transitions for Characters & Entities
// ============================================================

import Phaser from 'phaser';

export type FacingDirection = 'down' | 'up' | 'left' | 'right';
export type PlayerActionState = 'IDLE' | 'MOVING' | 'ATTACK' | 'SKILL' | 'DODGING' | 'HURT' | 'DEAD';

export class AnimationManager {
  /**
   * Khởi tạo và đăng ký toàn bộ animation vào Phaser Scene từ sprite sheet thật
   */
  public static registerAll(scene: Phaser.Scene) {
    this.registerPlayerAnims(scene);
    this.registerNPCAnims(scene);
    this.registerMonsterAnims(scene);
  }

  private static registerPlayerAnims(scene: Phaser.Scene) {
    // LPC standard directions: row 0 = up, row 1 = left, row 2 = down, row 3 = right
    const directions: FacingDirection[] = ['up', 'left', 'down', 'right'];

    // 1. Idle (4 frames per direction in player_idle)
    directions.forEach((dir, dirIdx) => {
      const start = dirIdx * 4;
      scene.anims.create({
        key: `player_idle_${dir}`,
        frames: scene.anims.generateFrameNumbers('player_idle', { start, end: start + 3 }),
        frameRate: 6,
        repeat: -1,
      });
    });

    // 2. Walk (9 frames per direction in player_walk)
    directions.forEach((dir, dirIdx) => {
      const start = dirIdx * 9;
      scene.anims.create({
        key: `player_walk_${dir}`,
        frames: scene.anims.generateFrameNumbers('player_walk', { start, end: start + 8 }),
        frameRate: 11,
        repeat: -1,
      });
    });

    // 3. Attack / Sword Slash (6 frames per direction in player_slash)
    directions.forEach((dir, dirIdx) => {
      const start = dirIdx * 6;
      scene.anims.create({
        key: `player_attack_${dir}`,
        frames: scene.anims.generateFrameNumbers('player_slash', { start, end: start + 5 }),
        frameRate: 14,
        repeat: 0,
      });
    });

    // 4. Cast Celestial Skills (7 frames per direction in player_cast)
    directions.forEach((dir, dirIdx) => {
      const start = dirIdx * 7;
      scene.anims.create({
        key: `player_cast_${dir}`,
        frames: scene.anims.generateFrameNumbers('player_cast', { start, end: start + 6 }),
        frameRate: 12,
        repeat: 0,
      });
    });

    // 5. Dodge (quick dash frames from walk with ghost aura)
    directions.forEach((dir, dirIdx) => {
      const start = dirIdx * 9;
      scene.anims.create({
        key: `player_dodge_${dir}`,
        frames: scene.anims.generateFrameNumbers('player_walk', { start: start + 2, end: start + 6 }),
        frameRate: 16,
        repeat: 0,
      });
    });

    // 6. Hurt (6 frames in player_hurt)
    directions.forEach((dir) => {
      scene.anims.create({
        key: `player_hurt_${dir}`,
        frames: scene.anims.generateFrameNumbers('player_hurt', { start: 0, end: 5 }),
        frameRate: 12,
        repeat: 0,
      });
    });

    // 7. Death (6 frames collapse & dissolve in player_death)
    scene.anims.create({
      key: 'player_death',
      frames: scene.anims.generateFrameNumbers('player_death', { start: 0, end: 5 }),
      frameRate: 6,
      repeat: 0,
    });
  }

  private static registerNPCAnims(scene: Phaser.Scene) {
    // Trưởng Lão Thanh Khê (Elder Idle: row 2 = down, frames 8 to 11)
    scene.anims.create({
      key: 'npc_elder_idle',
      frames: scene.anims.generateFrameNumbers('npc_elder', { start: 8, end: 11 }),
      frameRate: 5,
      repeat: -1,
    });

    // Dược Sĩ Liễu Muội (Healer Idle: frames 8 to 11)
    scene.anims.create({
      key: 'npc_healer_idle',
      frames: scene.anims.generateFrameNumbers('npc_healer', { start: 8, end: 11 }),
      frameRate: 5,
      repeat: -1,
    });

    // Đội Trưởng Vệ Binh (Guard Idle: frames 8 to 11)
    scene.anims.create({
      key: 'npc_guard_idle',
      frames: scene.anims.generateFrameNumbers('npc_guard', { start: 8, end: 11 }),
      frameRate: 5,
      repeat: -1,
    });
  }

  private static registerMonsterAnims(scene: Phaser.Scene) {
    // Sói Xám Thanh Khê (Wolf walk: row 2 = down, frames 20-24)
    scene.anims.create({
      key: 'wolf_walk',
      frames: scene.anims.generateFrameNumbers('monster_wolf', { start: 20, end: 24 }),
      frameRate: 9,
      repeat: -1,
    });
    // Sói Xám tấn công (Wolf bite attack: frames 40-44)
    scene.anims.create({
      key: 'wolf_attack',
      frames: scene.anims.generateFrameNumbers('monster_wolf', { start: 40, end: 44 }),
      frameRate: 12,
      repeat: 0,
    });

    // Boss Lang Vương (Alpha Wolf walk & attack)
    scene.anims.create({
      key: 'boss_wolf_walk',
      frames: scene.anims.generateFrameNumbers('boss_lang_vuong', { start: 20, end: 24 }),
      frameRate: 8,
      repeat: -1,
    });
    scene.anims.create({
      key: 'boss_wolf_attack',
      frames: scene.anims.generateFrameNumbers('boss_lang_vuong', { start: 40, end: 44 }),
      frameRate: 12,
      repeat: 0,
    });

    // Hắc Xà (Snake slither: frames 0-2)
    scene.anims.create({
      key: 'snake_walk',
      frames: scene.anims.generateFrameNumbers('monster_snake', { start: 0, end: 2 }),
      frameRate: 6,
      repeat: -1,
    });

    // U Hồn / Âm Linh (Ghost float: frames 0-2)
    scene.anims.create({
      key: 'ghost_float',
      frames: scene.anims.generateFrameNumbers('monster_ghost', { start: 0, end: 2 }),
      frameRate: 5,
      repeat: -1,
    });
  }

  /**
   * Tính hướng 4 chiều từ góc radian (-PI đến PI)
   */
  public static getDirectionFromAngle(angleRad: number): FacingDirection {
    // 0 = phải, PI/2 = dưới, -PI/2 = trên, PI / -PI = trái
    if (angleRad >= -Math.PI / 4 && angleRad <= Math.PI / 4) {
      return 'right';
    } else if (angleRad > Math.PI / 4 && angleRad < (3 * Math.PI) / 4) {
      return 'down';
    } else if (angleRad < -Math.PI / 4 && angleRad > (-3 * Math.PI) / 4) {
      return 'up';
    } else {
      return 'left';
    }
  }

  /**
   * Tính hướng 4 chiều từ vector di chuyển (vx, vy)
   */
  public static getDirectionFromVelocity(vx: number, vy: number, defaultDir: FacingDirection = 'down'): FacingDirection {
    if (Math.abs(vx) < 0.1 && Math.abs(vy) < 0.1) {
      return defaultDir;
    }
    if (Math.abs(vx) > Math.abs(vy)) {
      return vx > 0 ? 'right' : 'left';
    } else {
      return vy > 0 ? 'down' : 'up';
    }
  }
}
