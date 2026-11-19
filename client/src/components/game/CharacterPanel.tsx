// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Character & Cultivation Panel
// ============================================================

import React, { useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import * as gameApi from '../../api/game';
import { CultivationPath, CULTIVATION_PATH_NAMES } from '@shared/index';

export default function CharacterPanel() {
  const { character, loadCharacter, setActivePanel, addNotification } = useGameStore();
  const [breakthroughLoading, setBreakthroughLoading] = useState(false);

  if (!character) return null;

  const handleBreakthrough = async () => {
    setBreakthroughLoading(true);
    try {
      const res = await gameApi.attemptBreakthrough(character);
      if (res.success && res.data) {
        addNotification(res.data.message || 'Đột phá thành công!', 'success');
        await loadCharacter();
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

  return (
    <div style={{
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '740px',
      maxWidth: '92vw',
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
          <img
            src={character.cultivationPath === CultivationPath.SWORD ? '/assets/vnext/icon_item_sword.png' : character.cultivationPath === CultivationPath.SPELL ? '/assets/vnext/icon_item_staff.png' : '/assets/vnext/icon_item_fist.png'}
            alt="Đạo Thân"
            style={{ width: '40px', height: '40px', imageRendering: 'pixelated', background: '#1e293b', border: '1px solid #ffd700', borderRadius: '6px', padding: '3px' }}
          />
          <div>
            <h2 style={{ margin: 0, color: '#ffd700', fontSize: '1.4rem' }}>🧘 TU VI & ĐẠO THÂN</h2>
            <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
              {CULTIVATION_PATH_NAMES[character.cultivationPath]} • {character.realmName}
            </span>
          </div>
        </div>
        <button
          onClick={() => setActivePanel(null)}
          style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}
        >
          ✕
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
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
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.5, marginBottom: '16px' }}>
              Hấp thu thiên địa linh khí thông qua chiến đấu, làm nhiệm vụ và dùng đan dược. Khi tu vi viên mãn, có thể dẫn động lôi kiếp đột phá cảnh giới mới.
            </p>

            <div style={{ background: '#1e293b', padding: '12px', borderRadius: '6px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                <span style={{ color: '#ffd700' }}>Cảnh Giới Hiện Tại:</span>
                <strong>{character.realmName}</strong>
              </div>
            </div>
          </div>

          <button
            onClick={handleBreakthrough}
            disabled={breakthroughLoading}
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
  );
}
