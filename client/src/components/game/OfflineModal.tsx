// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - React Offline Cultivation (Bế Quan) Modal
// ============================================================

import React, { useEffect, useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import * as gameApi from '../../api/game';
import { OfflineStatus } from '@shared/index';

export default function OfflineModal() {
  const { setActivePanel, addNotification, loadCharacter } = useGameStore();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<OfflineStatus | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  async function fetchStatus() {
    try {
      setLoading(true);
      const res = await gameApi.getOfflineStatus();
      if (res.success && res.data) {
        setStatus(res.data);
      }
    } catch {
      addNotification('Không thể kiểm tra tu luyện ngoại tuyến', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStatus();
  }, []);

  async function handleClaim() {
    try {
      setActionLoading(true);
      const res = await gameApi.claimOfflineRewards();
      if (res.success && res.data) {
        addNotification(res.data.message || 'Nhận thưởng tu vi thành công!', 'success');
        await loadCharacter();
        setActivePanel(null);
      }
    } catch (err: any) {
      addNotification(err.response?.data?.error || 'Chưa thể nhận thưởng', 'warning');
    } finally {
      setActionLoading(false);
    }
  }

  const hours = status ? Math.floor(status.minutesElapsed / 60) : 0;
  const mins = status ? status.minutesElapsed % 60 : 0;
  const progressRatio = status ? Math.min(100, (status.minutesElapsed / status.maxMinutes) * 100) : 0;

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
    }}>
      <div style={{
        width: '520px',
        background: '#0d131d',
        border: '2px solid #ffd700',
        borderRadius: '12px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 8px 32px rgba(255, 215, 0, 0.2)',
        color: '#e0e0e0',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #37474f', paddingBottom: '12px' }}>
          <div>
            <h2 style={{ margin: 0, color: '#ffd700', fontSize: '1.3rem' }}>
              🧘 Bế Quan Tu Luyện (Vắng Mặt)
            </h2>
            <div style={{ fontSize: '0.8rem', color: '#90a4ae', marginTop: '2px' }}>
              Ngưng thần tĩnh khí, thu nạp linh khí đất trời ngay cả khi rời mạng
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
          <div style={{ padding: '40px', textAlign: 'center', color: '#90a4ae' }}>Đang kết toán linh khí...</div>
        ) : (
          <div style={{ marginTop: '18px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Time progress */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                <span style={{ color: '#cfd8dc' }}>Thời gian tích lũy:</span>
                <span style={{ color: '#ffd700', fontWeight: 'bold' }}>
                  {hours} giờ {mins} phút / 8 giờ tối đa
                </span>
              </div>
              <div style={{ width: '100%', height: '10px', background: '#37474f', borderRadius: '5px', overflow: 'hidden' }}>
                <div style={{ width: `${progressRatio}%`, height: '100%', background: '#ffd700', transition: 'width 0.3s' }} />
              </div>
            </div>

            {/* Accrued Rewards Grid */}
            <div style={{
              background: '#131b26',
              border: '1px solid #37474f',
              borderRadius: '8px',
              padding: '16px',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '10px',
              textAlign: 'center',
            }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#81c784' }}>Tu Vi Đại Đạo</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#81c784', marginTop: '4px' }}>
                  +{status?.cultivationExpEarned || 0}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#64b5f6' }}>Kinh Nghiệm</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#64b5f6', marginTop: '4px' }}>
                  +{status?.expEarned || 0}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#ffd700' }}>Linh Thạch</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#ffd700', marginTop: '4px' }}>
                  +{status?.goldEarned || 0}
                </div>
              </div>
            </div>

            <div style={{ fontSize: '0.8rem', color: '#78909c', textAlign: 'center', lineHeight: '1.4' }}>
              💡 Nâng cấp Tụ Linh Trận tại Động Phủ để tăng tốc độ hấp thụ tu vi ngoại tuyến lên đáng kể.
            </div>

            {/* Claim button */}
            <button
              disabled={actionLoading || !status?.canClaim}
              onClick={handleClaim}
              style={{
                background: status?.canClaim ? '#c5a059' : '#37474f',
                color: status?.canClaim ? '#000' : '#78909c',
                border: 'none',
                padding: '12px',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: status?.canClaim ? 'pointer' : 'not-allowed',
                fontSize: '1rem',
                boxShadow: status?.canClaim ? '0 4px 16px rgba(197, 160, 89, 0.4)' : 'none',
              }}
            >
              {status?.canClaim ? 'Lĩnh Thưởng Bế Quan' : 'Thời gian tích lũy chưa đủ 1 phút'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
