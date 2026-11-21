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
import { heroAvatarUrl } from '../../game/assets/hero-variants';
import { getSkills, type SkillInfo } from '../../api/game';
import { skillIcon } from '../../game/assets/skillIcon';
import GameMenu from './GameMenu';
type Vitals = { hp: number; maxHp: number; mp: number; maxMp: number };

const emptyCooldowns: Cooldowns = { dodgeRemainingSec: 0, attackRemainingSec: 0, skillsRemainingSec: [] };

export default function HUD() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    character,
    quests,
    activeQuestId,
    setCharacterSlotsOpen,
    notifications,
  } = useGameStore();

  const [vitals, setVitals] = useState<Vitals | null>(null);
  const [cooldowns, setCooldowns] = useState<Cooldowns>(emptyCooldowns);
  const [prompt, setPrompt] = useState('');
  const [debug, setDebug] = useState('');
  const [worldStatus, setWorldStatus] = useState('');
  const [learnedSkills, setLearnedSkills] = useState<SkillInfo[]>([]);

  useEffect(() => {
    let live = true;
    const refresh = () => { void getSkills().then((response) => {
      if (live && response.success) setLearnedSkills(response.data?.skills ?? []);
    }).catch(() => { if (live) setLearnedSkills([]); }); };
    if (character?.id) refresh();
    eventBridge.on('skillsChanged', refresh);
    eventBridge.on('worldProgressCommitted', refresh);
    return () => { live = false; eventBridge.off('skillsChanged', refresh); eventBridge.off('worldProgressCommitted', refresh); };
  }, [character?.id]);

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
  const heroPreview = character ? heroAvatarUrl(character.cultivationPath,
    character.gender ?? 'MALE', character.alignment ?? 'IMMORTAL', character.realmIndex) : null;

  return (
    <div className="game-hud" style={{ pointerEvents: 'none', position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {/* Top Left: Character Profile & Vitals */}
      <div style={{
        pointerEvents: 'auto',
        position: 'absolute',
        top: 16,
        left: 16,
        background: 'rgba(13, 19, 29, 0.85)',
        border: '1px solid #aa9163',
        borderRadius: '8px',
        padding: '12px 16px',
        minWidth: '240px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <img
            src={heroPreview ?? '/assets/vnext/icon_item_sword.png'}
            alt={`Chân dung ${character?.name ?? 'đạo thân'}`}
            style={{ width: '46px', height: '46px', objectFit: 'contain', imageRendering: 'pixelated', background: '#24372c', border: '1px solid #aa9163', borderRadius: '3px', padding: '2px', flexShrink: 0 }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 'bold', color: '#dfc38a', fontSize: '1rem' }}>
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
            <div style={{ width: `${Math.max(0, Math.min(100, hpRatio))}%`, height: '100%', background: '#b76b61', transition: 'width 0.3s' }} />
          </div>
        </div>

        {/* MP Bar */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#bbdefb', marginBottom: '2px' }}>
            <span>Linh Lực</span>
            <span>{Math.round(curMp)} / {maxMp}</span>
          </div>
          <div style={{ width: '100%', height: '6px', background: '#37474f', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${Math.max(0, Math.min(100, mpRatio))}%`, height: '100%', background: '#6e9cb0', transition: 'width 0.3s' }} />
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
          border: '1px solid #aa9163',
          borderRadius: '8px',
          padding: '8px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#dfc38a',
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
            background: '#35544a',
            border: '1px solid #90a987',
            borderRadius: '8px',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: '#fff',
            fontWeight: 'bold',
            fontSize: '0.85rem',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.28)',
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
          <div style={{ fontSize: '0.8rem', color: '#aa9163', fontWeight: 'bold', marginBottom: '4px' }}>
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
              border: '1px solid #dfc38a',
              color: '#dfc38a',
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
        border: '1px solid #aa9163',
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
            background: '#26362f',
            border: '1px solid #dfc38a',
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
          <span style={{ position: 'absolute', bottom: 1, fontSize: '0.6rem', color: '#dfc38a', fontWeight: 'bold', textShadow: '0 1px 2px #000' }}>
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
            background: cooldowns.dodgeRemainingSec > 0 ? '#4f5d52' : '#345b4d',
            border: '1px solid #8cae93',
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
              color: '#dfc38a',
              fontWeight: 'bold',
              fontSize: '0.85rem',
            }}>
              {cooldowns.dodgeRemainingSec}s
            </div>
          )}
        </div>

        {[1, 2, 3, 4].map(num => {
          const cooldown = cooldowns.skillsRemainingSec[num - 1];
          const skill = learnedSkills.find((entry) => entry.equipSlot === num);
          const learned = !!skill;
          const cd = cooldown ?? 0;
          const skillName = skill?.name ?? `Ô chiêu ${num}`;
          const icon = skill ? skillIcon(skill.id) : '';
          const label = learned ? `${skillName} [Phím ${num}]` : `Ô chiêu ${num} · Mở Bí Kíp để học và trang bị`;

          return (
            <div
              key={num}
              title={label}
              style={{
                position: 'relative',
                width: '46px',
                height: '46px',
                background: cd > 0 ? '#4f5d52' : '#182620',
                border: learned && cd === 0 ? '1px solid #b7a474' : '1px solid #475569',
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
                  src={icon}
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
                color: learned ? '#d0bc8c' : '#94a3b8',
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
                  color: '#dfc38a',
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

      <GameMenu />

      {prompt && (
        <div role="status" style={{
          position: 'absolute', bottom: 88, left: '50%', transform: 'translateX(-50%)',
          maxWidth: 'calc(100vw - 32px)', padding: '8px 16px', borderRadius: 8,
          color: '#dfc38a', background: 'rgba(15, 23, 42, 0.9)', textAlign: 'center', fontSize: '0.9rem',
        }}>
          {prompt}
        </div>
      )}

      {debug && (
        <div style={{
          position: 'absolute', top: 136, left: 16, padding: '4px 8px', borderRadius: 4,
          color: '#b7a474', background: 'rgba(15, 23, 42, 0.75)', font: '12px monospace',
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
