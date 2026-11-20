// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - React Game HUD Overlay
// ============================================================

import React, { useState, useEffect } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { useAuthStore } from '../../stores/authStore';
import { useNavigate } from 'react-router-dom';
import { AccountRole } from '@shared/index';
import type { Cooldowns } from '../../game/exploration/actions';
import { eventBridge } from '../../game/EventBridge';
type Vitals = { hp: number; maxHp: number; mp: number; maxMp: number };

const emptyCooldowns: Cooldowns = { dodgeRemainingSec: 0, attackRemainingSec: 0, skillsRemainingSec: [] };

export default function HUD() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    character,
    quests,
    activeQuestId,
    activePanel,
    dialogueState,
    setActivePanel,
    setCharacterSlotsOpen,
    notifications,
  } = useGameStore();

  const [menuCollapsed, setMenuCollapsed] = useState(false);
  const [vitals, setVitals] = useState<Vitals | null>(null);
  const [cooldowns, setCooldowns] = useState<Cooldowns>(emptyCooldowns);
  const [prompt, setPrompt] = useState('');
  const [debug, setDebug] = useState('');
  const [worldStatus, setWorldStatus] = useState('');

  useEffect(() => {
    const handleHpMp = (data: Vitals | null) => {
      setVitals(previous => (previous && data && previous.hp === data.hp && previous.mp === data.mp &&
        previous.maxHp === data.maxHp && previous.maxMp === data.maxMp) ? previous : data);
    };
    const handleCds = (data: Cooldowns | null) => {
      const next = data ?? emptyCooldowns;
      setCooldowns(previous => previous.dodgeRemainingSec === next.dodgeRemainingSec &&
        previous.attackRemainingSec === next.attackRemainingSec &&
        previous.skillsRemainingSec.length === next.skillsRemainingSec.length &&
        previous.skillsRemainingSec.every((value, i) => value === next.skillsRemainingSec[i]) ? previous : next);
    };

    eventBridge.on('playerHpMpUpdate', handleHpMp);
    eventBridge.on('cooldownsUpdate', handleCds);
    eventBridge.on('worldPromptUpdate', setPrompt);
    eventBridge.on('worldDebugUpdate', setDebug);
    eventBridge.on('worldStatusUpdate', setWorldStatus);

    return () => {
      eventBridge.off('playerHpMpUpdate', handleHpMp);
      eventBridge.off('cooldownsUpdate', handleCds);
      eventBridge.off('worldPromptUpdate', setPrompt);
      eventBridge.off('worldDebugUpdate', setDebug);
      eventBridge.off('worldStatusUpdate', setWorldStatus);
    };
  }, []);

  const isStaff = user?.role === AccountRole.OWNER || user?.role === AccountRole.GAME_MASTER || user?.role === AccountRole.CONTENT_EDITOR;
  const activeQuest = quests.find((q) => q.id === activeQuestId) || quests.find((q) => q.status === 'ACTIVE');

  const curHp = vitals?.hp ?? character?.stats.hp ?? 100;
  const maxHp = vitals?.maxHp ?? character?.stats.maxHp ?? 100;
  const curMp = vitals?.mp ?? character?.stats.mp ?? 100;
  const maxMp = vitals?.maxMp ?? character?.stats.maxMp ?? 100;

  const hpRatio = maxHp > 0 ? (curHp / maxHp) * 100 : 0;
  const mpRatio = maxMp > 0 ? (curMp / maxMp) * 100 : 0;

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <img
            src={character?.cultivationPath === 'SPELL' ? '/assets/vnext/icon_item_staff.png' : character?.cultivationPath === 'BODY' ? '/assets/vnext/icon_item_fist.png' : '/assets/vnext/icon_item_sword.png'}
            alt="Đạo Thân"
            style={{ width: '36px', height: '36px', imageRendering: 'pixelated', background: '#1e293b', border: '1px solid #ffd700', borderRadius: '6px', padding: '2px', flexShrink: 0 }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 'bold', color: '#ffd700', fontSize: '1rem' }}>
                {character?.name || 'Tu Sĩ'}
              </span>
              <span style={{ fontSize: '0.75rem', color: '#81c784', background: 'rgba(76,175,80,0.15)', padding: '1px 6px', borderRadius: '4px', border: '1px solid rgba(76,175,80,0.3)' }}>
                {character?.realmName || 'Luyện Khí - Sơ Kỳ'}
              </span>
            </div>
          </div>
        </div>

        {/* HP Bar */}
        <div style={{ marginBottom: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#ffcdd2', marginBottom: '2px' }}>
            <span>Sinh Lực</span>
            <span>{Math.round(curHp)} / {maxHp}</span>
          </div>
          <div style={{ width: '100%', height: '8px', background: '#37474f', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${Math.max(0, Math.min(100, hpRatio))}%`, height: '100%', background: '#ef5350', transition: 'width 0.3s' }} />
          </div>
        </div>

        {/* MP Bar */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#bbdefb', marginBottom: '2px' }}>
            <span>Linh Lực</span>
            <span>{Math.round(curMp)} / {maxMp}</span>
          </div>
          <div style={{ width: '100%', height: '6px', background: '#37474f', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${Math.max(0, Math.min(100, mpRatio))}%`, height: '100%', background: '#29b6f6', transition: 'width 0.3s' }} />
          </div>
        </div>
      </div>

      {/* Top Right: Currency, Character Slots & Quick Admin */}
      <div style={{
        pointerEvents: 'auto',
        position: 'absolute',
        top: 16,
        right: 16,
        display: 'flex',
        gap: '10px',
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

        {/* 3 Character Slots Modal Trigger */}
        <button
          onClick={() => setCharacterSlotsOpen(true)}
          title="Quản lý và chuyển đổi 3 Đạo Thân (Nhân vật)"
          style={{
            background: 'linear-gradient(135deg, #1e3a8a, #2563eb)',
            border: '1px solid #60a5fa',
            borderRadius: '8px',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: '#fff',
            fontWeight: 'bold',
            fontSize: '0.85rem',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(37, 99, 235, 0.4)',
            transition: 'all 0.15s',
          }}
        >
          <span>👤</span>
          <span>3 Đạo Thân</span>
        </button>

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
            📜 TIẾN ĐỘ NHIỆM VỤ
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

      {/* Real-time ARPG Action & Cooldown Bar (Luôn ở chính giữa phía dưới, không bị menu che) */}
      <div style={{
        pointerEvents: 'auto',
        position: 'absolute',
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
        background: 'rgba(10, 15, 24, 0.90)',
        border: '1px solid #c5a059',
        borderRadius: '12px',
        padding: '6px 14px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.7)',
        zIndex: 50,
      }}>
        {/* Basic Attack (Left click) */}
        <div
          title="Đánh thường (Chuột trái)"
          style={{
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
            overflow: 'hidden',
          }}
        >
          <img
            src="/assets/vnext/icon_action_attack.png"
            alt="Đánh thường"
            style={{ width: '32px', height: '32px', imageRendering: 'pixelated' }}
          />
          <span style={{ position: 'absolute', bottom: 1, fontSize: '0.6rem', color: '#ffd700', fontWeight: 'bold', textShadow: '0 1px 2px #000' }}>
            L-Click
          </span>
        </div>

        {/* Space Dodge */}
        <div
          title="Thân pháp né đòn (Phím Space)"
          style={{
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
            overflow: 'hidden',
          }}
        >
          <img
            src="/assets/vnext/icon_action_dodge.png"
            alt="Né đòn"
            style={{ width: '32px', height: '32px', imageRendering: 'pixelated' }}
          />
          <span style={{ position: 'absolute', bottom: 1, fontSize: '0.6rem', color: '#99f6e4', fontWeight: 'bold', textShadow: '0 1px 2px #000' }}>
            Space
          </span>
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

        {[1, 2, 3, 4].map(num => {
          const cooldown = cooldowns.skillsRemainingSec[num - 1];
          const learned = cooldown !== undefined;
          const cd = cooldown ?? 0;
          const p = character?.cultivationPath || 'SWORD';
          const skillNames: Record<string, string[]> = {
            SWORD: ['Kiếm Khí Trảm', 'Vạn Kiếm Quy Tông', 'Bạt Kiếm Thuật', 'Kiếm Ý Hộ Thể'],
            SPELL: ['Cửu Thiên Dẫn Lôi', 'Hỏa Phượng Liêu Nguyên', 'Băng Phong Vạn Lý', 'Thái Hư Hộ Thuẫn'],
            BODY: ['Băng Sơn Quyền', 'Bất Hoại Kim Thân', 'Cuồng Long Xuất Hải', 'Huyết Khí Liệt Ba'],
          };
          const skillIcons: Record<string, string[]> = {
            SWORD: [
              '/assets/vnext/icon_skill_sword_slash.png',
              '/assets/vnext/icon_skill_sword_array.png',
              '/assets/vnext/icon_skill_sword_dash.png',
              '/assets/vnext/icon_skill_sword_shield.png',
            ],
            SPELL: [
              '/assets/vnext/icon_skill_spell_thunder.png',
              '/assets/vnext/icon_skill_spell_fire.png',
              '/assets/vnext/icon_skill_spell_ice.png',
              '/assets/vnext/icon_skill_spell_shield.png',
            ],
            BODY: [
              '/assets/vnext/icon_skill_body_punch.png',
              '/assets/vnext/icon_skill_body_iron.png',
              '/assets/vnext/icon_skill_body_roar.png',
              '/assets/vnext/icon_skill_body_wave.png',
            ],
          };
          const skillName = (skillNames[p] && skillNames[p][num - 1]) || `Kỹ năng ${num}`;
          const skillIcon = (skillIcons[p] && skillIcons[p][num - 1]) || '/assets/vnext/icon_skill_sword_slash.png';
          const label = learned ? `${skillName} [Phím ${num}]` : `Ô kỹ năng ${num} · Chưa lĩnh ngộ (Yêu cầu tăng cảnh giới)`;

          return (
            <div
              key={num}
              title={label}
              style={{
                position: 'relative',
                width: '46px',
                height: '46px',
                background: cd > 0 ? '#334155' : '#0f172a',
                border: learned && cd === 0 ? '1px solid #38bdf8' : '1px solid #475569',
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: learned ? 1 : 0.45,
                overflow: 'hidden',
              }}
            >
              {learned ? (
                <img
                  src={skillIcon}
                  alt={skillName}
                  style={{ width: '32px', height: '32px', imageRendering: 'pixelated' }}
                />
              ) : (
                <span style={{ fontSize: '1.1rem', color: '#64748b' }}>–</span>
              )}
              <span style={{
                position: 'absolute',
                bottom: 1,
                fontSize: '0.6rem',
                color: learned ? '#7dd3fc' : '#94a3b8',
                fontWeight: 'bold',
                textShadow: '0 1px 2px #000',
              }}>
                [{num}]
              </span>
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

      {/* System Navigation Dock (Đặt phía trên thanh kỹ năng ở góc phải, đảm bảo không bao giờ che thanh kỹ năng ở màn hình 1366x768) */}
      <div style={{
        pointerEvents: 'auto',
        position: 'absolute',
        bottom: 84,
        right: 16,
        zIndex: 50,
        display: dialogueState?.isOpen ? 'none' : 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '6px',
      }}>
        {/* Toggle Collapse/Expand Button */}
        <button
          onClick={() => setMenuCollapsed(collapsed => !collapsed)}
          aria-expanded={!menuCollapsed}
          aria-controls="game-system-menu"
          style={{
            background: 'rgba(13, 19, 29, 0.92)',
            border: '1px solid #c5a059',
            borderRadius: '20px',
            color: '#ffd700',
            padding: '4px 12px',
            fontSize: '0.75rem',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>{menuCollapsed ? '📜 Mở Menu Hệ Thống' : '🔽 Thu Gọn Menu'}</span>
        </button>

        {/* Menu Items Container (Bố cục 4 cột gọn gàng, bề ngang chỉ 310px, hoàn toàn thoáng đãng) */}
        {!menuCollapsed && (
          <div id="game-system-menu" style={{
            background: 'rgba(13, 19, 29, 0.94)',
            border: '1px solid #37474f',
            borderRadius: '12px',
            padding: '8px 10px',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: '6px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
            width: '344px',
            maxWidth: 'calc(100vw - 32px)',
            maxHeight: 'min(200px, calc(100vh - 130px))',
            overflowY: 'auto',
          }}>
            {[
              { key: 'inventory', label: '🎒 Túi' },
              { key: 'character', label: '🧘 Tu Vi' },
              { key: 'quest', label: '📜 N.Vụ' },
              { key: 'crafting', label: '🔥 Luyện' },
              { key: 'sect', label: '⚔️ Tông' },
              { key: 'cave', label: '🏡 Động' },
              { key: 'pets', label: '🐉 Thú' },
              { key: 'disciple', label: '👥 Đệ Tử' },
              { key: 'offline', label: '⏳ Bế Quan' },
              { key: 'story', label: '📖 Sử Ký' },
              { key: 'tower', label: '🗼 Tháp' },
              { key: 'map', label: '🗺️ Bản Đồ' },
              { key: 'settings', label: '⚙️ Cài Đặt' },
              { key: 'guide', label: '❔ Hướng Dẫn' },
            ].map((btn) => (
              <button
                id={btn.key === 'disciple' ? 'disciple-menu-button' : undefined}
                key={btn.key}
                onClick={() => setActivePanel(activePanel === btn.key ? null : (btn.key as any))}
                style={{
                  background: activePanel === btn.key ? '#c5a059' : '#1e293b',
                  color: activePanel === btn.key ? '#000' : '#cfd8dc',
                  border: '1px solid #334155',
                  padding: '6px 4px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.78rem',
                  minWidth: 0,
                  transition: 'all 0.15s',
                }}
              >
                {btn.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {prompt && (
        <div role="status" style={{
          position: 'absolute', bottom: 88, left: '50%', transform: 'translateX(-50%)',
          maxWidth: 'calc(100vw - 32px)', padding: '8px 16px', borderRadius: 8,
          color: '#ffd700', background: 'rgba(15, 23, 42, 0.9)', textAlign: 'center', fontSize: '0.9rem',
        }}>
          {prompt}
        </div>
      )}

      {debug && (
        <div style={{
          position: 'absolute', top: 136, left: 16, padding: '4px 8px', borderRadius: 4,
          color: '#38bdf8', background: 'rgba(15, 23, 42, 0.75)', font: '12px monospace',
        }}>
          {debug}
        </div>
      )}

      {worldStatus && (
        <div role="status" style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          background: 'rgba(15, 23, 42, 0.9)', color: '#e2e8f0', padding: '12px 20px', borderRadius: 8,
        }}>
          {worldStatus}
        </div>
      )}
    </div>
  );
}
