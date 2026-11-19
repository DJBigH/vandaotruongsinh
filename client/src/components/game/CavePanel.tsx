// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - React Cave Abode (Động Phủ & Linh Điền) Panel
// ============================================================

import React, { useEffect, useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import * as gameApi from '../../api/game';
import { FarmSlot, CaveAbodeInfo } from '@shared/index';

export default function CavePanel() {
  const { setActivePanel, addNotification, inventory, loadInventory, loadCharacter } = useGameStore();
  const [loading, setLoading] = useState(true);
  const [caveInfo, setCaveInfo] = useState<CaveAbodeInfo | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Available seeds in inventory
  const seeds = inventory.filter((i) => i.templateId === 'item_053' || i.templateId === 'item_054');

  async function fetchCave() {
    try {
      setLoading(true);
      const res = await gameApi.getCaveInfo();
      if (res.success && res.data) {
        setCaveInfo(res.data);
      }
    } catch {
      addNotification('Không thể tải thông tin động phủ', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCave();
    const interval = setInterval(fetchCave, 10000); // Poll status every 10s
    return () => clearInterval(interval);
  }, []);

  async function handlePlant(slotIndex: number, seedItemId: string) {
    try {
      setActionLoading(true);
      const res = await gameApi.plantSeed(slotIndex, seedItemId);
      if (res.success) {
        addNotification(res.message || 'Gieo hạt thành công!', 'success');
        await fetchCave();
        await loadInventory();
      }
    } catch (err: any) {
      addNotification(err.response?.data?.error || 'Lỗi khi gieo trồng', 'error');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleHarvest(slotIndex: number) {
    try {
      setActionLoading(true);
      const res = await gameApi.harvestCrop(slotIndex);
      if (res.success) {
        addNotification(res.message || 'Thu hoạch thành công!', 'success');
        await fetchCave();
        await loadInventory();
      }
    } catch (err: any) {
      addNotification(err.response?.data?.error || 'Lỗi khi thu hoạch', 'error');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleUpgrade(facility: 'spiritGathering' | 'herbField') {
    try {
      setActionLoading(true);
      const res = await gameApi.upgradeCave(facility);
      if (res.success) {
        addNotification(res.message || 'Nâng cấp thành công!', 'success');
        await fetchCave();
        await Promise.all([loadInventory(), loadCharacter()]);
      }
    } catch (err: any) {
      addNotification(err.response?.data?.error || 'Chưa đủ điều kiện nâng cấp', 'warning');
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
        width: '740px',
        maxHeight: '85vh',
        background: '#0d131d',
        border: '2px solid #81c784',
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
            <h2 style={{ margin: 0, color: '#81c784', fontSize: '1.4rem' }}>
              🏡 Động Phủ & Linh Điền
            </h2>
            <div style={{ fontSize: '0.85rem', color: '#90a4ae', marginTop: '2px' }}>
              Nơi tĩnh dưỡng, tụ tập linh khí trời đất và gieo trồng tiên thảo
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

        {loading && !caveInfo ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#90a4ae' }}>Đang mở cửa động phủ...</div>
        ) : (
          <div style={{ marginTop: '16px', overflowY: 'auto', paddingRight: '6px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Facilities Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {/* Tụ Linh Trận */}
              <div style={{ background: '#131b26', border: '1px solid #37474f', borderRadius: '8px', padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'bold', color: '#64b5f6' }}>🌀 Tụ Linh Trận (Cấp {caveInfo?.spiritGatheringLevel})</span>
                  <button
                    disabled={actionLoading}
                    onClick={() => handleUpgrade('spiritGathering')}
                    style={{
                      background: '#1976d2',
                      color: '#fff',
                      border: 'none',
                      padding: '4px 10px',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                    }}
                  >
                    Nâng Cấp ({caveInfo?.upgradeCosts?.spiritGathering?.gold} 💎)
                  </button>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#90a4ae', marginTop: '4px' }}>
                  Hấp thụ tu vi: +{caveInfo?.passiveExpPerHour} EXP/giờ (Ngoại tuyến)
                </div>
              </div>

              {/* Linh Điền */}
              <div style={{ background: '#131b26', border: '1px solid #37474f', borderRadius: '8px', padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'bold', color: '#81c784' }}>🌱 Linh Điền (Cấp {caveInfo?.herbFieldLevel})</span>
                  <button
                    disabled={actionLoading}
                    onClick={() => handleUpgrade('herbField')}
                    style={{
                      background: '#388e3c',
                      color: '#fff',
                      border: 'none',
                      padding: '4px 10px',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                    }}
                  >
                    Mở Rộng ({caveInfo?.upgradeCosts?.herbField?.gold} 💎)
                  </button>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#90a4ae', marginTop: '4px' }}>
                  Quy mô đất trồng: {caveInfo?.maxFarmSlots} ô linh điền màu mỡ
                </div>
              </div>
            </div>

            {/* Farm Slots Grid */}
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#ffd700', marginBottom: '8px' }}>
                🌾 Danh Sách Ô Đất Trồng
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                {caveInfo?.farmSlots.map((slot, index) => {
                  const isPlanted = Boolean(slot.seedItemId);
                  const isReady = slot.isReady;

                  return (
                    <div
                      key={index}
                      style={{
                        background: isReady ? 'rgba(76, 175, 80, 0.15)' : '#131b26',
                        border: `1px solid ${isReady ? '#81c784' : '#37474f'}`,
                        borderRadius: '8px',
                        padding: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        minHeight: '130px',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#90a4ae' }}>
                          <span>Ô số {index + 1}</span>
                          <span>{isPlanted ? (isReady ? '✅ Đã Chín' : '⏳ Đang Lớn') : 'Trống'}</span>
                        </div>

                        {isPlanted ? (
                          <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <img
                              src="/assets/vnext/icon_item_herb.png"
                              alt="Linh Thảo"
                              style={{ width: '28px', height: '28px', imageRendering: 'pixelated', filter: isReady ? 'none' : 'grayscale(60%)' }}
                            />
                            <div>
                              <div style={{ fontWeight: 'bold', color: isReady ? '#81c784' : '#ffd700', fontSize: '0.92rem' }}>
                                {slot.harvestItemName || 'Linh Thảo'}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#b0bec5', marginTop: '2px' }}>
                                Giống: {slot.seedName}
                              </div>
                              {slot.harvestAt && !isReady && (
                                <div style={{ fontSize: '0.75rem', color: '#ffb74d', marginTop: '4px' }}>
                                  Thu hoạch: {new Date(slot.harvestAt).toLocaleTimeString()}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div style={{ marginTop: '10px', fontSize: '0.85rem', color: '#78909c' }}>
                            Đất hoang chưa gieo giống
                          </div>
                        )}
                      </div>

                      <div style={{ marginTop: '10px' }}>
                        {isReady ? (
                          <button
                            disabled={actionLoading}
                            onClick={() => handleHarvest(index)}
                            style={{
                              width: '100%',
                              background: '#2e7d32',
                              color: '#fff',
                              border: 'none',
                              padding: '6px',
                              borderRadius: '4px',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                            }}
                          >
                            🌾 Thu Hoạch
                          </button>
                        ) : isPlanted ? (
                          <div style={{ fontSize: '0.75rem', color: '#90a4ae', textAlign: 'center', fontStyle: 'italic' }}>
                            Đang hấp thụ linh khí...
                          </div>
                        ) : (
                          seeds.length > 0 ? (
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <select
                                id={`seed-select-${index}`}
                                style={{
                                  flex: 1,
                                  background: '#1e293b',
                                  color: '#fff',
                                  border: '1px solid #37474f',
                                  borderRadius: '4px',
                                  fontSize: '0.75rem',
                                  padding: '4px',
                                }}
                              >
                                {seeds.map((s) => (
                                  <option key={s.id} value={s.templateId}>
                                    {s.name} (x{s.quantity})
                                  </option>
                                ))}
                              </select>
                              <button
                                disabled={actionLoading}
                                onClick={() => {
                                  const sel = document.getElementById(`seed-select-${index}`) as HTMLSelectElement;
                                  if (sel && sel.value) handlePlant(index, sel.value);
                                }}
                                style={{
                                  background: '#c5a059',
                                  color: '#000',
                                  border: 'none',
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  fontWeight: 'bold',
                                  cursor: 'pointer',
                                  fontSize: '0.75rem',
                                }}
                              >
                                Gieo
                              </button>
                            </div>
                          ) : (
                            <div style={{ fontSize: '0.75rem', color: '#ef5350', textAlign: 'center' }}>
                              Hết hạt giống (Mua tại Tông Môn)
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
