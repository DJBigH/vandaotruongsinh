// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Admin Audit Log Viewer
// ============================================================

import React, { useEffect, useState } from 'react';
import * as adminApi from '../../api/admin';
import type { AuditLogEntry } from '@shared/index';

export default function AuditLog() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchLogs() {
      setLoading(true);
      try {
        const res = await adminApi.getAuditLogs(page, 15);
        if (res.success && res.data) {
          setLogs(res.data.items);
          setTotal(res.data.total);
        }
      } catch (err) {
        console.error('Lỗi tải nhật ký thao tác:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, [page]);

  return (
    <div>
      <h2 style={{ color: '#ffd700', marginBottom: '20px' }}>🛡️ NHẬT KÝ THAO TÁC QUẢN TRỊ (AUDIT LOGS)</h2>
      <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '16px' }}>
        Toàn bộ thao tác can thiệp dữ liệu, khóa tài khoản và điều chỉnh tài nguyên của ban quản trị đều được máy chủ ghi nhận bất biến.
      </p>

      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#0f172a', borderBottom: '1px solid #334155', color: '#94a3b8', fontSize: '0.85rem' }}>
              <th style={{ padding: '12px' }}>Thời Gian</th>
              <th style={{ padding: '12px' }}>Quản Trị Viên</th>
              <th style={{ padding: '12px' }}>Hành Động</th>
              <th style={{ padding: '12px' }}>Đối Tượng</th>
              <th style={{ padding: '12px' }}>Lý Do Ghi Nhận</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} style={{ borderBottom: '1px solid #334155', fontSize: '0.85rem' }}>
                <td style={{ padding: '12px', color: '#94a3b8' }}>
                  {new Date(log.createdAt).toLocaleString()}
                </td>
                <td style={{ padding: '12px', fontWeight: 600, color: '#ffd700' }}>
                  {log.adminUsername}
                </td>
                <td style={{ padding: '12px' }}>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    color: '#81c784',
                    fontFamily: 'monospace',
                  }}>
                    {log.action}
                  </span>
                </td>
                <td style={{ padding: '12px', fontFamily: 'monospace', color: '#cbd5e1' }}>
                  {log.targetType}:{log.targetId.slice(0, 8)}...
                </td>
                <td style={{ padding: '12px', color: '#e2e8f0' }}>
                  {log.reason}
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                  {loading ? 'Đang tải nhật ký...' : 'Chưa có nhật ký thao tác nào.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
