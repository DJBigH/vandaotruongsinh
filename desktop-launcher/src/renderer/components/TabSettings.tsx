import React, { useState, useEffect } from 'react';
import { LauncherSettings } from '../../shared/types';

interface TabSettingsProps {
  settings: LauncherSettings | null;
  onSaveSettings: (newSettings: Partial<LauncherSettings>) => void;
  onSelectProjectFolder: () => void;
  onOpenLogFolder: () => void;
}

export const TabSettings: React.FC<TabSettingsProps> = ({
  settings,
  onSaveSettings,
  onSelectProjectFolder,
  onOpenLogFolder,
}) => {
  const [form, setForm] = useState<LauncherSettings>({
    autoOpenBrowser: false,
    minimizeToTrayOnClose: true,
    projectDir: '',
    serverPort: 3001,
    clientPort: 5173,
    dbHost: '127.0.0.1',
    dbPort: 5432,
    startTimeoutSec: 30,
    stopTimeoutSec: 10,
    desktopNotifications: true,
    maxLogLines: 2000,
  });

  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (settings) {
      setForm(settings);
    }
  }, [settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(form);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '780px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--accent-gold)' }}>
            ⚙️ CÀI ĐẶT CẤU HÌNH TRÌNH KHỞI CHẠY
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Tùy chỉnh hành vi tự động, cổng mạng, thời gian chờ và thư mục lưu trữ.
          </div>
        </div>

        <button type="submit" className="btn btn-primary">
          💾 Lưu Cài Đặt
        </button>
      </div>

      {savedSuccess && (
        <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#34d399', padding: '10px 14px', borderRadius: '6px', fontSize: '12.5px' }}>
          ✅ Đã lưu cấu hình thành công vào %APPDATA%/VanDaoTruongSinh/launcher-settings.json!
        </div>
      )}

      {/* Group 1: Hành vi chung */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ fontWeight: 700, color: 'var(--accent-cyan)', fontSize: '13.5px' }}>
          1. Hành Vi Ứng Dụng
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={form.autoOpenBrowser}
            onChange={(e) => setForm({ ...form, autoOpenBrowser: e.target.checked })}
          />
          <span>Tự động mở trình duyệt vào game khi khởi động thành công (Mặc định: Tắt)</span>
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={form.minimizeToTrayOnClose}
            onChange={(e) => setForm({ ...form, minimizeToTrayOnClose: e.target.checked })}
          />
          <span>Thu nhỏ xuống khay hệ thống (System Tray) khi nhấn nút X (Đóng cửa sổ)</span>
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={form.desktopNotifications}
            onChange={(e) => setForm({ ...form, desktopNotifications: e.target.checked })}
          />
          <span>Bật thông báo màn hình (Desktop Notification) khi chuyển trạng thái</span>
        </label>
      </div>

      {/* Group 2: Thư mục dự án */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ fontWeight: 700, color: 'var(--accent-cyan)', fontSize: '13.5px' }}>
          2. Đường Dẫn Mã Nguồn Dự Án
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          Thư mục gốc chứa các gói <code>server/</code>, <code>client/</code>, <code>shared/</code> (Hỗ trợ ký tự tiếng Việt và khoảng trắng):
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            className="logs-input"
            style={{ flex: 1 }}
            value={form.projectDir}
            onChange={(e) => setForm({ ...form, projectDir: e.target.value })}
          />
          <button type="button" className="btn btn-outline" onClick={onSelectProjectFolder}>
            📂 Chọn Thư Mục
          </button>
        </div>
      </div>

      {/* Group 3: Cổng kết nối & Thời gian chờ */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ fontWeight: 700, color: 'var(--accent-cyan)', fontSize: '13.5px' }}>
          3. Cổng Dịch Vụ & Thời Gian Chờ (Timeouts)
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              Cổng Máy Chủ (Server Port):
            </label>
            <input
              type="number"
              className="logs-input"
              style={{ width: '100%' }}
              value={form.serverPort}
              onChange={(e) => setForm({ ...form, serverPort: parseInt(e.target.value, 10) || 3001 })}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              Cổng Giao Diện (Client Port):
            </label>
            <input
              type="number"
              className="logs-input"
              style={{ width: '100%' }}
              value={form.clientPort}
              onChange={(e) => setForm({ ...form, clientPort: parseInt(e.target.value, 10) || 5173 })}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              Thời Gian Chờ Khởi Động (Giây):
            </label>
            <input
              type="number"
              className="logs-input"
              style={{ width: '100%' }}
              value={form.startTimeoutSec}
              onChange={(e) => setForm({ ...form, startTimeoutSec: parseInt(e.target.value, 10) || 30 })}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              Thời Gian Chờ Dừng Dịch Vụ (Giây):
            </label>
            <input
              type="number"
              className="logs-input"
              style={{ width: '100%' }}
              value={form.stopTimeoutSec}
              onChange={(e) => setForm({ ...form, stopTimeoutSec: parseInt(e.target.value, 10) || 10 })}
            />
          </div>
        </div>
      </div>

      {/* Group 4: Nhật ký */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 700, color: 'var(--accent-cyan)', fontSize: '13.5px' }}>
            4. Thư Mục Lưu Trữ Nhật Ký (Logs)
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Vị trí: <code>%APPDATA%/VanDaoTruongSinh/logs/</code> (Tự động xoay vòng khi vượt 10MB)
          </div>
        </div>

        <button type="button" className="btn btn-outline" onClick={onOpenLogFolder}>
          📁 Mở Thư Mục Log
        </button>
      </div>
    </form>
  );
};
