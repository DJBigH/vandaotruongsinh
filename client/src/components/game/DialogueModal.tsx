// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Dialogue Modal Overlay
// ============================================================

import React from 'react';
import { useGameStore } from '../../stores/gameStore';

const getSpeakerAvatar = (speakerName?: string, npcSpriteKey?: string) => {
  if (npcSpriteKey) {
    if (npcSpriteKey === 'npc_elder') return '/assets/vnext/npc_elder.png';
    if (npcSpriteKey === 'npc_mentor') return '/assets/vnext/npc_mentor.png';
    if (npcSpriteKey === 'npc_guard') return '/assets/vnext/npc_guard.png';
    if (npcSpriteKey === 'npc_healer') return '/assets/vnext/npc_healer.png';
  }
  const name = speakerName || '';
  if (name.includes('Trưởng Lão') || name.includes('Chưởng Môn') || name.includes('Thiên Khế') || name.includes('Ký Ức')) {
    return '/assets/vnext/npc_elder.png';
  }
  if (name.includes('Dược Sĩ') || name.includes('Đan Tôn')) {
    return '/assets/vnext/npc_healer.png';
  }
  if (name.includes('Vệ Binh')) {
    return '/assets/vnext/npc_guard.png';
  }
  if (name.includes('Đạo Sĩ') || name.includes('Kiếm Hồn') || name.includes('Kiếm Tôn')) {
    return '/assets/vnext/npc_mentor.png';
  }
  if (name.includes('U Minh') || name.includes('Quỷ')) {
    return '/assets/vnext/monster_ghost.png';
  }
  if (name.includes('Tháp Linh')) {
    return '/assets/vnext/boss_turtle.png';
  }
  if (name.includes('Sơn Thần') || name.includes('Lang Vương')) {
    return '/assets/vnext/boss_lang_vuong.png';
  }
  return '/assets/vnext/npc_elder.png';
};

export default function DialogueModal() {
  const { dialogueState, advanceDialogue, selectChoice, closeDialogue } = useGameStore();

  if (!dialogueState || !dialogueState.isOpen) return null;

  const currentLine = dialogueState.lines[dialogueState.currentIndex];
  if (!currentLine) return null;

  const hasChoices = currentLine.choices && currentLine.choices.length > 0;
  const isLastLine = dialogueState.currentIndex >= dialogueState.lines.length - 1;
  const speakerName = currentLine.speaker || dialogueState.npcName || 'Nhân Vật Kỳ Bí';
  const avatarUrl = getSpeakerAvatar(speakerName);

  return (
    <div style={{
      position: 'absolute',
      bottom: 92,
      left: '50%',
      transform: 'translateX(-50%)',
      width: '780px',
      maxWidth: '92vw',
      background: 'rgba(15, 23, 42, 0.96)',
      border: '2px solid #c5a059',
      borderRadius: '12px',
      padding: '20px 24px',
      boxShadow: '0 8px 36px rgba(0,0,0,0.85)',
      zIndex: 200,
      color: '#e2e8f0',
    }}>
      {/* Speaker Name Tag */}
      <div style={{
        position: 'absolute',
        top: -16,
        left: 24,
        background: '#c5a059',
        color: '#000',
        fontWeight: 'bold',
        fontSize: '0.9rem',
        padding: '4px 14px',
        borderRadius: '4px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
      }}>
        {speakerName}
      </div>

      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', marginTop: '6px' }}>
        {/* Speaker Avatar Frame */}
        <div style={{
          width: '64px',
          height: '64px',
          flexShrink: 0,
          background: '#1e293b',
          border: '2px solid #ffd700',
          borderRadius: '8px',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
        }}>
          <img
            src={avatarUrl}
            alt={speakerName}
            style={{
              height: '64px',
              maxWidth: 'none',
              imageRendering: 'pixelated',
              objectFit: 'none',
              objectPosition: '0 0',
            }}
          />
        </div>

        {/* Dialogue Body & Actions */}
        <div style={{ flex: 1 }}>
          <div style={{
            minHeight: '60px',
            fontSize: '1.05rem',
            lineHeight: 1.6,
            marginBottom: '16px',
            color: '#f1f5f9',
          }}>
            {currentLine.text}
          </div>

          {/* Choices or Next Button */}
          {hasChoices ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {currentLine.choices!.map((c, idx) => (
                <button
                  key={idx}
                  onClick={() => selectChoice(idx)}
                  style={{
                    background: '#1e293b',
                    border: '1px solid #c5a059',
                    color: '#f8fafc',
                    padding: '10px 16px',
                    borderRadius: '6px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '0.95rem',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#334155')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#1e293b')}
                >
                  ➤ {c.text}
                </button>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={closeDialogue}
                style={{
                  background: 'transparent',
                  border: '1px solid #64748b',
                  color: '#94a3b8',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                }}
              >
                Đóng
              </button>
              <button
                onClick={isLastLine ? closeDialogue : advanceDialogue}
                style={{
                  background: '#c5a059',
                  border: 'none',
                  color: '#000',
                  fontWeight: 'bold',
                  padding: '8px 20px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                }}
              >
                {isLastLine ? 'Kết Thúc' : 'Tiếp Tục ▶'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
