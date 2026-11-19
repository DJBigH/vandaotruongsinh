import type Phaser from 'phaser';
import type { CultivationPath } from '@shared/index';
import { usePresentationSettings } from './settings';

type Cue = 'sword' | 'cast' | 'dodge' | 'hit';
type Effect = Phaser.GameObjects.Sprite | Phaser.GameObjects.Graphics | Phaser.GameObjects.Arc;

export class CombatFeedback {
  private pieces = new Set<Effect>();
  private lastHitCue = -Infinity;
  constructor(private scene: Phaser.Scene) { }

  sound(cue: Cue) {
    const key = 'sfx_' + cue;
    // Phaser unlocks on its first browser input gesture. Never queue stale combat audio.
    if (!usePresentationSettings.getState().sfx || this.scene.sound.locked || !this.scene.cache.audio.exists(key)) return;
    if (cue === 'hit') {
      const now = performance.now();
      if (now - this.lastHitCue < 80) return;
      this.lastHitCue = now;
    }
    this.scene.sound.play(key, { volume: cue === 'hit' ? 0.25 : 0.34 });
  }

  silence() {
    for (const cue of ['sword', 'hit', 'cast', 'dodge']) this.scene.sound.stopByKey('sfx_' + cue);
  }

  clear() {
    for (const piece of this.pieces) {
      this.scene.tweens.killTweensOf(piece);
      piece.destroy();
    }
    this.pieces.clear();
  }

  private fade(piece: Effect, duration: number, scale: number) {
    this.pieces.add(piece);
    this.scene.tweens.add({
      targets: piece, scale, alpha: 0, duration,
      onComplete: () => { this.pieces.delete(piece); piece.destroy(); },
    });
  }

  slash(player: Phaser.GameObjects.Sprite, angle: number, path?: CultivationPath) {
    if (usePresentationSettings.getState().reducedEffects) return;

    if (this.scene.textures.exists('vfx_sword_slash')) {
      const slashSprite = this.scene.add.sprite(
        player.x + Math.cos(angle) * 20,
        player.y - 18 + Math.sin(angle) * 20,
        'vfx_sword_slash'
      ).setDepth(player.y + 2).setRotation(angle).setScale(0.8);

      if (path === 'BODY') slashSprite.setTint(0xf97316);
      else if (path === 'SPELL') slashSprite.setTint(0xc084fc);
      else slashSprite.setTint(0x8ae0f2);

      this.fade(slashSprite, 220, 1.3);
    } else {
      const arc = this.scene.add.graphics().setPosition(player.x, player.y - 18).setDepth(player.y + 1).setRotation(angle);
      arc.lineStyle(3, path === 'BODY' ? 0xe5b57f : path === 'SPELL' ? 0xcbb2e4 : 0xe5e9ce, 0.85);
      arc.beginPath(); arc.arc(0, 0, 29, -0.86, 0.85); arc.strokePath();
      arc.lineStyle(1, 0xd2e6d0, 0.65);
      arc.beginPath(); arc.arc(1, 0, 34, -0.62, 0.42); arc.strokePath();
      this.fade(arc, 185, 1.22);
    }
  }

  cast(player: Phaser.GameObjects.Sprite, path?: CultivationPath) {
    if (usePresentationSettings.getState().reducedEffects) return;

    if (this.scene.textures.exists('vfx_lightning_burst') && path === 'SPELL') {
      const burst = this.scene.add.sprite(player.x, player.y - 18, 'vfx_lightning_burst')
        .setDepth(player.y + 2).setScale(0.7);
      this.fade(burst, 280, 1.5);
    } else if (this.scene.textures.exists('vfx_shield') && path === 'BODY') {
      const shield = this.scene.add.sprite(player.x, player.y - 18, 'vfx_shield')
        .setDepth(player.y + 2).setScale(0.8);
      this.fade(shield, 320, 1.4);
    } else {
      const color = path === 'SPELL' ? 0xbf9bea : path === 'BODY' ? 0xe6ad82 : 0xacdcc9;
      const ring = this.scene.add.circle(player.x, player.y - 18, 13).setStrokeStyle(2, color, 0.76).setDepth(player.y + 1);
      this.fade(ring, 270, 2);
    }
  }

  trail(player: Phaser.GameObjects.Sprite) {
    if (usePresentationSettings.getState().reducedEffects) return;
    const ghost = this.scene.add.sprite(player.x, player.y, player.texture.key, player.frame.name)
      .setOrigin(player.originX, player.originY).setDepth(player.y - 1).setTint(0xb4ddd7).setAlpha(0.32);
    this.fade(ghost, 165, 1);
  }

  hit(x: number, y: number) {
    this.sound('hit');
    if (usePresentationSettings.getState().reducedEffects) return;
    const spark = this.scene.add.graphics().setPosition(x, y - 18).setDepth(y + 2);
    spark.lineStyle(2, 0xffdec0, 0.95);
    for (let i = 0; i < 5; i++) {
      const angle = i * 2 * Math.PI / 5 - 0.35;
      spark.lineBetween(4 * Math.cos(angle), 4 * Math.sin(angle), 9 * Math.cos(angle), 9 * Math.sin(angle));
    }
    this.fade(spark, 170, 1.65);
  }
}
