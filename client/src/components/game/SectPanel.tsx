// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - React Sect (Môn Phái) Panel
// ============================================================

import React, { useEffect, useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import * as gameApi from '../../api/game';

export default function SectPanel() {
  const { setActivePanel, addNotification, loadCharacter, loadInventory } = useGameStore();
  const [loading, setLoading] = useState(true);
  const [sectInfo, setSectInfo] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'missions' | 'shop'>('missions');
  const [actionLoading, setActionLoading] = useState(false);
  const [showSects, setShowSects] = useState(false);

  async function fetchSect() {
    try {
      setLoading(true);
      const res = await gameApi.getSectInfo();
      if (res.success && res.data) {
        setSectInfo(res.data);
      }
    } catch {
      addNotification('Không thể tải thông tin môn phái', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSect();
  }, []);

  async function handleJoin(sectId: string) {
    try {
      setActionLoading(true);
      const res = await gameApi.joinSect(sectId);
      if (res.success) {
        addNotification(res.message || 'Gia nhập môn phái thành công!', 'success');
        await fetchSect();
        setShowSects(false);
        await loadCharacter();
      }
    } catch (err: any) {
      addNotification(err.response?.data?.error || 'Lỗi khi gia nhập', 'error');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCompleteMission(missionId: string) {
    try {
      setActionLoading(true);
      const res = await gameApi.completeSectMission(missionId);
      if (res.success) {
        addNotification(res.message || 'Hoàn thành nhiệm vụ!', 'success');
        await fetchSect();
        await Promise.all([loadCharacter(), loadInventory()]);
      }
    } catch (err: any) {
      addNotification(err.response?.data?.error || 'Chưa đủ điều kiện hoàn thành', 'warning');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleBuy(itemId: string) {
    try {
      setActionLoading(true);
      const res = await gameApi.buySectShop(itemId, 1);
      if (res.success) {
        addNotification(res.message || 'Đổi vật phẩm thành công!', 'success');
        await fetchSect();
        await Promise.all([loadCharacter(), loadInventory()]);
      }
    } catch (err: any) {
      addNotification(err.response?.data?.error || 'Không thể đổi vật phẩm', 'error');
    } finally {
      setActionLoading(false);
    }
  }

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
        width: '680px',
        maxHeight: '85vh',
        background: '#0d131d',
        border: '2px solid #c5a059',
        borderRadius: '12px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
        color: '#e0e0e0',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #37474f', paddingBottom: '12px' }}>
          <div>
            <h2 style={{ margin: 0, color: '#ffd700', fontSize: '1.4rem' }}>
              ⚔️ {sectInfo?.sectName || 'Đại Tông Môn'}
            </h2>
            <div style={{ fontSize: '0.85rem', color: '#90a4ae', marginTop: '2px' }}>
              {sectInfo?.sectId ? `${sectInfo.rankName} | Điểm cống hiến: ${sectInfo.contribution}` : 'Chưa gia nhập môn phái'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {sectInfo?.sectId && <button onClick={() => setShowSects((shown) => !shown)}
            style={{ background: '#243444', border: '1px solid #c5a059', color: '#ffd700', borderRadius: '6px', padding: '7px 10px', cursor: 'pointer' }}>
            {showSects ? 'Về môn phái' : 'Ba môn phái'}
          </button>}
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
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#90a4ae' }}>Đang tải dữ liệu tông môn...</div>
        ) : !sectInfo?.sectId || showSects ? (
          /* Sect Selection View */
          <div style={{ marginTop: '16px', overflowY: 'auto', paddingRight: '8px' }}>
            <p style={{ color: '#cfd8dc', fontSize: '0.9rem', marginBottom: '16px' }}>
              Thiên hạ ba đại tông phái đang mở rộng sơn môn tuyển mộ hiền tài. Hãy lựa chọn môn phái phù hợp với con đường tu đạo của mình:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {sectInfo?.availableSects?.map((sect: any) => (
                <div
                  key={sect.id}
                  style={{
                    background: '#131b26',
                    border: '1px solid #37474f',
                    borderRadius: '8px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#ffd700' }}>{sect.name}</span>
                    <span style={{ fontSize: '0.8rem', color: '#81c784', background: 'rgba(76,175,80,0.15)', padding: '2px 8px', borderRadius: '4px' }}>
                      {sect.specialization}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#b0bec5', lineHeight: '1.4' }}>
                    {sect.description}
                  </p>
                  <div style={{ fontSize: '0.8rem', color: '#ffb74d' }}>
                    ✨ Phúc lợi: {sect.buffDescription}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                    <span style={{ fontSize: '0.8rem', color: '#78909c' }}>Chưởng môn: {sect.leaderName}</span>
                    <button
                      disabled={actionLoading || sectInfo?.sectId === sect.id}
                      onClick={() => handleJoin(sect.id)}
                      style={{
                        background: '#c5a059',
                        color: '#000',
                        border: 'none',
                        padding: '6px 16px',
                        borderRadius: '6px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                      }}
                    >
                      {sectInfo?.sectId === sect.id ? 'Đang Gia Nhập' : 'Bái Nhập Sơn Môn'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Joined Sect View */
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', marginTop: '16px', overflow: 'hidden' }}>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
              <button
                onClick={() => setActiveTab('missions')}
                style={{
                  flex: 1,
                  padding: '8px',
                  background: activeTab === 'missions' ? '#c5a059' : '#1e293b',
                  color: activeTab === 'missions' ? '#000' : '#cfd8dc',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                }}
              >
                📜 Nhiệm Vụ Môn Phái
              </button>
              <button
                onClick={() => setActiveTab('shop')}
                style={{
                  flex: 1,
                  padding: '8px',
                  background: activeTab === 'shop' ? '#c5a059' : '#1e293b',
                  color: activeTab === 'shop' ? '#000' : '#cfd8dc',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                }}
              >
                💎 Tàng Bảo Các (Đổi Đồ)
              </button>
            </div>

            {/* Tab Content */}
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '6px' }}>
              {activeTab === 'missions' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {sectInfo.missions.map((m: any) => (
                    <div
                      key={m.id}
                      style={{
                        background: '#131b26',
                        border: '1px solid #37474f',
                        borderRadius: '8px',
                        padding: '14px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '0.95rem' }}>{m.name}</div>
                        <div style={{ fontSize: '0.85rem', color: '#90a4ae', marginTop: '2px' }}>{m.description}</div>
                        <div style={{ fontSize: '0.8rem', color: '#ffd700', marginTop: '4px' }}>
                          Thưởng: +{m.contributionReward} Cống hiến, +{m.goldReward} Linh thạch
                        </div>
                        {m.requiredItem && <div style={{ fontSize: '0.8rem', color: '#b0bec5', marginTop: '4px' }}>
                          Cần giao: {m.requiredItem.name} ×{m.requiredItem.quantity}
                        </div>}
                      </div>
                      <button
                        disabled={actionLoading || m.completedToday}
                        onClick={() => handleCompleteMission(m.id)}
                        style={{
                          background: '#2e7d32',
                          color: '#fff',
                          border: 'none',
                          padding: '8px 14px',
                          borderRadius: '6px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {m.completedToday ? 'Đã xong hôm nay' : 'Giao Nộp'}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {sectInfo.shopItems.map((item: any) => (
                    <div
                      key={item.itemId}
                      style={{
                        background: '#131b26',
                        border: '1px solid #37474f',
                        borderRadius: '8px',
                        padding: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <img
                          src={item.name.includes('Đan') ? '/assets/vnext/icon_item_pill_gold.png' : item.name.includes('Kiếm') ? '/assets/vnext/icon_item_sword.png' : item.name.includes('Bào') ? '/assets/vnext/icon_item_robe.png' : '/assets/vnext/icon_item_token.png'}
                          alt={item.name}
                          style={{ width: '32px', height: '32px', imageRendering: 'pixelated', background: '#1e293b', padding: '2px', borderRadius: '4px', border: '1px solid #c5a059', flexShrink: 0 }}
                        />
                        <div>
                          <div style={{ fontWeight: 'bold', color: '#ffd700', fontSize: '0.95rem' }}>{item.name}</div>
                          <div style={{ fontSize: '0.8rem', color: '#81c784', marginTop: '2px' }}>
                            Phẩm cấp: {item.quality}
                          </div>
                        </div>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#ffb74d', marginTop: '6px' }}>
                        Giá: {item.priceContribution} Cống hiến
                      </div>
                      <button
                        disabled={actionLoading || sectInfo.contribution < item.priceContribution}
                        onClick={() => handleBuy(item.itemId)}
                        style={{
                          marginTop: '10px',
                          background: sectInfo.contribution >= item.priceContribution ? '#c5a059' : '#37474f',
                          color: sectInfo.contribution >= item.priceContribution ? '#000' : '#78909c',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontWeight: 'bold',
                          cursor: sectInfo.contribution >= item.priceContribution ? 'pointer' : 'not-allowed',
                          fontSize: '0.85rem',
                        }}
                      >
                        Đổi
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
