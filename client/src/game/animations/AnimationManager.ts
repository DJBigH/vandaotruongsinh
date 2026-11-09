// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Animation Manager
// Registration & State Transitions for Characters & Entities
// ============================================================

import Phaser from 'phaser';

export type FacingDirection = 'down' | 'up' | 'left' | 'right';
export type PlayerActionState = 'IDLE' | 'MOVING' | 'ATTACK' | 'SKILL' | 'DODGING' | 'HURT' | 'DEAD';

export class AnimationManager {
  /**
   * Khởi tạo và đăng ký toàn bộ animation vào Phaser Scene
   */
  public static registerAll(scene: Phaser.Scene) {
    this.registerPlayerAnims(scene);
    this.registerNPCAnims(scene);
    this.registerMonsterAnims(scene);
    this.registerBossAnims(scene);
  }

  private static registerPlayerAnims(scene: Phaser.Scene) {
    const directions: FacingDirection[] = ['down', 'up', 'left', 'right'];

    // 1. Idle
    directions.forEach((dir, dirIdx) => {
      const start = dirIdx * 4;
      scene.anims.create({
        key: `player_idle_${dir}`,
        frames: scene.anims.generateFrameNumbers('player_kiem_tu_idle', { start, end: start + 3 }),
        frameRate: 6,
        repeat: -1,
      });
    });

    // 2. Walk
    directions.forEach((dir, dirIdx) => {
      const start = dirIdx * 6;
      scene.anims.create({
        key: `player_walk_${dir}`,
        frames: scene.anims.generateFrameNumbers('player_kiem_tu_walk', { start, end: start + 5 }),
        frameRate: 10,
        repeat: -1,
      });
    });

    // 3. Attack
    directions.forEach((dir, dirIdx) => {
      const start = dirIdx * 4;
      scene.anims.create({
        key: `player_attack_${dir}`,
        frames: scene.anims.generateFrameNumbers('player_kiem_tu_attack', { start, end: start + 3 }),
        frameRate: 12,
        repeat: 0,
      });
    });

    // 4. Cast Skill
    directions.forEach((dir, dirIdx) => {
      const start = dirIdx * 4;
      scene.anims.create({
        key: `player_cast_${dir}`,
        frames: scene.anims.generateFrameNumbers('player_kiem_tu_cast', { start, end: start + 3 }),
        frameRate: 10,
        repeat: 0,
      });
    });

    // 5. Dodge
    directions.forEach((dir, dirIdx) => {
      const start = dirIdx * 3;
      scene.anims.create({
        key: `player_dodge_${dir}`,
        frames: scene.anims.generateFrameNumbers('player_kiem_tu_dodge', { start, end: start + 2 }),
        frameRate: 10,
        repeat: 0,
      });
    });

    // 6. Hurt
    directions.forEach((dir, dirIdx) => {
      const start = dirIdx * 2;
      scene.anims.create({
        key: `player_hurt_${dir}`,
        frames: scene.anims.generateFrameNumbers('player_kiem_tu_hurt', { start, end: start + 1 }),
        frameRate: 8,
        repeat: 0,
      });
    });

    // 7. Death
    scene.anims.create({
      key: 'player_death',
      frames: scene.anims.generateFrameNumbers('player_kiem_tu_death', { start: 0, end: 4 }),
      frameRate: 6,
      repeat: 0,
    });
  }

  private static registerNPCAnims(scene: Phaser.Scene) {
    scene.anims.create({
      key: 'npc_elder_idle',
      frames: scene.anims.generateFrameNumbers('npc_elder', { start: 0, end: 3 }),
      frameRate: 4,
      repeat: -1,
    });
  }

  private static registerMonsterAnims(scene: Phaser.Scene) {
    scene.anims.create({
      key: 'mon_001_prowl',
      frames: scene.anims.generateFrameNumbers('mon_001', { start: 0, end: 3 }),
      frameRate: 8,
      repeat: -1,
    });

    scene.anims.create({
      key: 'mon_001_attack',
      frames: scene.anims.generateFrameNumbers('mon_001', { start: 4, end: 7 }),
      frameRate: 10,
      repeat: 0,
    });
  }

  private static registerBossAnims(scene: Phaser.Scene) {
    scene.anims.create({
      key: 'boss_001_prowl',
      frames: scene.anims.generateFrameNumbers('boss_001', { start: 0, end: 3 }),
      frameRate: 6,
      repeat: -1,
    });

    scene.anims.create({
      key: 'boss_001_attack',
      frames: scene.anims.generateFrameNumbers('boss_001', { start: 4, end: 7 }),
      frameRate: 8,
      repeat: 0,
    });
  }

  /**
   * Tính hướng 4 chiều từ góc radian (-PI đến PI)
   */
  public static getDirectionFromAngle(angleRad: number): FacingDirection {
    // Góc: 0 = phải, PI/2 = dưới, -PI/2 = trên, PI / -PI = trái
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
