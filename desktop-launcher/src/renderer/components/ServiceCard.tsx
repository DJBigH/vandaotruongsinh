import React from 'react';
import { ServiceInfo, ServiceName } from '../../shared/types';

interface ServiceCardProps {
  service: ServiceInfo;
  onStart: (name: ServiceName) => void;
  onStop: (name: ServiceName, force?: boolean) => void;
  onRestart: (name: ServiceName) => void;
  isProcessing: boolean;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({
  service,
  onStart,
  onStop,
  onRestart,
  isProcessing,
}) => {
  const getBadgeClass = () => {
    switch (service.state) {
      case 'READY':
        return 'badge-ready';
      case 'STARTING':
      case 'RUNNING_UNREADY':
        return 'badge-starting';
      case 'ERROR':
        return 'badge-error';
      case 'EXTERNAL_RUNNING':
        return 'badge-external';
      default:
        return 'badge-stopped';
    }
  };

  const getStateText = () => {
    switch (service.state) {
      case 'READY':
        return '● Sẵn Sàng';
      case 'STARTING':
        return '◌ Đang Khởi Động';
      case 'RUNNING_UNREADY':
        return '▲ Đang Chạy Chưa Sẵn Sàng';
      case 'STOPPING':
        return '◌ Đang Dừng';
      case 'ERROR':
        return '✕ Lỗi';
      case 'EXTERNAL_RUNNING':
        return '⬡ Chạy Ngoài Launcher';
      default:
        return '○ Đã Dừng';
    }
  };

  const formatUptime = (sec: number) => {
    if (!sec || sec <= 0) return '0s';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (m === 0) return `${s}s`;
    const h = Math.floor(m / 60);
    const remM = m % 60;
    if (h === 0) return `${remM}m ${s}s`;
    return `${h}h ${remM}m ${s}s`;
  };

  const isRunning = service.state === 'READY' || service.state === 'STARTING' || service.state === 'RUNNING_UNREADY';
  const isExternal = service.state === 'EXTERNAL_RUNNING';

  return (
    <div className="service-card">
      <div className="service-card-header">
        <div className="service-title">
          {service.name === 'server' ? '🖥️ Máy Chủ (Server Fastify)' : '🌐 Giao Diện Game (Client Web)'}
        </div>
        <div className={`badge ${getBadgeClass()}`}>{getStateText()}</div>
      </div>

      <div className="service-metrics">
        <div className="metric-item">
          <span className="metric-label">Địa Chỉ / Cổng:</span>
          <span className="metric-value">127.0.0.1:{service.port}</span>
        </div>
        <div className="metric-item">
          <span className="metric-label">Mã Tiến Trình (PID):</span>
          <span className="metric-value">{service.pid ? service.pid : isExternal ? 'Tiến trình ngoài' : 'Chưa có'}</span>
        </div>
        <div className="metric-item">
          <span className="metric-label">Thời Gian Hoạt Động:</span>
          <span className="metric-value">{formatUptime(service.uptimeSec)}</span>
        </div>
        <div className="metric-item">
          <span className="metric-label">Quyền Quản Lý:</span>
          <span className="metric-value">{service.isManagedByLauncher ? 'Do Launcher quản lý' : isExternal ? 'Chạy độc lập bên ngoài' : 'Chưa chạy'}</span>
        </div>
      </div>

      {service.lastError && (
        <div style={{ fontSize: '11px', color: '#f87171', background: 'rgba(239, 68, 68, 0.1)', padding: '6px 10px', borderRadius: '4px' }}>
          ⚠️ Lỗi gần nhất: {service.lastError}
        </div>
      )}

      <div className="service-card-actions">
        {(!isRunning && !isExternal) ? (
          <button
            className="btn btn-success"
            style={{ flex: 1 }}
            onClick={() => onStart(service.name)}
            disabled={isProcessing || service.state === 'STARTING'}
          >
            ▶ Bật Dịch Vụ
          </button>
        ) : (
          <>
            <button
              className="btn btn-danger"
              style={{ flex: 1 }}
              onClick={() => onStop(service.name, false)}
              disabled={isProcessing || isExternal || service.state === 'STOPPING'}
              title={isExternal ? 'Tiến trình bên ngoài launcher không được phép tắt' : 'Dừng tiến trình có kiểm soát'}
            >
              ■ Tắt Dịch Vụ
            </button>
            <button
              className="btn btn-outline"
              onClick={() => onRestart(service.name)}
              disabled={isProcessing || isExternal || service.state === 'STOPPING'}
              title="Khởi động lại dịch vụ này"
            >
              🔄
            </button>
          </>
        )}
      </div>
    </div>
  );
};
