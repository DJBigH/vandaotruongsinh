// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - React Game HUD Overlay
// ============================================================

import React, { useState, useEffect } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { useAuthStore } from '../../stores/authStore';
import { useNavigate } from 'react-router-dom';
import { AccountRole } from '@shared/index';
import { eventBridge } from '../../game/EventBridge';
import CharacterSlotsModal from './CharacterSlotsModal';

export default function HUD() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    character,
    quests,
    activeQuestId,
    activePanel,
    setActivePanel,
    notifications,
  } = useGameStore();

  const [showSlotsModal, setShowSlotsModal] = useState(false);
  const [realtimeHp, setRealtimeHp] = useState<number | null>(null);
  const [realtimeMp, setRealtimeMp] = useState<number | null>(null);
  const [cooldowns, setCooldowns] = useState<{
    dodgeRemainingSec: number;
    attackRemainingSec: number;
    skillsRemainingSec: number[];
  }>({
    dodgeRemainingSec: 0,
    attackRemainingSec: 0,
    skillsRemainingSec: [0, 0, 0, 0],
  });

  useEffect(() => {
    const handleHpMp = (data: { hp: number; maxHp: number; mp: number; maxMp: number }) => {
      setRealtimeHp(data.hp);
      setRealtimeMp(data.mp);
    };

    const handleCds = (cds: any) => {
      setCooldowns(cds);
    };

    eventBridge.on('playerHpMpUpdate', handleHpMp);
    eventBridge.on('cooldownsUpdate', handleCds);

    return () => {
      eventBridge.off('playerHpMpUpdate', handleHpMp);
      eventBridge.off('cooldownsUpdate', handleCds);
    };
  }, []);

  const isStaff = user?.role === AccountRole.OWNER || user?.role === AccountRole.GAME_MASTER || user?.role === AccountRole.CONTENT_EDITOR;
  const activeQuest = quests.find((q) => q.id === activeQuestId) || quests.find((q) => q.status === 'ACTIVE');

  const curHp = realtimeHp ?? character?.stats.hp ?? 100;
  const maxHp = character?.stats.maxHp ?? 100;
  const curMp = realtimeMp ?? character?.stats.mp ?? 100;
  const maxMp = character?.stats.maxMp ?? 100;

  const hpRatio = (curHp / maxHp) * 100;
  const mpRatio = (curMp / maxMp) * 100;

  return (
    <div style={{ pointerEvents: 'none', position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {/* Top Left: Character Profile & Vitals */}
      <div style={{
        pointerEvents: 'auto',
        position: 'absolute',
        top: 16,
        left: 16,
        background: 'rgba(13, 19, 29, 0.85)',
        border: '1px solid #c5a059',
        borderRadius: '8px',
        padding: '12px 16px',
        minWidth: '240px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <span style={{ fontWeight: 'bold', color: '#ffd700', fontSize: '1rem' }}>
            {character?.name || 'Tu Sĩ'}
          </span>
          <span style={{ fontSize: '0.8rem', color: '#81c784', background: 'rgba(76,175,80,0.15)', padding: '2px 6px', borderRadius: '4px' }}>
            {character?.realmName || 'Luyện Khí - Sơ Kỳ'}
          </span>
        </div>

        {/* HP Bar */}
        <div style={{ marginBottom: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#ffcdd2', marginBottom: '2px' }}>
            <span>Sinh Lực</span>
            <span>{character?.stats.hp} / {character?.stats.maxHp}</span>
          </div>
          <div style={{ width: '100%', height: '8px', background: '#37474f', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${Math.max(0, Math.min(100, hpRatio))}%`, height: '100%', background: '#ef5350', transition: 'width 0.3s' }} />
          </div>
        </div>

        {/* MP Bar */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#bbdefb', marginBottom: '2px' }}>
            <span>Linh Lực</span>
            <span>{character?.stats.mp} / {character?.stats.maxMp}</span>
          </div>
          <div style={{ width: '100%', height: '6px', background: '#37474f', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${Math.max(0, Math.min(100, mpRatio))}%`, height: '100%', background: '#29b6f6', transition: 'width 0.3s' }} />
          </div>
        </div>
      </div>

      {/* Top Right: Currency & Quick Admin */}
      <div style={{
        pointerEvents: 'auto',
        position: 'absolute',
        top: 16,
        right: 16,
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
      }}>
        <div style={{
          background: 'rgba(13, 19, 29, 0.85)',
          border: '1px solid #c5a059',
          borderRadius: '8px',
          padding: '8px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#ffd700',
          fontWeight: 'bold',
          fontSize: '0.95rem',
        }}>
          <span>💎</span>
          <span>{character?.gold ?? 0}</span>
          <span style={{ fontSize: '0.75rem', color: '#cfd8dc' }}>Linh Thạch</span>
        </div>

        {isStaff && (
          <button
            onClick={() => navigate('/admin')}
            style={{
              background: '#b71c1c',
              border: '1px solid #ff5252',
              color: '#fff',
              padding: '8px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem',
            }}
          >
            Quản Trị (Admin)
          </button>
        )}
      </div>

      {/* Right: Quest Tracker */}
      {activeQuest && (
        <div style={{
          pointerEvents: 'auto',
          position: 'absolute',
          top: 80,
          right: 16,
          background: 'rgba(13, 19, 29, 0.85)',
          border: '1px solid #37474f',
          borderRadius: '8px',
          padding: '12px 14px',
          maxWidth: '260px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        }}>
          <div style={{ fontSize: '0.8rem', color: '#c5a059', fontWeight: 'bold', marginBottom: '4px' }}>
            📜 NHIỆM VỤ ĐANG LÀM
          </div>
          <div style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 600, marginBottom: '6px' }}>
            {activeQuest.name}
          </div>
          {activeQuest.objectives.map((obj, i) => (
            <div key={i} style={{ fontSize: '0.8rem', color: obj.current >= obj.required ? '#81c784' : '#b0bec5', marginBottom: '2px' }}>
              • {obj.description}: {obj.current}/{obj.required}
            </div>
          ))}
        </div>
      )}

      {/* Notifications overlay */}
      <div style={{
        position: 'absolute',
        top: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        alignItems: 'center',
      }}>
        {notifications.map((n) => (
          <div
            key={n.id}
            style={{
              background: 'rgba(0, 0, 0, 0.85)',
              border: '1px solid #ffd700',
              color: '#ffd700',
              padding: '8px 18px',
              borderRadius: '20px',
              fontSize: '0.9rem',
              fontWeight: 'bold',
              boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
            }}
          >
            {n.message}
          </div>
        ))}
      </div>

      {/* Real-time ARPG Action & Cooldown Bar */}
      <div style={{
        pointerEvents: 'auto',
        position: 'absolute',
        bottom: 74,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
        background: 'rgba(10, 15, 24, 0.85)',
        border: '1px solid #c5a059',
        borderRadius: '12px',
        padding: '6px 12px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
      }}>
        {/* Basic Attack (Left click) */}
        <div style={{
          position: 'relative',
          width: '46px',
          height: '46px',
          background: '#1e293b',
          border: '1px solid #ffd700',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}>
          <span style={{ fontSize: '1.2rem' }}>⚔️</span>
          <span style={{ fontSize: '0.65rem', color: '#ffd700', fontWeight: 'bold' }}>L-Click</span>
        </div>

        {/* Space Dodge */}
        <div style={{
          position: 'relative',
          width: '46px',
          height: '46px',
          background: cooldowns.dodgeRemainingSec > 0 ? '#334155' : '#0f766e',
          border: '1px solid #14b8a6',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <span style={{ fontSize: '1.1rem' }}>💨</span>
          <span style={{ fontSize: '0.65rem', color: '#99f6e4', fontWeight: 'bold' }}>Space</span>
          {cooldowns.dodgeRemainingSec > 0 && (
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.7)',
              borderRadius: '7px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffd700',
              fontWeight: 'bold',
              fontSize: '0.85rem',
            }}>
              {cooldowns.dodgeRemainingSec}s
            </div>
          )}
        </div>

        {/* Skills 1, 2, 3, 4 */}
        {[1, 2, 3, 4].map((num, idx) => {
          const cd = cooldowns.skillsRemainingSec[idx] ?? 0;
          return (
            <div
              key={num}
              style={{
                position: 'relative',
                width: '46px',
                height: '46px',
                background: cd > 0 ? '#334155' : '#1e1b4b',
                border: '1px solid #818cf8',
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ fontSize: '1.1rem' }}>{num === 1 ? '⚡' : num === 2 ? '🔥' : num === 3 ? '❄️' : '🌟'}</span>
              <span style={{ fontSize: '0.65rem', color: '#c7d2fe', fontWeight: 'bold' }}>[{num}]</span>
              {cd > 0 && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(0,0,0,0.7)',
                  borderRadius: '7px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffd700',
                  fontWeight: 'bold',
                  fontSize: '0.85rem',
                }}>
                  {cd}s
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Menu Navigation Bar */}
      <div style={{
        pointerEvents: 'auto',
        position: 'absolute',
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(13, 19, 29, 0.9)',
        border: '1px solid #c5a059',
        borderRadius: '30px',
        padding: '6px 14px',
        display: 'flex',
        gap: '10px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
      }}>
        {[
          { key: 'inventory', label: '🎒 Túi Đồ' },
          { key: 'character', label: '🧘 Tu Vi' },
          { key: 'quest', label: '📜 Nhiệm Vụ' },
          { key: 'crafting', label: '🔥 Luyện Chế' },
          { key: 'sect', label: '⚔️ Tông Môn' },
          { key: 'cave', label: '🏡 Động Phủ' },
          { key: 'pets', label: '🐉 Linh Thú' },
          { key: 'offline', label: '⏳ Bế Quan' },
          { key: 'story', label: '📖 Sử Ký' },
          { key: 'tower', label: '🗼 Trấn Yêu' },
          { key: 'map', label: '🗺️ Bản Đồ' },
          { key: 'settings', label: '⚙️ Cài Đặt' },
        ].map((btn) => (
          <button
            key={btn.key}
            onClick={() => setActivePanel(activePanel === btn.key ? null : (btn.key as any))}
            style={{
              background: activePanel === btn.key ? '#c5a059' : 'transparent',
              color: activePanel === btn.key ? '#000' : '#cfd8dc',
              border: 'none',
              padding: '8px 14px',
              borderRadius: '20px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '0.85rem',
              transition: 'all 0.2s',
            }}
          >
            {btn.label}
          </button>
        ))}

        {/* 3 Character Slots Switcher button */}
        <button
          onClick={() => setShowSlotsModal(true)}
          style={{
            background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)',
            color: '#fff',
            border: '1px solid #60a5fa',
            padding: '8px 14px',
            borderRadius: '20px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '0.85rem',
            boxShadow: '0 2px 8px rgba(59, 130, 246, 0.4)',
          }}
        >
          👤 3 Đạo Thân
        </button>
      </div>

      {/* 3 Character Slots Modal */}
      {showSlotsModal && (
        <CharacterSlotsModal onClose={() => setShowSlotsModal(false)} />
      )}
    </div>
  );
}
