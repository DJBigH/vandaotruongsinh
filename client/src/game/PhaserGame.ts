// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Phaser Game Instance Config
// ============================================================

import Phaser from 'phaser';
import BootScene from './scenes/BootScene';
import ExplorationScene from './scenes/ExplorationScene';
import CombatScene from './scenes/CombatScene';

export function createPhaserGame(parentContainerId: string): Phaser.Game {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: parentContainerId,
    width: 960,
    height: 640,
    pixelArt: true,
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: '100%',
      height: '100%',
    },
    scene: [BootScene, ExplorationScene, CombatScene],
  };

  return new Phaser.Game(config);
}
