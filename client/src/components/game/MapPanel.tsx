// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Map & Teleport Panel
// ============================================================

import React, { useEffect, useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import * as gameApi from '../../api/game';
import { eventBridge } from '../../game/EventBridge';

export default function MapPanel() {
  const { character, setActivePanel, addNotification } = useGameStore();
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

  const handleTeleport = async (mapId: string) => {
    try {
      const res = await gameApi.teleport(mapId);
      if (res.success) {
        addNotification(`Đã dịch chuyển tới ${mapId === 'map_thanh_khe' ? 'Làng Thanh Khê' : 'Rừng Thanh Khê'}!`, 'success');
        eventBridge.emit('teleportMap', mapId);
        setActivePanel(null);
      }
    } catch (err: any) {
      addNotification(err.response?.data?.error || 'Không thể dịch chuyển', 'error');
    }
  };

  return (
    <div style={{
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '640px',
      maxWidth: '92vw',
      background: 'rgba(15, 23, 42, 0.96)',
      border: '2px solid #c5a059',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 12px 48px rgba(0,0,0,0.85)',
      zIndex: 100,
      color: '#e2e8f0',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, color: '#ffd700', fontSize: '1.4rem' }}>🗺️ THẦN CHÂU ĐỊA ĐỒ</h2>
        <button
          onClick={() => setActivePanel(null)}
          style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}
        >
          ✕
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {maps.map((m) => {
          const isCurrent = character?.currentMapId === m.id;
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
              }}
            >
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '1.05rem', color: isCurrent ? '#ffd700' : '#e2e8f0' }}>
                  {m.name} {isCurrent && '(Vị trí hiện tại)'}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>
                  {m.id === 'map_thanh_khe' ? 'Khu vực an toàn, có thương nhân, trưởng lão và linh miếu hồi phục.' : 'Vùng hoang dã nguy hiểm, quái vật hoành hành và có sói chúa nanh đỏ.'}
                </div>
              </div>

              {!isCurrent && (
                <button
                  onClick={() => handleTeleport(m.id)}
                  style={{
                    background: '#c5a059',
                    border: 'none',
                    color: '#000',
                    fontWeight: 'bold',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    cursor: 'pointer',
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
