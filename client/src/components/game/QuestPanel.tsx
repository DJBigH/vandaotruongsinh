// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Quest Log Panel
// ============================================================

import React, { useState } from 'react';
import type { QuestInfo } from '@shared/index';
import { useGameStore } from '../../stores/gameStore';
import * as gameApi from '../../api/game';

const tabs = [
  { key: 'CURRENT', label: 'Đang Thực Hiện' },
  { key: 'AVAILABLE', label: 'Có Thể Nhận' },
  { key: 'TURNED_IN', label: 'Đã Nhận Thưởng' },
] as const;

function isCurrentQuest(quest: QuestInfo) {
  return quest.status === 'ACTIVE' || quest.status === 'COMPLETED';
}

export default function QuestPanel() {
  const { quests, activeQuestId, setActiveQuest, loadQuests, loadCharacter, loadInventory, setActivePanel, addNotification } = useGameStore();
  const [filter, setFilter] = useState<(typeof tabs)[number]['key']>('CURRENT');

  const filteredQuests = quests.filter(quest => filter === 'CURRENT' ? isCurrentQuest(quest) : quest.status === filter)
    .sort((a, b) => Number(b.type === 'MAIN') - Number(a.type === 'MAIN') || a.chapter - b.chapter);
  const nextMain = quests.find((quest) => quest.type === 'MAIN' && isCurrentQuest(quest))
    ?? quests.find((quest) => quest.type === 'MAIN' && quest.status === 'AVAILABLE');

  const handleAccept = async (templateId: string) => {
    try {
      const res = await gameApi.acceptQuest(templateId);
      if (res.success) {
        addNotification('Đã nhận nhiệm vụ mới!', 'success');
        await loadQuests();
        if (res.data?.id) setActiveQuest(res.data.id);
      }
    } catch (err: any) {
      addNotification(err.response?.data?.error || 'Không thể nhận nhiệm vụ', 'error');
    }
  };

  const handleTurnIn = async (quest: QuestInfo) => {
    try {
      const res = await gameApi.turnInQuest(quest.templateId);
      if (res.success) {
        addNotification(res.data?.message || 'Hoàn thành nhiệm vụ!', 'success');
        await Promise.all([loadQuests(), loadCharacter(), loadInventory()]);
        if (useGameStore.getState().activeQuestId === quest.id) setActiveQuest(null);
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
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            aria-pressed={filter === tab.key}
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
      {nextMain && filter !== 'TURNED_IN' && (
        <div style={{ background: 'rgba(197,160,89,0.13)', border: '1px solid #957542', borderRadius: 8,
          padding: '10px 12px', marginBottom: 12, fontSize: '0.85rem', lineHeight: 1.45 }}>
          <strong style={{ color: '#f5d47b' }}>Hành trình chính · Chương {nextMain.chapter}: {nextMain.name}</strong>
          <div style={{ color: '#cfdae2', marginTop: 3 }}>{nextMain.description}</div>
          <div style={{ color: '#a9d5cc', marginTop: 5 }}>
            Tiếp theo: {nextMain.objectives.find((objective) => objective.current < objective.required)?.description ?? 'Nhận thưởng để mở hồi tiếp theo.'}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            <button type="button" onClick={() => setActivePanel('map')} style={{ padding: '5px 9px', background: '#263d42', color: '#e2e8f0', border: '1px solid #547d78', borderRadius: 5, cursor: 'pointer' }}>Xem địa đồ và di tích</button>
            <button type="button" onClick={() => setActivePanel('story')} style={{ padding: '5px 9px', background: '#342d45', color: '#e2e8f0', border: '1px solid #776292', borderRadius: 5, cursor: 'pointer' }}>Đọc sử ký</button>
          </div>
        </div>
      )}
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
                <div style={{ height: 5, borderRadius: 999, background: '#263647', margin: '7px 0 10px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${quest.objectives.length ? quest.objectives.reduce((sum, obj) => sum + Math.min(obj.current / obj.required, 1), 0) / quest.objectives.length * 100 : 0}%`, background: '#c5a059' }} />
                </div>
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

                {isCurrentQuest(quest) && (
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
                        onClick={() => handleTurnIn(quest)}
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
