const weaponById: Record<string, string> = {
  item_001: 'sword', item_004: 'sword', item_016: 'sword', item_021: 'sword',
  item_025: 'sword', item_076: 'sword', item_077: 'sword', item_079: 'sword',
  item_102: 'sword', item_108: 'sword', item_109: 'sword', item_110: 'sword',
  item_002: 'staff', item_017: 'staff', item_023: 'staff', item_080: 'staff', item_103: 'staff',
  item_003: 'fists', item_018: 'fists', item_107: 'fists',
  item_020: 'spear', item_024: 'spear', item_101: 'spear',
  item_075: 'bow', item_078: 'axe', item_104: 'axe',
  item_019: 'spear', item_022: 'spear', item_105: 'spear',
};

export function weaponArt(templateId: string, name = '', enhanceLevel = 0) {
  const kind = weaponById[templateId] ??
    (/trượng|xích|thụ/.test(name.toLowerCase()) ? 'staff' :
      /quyền|sáo|khải|bổng/.test(name.toLowerCase()) ? 'fists' :
        /thương|kích|đao/.test(name.toLowerCase()) ? 'spear' :
          /cung/.test(name.toLowerCase()) ? 'bow' :
            /phủ|rìu/.test(name.toLowerCase()) ? 'axe' : 'sword');
  const stage = Math.max(0, Math.min(10, Math.trunc(enhanceLevel || 0)));
  return stage <= 5 ? `/assets/v110/weapon_${kind}_${stage}.png` : `/assets/v130/weapon_${kind}_${stage}.png`;
}

export function weaponPortrait(templateId: string, name = '', enhanceLevel = 0) {
  const icon = weaponArt(templateId, name, enhanceLevel);
  return enhanceLevel <= 5 ? icon : icon.replace('/weapon_', '/avatar_weapon_');
}
