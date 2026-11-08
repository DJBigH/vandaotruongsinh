// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Player Management Component
// ============================================================

import React, { useEffect, useState } from 'react';
import * as adminApi from '../../api/admin';
import type { AdminPlayerInfo, AdminPlayerDetail } from '../../api/admin';

export default function PlayerManager() {
  const [players, setPlayers] = useState<AdminPlayerInfo[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<AdminPlayerDetail | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // Adjust resource modal
  const [adjustGold, setAdjustGold] = useState('');
  const [adjustExp, setAdjustExp] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);

  const fetchPlayers = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getPlayers(page, 10, search);
      if (res.success && res.data) {
        setPlayers(res.data.items);
        setTotal(res.data.total);
      }
    } catch (err) {
      console.error('Lỗi khi tải người chơi:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlayers();
  }, [page, search]);

  const viewDetail = async (id: string) => {
    try {
      const res = await adminApi.getPlayerDetail(id);
      if (res.success && res.data) {
        setSelectedPlayer(res.data);
      }
    } catch (err) {
      alert('Không thể tải chi tiết người chơi');
    }
  };

  const handleBanToggle = async (player: AdminPlayerInfo) => {
    const reason = prompt(player.isBanned ? 'Lý do mở khóa tài khoản:' : 'Lý do khóa tài khoản:');
    if (!reason) return;

    try {
      if (player.isBanned) {
        await adminApi.unbanPlayer(player.id);
      } else {
        await adminApi.banPlayer(player.id, reason);
      }
      await fetchPlayers();
      if (selectedPlayer?.id === player.id) {
        setSelectedPlayer({ ...selectedPlayer, isBanned: !player.isBanned });
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Lỗi thao tác');
    }
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlayer || !adjustReason.trim()) {
      alert('Vui lòng nhập lý do điều chỉnh!');
      return;
    }

    try {
      await adminApi.adjustResources(
        selectedPlayer.id,
        {
          gold: adjustGold ? parseInt(adjustGold) : undefined,
          exp: adjustExp ? parseInt(adjustExp) : undefined,
        },
        adjustReason.trim(),
      );
      alert('Điều chỉnh tài nguyên thành công!');
      setAdjustModalOpen(false);
      setAdjustGold('');
      setAdjustExp('');
      setAdjustReason('');
      viewDetail(selectedPlayer.id);
      fetchPlayers();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Lỗi điều chỉnh');
    }
  };

  return (
    <div>
      <h2 style={{ color: '#ffd700', marginBottom: '20px' }}>👥 QUẢN LÝ NGƯỜI CHƠI</h2>

      {/* Search Input */}
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Tìm theo tên tài khoản, email hoặc tên nhân vật..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            maxWidth: '460px',
            padding: '10px 14px',
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '6px',
            color: '#fff',
            outline: 'none',
          }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedPlayer ? '1fr 340px' : '1fr', gap: '20px' }}>
        {/* Players Table */}
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#0f172a', borderBottom: '1px solid #334155', color: '#94a3b8', fontSize: '0.85rem' }}>
                <th style={{ padding: '12px' }}>Tài Khoản</th>
                <th style={{ padding: '12px' }}>Đạo Hiệu</th>
                <th style={{ padding: '12px' }}>Cấp/Cảnh Giới</th>
                <th style={{ padding: '12px' }}>Linh Thạch</th>
                <th style={{ padding: '12px' }}>Trạng Thái</th>
                <th style={{ padding: '12px' }}>Hành Động</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid #334155', fontSize: '0.9rem' }}>
                  <td style={{ padding: '12px' }}>
                    <div style={{ fontWeight: 600, color: '#fff' }}>{p.username}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{p.email}</div>
                  </td>
                  <td style={{ padding: '12px', color: '#ffd700', fontWeight: 600 }}>
                    {p.character?.name || '(Chưa tạo)'}
                  </td>
                  <td style={{ padding: '12px', color: '#81c784' }}>
                    {p.character ? `Tầng ${p.character.realmTier + 1}` : '-'}
                  </td>
                  <td style={{ padding: '12px' }}>{p.character?.gold ?? 0}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      background: p.isBanned ? 'rgba(239,83,80,0.2)' : 'rgba(76,175,80,0.2)',
                      color: p.isBanned ? '#ef5350' : '#81c784',
                    }}>
                      {p.isBanned ? 'Đã Khóa' : 'Hoạt Động'}
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => viewDetail(p.id)}
                        style={{ background: '#334155', border: 'none', color: '#fff', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                      >
                        Chi Tiết
                      </button>
                      <button
                        onClick={() => handleBanToggle(p)}
                        style={{
                          background: p.isBanned ? '#2e7d32' : '#b71c1c',
                          border: 'none',
                          color: '#fff',
                          padding: '6px 10px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                        }}
                      >
                        {p.isBanned ? 'Mở Khóa' : 'Khóa'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Selected Player Detail Drawer */}
        {selectedPlayer && (
          <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: '#ffd700' }}>Hồ Sơ Tu Sĩ</h3>
              <button onClick={() => setSelectedPlayer(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
              <div><strong>Tài khoản:</strong> {selectedPlayer.username}</div>
              <div><strong>Email:</strong> {selectedPlayer.email}</div>
              <div><strong>Vai trò:</strong> {selectedPlayer.role}</div>
              <div><strong>Lần cuối online:</strong> {new Date(selectedPlayer.lastLogin).toLocaleString()}</div>

              {selectedPlayer.character ? (
                <>
                  <div style={{ borderTop: '1px solid #334155', paddingTop: '10px', color: '#c5a059', fontWeight: 600 }}>
                    Nhân Vật: {selectedPlayer.character.name}
                  </div>
                  <div>Linh Thạch: <strong>{selectedPlayer.character.gold}</strong></div>
                  <div>Trang bị trong túi: {selectedPlayer.character.inventory?.length || 0} món</div>
                  <div>Nhiệm vụ: {selectedPlayer.character.quests?.length || 0} nhiệm vụ</div>

                  <button
                    onClick={() => setAdjustModalOpen(true)}
                    style={{
                      marginTop: '12px',
                      padding: '10px',
                      background: '#c5a059',
                      border: 'none',
                      color: '#000',
                      fontWeight: 'bold',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    🛠️ Điều Chỉnh Tài Nguyên
                  </button>
                </>
              ) : (
                <div style={{ color: '#64748b', marginTop: '10px' }}>Người chơi chưa tạo nhân vật.</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Resource Adjustment Modal */}
      {adjustModalOpen && selectedPlayer && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <form onSubmit={handleAdjustSubmit} style={{
            background: '#1e293b',
            border: '2px solid #c5a059',
            borderRadius: '10px',
            padding: '24px',
            width: '400px',
            maxWidth: '90vw',
          }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#ffd700' }}>Điều Chỉnh Tài Nguyên</h3>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>Số Linh Thạch mới:</label>
              <input
                type="number"
                placeholder={`Hiện tại: ${selectedPlayer.character?.gold}`}
                value={adjustGold}
                onChange={(e) => setAdjustGold(e.target.value)}
                style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '4px' }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px', color: '#ef5350' }}>Lý do điều chỉnh (Bắt buộc):</label>
              <textarea
                required
                rows={3}
                placeholder="Nhập lý do thực hiện thao tác này..."
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '4px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setAdjustModalOpen(false)}
                style={{ padding: '8px 14px', background: 'transparent', border: '1px solid #64748b', color: '#fff', borderRadius: '4px', cursor: 'pointer' }}
              >
                Hủy
              </button>
              <button
                type="submit"
                style={{ padding: '8px 16px', background: '#c5a059', border: 'none', color: '#000', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer' }}
              >
                Xác Nhận Cập Nhật
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
