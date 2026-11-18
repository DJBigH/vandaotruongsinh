import React from 'react';
import { SystemStatusSnapshot, ServiceName } from '../../shared/types';
import { ServiceCard } from './ServiceCard';
import { DatabaseStatus } from './DatabaseStatus';

interface TabOverviewProps {
  status: SystemStatusSnapshot | null;
  onStartService: (name: ServiceName) => void;
  onStopService: (name: ServiceName, force?: boolean) => void;
  onRestartService: (name: ServiceName) => void;
  onCheckDatabase: () => void;
  onOpenExportModal: () => void;
  onNavigateToSetup?: () => void;
  isProcessing: boolean;
  isCheckingDb: boolean;
}

export const TabOverview: React.FC<TabOverviewProps> = ({
  status,
  onStartService,
  onStopService,
  onRestartService,
  onCheckDatabase,
  onOpenExportModal,
  onNavigateToSetup,
  isProcessing,
  isCheckingDb,
}) => {
  if (!status) {
    return <div style={{ color: 'var(--text-muted)' }}>Đang kết nối tới lõi trình khởi chạy...</div>;
  }

  const latestError = status.lastErrorSummary.latestError;

  return (
    <div>
      {/* Alert Banner for Recent Errors */}
      {latestError && (
        <div className="alert-box">
          <div className="alert-message">
            <span>⚠️</span>
            <span>
              <strong>Cảnh báo lỗi gần nhất:</strong> {latestError}
            </span>
          </div>
          <button
            className="btn btn-ai"
            style={{ padding: '4px 10px', fontSize: '11px', flexShrink: 0 }}
            onClick={onOpenExportModal}
          >
            🤖 Xuất Log Ngay
          </button>
        </div>
      )}

      {/* Database Status Bar */}
      <DatabaseStatus
        database={status.database}
        onCheckAgain={onCheckDatabase}
        isChecking={isCheckingDb}
      />

      {/* Services Grid (Server & Client) */}
      <div className="services-grid">
        <ServiceCard
          service={status.services.server}
          onStart={onStartService}
          onStop={onStopService}
          onRestart={onRestartService}
          isProcessing={isProcessing}
        />
        <ServiceCard
          service={status.services.client}
          onStart={onStartService}
          onStop={onStopService}
          onRestart={onRestartService}
          isProcessing={isProcessing}
        />
      </div>

      {/* Quick Instruction & System Info */}
      {onNavigateToSetup && (
        <div
          style={{
            background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.15), rgba(6, 182, 212, 0.15))',
            border: '1px solid #10b981',
            borderRadius: '8px',
            padding: '12px 18px',
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div>
            <div style={{ color: '#34d399', fontWeight: 700, fontSize: '13px' }}>
              🛠️ CÀI ĐẶT DỰ ÁN CHO NGƯỜI MỚI CLONE:
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '2px' }}>
              Nếu bạn vừa clone mã nguồn về, hãy dùng tính năng Cài Đặt Tự Động để launcher tự kiểm tra và cài đặt trọn gói.
            </div>
          </div>
          <button
            className="btn btn-primary"
            style={{ padding: '6px 14px', fontSize: '12px', whiteSpace: 'nowrap' }}
            onClick={onNavigateToSetup}
          >
            🚀 Mở Cài Đặt Tự Động
          </button>
        </div>
      )}

      <div
        style={{
          background: 'rgba(15, 28, 53, 0.5)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '16px 20px',
          fontSize: '12.5px',
          color: 'var(--text-muted)',
          lineHeight: '1.6',
        }}
      >
        <div style={{ color: 'var(--accent-cyan)', fontWeight: 700, marginBottom: '6px' }}>
          📜 HƯỚNG DẪN KHỞI CHẠY TIÊN ĐẠO:
        </div>
        <div>
          1. Đảm bảo <strong>PostgreSQL</strong> đang lắng nghe tại địa chỉ trong <code>DATABASE_URL</code> (WSL, Docker hoặc Windows Service).
        </div>
        <div>
          2. Nhấn nút <strong>[⚡ Khởi Động Tất Cả]</strong> trên thanh tiêu đề để tự động bật Máy chủ và Giao diện theo các cổng trong Cài Đặt.
        </div>
        <div>
          3. Khi cả hai thẻ dịch vụ chuyển sang trạng thái <strong>[● Sẵn Sàng]</strong>, nút <strong>[🎮 Vào Game]</strong> sẽ sáng lên để mở trò chơi trên trình duyệt.
        </div>
        <div>
          4. Nếu gặp sự cố khởi động hoặc lỗi logic, nhấn <strong>[🤖 Xuất Log Cho AI]</strong> để lưu file chẩn đoán gửi cho AI phân tích.
        </div>
      </div>
    </div>
  );
};
