import React from 'react';
import { DatabaseInfo } from '../../shared/types';

interface DatabaseStatusProps {
  database: DatabaseInfo;
  onCheckAgain: () => void;
  isChecking: boolean;
}

export const DatabaseStatus: React.FC<DatabaseStatusProps> = ({
  database,
  onCheckAgain,
  isChecking,
}) => {
  const getBadge = () => {
    switch (database.state) {
      case 'CONNECTED':
        return <span className="badge badge-ready">● Đang Kết Nối</span>;
      case 'DISCONNECTED':
        return <span className="badge badge-error">✕ Mất Kết Nối</span>;
      case 'CHECKING':
        return <span className="badge badge-starting">◌ Đang Kích Hoạt...</span>;
      default:
        return <span className="badge badge-stopped">○ Chưa Kiểm Tra</span>;
    }
  };

  return (
    <div className="db-bar">
      <div className="db-bar-info">
        <span style={{ fontSize: '16px' }}>🗄️</span>
        <div>
          <span style={{ fontWeight: 700, marginRight: '8px' }}>Cơ Sở Dữ Liệu PostgreSQL:</span>
          <span style={{ color: 'var(--text-muted)' }}>{database.host}:{database.port}</span>
          <span style={{ marginLeft: '12px', fontSize: '11.5px', color: 'var(--text-dim)' }}>
            ({database.message})
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {getBadge()}
        <button
          className="btn btn-outline"
          style={{ padding: '4px 10px', fontSize: '11px', fontWeight: database.state === 'DISCONNECTED' ? 700 : 500 }}
          onClick={onCheckAgain}
          disabled={isChecking}
          title={database.state === 'DISCONNECTED' ? 'Tự động kích hoạt dịch vụ PostgreSQL trong WSL Ubuntu và kết nối lại' : 'Kiểm tra kết nối TCP tới cổng 5432 của PostgreSQL'}
        >
          {isChecking ? '🔄 Đang Bật...' : database.state === 'DISCONNECTED' ? '⚡ Tự Bật & Kết Nối' : '🔍 Thử Kết Nối'}
        </button>
      </div>
    </div>
  );
};
