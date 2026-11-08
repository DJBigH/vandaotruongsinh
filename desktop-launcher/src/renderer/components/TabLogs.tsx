import React, { useState, useEffect, useRef } from 'react';
import { LogEntry, LogSource, LogLevel } from '../../shared/types';

interface TabLogsProps {
  logs: LogEntry[];
  onClearLogs: () => void;
  onOpenLogFolder: () => void;
  onCopyLogs: () => void;
}

export const TabLogs: React.FC<TabLogsProps> = ({
  logs,
  onClearLogs,
  onOpenLogFolder,
  onCopyLogs,
}) => {
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');
  const [levelFilter, setLevelFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [autoScroll, setAutoScroll] = useState<boolean>(true);

  const logViewerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new log entry if enabled
  useEffect(() => {
    if (autoScroll && logViewerRef.current) {
      logViewerRef.current.scrollTop = logViewerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    if (sourceFilter !== 'ALL' && log.source !== sourceFilter) return false;
    if (levelFilter !== 'ALL' && log.level !== levelFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchMsg = log.message.toLowerCase().includes(q);
      const matchStack = log.stack ? log.stack.toLowerCase().includes(q) : false;
      const matchEvent = log.event ? log.event.toLowerCase().includes(q) : false;
      if (!matchMsg && !matchStack && !matchEvent) return false;
    }
    return true;
  });

  const jumpToLatestError = () => {
    setLevelFilter('ERROR');
    setAutoScroll(true);
  };

  return (
    <div className="logs-container">
      {/* Toolbar */}
      <div className="logs-toolbar">
        <div className="logs-filters">
          <label style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Nguồn:</label>
          <select
            className="logs-select"
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
          >
            <option value="ALL">Tất Cả (All Sources)</option>
            <option value="launcher">Launcher</option>
            <option value="server">Server (Backend)</option>
            <option value="client">Client (Frontend)</option>
          </select>

          <label style={{ fontSize: '11px', color: 'var(--text-dim)', marginLeft: '6px' }}>Mức Độ:</label>
          <select
            className="logs-select"
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
          >
            <option value="ALL">Tất Cả Cấp Độ</option>
            <option value="INFO">INFO</option>
            <option value="WARN">WARN</option>
            <option value="ERROR">ERROR</option>
          </select>

          <input
            type="text"
            className="logs-input"
            style={{ width: '160px' }}
            placeholder="Tìm kiếm nhật ký..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <label style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
            />
            Tự cuộn
          </label>

          <button
            className="btn btn-outline"
            style={{ padding: '4px 10px', fontSize: '11.5px' }}
            onClick={jumpToLatestError}
            title="Lọc nhanh đến các dòng lỗi"
          >
            ⚠️ Xem Lỗi
          </button>

          <button
            className="btn btn-outline"
            style={{ padding: '4px 10px', fontSize: '11.5px' }}
            onClick={onCopyLogs}
            title="Sao chép toàn bộ nhật ký đang hiển thị vào Clipboard"
          >
            📋 Sao Chép
          </button>

          <button
            className="btn btn-outline"
            style={{ padding: '4px 10px', fontSize: '11.5px' }}
            onClick={onOpenLogFolder}
            title="Mở thư mục chứa file log trên Windows Explorer"
          >
            📁 Mở Thư Mục Log
          </button>

          <button
            className="btn btn-outline"
            style={{ padding: '4px 10px', fontSize: '11.5px' }}
            onClick={onClearLogs}
            title="Xóa nội dung đang hiển thị trên giao diện (Không xóa file trên đĩa)"
          >
            🧹 Xóa Màn Hình
          </button>
        </div>
      </div>

      {/* Log Terminal Window */}
      <div className="logs-viewer" ref={logViewerRef}>
        {filteredLogs.length === 0 ? (
          <div style={{ color: '#4b5563', fontStyle: 'italic', padding: '10px' }}>
            {logs.length === 0
              ? 'Chưa có nhật ký nào được ghi nhận. Khởi động Server hoặc Client để xem dữ liệu real-time.'
              : 'Không có dòng nhật ký nào khớp với bộ lọc hiện tại.'}
          </div>
        ) : (
          filteredLogs.map((entry) => (
            <div key={entry.id} className="log-line">
              <span className="log-time">[{entry.timestamp.slice(11, 19)}]</span>
              <span className={`log-source log-source-${entry.source}`}>
                [{entry.source.toUpperCase()}]
              </span>
              <span className={`log-msg-${entry.level}`} style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                {entry.level !== 'INFO' && `[${entry.level}] `}
                {entry.event && `[${entry.event}] `}
                {entry.message}
                {entry.stack && `\n${entry.stack}`}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Log Stats Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-dim)', padding: '0 4px' }}>
        <span>
          Hiển thị: <strong>{filteredLogs.length}</strong> / {logs.length} dòng
        </span>
        <span>
          Đường dẫn lưu trữ: <code>%APPDATA%/VanDaoTruongSinh/logs/</code>
        </span>
      </div>
    </div>
  );
};
