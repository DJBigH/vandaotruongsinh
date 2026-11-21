import { useEffect, useState } from 'react';
import { REALM_TIERS, realmName } from '@shared/index';
import { equipSkill, getSkills, learnSkill, type SkillInfo } from '../../api/game';
import { useGameStore } from '../../stores/gameStore';
import { eventBridge } from '../../game/EventBridge';
import { skillIcon } from '../../game/assets/skillIcon';

export default function SkillPanel() {
  const { setActivePanel, addNotification, character } = useGameStore();
  const [skills, setSkills] = useState<SkillInfo[]>([]);
  const [gold, setGold] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const refresh = async () => {
    const response = await getSkills();
    if (response.success && response.data) {
      setSkills(response.data.skills);
      setGold(response.data.gold);
      setSelectedId((prior) => prior ?? response.data!.skills[0]?.id ?? null);
    }
  };
  useEffect(() => { void refresh(); }, [character?.id]);
  const selected = skills.find((skill) => skill.id === selectedId);
  const act = async (kind: 'learn' | 'equip' | 'remove', slot?: number) => {
    if (!selected) return;
    setBusy(true);
    try {
      const result = kind === 'learn' ? await learnSkill(selected.id)
        : await equipSkill(kind === 'remove' ? null : selected.id, slot!);
      if (!result.success) return addNotification(result.error || 'Chưa thể lĩnh ngộ chiêu thức', 'warning');
      await refresh();
      eventBridge.emit('skillsChanged');
      addNotification(kind === 'learn' ? `Đã lĩnh ngộ ${selected.name}` : 'Đã đổi ô chiêu', 'success');
    } catch (error: any) { addNotification(error.response?.data?.error || 'Không thể đổi chiêu', 'warning'); }
    finally { setBusy(false); }
  };
  return <section className="skill-panel v105-panel" role="dialog" aria-modal="true" aria-labelledby="skill-heading">
    <header><div><small>BÍ KÍP · {character?.cultivationPath === 'SWORD' ? 'KIẾM TU' : character?.cultivationPath === 'SPELL' ? 'PHÁP TU' : 'THỂ TU'}</small>
      <h2 id="skill-heading">Lĩnh ngộ chiêu thức</h2></div>
      <button type="button" onClick={() => setActivePanel(null)} aria-label="Đóng bảng chiêu">✕</button></header>
    <p className="skill-intro">Đột phá để mở cảnh giới học chiêu. Săn quái kiếm linh thạch, sau đó lĩnh ngộ và đặt vào phím 1–4.</p>
    <div className="skill-layout">
      <div className="skill-list" aria-label="Bí kíp có thể học">
        {skills.map((skill) => <button type="button" key={skill.id} className={selectedId === skill.id ? 'selected' : ''}
          onClick={() => setSelectedId(skill.id)} aria-current={selectedId === skill.id ? 'true' : undefined}>
          <img src={skillIcon(skill.id)} alt="" /><span><strong>{skill.name}</strong><small>
            {skill.learned ? skill.equipSlot ? `Đã học · Phím ${skill.equipSlot}` : 'Đã học · Chưa đặt ô'
              : skill.eligible ? `${skill.cost} linh thạch` : `${realmName(skill.unlockRealmIndex, character?.alignment)} · ${REALM_TIERS[skill.unlockRealmTier]}`}
          </small></span></button>)}
      </div>
      <div className="skill-detail">{selected ? <>
        <img src={skillIcon(selected.id)} alt="" className="skill-portrait" />
        <h3>{selected.name}</h3><p>{selected.description}</p>
        <div className="skill-facts"><span>Yêu cầu <strong>{realmName(selected.unlockRealmIndex, character?.alignment)} · {REALM_TIERS[selected.unlockRealmTier]}</strong></span>
          <span>Linh lực <strong>{selected.mpCost}</strong></span><span>Hồi chiêu <strong>{selected.cooldown}</strong></span>
          <span>Linh thạch <strong>{gold}</strong></span></div>
        {!selected.learned ? <button type="button" disabled={busy || !selected.eligible || gold < selected.cost}
          onClick={() => void act('learn')}>
          {!selected.eligible ? 'Chưa đủ cảnh giới' : gold < selected.cost ? `Cần ${selected.cost} linh thạch` : `Lĩnh ngộ · ${selected.cost} linh thạch`}
        </button> : <div className="skill-slots"><strong>Đặt vào ô chiến đấu</strong><div>
          {[1, 2, 3, 4].map((slot) => <button key={slot} type="button" className={selected.equipSlot === slot ? 'selected' : ''}
            disabled={busy} onClick={() => void act('equip', slot)} aria-label={`Đặt ${selected.name} vào phím ${slot}`}>{slot}</button>)}
          {selected.equipSlot && <button type="button" disabled={busy} onClick={() => void act('remove', selected.equipSlot!)}>Bỏ ô</button>}
        </div></div>}
      </> : <p>Đang mở bí kíp…</p>}</div>
    </div>
  </section>;
}
