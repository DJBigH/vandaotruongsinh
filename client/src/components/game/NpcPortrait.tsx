import React from 'react';
import villageNpcs from '../../../../art/vnext/source/thanh-khe-npcs-v1.png';
import swordCultivator from '../../../../art/vnext/source/kiem-tu-reference.png';
import spellCultivator from '../../../../art/vnext/source/phap-tu-reference-v102.png';
import bodyCultivator from '../../../../art/vnext/source/the-tu-reference-v102.png';

type PortraitRole = 'elder' | 'healer' | 'guard' | 'sword' | 'spell' | 'body';

function portraitRole(speaker: string, spriteKey?: string): PortraitRole {
  if (/Liễu Muội|Liễu Nhược Vân|Dược Sĩ|Đan Tôn/.test(speaker)) return 'healer';
  if (/Vệ Binh|Đội Trưởng/.test(speaker)) return 'guard';
  if (/U Minh|Quỷ Đế|Chấp Pháp/.test(speaker)) return 'body';
  if (/Tiếng Vọng|Kính Tâm|Tâm Ma|Tháp Linh/.test(speaker)) return 'spell';
  if (/Tiêu Dao|Kiếm Hồn|Kiếm Tôn|Đạo Sĩ/.test(speaker)) return 'sword';
  if (/Trưởng Lão|Chưởng Môn|Sơn Thần|Thiên Khế/.test(speaker)) return 'elder';
  if (spriteKey === 'npc_healer') return 'healer';
  if (spriteKey === 'npc_guard') return 'guard';
  if (spriteKey === 'npc_mentor') return 'sword';
  return 'elder';
}

const PORTRAITS: Record<PortraitRole, { image: string; size: string; position: string; tint: string }> = {
  elder: { image: villageNpcs, size: '580px 435px', position: '-30px -3px', tint: '#606b50' },
  healer: { image: villageNpcs, size: '580px 435px', position: '-30px -148px', tint: '#526a5d' },
  guard: { image: villageNpcs, size: '580px 435px', position: '-30px -293px', tint: '#634a42' },
  sword: { image: swordCultivator, size: '313px 313px', position: '-27px -7px', tint: '#315064' },
  spell: { image: spellCultivator, size: '313px 313px', position: '-27px -7px', tint: '#4b3863' },
  body: { image: bodyCultivator, size: '313px 313px', position: '-27px -7px', tint: '#653e36' },
};

export default function NpcPortrait({ speaker, spriteKey, size = 104 }: { speaker: string; spriteKey?: string; size?: number }) {
  const portrait = PORTRAITS[portraitRole(speaker, spriteKey)];
  return <div role="img" aria-label={`Chân dung ${speaker}`} style={{
    width: size, height: size, flexShrink: 0, border: '2px solid #c5a059', borderRadius: 8,
    boxSizing: 'border-box', backgroundColor: portrait.tint, backgroundImage: `url(${portrait.image})`,
    backgroundSize: portrait.size, backgroundPosition: portrait.position, backgroundRepeat: 'no-repeat',
    boxShadow: 'inset 0 0 18px #0008, 0 4px 14px #0007',
  }} />;
}
