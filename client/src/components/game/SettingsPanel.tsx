// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Settings & Help Panel
// ============================================================

import React from 'react';
import { usePresentationSettings } from '../../game/exploration/settings';
import { useGameStore } from '../../stores/gameStore';
import { useAuthStore } from '../../stores/authStore';
import { useNavigate } from 'react-router-dom';

export default function SettingsPanel() {
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const { setActivePanel } = useGameStore();

  const { sfx, reducedEffects, change } = usePresentationSettings();

  const handleLogout = async () => {
    await logout();
    navigate('/');
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
        <h2 style={{ margin: 0, color: '#ffd700', fontSize: '1.4rem' }}>⚙️ THIẾT LẬP & HƯỚNG DẪN</h2>
        <button
          aria-label="Đóng thiết lập"
          onClick={() => setActivePanel(null)}
          style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}
        >
          ✕
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Controls Info */}
        <div style={{ background: '#0f172a', padding: '16px', borderRadius: '8px', border: '1px solid #334155' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#c5a059', fontSize: '1rem' }}>🎮 Phím Điều Khiển</h3>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.9rem', lineHeight: 1.6, color: '#cbd5e1' }}>
            <li><strong>W, A, S, D</strong> hoặc <strong>Phím Mũi Tên</strong>: Di chuyển đạo thân tự do</li>
            <li><strong>Phím E</strong>: Trò chuyện, thu thập vật phẩm hoặc qua cổng khi đứng gần</li>
            <li><strong>Chuột trái</strong> để tấn công theo hướng con trỏ. <strong>1–4</strong> dùng kỹ năng đã trang bị, <strong>Space</strong> để né</li>
            <li><strong>I</strong> mở túi đồ, <strong>M</strong> mở bản đồ</li>
          </ul>
        </div>

        {/* Audio Toggles */}
        <div style={{ display: 'flex', gap: '16px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input type="checkbox" checked={reducedEffects} onChange={(e) => change({reducedEffects: e.target.checked})} />
            <span>Giảm hiệu ứng và tắt rung màn hình</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input type="checkbox" checked={sfx} onChange={(e) => change({sfx: e.target.checked})} />
            <span>Hiệu Ứng Âm Thanh</span>
          </label>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          style={{
            marginTop: '8px',
            padding: '12px',
            background: '#b71c1c',
            border: 'none',
            color: '#fff',
            borderRadius: '6px',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          Đăng Xuất Khỏi Tiên Giới
        </button>
      </div>
    </div>
  );
}
