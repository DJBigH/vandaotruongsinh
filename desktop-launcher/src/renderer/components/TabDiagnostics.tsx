import React from 'react';
import { DiagnosticReport } from '../../shared/types';

interface TabDiagnosticsProps {
  report: DiagnosticReport | null;
  onRunDiagnostics: () => void;
  isRunning: boolean;
}

export const TabDiagnostics: React.FC<TabDiagnosticsProps> = ({
  report,
  onRunDiagnostics,
  isRunning,
}) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PASS':
        return <span style={{ color: '#10b981', fontWeight: 700 }}>✅ ĐẠT</span>;
      case 'WARN':
        return <span style={{ color: '#f59e0b', fontWeight: 700 }}>⚠️ CẢNH BÁO</span>;
      case 'FAIL':
        return <span style={{ color: '#ef4444', fontWeight: 700 }}>❌ THẤT BẠI</span>;
      default:
        return <span style={{ color: '#94a3b8' }}>◌ Đang kiểm tra...</span>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--accent-gold)' }}>
            🩺 CHẨN ĐOÁN MÔI TRƯỜNG & HẠ TẦNG HỆ THỐNG
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Tự động kiểm tra tính toàn vẹn của mã nguồn, Node.js runtime, cơ sở dữ liệu và cổng mạng.
          </div>
        </div>

        <button
          className="btn btn-primary"
          onClick={onRunDiagnostics}
          disabled={isRunning}
        >
          {isRunning ? '◌ Đang Kiểm Tra...' : '🔍 Chạy Kiểm Tra Lại'}
        </button>
      </div>

      {!report ? (
        <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Nhấn nút <strong>[Chạy Kiểm Tra Lại]</strong> để thực hiện rà soát toàn diện hệ thống.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {report.items.map((item) => (
            <div
              key={item.id}
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '14px 18px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '16px',
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '13.5px' }}>
                    {item.name}
                  </span>
                  <span
                    style={{
                      fontSize: '10px',
                      background: 'rgba(0, 242, 254, 0.1)',
                      color: 'var(--accent-cyan)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                    }}
                  >
                    {item.category}
                  </span>
                </div>

                <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '6px' }}>
                  {item.message}
                </div>

                {item.detail && (
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px', fontFamily: 'monospace' }}>
                    {item.detail}
                  </div>
                )}

                {item.recommendation && (
                  <div style={{ fontSize: '11.5px', color: '#fef08a', marginTop: '6px' }}>
                    💡 <strong>Gợi ý khắc phục:</strong> {item.recommendation}
                  </div>
                )}
              </div>

              <div>{getStatusIcon(item.status)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
