// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Map & Teleport Panel
// ============================================================

import React, { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import * as gameApi from '../../api/game';

export default function MapPanel() {
  const { character, currentMap, setActivePanel, addNotification } = useGameStore();
  const teleporting = useRef(false);
  const [isTeleporting, setIsTeleporting] = useState(false);
  const [maps, setMaps] = useState<{ id: string; name: string; discovered: boolean }[]>([]);

  useEffect(() => {
    async function fetchMaps() {
      try {
        const res = await gameApi.getWorldMaps();
        if (res.success && res.data) {
          setMaps(res.data);
        }
      } catch (err) {
        console.error('Lỗi tải danh sách bản đồ:', err);
      }
    }
    fetchMaps();
  }, []);

  const handleTeleport = async (mapId: string, name: string) => {
    if (teleporting.current) return;
    teleporting.current = true;
    setIsTeleporting(true);
    try {
      const res = await gameApi.teleport(mapId);
      if (res.success) {
        addNotification(`Đã dịch chuyển tới ${name}!`, 'success');
        if (useGameStore.getState().activePanel === 'map') setActivePanel(null);
      }
    } catch (err: any) {
      addNotification(err.response?.data?.error || 'Không thể dịch chuyển', 'error');
    } finally {
      teleporting.current = false;
      setIsTeleporting(false);
    }
  };

  return (
    <div role="dialog" aria-labelledby="world-map-heading" style={{
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '640px',
      maxWidth: 'calc(100vw - 32px)',
      maxHeight: 'calc(100vh - 32px)',
      display: 'flex',
      flexDirection: 'column',
      background: 'rgba(15, 23, 42, 0.96)',
      border: '2px solid #c5a059',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 12px 48px rgba(0,0,0,0.85)',
      zIndex: 100,
      color: '#e2e8f0',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexShrink: 0 }}>
        <h2 id="world-map-heading" style={{ margin: 0, color: '#ffd700', fontSize: '1.4rem' }}>🗺️ THẦN CHÂU ĐỊA ĐỒ</h2>
        <button
          onClick={() => setActivePanel(null)}
          aria-label="Đóng bản đồ"
          style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}
        >
          ✕
        </button>
      </div>

      <div style={{ display: 'grid', gap: '12px', minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain' }}>
        {maps.map((m) => {
          const isCurrent = (currentMap?.id ?? character?.currentMapId) === m.id;
          return (
            <div
              key={m.id}
              style={{
                background: isCurrent ? 'rgba(197, 160, 89, 0.15)' : '#1e293b',
                border: isCurrent ? '1px solid #ffd700' : '1px solid #334155',
                borderRadius: '8px',
                padding: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '1.05rem', color: isCurrent ? '#ffd700' : '#e2e8f0' }}>
                  {m.name} {isCurrent && '(Vị trí hiện tại)'}
                </div>
                {m.id === 'map_thanh_khe' && (
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>
                    Khu vực an toàn, có thương nhân, trưởng lão và linh miếu hồi phục.
                  </div>
                )}
                {m.id === 'map_thanh_khe_rung' && (
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>
                    Vùng hoang dã có sói xám và Lang Vương.
                  </div>
                )}
              </div>

              {!isCurrent && (
                <button
                  onClick={() => handleTeleport(m.id, m.name)}
                  disabled={isTeleporting}
                  style={{
                    background: '#c5a059',
                    border: 'none',
                    color: '#000',
                    fontWeight: 'bold',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    cursor: isTeleporting ? 'wait' : 'pointer',
                    flexShrink: 0,
                  }}
                >
                  Dịch Chuyển
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
