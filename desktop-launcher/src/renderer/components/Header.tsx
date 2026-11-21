import React from 'react';
import { SystemStatusSnapshot } from '../../shared/types';
import { BrandIcon } from './BrandIcon';

interface HeaderProps {
  status: SystemStatusSnapshot | null;
  onStartAll: () => void;
  onStopAll: () => void;
  onOpenGame: () => void;
  onOpenAdmin: () => void;
  onOpenExportModal: () => void;
  isProcessing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  status,
  onStartAll,
  onStopAll,
  onOpenGame,
  onOpenAdmin,
  onOpenExportModal,
  isProcessing,
}) => {
  const isServerReady = status?.services.server.state === 'READY' || status?.services.server.state === 'EXTERNAL_RUNNING';
  const isClientReady = status?.services.client.state === 'READY' || status?.services.client.state === 'EXTERNAL_RUNNING';
  const isGameReady = isServerReady && isClientReady;

  return (
    <header className="launcher-header">
      <div className="brand-section">
        <BrandIcon className="brand-icon-img" size={40} />
        <div>
          <div className="brand-title">VẠN ĐẠO TRƯỜNG SINH</div>
          <div className="brand-subtitle">
            Vạn Đạo Trường Sinh Launcher v{status?.launcherVersion || '1.5.0'} •{' '}
            {status?.isPackaged ? 'Bản Đóng Gói (Production)' : 'Bản Phát Triển (Dev)'}
          </div>
        </div>
      </div>

      <div className="header-actions">
        <button
          className="btn btn-outline"
          onClick={onStartAll}
          disabled={isProcessing || isGameReady}
          title="Khởi động cả Backend và Frontend theo trình tự"
        >
          ⚡ Khởi Động Tất Cả
        </button>

        <button
          className="btn btn-danger"
          onClick={onStopAll}
          disabled={isProcessing || (!status?.services.server.pid && !status?.services.client.pid)}
          title="Dừng an toàn toàn bộ tiến trình do Launcher quản lý"
        >
          🛑 Dừng Tất Cả
        </button>

        <button
          className="btn btn-primary"
          onClick={onOpenGame}
          disabled={!isClientReady}
          title={isClientReady ? 'Mở giao diện game trên trình duyệt mặc định' : 'Cần bật Client trước khi vào game'}
        >
          🎮 Vào Game
        </button>

        <button
          className="btn btn-outline"
          onClick={onOpenAdmin}
          disabled={!isClientReady}
          title="Mở Bảng Điều Khiển Quản Trị Viên (Admin Panel)"
        >
          🛡️ Admin
        </button>

        <button
          className="btn btn-ai"
          onClick={onOpenExportModal}
          title="Xuất báo cáo chẩn đoán định dạng .txt hoặc .zip gửi cho AI phân tích"
        >
          🤖 Xuất Log Cho AI
        </button>
      </div>
    </header>
  );
};
