// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Admin Dashboard Overview
// ============================================================

import React, { useEffect, useState } from 'react';
import * as adminApi from '../../api/admin';
import type { AdminDashboard as DashboardData } from '@shared/index';

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await adminApi.getDashboard();
        if (res.success && res.data) {
          setData(res.data);
        }
      } catch (err) {
        console.error('Lỗi tải dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  if (loading) return <div>Đang tải thông số vận hành...</div>;
  if (!data) return <div>Không có dữ liệu thống kê.</div>;

  return (
    <div>
      <h2 style={{ color: '#ffd700', marginBottom: '20px' }}>📊 TỔNG QUAN HỆ THỐNG</h2>

      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '20px' }}>
          <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '8px' }}>Tổng Người Chơi Đăng Ký</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ffd700' }}>{data.totalPlayers}</div>
        </div>
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '20px' }}>
          <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '8px' }}>Hoạt Động Trong 24h</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#81c784' }}>{data.activePlayers24h}</div>
        </div>
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '20px' }}>
          <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '8px' }}>Trạng Thái Dịch Vụ</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#4fc3f7', marginTop: '6px' }}>🟢 Hoạt động bình thường</div>
        </div>
      </div>

      {/* Realm Distribution */}
      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '20px', marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: '#c5a059' }}>Phân Bố Cảnh Giới Tu Sĩ</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
          {Object.entries(data.realmDistribution).map(([realm, count]) => (
            <div key={realm} style={{ background: '#0f172a', padding: '12px', borderRadius: '6px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '4px' }}>{realm}</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#fff' }}>{count}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Boss Kills */}
      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '20px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: '#ef5350' }}>Thống Kê Tiêu Diệt Boss</h3>
        {data.bossKills.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8', fontSize: '0.9rem' }}>
                <th style={{ padding: '8px' }}>Mã Boss</th>
                <th style={{ padding: '8px' }}>Tên Boss</th>
                <th style={{ padding: '8px' }}>Số Lần Bị Hạ</th>
              </tr>
            </thead>
            <tbody>
              {data.bossKills.map((b) => (
                <tr key={b.bossId} style={{ borderBottom: '1px solid #1e293b' }}>
                  <td style={{ padding: '10px 8px' }}>{b.bossId}</td>
                  <td style={{ padding: '10px 8px', fontWeight: 'bold', color: '#ffd700' }}>{b.bossName}</td>
                  <td style={{ padding: '10px 8px' }}>{b.kills}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ color: '#64748b' }}>Chưa có lượt hạ Boss nào được ghi nhận.</div>
        )}
      </div>
    </div>
  );
}
