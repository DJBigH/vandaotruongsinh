import Phaser from 'phaser';
import { eventBridge } from '../EventBridge';
import { ASSET_MANIFEST } from './AssetManifest';

type Asset = typeof ASSET_MANIFEST.assets[number];
const queues = new WeakMap<Phaser.Scene, Promise<void>>();

export function queueAsset(scene: Phaser.Scene, asset: Asset) {
  if (scene.textures.exists(asset.key) || scene.cache.audio.exists(asset.key)) return;
  if (asset.type === 'spritesheet') {
    scene.load.spritesheet(asset.key, asset.file, { frameWidth: asset.frameWidth, frameHeight: asset.frameHeight });
  } else if (asset.type === 'audio') {
    scene.load.audio(asset.key, asset.file);
  } else {
    scene.load.image(asset.key, asset.file);
  }
}

export function loadSceneAssets(scene: Phaser.Scene, assets: Asset[], label: string): Promise<void> {
  const previous = queues.get(scene) ?? Promise.resolve();
  const pending = previous.catch(() => undefined).then(() => new Promise<void>((resolve, reject) => {
    const missing = assets.filter(asset => !scene.textures.exists(asset.key) && !scene.cache.audio.exists(asset.key));
    if (!missing.length) return resolve();
    const failures: string[] = [];
    const loader = scene.load;
    const progress = (value: number) => eventBridge.emit('gameLoadProgress', { label, progress: Math.round(value * 100) });
    const failure = (file: Phaser.Loader.File) => failures.push(file.key);
    const cleanup = () => {
      loader.off(Phaser.Loader.Events.PROGRESS, progress);
      loader.off(Phaser.Loader.Events.FILE_LOAD_ERROR, failure);
      loader.off(Phaser.Loader.Events.COMPLETE, complete);
      scene.events.off(Phaser.Scenes.Events.SHUTDOWN, stopped);
    };
    const complete = () => {
      cleanup();
      if (failures.length) reject(new Error(`Không tải được hình: ${failures.slice(0, 3).join(', ')}`));
      else { progress(1); resolve(); }
    };
    const stopped = () => { cleanup(); reject(new Error('Màn chơi đã đóng khi đang tải hình.')); };
    loader.on(Phaser.Loader.Events.PROGRESS, progress);
    loader.on(Phaser.Loader.Events.FILE_LOAD_ERROR, failure);
    loader.once(Phaser.Loader.Events.COMPLETE, complete);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, stopped);
    progress(0);
    for (const asset of missing) queueAsset(scene, asset);
    if (!loader.isLoading()) loader.start();
  }));
  queues.set(scene, pending);
  return pending;
}
