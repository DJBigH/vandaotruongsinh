// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Animation Manager
// Registration & State Transitions for Characters & Entities
// ============================================================

import Phaser from 'phaser';
import type { ActionAnimationLock } from '../exploration/actions';

import { getAllSpritesheets, type FacingDirection } from '../assets/AssetManifest';
export type { FacingDirection } from '../assets/AssetManifest';
export type PlayerActionState = 'IDLE' | 'MOVING' | 'ATTACK' | 'SKILL' | 'DODGING' | 'HURT' | 'DEAD';

export class AnimationManager {
  /**
   * Khởi tạo và đăng ký toàn bộ animation vào Phaser Scene từ sprite sheet thật
   */
  public static registerAll(scene: Phaser.Scene) {
    for (const sheet of getAllSpritesheets()) {
      for (const { key, frameStart, frameEnd, duration, repeat } of sheet.animations) {
        if (scene.anims.exists(key)) continue;
        const frames = scene.anims.generateFrameNumbers(sheet.key, { start: frameStart, end: frameEnd });
        scene.anims.create({ key, frames, duration, repeat });
      }
    }
  }

  public static playAction(
    scene: Phaser.Scene,
    sprite: Phaser.GameObjects.Sprite,
    lock: ActionAnimationLock,
    key: string,
    timeout: number,
  ) {
    if (!scene.anims.exists(key)) return;
    lock.start((complete) => {
      const event = Phaser.Animations.Events.ANIMATION_COMPLETE_KEY + key;
      sprite.once(event, complete);
      const timer = scene.time.delayedCall(timeout, complete);
      sprite.play(key);
      return () => {
        sprite.off(event, complete);
        timer.remove();
      };
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
