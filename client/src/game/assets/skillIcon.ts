const icons: Record<string, string[]> = {
  sword: ['slash', 'array', 'dash', 'shield'],
  spell: ['thunder', 'fire', 'ice', 'shield'],
  body: ['punch', 'iron', 'roar', 'wave'],
};

export function skillIcon(skillId: string) {
  const match = /^skill_(sword|spell|body)_(\d+)$/.exec(skillId);
  if (!match) return '/assets/vnext/icon_action_attack.png';
  const index = (Number(match[2]) - 1) % 4;
  return `/assets/vnext/icon_skill_${match[1]}_${icons[match[1]][index]}.png`;
}
