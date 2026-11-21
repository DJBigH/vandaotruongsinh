// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Character & Cultivation Panel
// ============================================================

import React, { useEffect, useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import * as gameApi from '../../api/game';
import { CULTIVATION_PATH_NAMES, MAX_REALM_INDEX, realmName, titleName } from '@shared/index';
import { heroAvatarUrl, realmArtUrl } from '../../game/assets/hero-variants';
import UpgradeOutcome from './UpgradeOutcome';

export default function CharacterPanel() {
  const { character, loadCharacter, setActivePanel, addNotification } = useGameStore();
  const [breakthroughLoading, setBreakthroughLoading] = useState(false);
  const [breakthroughInfo, setBreakthroughInfo] = useState<gameApi.BreakthroughInfo | null>(null);
  const [remainingCooldown, setRemainingCooldown] = useState(0);
  const [breakthroughScene, setBreakthroughScene] = useState<{ success: boolean; message: string; realmIndex: number } | null>(null);

  useEffect(() => {
    let mounted = true;
    void gameApi.getBreakthroughInfo().then((res) => {
      if (mounted && res.success) setBreakthroughInfo(res.data ?? null);
    }).catch(() => { if (mounted) setBreakthroughInfo(null); });
    return () => { mounted = false; };
  }, [character?.id, character?.realmIndex, character?.realmTier, character?.cultivationExp,
    character?.exp, character?.gold]);

  useEffect(() => {
    let active = true;
    let remaining = breakthroughInfo?.cooldownSeconds ?? 0;
    setRemainingCooldown(remaining);
    if (!remaining) return;
    const timer = window.setInterval(() => {
      remaining = Math.max(0, remaining - 1);
      setRemainingCooldown(remaining);
      if (remaining === 0) {
        window.clearInterval(timer);
        void gameApi.getBreakthroughInfo().then((res) => {
          if (active && res.success) setBreakthroughInfo(res.data ?? null);
        }).catch(() => {});
      }
    }, 1000);
    return () => { active = false; window.clearInterval(timer); };
  }, [breakthroughInfo]);

  if (!character) return null;

  const handleBreakthrough = async () => {
    setBreakthroughLoading(true);
    try {
      const res = await gameApi.attemptBreakthrough(character);
      if (res.success && res.data) {
        setBreakthroughScene({ success: res.data.success, message: res.data.message,
          realmIndex: res.data.success && character.realmTier === 3
            ? Math.min(MAX_REALM_INDEX, character.realmIndex + 1) : character.realmIndex });
        addNotification(res.data.message, res.data.success ? 'success' : 'warning');
        await loadCharacter();
        const next = await gameApi.getBreakthroughInfo();
        if (next.success) setBreakthroughInfo(next.data ?? null);
      } else {
        addNotification(res.error || 'Chưa đủ điều kiện đột phá', 'warning');
      }
    } catch (err: any) {
      if (err.response?.status === 409) await loadCharacter();
      addNotification(err.response?.data?.error || 'Chưa đủ điều kiện đột phá cảnh giới', 'error');
    } finally {
      setBreakthroughLoading(false);
    }
  };

  return <>
    <div style={{
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '740px',
      maxWidth: '92vw',
      maxHeight: '90vh',
      overflowY: 'auto',
      boxSizing: 'border-box',
      background: 'rgba(15, 23, 42, 0.96)',
      border: '2px solid #c5a059',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 12px 48px rgba(0,0,0,0.85)',
      zIndex: 100,
      color: '#e2e8f0',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src={heroAvatarUrl(character.cultivationPath, character.gender, character.alignment, character.realmIndex)}
            alt={`Chân dung ${character.name}`}
            style={{ width: '64px', height: '64px', objectFit: 'contain', imageRendering: 'pixelated', background: '#1e293b', border: '1px solid #b8a06a', borderRadius: '6px' }} />
          <div>
            <h2 style={{ margin: 0, color: '#ffd700', fontSize: '1.4rem' }}>🧘 TU VI & ĐẠO THÂN</h2>
            <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
              {CULTIVATION_PATH_NAMES[character.cultivationPath]} • {character.realmName}
            </span>
            {character.equippedTitleId && <div style={{ color: '#e4c78c', fontFamily: 'serif' }}>
              {titleName(character.equippedTitleId, character.alignment)}
            </div>}
          </div>
        </div>
        <button
          onClick={() => setActivePanel(null)}
          style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}
        >
          ✕
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '20px' }}>
        {/* Left: Stats Column */}
        <div style={{ background: '#0f172a', padding: '16px', borderRadius: '8px', border: '1px solid #334155' }}>
          <h3 style={{ margin: '0 0 12px 0', color: '#c5a059', fontSize: '1rem' }}>Chỉ Số Bổn Nguyên</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#ef5350' }}>❤️ Sinh Lực:</span>
              <strong>{character.stats.hp} / {character.stats.maxHp}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#42a5f5' }}>💧 Linh Lực:</span>
              <strong>{character.stats.mp} / {character.stats.maxMp}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#ffa726' }}>⚔️ Công Kích:</span>
              <strong>{character.stats.atk}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#ab47bc' }}>🛡️ Phòng Thủ:</span>
              <strong>{character.stats.def}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#26a69a' }}>⚡ Tốc Độ:</span>
              <strong>{character.stats.spd}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#ffd700' }}>🎯 Tỷ Lệ Chí Mạng:</span>
              <strong>{character.stats.critRate}%</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#8d6e63' }}>🌀 Kháng Hiệu Ứng:</span>
              <strong>{character.stats.resist}</strong>
            </div>
          </div>
        </div>

        {/* Right: Realm & Breakthrough Column */}
        <div style={{ background: '#0f172a', padding: '16px', borderRadius: '8px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ margin: '0 0 12px 0', color: '#c5a059', fontSize: '1rem' }}>Tiến Cảnh Tu Luyện</h3>
            <div className="realm-current-art">
              <img src={realmArtUrl(character.alignment, character.realmIndex, 'crest')} alt="" width="64" height="64" />
              <span>{realmName(character.realmIndex, character.alignment)}<small>{character.alignment === 'DEMONIC' ? 'Ma đạo' : 'Tiên đạo'} · {character.realmTier + 1}/4 tầng</small></span>
            </div>
            <div className="realm-ladder" aria-label={`Mười hai cảnh giới ${character.alignment === 'DEMONIC' ? 'Ma' : 'Tiên'}`}>
              {Array.from({ length: MAX_REALM_INDEX + 1 }, (_, index) => <div key={index}
                className={index === character.realmIndex ? 'current' : index < character.realmIndex ? 'reached' : ''}>
                <img src={realmArtUrl(character.alignment, index, 'crest')} alt="" width="36" height="36" loading="lazy" />
                <span>{realmName(index, character.alignment)}</span>
              </div>)}
            </div>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.5, marginBottom: '16px' }}>
              Chiến đấu và làm nhiệm vụ để tăng cấp. Tích lũy tu vi và linh thạch để đột phá; mỗi lần thử đều có thể thất bại.
            </p>

            <div style={{ background: '#1e293b', padding: '12px', borderRadius: '6px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                <span style={{ color: '#ffd700' }}>Cảnh Giới Hiện Tại:</span>
                <strong>{character.realmName}</strong>
              </div>
              {breakthroughInfo && (
                <>
                  <div className="realm-stages" aria-label="Các tầng của cảnh giới hiện tại">
                    {breakthroughInfo.stages.map((stage) => <span key={stage.name} className={stage.reached ? 'reached' : ''}>{stage.name}</span>)}
                  </div>
                  {breakthroughInfo.requiredLevel > 0 && <p style={{ color: '#d8c18c', fontSize: '0.82rem', margin: '8px 0 0' }}>
                    Tỉ lệ thành công: {Math.round(breakthroughInfo.chance * 100)}%. Thất bại hao 15% tu vi cần cho tầng này.
                    {remainingCooldown > 0 ? ` Tâm mạch hồi phục sau ${remainingCooldown} giây.` : ''}
                  </p>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: '0.82rem', marginTop: 12 }}>
                    <span>Cấp nhân vật</span>
                    <strong style={{ color: breakthroughInfo.currentLevel >= breakthroughInfo.requiredLevel ? '#81c784' : '#f1b96b' }}>
                      {breakthroughInfo.currentLevel}{breakthroughInfo.requiredLevel > 0 ? ` / ${breakthroughInfo.requiredLevel}` : ' (tối đa)'}
                    </strong>
                  </div>
                  <progress aria-label="Kinh nghiệm lên cấp" value={breakthroughInfo.levelExperienceRequired ? breakthroughInfo.levelExperience : 1}
                    max={breakthroughInfo.levelExperienceRequired || 1} style={{ width: '100%', height: 10, accentColor: '#81c784', marginTop: 6 }} />
                  <div style={{ fontSize: '0.76rem', color: '#a9bac9', textAlign: 'right' }}>
                    {breakthroughInfo.levelExperienceRequired
                      ? `${breakthroughInfo.levelExperience.toLocaleString('vi-VN')} / ${breakthroughInfo.levelExperienceRequired.toLocaleString('vi-VN')} EXP lên cấp`
                      : 'Đã đạt cấp tối đa'}
                  </div>
                  {breakthroughInfo.requiredLevel > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: '0.82rem', marginTop: 12 }}>
                    <span>Tu vi tích lũy</span>
                    <strong>{breakthroughInfo.currentExp.toLocaleString('vi-VN')} / {breakthroughInfo.requiredExp.toLocaleString('vi-VN')}</strong>
                  </div>}
                  {breakthroughInfo.requiredLevel > 0 && <progress aria-label="Tiến độ tu vi" value={Math.min(breakthroughInfo.currentExp, breakthroughInfo.requiredExp)}
                    max={breakthroughInfo.requiredExp} style={{ width: '100%', height: 10, accentColor: '#c5a059', marginTop: 6 }} />}
                  {breakthroughInfo.requiredLevel > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: '0.82rem', marginTop: 12 }}>
                    <span>Linh thạch mỗi lần thử</span>
                    <strong style={{ color: breakthroughInfo.currentGold >= breakthroughInfo.requiredGold ? '#81c784' : '#f1b96b' }}>
                      {breakthroughInfo.currentGold.toLocaleString('vi-VN')} / {breakthroughInfo.requiredGold.toLocaleString('vi-VN')}
                    </strong>
                  </div>}
                  <p role="status" style={{ margin: '10px 0 0', color: breakthroughInfo.canBreakthrough ? '#81c784' : '#f1b96b', fontSize: '0.82rem' }}>
                    {breakthroughInfo.message}
                  </p>
                  {breakthroughInfo.requiredLevel > 0 && <p style={{ margin: '10px 0 0', color: '#c5a059', fontSize: '0.82rem' }}>Mốc tiếp: {breakthroughInfo.nextRealmName}</p>}
                  {breakthroughInfo.requiredItems.map((item) => (
                    <div key={item.itemId} style={{ fontSize: '0.8rem', color: item.owned >= item.quantity ? '#81c784' : '#f1b96b', marginTop: 4 }}>
                      {item.name}: {item.owned}/{item.quantity}
                    </div>
                  ))}
                </>
              )}
            </div>
            <p style={{ fontSize: '0.82rem', color: '#a9bac9', lineHeight: 1.5 }}>
              Tăng tu vi bằng nhiệm vụ chính, manh mối ở linh miếu, chiến đấu và đan dược. Khoáng thu được có thể cường hóa trang bị trong Túi.
            </p>
          </div>

          <button
            onClick={handleBreakthrough}
            disabled={breakthroughLoading || !breakthroughInfo?.canBreakthrough || remainingCooldown > 0}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '6px',
              border: 'none',
              background: 'linear-gradient(135deg, #c5a059 0%, #8c6d31 100%)',
              color: '#000',
              fontWeight: 'bold',
              fontSize: '1rem',
              cursor: breakthroughLoading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(197, 160, 89, 0.3)',
            }}
          >
            {breakthroughLoading ? 'Đang Dẫn Động Linh Khí...' : '⚡ Thử Đột Phá Cảnh Giới'}
          </button>
        </div>
      </div>
    </div>
    {breakthroughScene && <UpgradeOutcome subject="realm" success={breakthroughScene.success}
      title={breakthroughScene.success ? 'Đột phá thành công' : 'Tâm mạch dao động'}
      message={breakthroughScene.message}
      avatar={heroAvatarUrl(character.cultivationPath, character.gender, character.alignment, breakthroughScene.realmIndex)}
      effectUrl={realmArtUrl(character.alignment, breakthroughScene.realmIndex, 'breakthrough')}
      onClose={() => setBreakthroughScene(null)} />}
  </>;
}
