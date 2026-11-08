// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - React Story Journal (Sử Ký Cốt Truyện) Panel
// ============================================================

import React, { useEffect, useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import * as gameApi from '../../api/game';

export default function StoryJournalPanel() {
  const { setActivePanel, addNotification, loadCharacter } = useGameStore();
  const [loading, setLoading] = useState(true);
  const [chapters, setChapters] = useState<any[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<number>(1);
  const [currentEnding, setCurrentEnding] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  async function fetchStory() {
    try {
      setLoading(true);
      const res = await gameApi.getStoryChapters();
      if (res.success && res.data) {
        setChapters(res.data.chapters || []);
        setCurrentEnding(res.data.currentEnding);
      }
    } catch {
      addNotification('Không thể tải nhật ký cốt truyện', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStory();
  }, []);

  async function handleChooseEnding(endingKey: string) {
    try {
      setActionLoading(true);
      const res = await gameApi.chooseStoryEnding(endingKey);
      if (res.success) {
        addNotification(res.message || 'Đã định đoạt tương lai!', 'success');
        await fetchStory();
        await loadCharacter();
      }
    } catch (err: any) {
      addNotification(err.response?.data?.error || 'Lỗi khi chọn kết cục', 'error');
    } finally {
      setActionLoading(false);
    }
  }

  const currentCh = chapters.find((c) => c.chapter === selectedChapter);

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
    }}>
      <div style={{
        width: '800px',
        maxHeight: '85vh',
        background: '#0d131d',
        border: '2px solid #ffd700',
        borderRadius: '12px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 8px 32px rgba(255, 215, 0, 0.25)',
        color: '#e0e0e0',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #37474f', paddingBottom: '12px' }}>
          <div>
            <h2 style={{ margin: 0, color: '#ffd700', fontSize: '1.4rem' }}>
              📜 Thiên Thư Sử Ký (8 Chương Cốt Truyện)
            </h2>
            <div style={{ fontSize: '0.85rem', color: '#90a4ae', marginTop: '2px' }}>
              Nơi lưu giữ toàn bộ ký ức, chân tướng lịch sử và các sự kiện đã trải qua
            </div>
          </div>
          <button
            onClick={() => setActivePanel(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#b0bec5',
              fontSize: '1.4rem',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#90a4ae' }}>Đang mở cuốn Thiên Thư...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '16px', marginTop: '16px', height: '460px' }}>
            {/* Left: Chapter list */}
            <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
              {chapters.map((ch) => {
                const isSelected = selectedChapter === ch.chapter;
                return (
                  <div
                    key={ch.chapter}
                    onClick={() => setSelectedChapter(ch.chapter)}
                    style={{
                      background: isSelected ? 'rgba(255, 215, 0, 0.15)' : '#131b26',
                      border: `1px solid ${isSelected ? '#ffd700' : '#37474f'}`,
                      borderRadius: '8px',
                      padding: '10px 12px',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '0.85rem', color: isSelected ? '#ffd700' : '#cfd8dc' }}>
                        Chương {ch.chapter}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: ch.isCompleted ? '#81c784' : '#78909c' }}>
                        {ch.isCompleted ? '✅ Xong' : '⏳ Đang làm'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#90a4ae', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {ch.location}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right: Chapter Content & Climax */}
            {currentCh && (
              <div style={{
                background: '#131b26',
                border: '1px solid #37474f',
                borderRadius: '8px',
                padding: '18px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}>
                <div>
                  <h3 style={{ margin: 0, color: '#ffd700', fontSize: '1.2rem' }}>
                    {currentCh.title}
                  </h3>
                  <div style={{ fontSize: '0.85rem', color: '#64b5f6', marginTop: '4px' }}>
                    📍 Địa danh: {currentCh.location}
                  </div>
                </div>

                <div style={{ background: '#1e293b', padding: '12px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#ffb74d', marginBottom: '4px' }}>
                    📖 Tóm Tắt Diễn Biến:
                  </div>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#cfd8dc', lineHeight: '1.5' }}>
                    {currentCh.summary}
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div style={{ background: '#1e293b', padding: '10px', borderRadius: '6px' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#81c784', marginBottom: '2px' }}>
                      ⚡ Sự Kiện Mở Đầu:
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#b0bec5' }}>
                      {currentCh.openingEvent}
                    </div>
                  </div>
                  <div style={{ background: '#1e293b', padding: '10px', borderRadius: '6px' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#ef5350', marginBottom: '2px' }}>
                      🔥 Cao Trào & Thử Thách:
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#b0bec5' }}>
                      {currentCh.climaxEvent}
                    </div>
                  </div>
                </div>

                {/* Major NPCs */}
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#ffd700', marginBottom: '6px' }}>
                    👥 Nhân Vật Then Chốt:
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {currentCh.majorNPCs?.map((npc: any, idx: number) => (
                      <div key={idx} style={{ background: '#1e293b', padding: '8px 10px', borderRadius: '6px', fontSize: '0.8rem' }}>
                        <span style={{ fontWeight: 'bold', color: '#64b5f6' }}>{npc.name}</span>{' '}
                        <span style={{ color: '#ffb74d' }}>({npc.role})</span>: <span style={{ color: '#b0bec5' }}>{npc.description}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Ending Selection if Chapter 8 */}
                {currentCh.chapter === 8 && (
                  <div style={{ borderTop: '1px solid #37474f', paddingTop: '14px', marginTop: '6px' }}>
                    <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#ffd700', marginBottom: '8px' }}>
                      🌟 3 Đại Kết Cục Vận Mệnh Thế Giới:
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {[
                        { key: 'MAINTAIN_PACT', label: '1. Duy Trì Thiên Khế (Thuận Thiên)', desc: 'Bảo vệ linh mạch trường tồn, giữ trật tự cổ xưa.' },
                        { key: 'DESTROY_PACT', label: '2. Phá Bỏ Thiên Khế (Nghịch Thiên)', desc: 'Giải phóng toàn bộ ký ức đã mất cho muôn vạn sinh linh.' },
                        { key: 'REWRITE_PACT', label: '3. Viết Lại Thiên Khế: Vạn Đạo Trường Sinh', desc: 'Dung hợp ký ức và linh mạch, nhân loại làm chủ vận mệnh.' },
                      ].map((endOpt) => (
                        <div
                          key={endOpt.key}
                          style={{
                            background: currentEnding === endOpt.key ? 'rgba(255, 215, 0, 0.2)' : '#1e293b',
                            border: `1px solid ${currentEnding === endOpt.key ? '#ffd700' : '#37474f'}`,
                            padding: '10px',
                            borderRadius: '6px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 'bold', color: '#ffd700', fontSize: '0.85rem' }}>{endOpt.label}</div>
                            <div style={{ fontSize: '0.75rem', color: '#90a4ae' }}>{endOpt.desc}</div>
                          </div>
                          <button
                            disabled={actionLoading}
                            onClick={() => handleChooseEnding(endOpt.key)}
                            style={{
                              background: currentEnding === endOpt.key ? '#2e7d32' : '#c5a059',
                              color: currentEnding === endOpt.key ? '#fff' : '#000',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: '4px',
                              fontWeight: 'bold',
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                            }}
                          >
                            {currentEnding === endOpt.key ? 'Đã Chọn' : 'Định Đoạt'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
