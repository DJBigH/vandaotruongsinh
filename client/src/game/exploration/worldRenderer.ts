import type Phaser from 'phaser';
import type { MapCollisionZone, MapData, Position } from '@shared/index';
import { buildingScale, buildingTexture, isForest, isSect, isVillage, isWater, worldTrails } from './worldLayout';
import { worldDetails } from './v110WorldProps';
import { usePresentationSettings } from './settings';

type Occluder = {
  sprite: Phaser.GameObjects.Sprite;
  left: number; right: number; top: number; foot: number; opacity: number;
};

// A raised, enclosed plinth marks the entire blocker, including transparent corners of
// the sprite. All faces and steps are painted inside the authoritative tile rectangle.
export function paintFoundation(
  ctx: CanvasRenderingContext2D, zone: MapCollisionZone, size: number, deck: CanvasPattern, masonry: CanvasPattern,
) {
  const x = zone.x * size, y = zone.y * size, w = zone.w * size, h = zone.h * size;
  const edge = Math.max(4, Math.round(size / 4));
  const face = edge * 2;
  const opening = Math.min(w, size * 1.5);
  const wing = (w - opening) / 2;
  ctx.fillStyle = deck;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = masonry;
  ctx.fillRect(x, y, w, face);
  ctx.fillRect(x, y, edge, h);
  ctx.fillRect(x + w - edge, y, edge, h);
  ctx.fillRect(x, y + h - face, wing, face);
  ctx.fillRect(x + wing + opening, y + h - face, wing, face);
  ctx.fillStyle = '#99977b';
  ctx.fillRect(x, y, w, 3);
  ctx.fillRect(x, y, 3, h);
  ctx.fillRect(x + w - edge, y, 3, h);
  ctx.fillRect(x, y + h - face, wing, 3);
  ctx.fillRect(x + wing + opening, y + h - face, wing, 3);
  ctx.fillStyle = '#45483d';
  ctx.fillRect(x, y + face - 2, w, 2);
  ctx.fillRect(x, y + h - 3, wing, 3);
  ctx.fillRect(x + wing + opening, y + h - 3, wing, 3);
  for (let step = 0; step < 3; step++) {
    ctx.fillStyle = '#b1ac90';
    ctx.fillRect(x + wing, y + h - 4 * (step + 1), opening, 2);
  }
}

export class WorldRenderer {
  private occluders: Occluder[] = [];
  private rotating: Phaser.Tweens.Tween[] = [];
  private gate?: Phaser.GameObjects.Sprite;
  private readonly groundKey: string;

  constructor(private scene: Phaser.Scene, private map: MapData) {
    this.groundKey = 'terrain:' + map.id;
    this.buildGround();
    for (const zone of map.collisionZones ?? []) this.placeBarrier(zone);

    const size = map.tileSize;
    const occupied = new Set([...map.interactables, ...map.portals].map(o => o.position.x + ',' + o.position.y));
    const placed = new Set<string>();
    for (const prop of [...(map.decorativeProps ?? []), ...(worldDetails[map.id] ?? [])]) {
      const location = prop.x + ',' + prop.y;
      const id = prop.key + ':' + location;
      if (placed.has(id) || !scene.textures.exists(prop.key)) continue;
      placed.add(id);
      if (occupied.has(location) && ['prop_portal', 'prop_shrine', 'prop_chest', 'prop_herb', 'prop_ore'].includes(prop.key)) continue;
      const ambient = `${prop.key}_loop`;
      const texture = scene.textures.exists(ambient) ? ambient : prop.key;
      const sprite = scene.add.sprite(prop.x * size, prop.y * size, texture)
        .setOrigin(0.5, prop.originY ?? 0.9).setScale(prop.scale ?? 1)
        .setDepth(prop.depth ?? prop.y * size).setAlpha(prop.alpha ?? 1);
      if (prop.key === 'prop_sect_gate') {
        // Fit the gate between its mapped foot and the northern map boundary.
        const available = sprite.y - 4;
        sprite.setScale(Math.min(sprite.scaleX, available / (sprite.height * sprite.originY)));
        this.gate = sprite;
      }
      if (prop.tint !== undefined) sprite.setTint(prop.tint);
      if (scene.anims.exists(texture) && !usePresentationSettings.getState().reducedEffects) sprite.play(texture);
      if (prop.spin) this.rotating.push(scene.tweens.add({ targets: sprite, angle: 360, duration: 36000, repeat: -1 }));
      if (prop.depth === undefined && sprite.displayHeight >= 44) this.track(sprite);
    }
  }

  portalSign(x: number, y: number) {
    if (this.gate?.x === x && this.gate.y === y) {
      // The north gate has little headroom. Put its sign alongside the arch.
      return { x: this.gate.getBounds().right + 6, y: y - 19, originX: 0 };
    }
    return { x, y: y - 42, originX: 0.5 };
  }

  setReducedMotion(reduced: boolean) {
    for (const tween of this.rotating) reduced ? tween.pause() : tween.resume();
  }

  track(sprite: Phaser.GameObjects.Sprite) {
    const bounds = sprite.getBounds();
    this.occluders.push({ sprite, left: bounds.left, right: bounds.right, top: bounds.top, foot: sprite.y, opacity: sprite.alpha });
  }

  updateOcclusion(player: Position) {
    for (const o of this.occluders) {
      const behind = player.y <= o.foot && player.y >= o.top - 4 && player.x > o.left - 8 && player.x < o.right + 8;
      o.sprite.alpha = o.opacity * (behind ? 0.4 : 1);
    }
  }

  dispose() {
    this.occluders.length = 0;
    if (this.scene.textures.exists(this.groundKey)) this.scene.textures.remove(this.groundKey);
  }

  private placeBarrier(zone: MapCollisionZone) {
    const s = this.map.tileSize;
    if (!isVillage(this.map) && !isForest(this.map)) return;
    const building = buildingTexture(zone);
    if (building) {
      const sprite = this.scene.add.sprite((zone.x + zone.w / 2) * s, (zone.y + zone.h) * s, building)
        .setOrigin(0.5, 1);
      sprite.setScale(buildingScale(zone, s, sprite.width, sprite.height)).setDepth(sprite.y);
      this.track(sprite);
    } else if (isForest(this.map) && !isWater(zone)) {
      const trees = /rừng/iu.test(zone.label ?? '');
      const width = zone.w * s, height = zone.h * s;
      const rows = Math.max(1, Math.ceil(height / (trees ? 82 : 58)));
      const cols = Math.max(1, Math.ceil(width / (trees ? 88 : 78)));
      for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
        const key = trees ? ((row + col) % 3 ? 'prop_pine_tree' : 'prop_broadleaf_tree') : 'prop_ancient_rock';
        const x = zone.x * s + (col + 0.5) * width / cols;
        const y = zone.y * s + (row + 1) * height / rows - 3;
        const sprite = this.scene.add.sprite(x, y, key).setOrigin(0.5, 0.94).setDepth(y);
        sprite.setScale((width / cols + (trees ? 30 : 14)) / sprite.width);
        sprite.setFlipX((row + col) % 2 === 1);
        this.track(sprite);
      }
    }
  }

  private buildGround() {
    const { scene, map } = this;
    const s = map.tileSize, w = map.width * s, h = map.height * s;
    const canvas = scene.textures.createCanvas(this.groundKey, w, h)!;
    const ctx = canvas.context;
    ctx.imageSmoothingEnabled = false;
    const forest = isForest(map);
    const village = isVillage(map);
    const sect = isSect(map);
    const hasMaterials = scene.textures.exists('ground_stone') && scene.textures.exists('ground_grass');

    if (!hasMaterials) {
      const ground = map.layers.find(l => !l.collision);
      const solid = map.layers.filter(l => l.collision);
      for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) {
        const index = y * map.width + x;
        const zone = map.collisionZones?.find(z => x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h);
        const key = zone && isWater(zone) ? 'tile_water' : zone || solid.some(l => l.data[index] > 0) ? 'tile_rock'
          : ground?.data[index] === 2 ? 'tile_dirt' : 'tile_grass';
        ctx.drawImage(scene.textures.get(key).getSourceImage() as HTMLImageElement, x * s, y * s, s, s);
      }
    } else {
      const material = (key: string, color: string, opacity: number, side: number) => {
        // Mirror adjacent swatches to avoid visible seams. Blend the original pigment into a local base tone.
        const tile = document.createElement('canvas');
        tile.width = tile.height = side * 2;
        const c = tile.getContext('2d')!;
        c.fillStyle = color;
        c.fillRect(0, 0, tile.width, tile.height);
        c.globalAlpha = opacity;
        const source = scene.textures.get('ground_' + key).getSourceImage() as HTMLImageElement;
        for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) {
          c.save();
          c.translate(x * 2 * side, y * 2 * side);
          c.scale(x ? -1 : 1, y ? -1 : 1);
          c.drawImage(source, 0, 0, side, side);
          c.restore();
        }
        return ctx.createPattern(tile, 'repeat')!;
      };
      const isStoneMap = sect || ['map_co_kiem_di_tich', 'map_u_minh_vuc', 'map_kinh_tam_canh', 'map_thien_khe_dai', 'map_tran_yeu_thap', 'map_long_mach_thien_son'].includes(map.id);
      const isDirtMap = map.id === 'map_dan_ha';

      const grass = material('grass', forest ? '#475540' : '#747b58', forest ? 0.35 : 0.39, 154);
      const dirt = material('dirt', forest ? '#837459' : '#a89a78', 0.53, 142);
      const stoneTone = sect ? '#4b5563' : map.id === 'map_u_minh_vuc' ? '#2e1065' : map.id === 'map_long_mach_thien_son' ? '#475569' : '#64748b';
      const stone = material('stone', stoneTone, 0.68, 174);
      const water = material('water', '#3c6868', 0.63, 126);
      ctx.fillStyle = isStoneMap ? stone : isDirtMap ? dirt : grass;
      ctx.fillRect(0, 0, w, h);
      // Broad tonal changes keep the open grass readable at both desktop sizes.
      for (let i = 0; i < 26; i++) {
        const x = ((i * 839 + 310) % w), y = ((i * 461 + 170) % h), radius = 115 + (i * 47 % 130);
        const shade = ctx.createRadialGradient(x, y, 2, x, y, radius);
        shade.addColorStop(0, i % 2 ? 'rgba(32,66,55,.23)' : 'rgba(195,178,114,.21)');
        shade.addColorStop(1, 'rgba(90,100,72,0)');
        ctx.fillStyle = shade;
        ctx.fillRect(x - radius, y - radius, 2 * radius, 2 * radius);
      }
      if (forest) {
        const boss = map.monsters.find(m => m.monsterId === 'boss_001');
        const glades = [[19, 17, 4.2, 3.4], [44, 34, 4.8, 3.6]];
        if (boss) glades.push([boss.position.x, boss.position.y, 6.0, 3.7]);
        for (const [x, y, rx, ry] of glades) {
          ctx.save();
          ctx.translate(x * s, y * s);
          ctx.scale(rx * s, ry * s);
          const verge = ctx.createRadialGradient(0, 0, 0.18, 0, 0, 1);
          verge.addColorStop(0, 'rgba(170,147,95,.58)');
          verge.addColorStop(0.74, 'rgba(167,149,99,.32)');
          verge.addColorStop(1, 'rgba(167,149,99,0)');
          ctx.fillStyle = verge;
          ctx.fillRect(-1, -1, 2, 2);
          ctx.restore();
        }
      }
      ctx.lineJoin = ctx.lineCap = 'round';
      for (const trail of worldTrails(map)) {
        ctx.beginPath();
        trail.points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
        ctx.strokeStyle = 'rgba(115,111,75,.55)';
        ctx.lineWidth = trail.width + 11;
        ctx.stroke();
        ctx.strokeStyle = trail.paved ? stone : dirt;
        ctx.lineWidth = trail.width;
        ctx.stroke();
      }
      if (village) {
        const shrine = map.interactables.find(o => o.type === 'SHRINE');
        if (shrine) {
          const { x, y } = shrine.position;
          ctx.fillStyle = stone;
          ctx.strokeStyle = '#807b66';
          ctx.lineWidth = 5;
          ctx.beginPath();
          for (let i = 0; i < 8; i++) {
            const angle = Math.PI * (i / 4 + 1 / 8);
            const px = (x + 4.55 * Math.cos(angle)) * s, py = (y + 3.5 * Math.sin(angle)) * s;
            if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
          }
          ctx.closePath(); ctx.fill(); ctx.stroke();
        }
      }
      if (isStoneMap) {
        // Mountain border stone styling
        const solid = map.layers.filter(l => l.collision);
        for (let y = 0; y < map.height; y++) {
          for (let x = 0; x < map.width; x++) {
            const index = y * map.width + x;
            if (solid.some(l => l.data[index] > 0)) {
              ctx.fillStyle = '#1e293b';
              ctx.fillRect(x * s, y * s, s, s);
              ctx.fillStyle = '#334155';
              ctx.fillRect(x * s + 2, y * s + 2, s - 4, s - 4);
              ctx.fillStyle = '#475569';
              ctx.fillRect(x * s + 4, y * s + 4, s - 8, s - 8);
            }
          }
        }
        // Central Daoist Martial Array around shrine
        const shrine = map.interactables.find(o => o.type === 'SHRINE');
        if (shrine) {
          const cx = shrine.position.x * s, cy = shrine.position.y * s;
          ctx.save();
          ctx.fillStyle = 'rgba(30, 41, 59, 0.6)';
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          for (let i = 0; i < 8; i++) {
            const angle = Math.PI * (i / 4 + 1 / 8);
            const px = cx + 3.8 * s * Math.cos(angle), py = cy + 3.8 * s * Math.sin(angle);
            if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(cx, cy, 2.8 * s, 0, Math.PI * 2);
          ctx.stroke();

          ctx.strokeStyle = 'rgba(224, 231, 255, 0.25)';
          ctx.beginPath();
          ctx.arc(cx, cy, 1.8 * s, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }
      // Sample the opaque masonry between the pillars in the original wall module.
      let foundations: { deck: CanvasPattern; masonry: CanvasPattern } | undefined;
      if (village) {
        const wall = document.createElement('canvas');
        wall.width = 60;
        wall.height = 24;
        wall.getContext('2d')!.drawImage(scene.textures.get('prop_stone_wall').getSourceImage() as HTMLImageElement,
          18, 11, 60, 24, 0, 0, 60, 24);
        foundations = { deck: material('stone', '#474c41', 0.24, 120), masonry: ctx.createPattern(wall, 'repeat')! };
      }
      // Overpaint every authoritative blocker after the trails, including the full water footprint.
      for (const zone of map.collisionZones ?? []) {
        const x = zone.x * s, y = zone.y * s, width = zone.w * s, height = zone.h * s;
        if (isWater(zone)) {
          ctx.fillStyle = '#9b9170';
          ctx.fillRect(x - 4, y - 4, width + 8, height + 8);
          ctx.fillStyle = water;
          ctx.fillRect(x, y, width, height);
          ctx.strokeStyle = 'rgba(195,213,174,.65)';
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 1, y + 1, width - 2, height - 2);
        } else if (foundations && buildingTexture(zone)) {
          paintFoundation(ctx, zone, s, foundations.deck, foundations.masonry);
        } else {
          ctx.fillStyle = /rừng/iu.test(zone.label ?? '') ? '#42533d' : stone;
          ctx.fillRect(x, y, width, height);
        }
      }
      ctx.fillStyle = stone;
      for (const layer of map.layers.filter(l => l.collision)) {
        layer.data.forEach((value, index) => {
          if (value > 0) ctx.fillRect(index % map.width * s, Math.floor(index / map.width) * s, s, s);
        });
      }
    }
    canvas.refresh();
    scene.add.image(0, 0, this.groundKey).setOrigin(0, 0).setDepth(-1);
  }
}
