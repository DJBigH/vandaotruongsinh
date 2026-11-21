type EquipmentKind = 'icon' | 'avatar';

export function equipmentArt(type: string, name: string, enhanceLevel: number, kind: EquipmentKind): string | null {
  const family = type === 'ARMOR' ? (/bào|\by\b/iu.test(name) ? 'robe' : 'armor')
    : type === 'SHOES' ? 'boots' : type === 'ACCESSORY' ? 'ring' : null;
  if (!family) return null;
  const tier = Math.max(0, Math.min(10, Math.floor(Number.isFinite(enhanceLevel) ? enhanceLevel : 0)));
  return `/assets/v160/${kind}_equipment_${family}_${tier}_${alignmentSlug(useGameStore.getState().character?.alignment)}.png`;
}
import { useGameStore } from '../../stores/gameStore';
import { alignmentSlug } from './lineage';
