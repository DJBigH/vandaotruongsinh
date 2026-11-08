// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Quest Log Panel
// ============================================================

import React, { useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import * as gameApi from '../../api/game';

export default function QuestPanel() {
  const { quests, activeQuestId, setActiveQuest, loadQuests, loadCharacter, setActivePanel, addNotification } = useGameStore();
  const [filter, setFilter] = useState<'ACTIVE' | 'AVAILABLE' | 'TURNED_IN'>('ACTIVE');

  const filteredQuests = quests.filter((q) => q.status === filter);

  const handleAccept = async (questId: string) => {
    try {
      const res = await gameApi.acceptQuest(questId);
      if (res.success) {
        addNotification('Đã nhận nhiệm vụ mới!', 'success');
        await loadQuests();
        setActiveQuest(questId);
      }
    } catch (err: any) {
      addNotification(err.response?.data?.error || 'Không thể nhận nhiệm vụ', 'error');
    }
  };

  const handleTurnIn = async (questId: string) => {
    try {
      const res = await gameApi.turnInQuest(questId);
      if (res.success) {
        addNotification(res.data?.message || 'Hoàn thành nhiệm vụ!', 'success');
        await loadQuests();
        await loadCharacter();
      }
    } catch (err: any) {
      addNotification(err.response?.data?.error || 'Chưa thể hoàn thành nhiệm vụ', 'error');
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
      height: '500px',
      background: 'rgba(15, 23, 42, 0.96)',
      border: '2px solid #c5a059',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 12px 48px rgba(0,0,0,0.85)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 100,
      color: '#e2e8f0',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ margin: 0, color: '#ffd700', fontSize: '1.4rem' }}>📜 NHIỆM VỤ THIÊN THƯ</h2>
        <button
          onClick={() => setActivePanel(null)}
          style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}
        >
          ✕
        </button>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {[
          { key: 'ACTIVE', label: 'Đang Thực Hiện' },
          { key: 'AVAILABLE', label: 'Có Thể Nhận' },
          { key: 'TURNED_IN', label: 'Đã Hoàn Thành' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as any)}
            style={{
              background: filter === tab.key ? '#c5a059' : '#1e293b',
              color: filter === tab.key ? '#000' : '#cbd5e1',
              border: 'none',
              padding: '6px 14px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Quest List */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredQuests.map((quest) => {
          const isComplete = quest.objectives.every((o) => o.current >= o.required);

          return (
            <div
              key={quest.id}
              style={{
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '16px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontWeight: 'bold', fontSize: '1.05rem', color: '#ffd700' }}>
                  {quest.type === 'MAIN' ? '🌟 [Chính Tuyến]' : '🔹 [Chi Nhánh]'} {quest.name}
                </span>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                  Chương {quest.chapter}
                </span>
              </div>

              <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '10px' }}>
                {quest.description}
              </p>

              {/* Objectives */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '0.8rem', color: '#c5a059', fontWeight: 600, marginBottom: '4px' }}>Mục tiêu:</div>
                {quest.objectives.map((obj, i) => (
                  <div key={i} style={{ fontSize: '0.85rem', color: obj.current >= obj.required ? '#81c784' : '#e2e8f0', marginLeft: '8px' }}>
                    • {obj.description} ({obj.current}/{obj.required})
                  </div>
                ))}
              </div>

              {/* Rewards */}
              <div style={{ fontSize: '0.8rem', color: '#ffa726', marginBottom: '12px' }}>
                Phần thưởng: {quest.rewards.exp} EXP | {quest.rewards.gold} Linh Thạch | {quest.rewards.cultivationExp} Tu Vi
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                {quest.status === 'AVAILABLE' && (
                  <button
                    onClick={() => handleAccept(quest.templateId)}
                    style={{
                      background: '#c5a059',
                      border: 'none',
                      color: '#000',
                      fontWeight: 'bold',
                      padding: '6px 14px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    Tiếp Nhận
                  </button>
                )}

                {quest.status === 'ACTIVE' && (
                  <>
                    <button
                      onClick={() => setActiveQuest(quest.id)}
                      style={{
                        background: activeQuestId === quest.id ? '#1e293b' : '#334155',
                        border: '1px solid #c5a059',
                        color: '#ffd700',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                      }}
                    >
                      {activeQuestId === quest.id ? '✓ Đang Theo Dõi' : 'Theo Dõi'}
                    </button>

                    {isComplete && (
                      <button
                        onClick={() => handleTurnIn(quest.templateId)}
                        style={{
                          background: '#2e7d32',
                          border: 'none',
                          color: '#fff',
                          fontWeight: 'bold',
                          padding: '6px 16px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          boxShadow: '0 0 8px #2e7d32',
                        }}
                      >
                        Nhận Thưởng
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}

        {filteredQuests.length === 0 && (
          <div style={{ textAlign: 'center', color: '#64748b', marginTop: '60px' }}>
            Không có nhiệm vụ nào trong danh mục này.
          </div>
        )}
      </div>
    </div>
  );
}
