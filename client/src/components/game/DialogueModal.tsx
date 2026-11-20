// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Dialogue Modal Overlay
// ============================================================

import React from 'react';
import { useGameStore } from '../../stores/gameStore';
import NpcPortrait from './NpcPortrait';

export default function DialogueModal() {
  const { dialogueState, advanceDialogue, selectChoice, closeDialogue } = useGameStore();

  if (!dialogueState || !dialogueState.isOpen) return null;

  const currentLine = dialogueState.lines[dialogueState.currentIndex];
  if (!currentLine) return null;

  const hasChoices = currentLine.choices && currentLine.choices.length > 0;
  const isLastLine = dialogueState.currentIndex >= dialogueState.lines.length - 1;
  const speakerName = currentLine.speaker || dialogueState.npcName || 'Nhân Vật Kỳ Bí';

  return (
    <div style={{
      position: 'absolute',
      bottom: 92,
      left: '50%',
      transform: 'translateX(-50%)',
      width: '780px',
      maxWidth: '92vw',
      maxHeight: 'min(55vh, 430px)',
      overflowY: 'auto',
      boxSizing: 'border-box',
      background: 'rgba(25, 41, 33, 0.97)',
      border: '2px solid #aa9163',
      borderRadius: '4px',
      padding: '20px 24px',
      boxShadow: '0 8px 36px rgba(0,0,0,0.85)',
      zIndex: 200,
      color: '#e7e4d5',
    }}>
      {/* Speaker Name Tag */}
      <div style={{
        display: 'inline-block',
        marginBottom: 8,
        background: '#aa9163',
        color: '#000',
        fontWeight: 'bold',
        fontSize: '0.9rem',
        padding: '4px 14px',
        borderRadius: '4px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
      }}>
        {speakerName}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-start', marginTop: '6px' }}>
        {/* Speaker Avatar Frame */}
        <NpcPortrait speaker={speakerName} spriteKey={dialogueState.npcSpriteKey} />

        {/* Dialogue Body & Actions */}
        <div style={{ flex: '1 1 220px' }}>
          <div style={{
            minHeight: '60px',
            fontSize: '1.05rem',
            lineHeight: 1.6,
            marginBottom: '16px',
            color: '#f0ebd9',
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
                    background: '#26382c',
                    border: '1px solid #aa9163',
                    color: '#f0ebd9',
                    padding: '10px 16px',
                    borderRadius: '6px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '0.95rem',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#3d513c')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#26382c')}
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
