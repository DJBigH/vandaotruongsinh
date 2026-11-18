import React, { useState, useEffect, useRef } from 'react';
import {
  SetupInspection,
  SetupStep,
  SetupLogPayload,
  SetupRunOptions,
} from '../../shared/types';

interface TabSetupProps {
  initialProjectDir?: string;
  onNavigateToOverview: () => void;
  onStartAllAndPlay?: () => void;
  showToast: (msg: string) => void;
}

export const TabSetup: React.FC<TabSetupProps> = ({
  initialProjectDir,
  onNavigateToOverview,
  onStartAllAndPlay,
  showToast,
}) => {
  const [projectDir, setProjectDir] = useState<string>(initialProjectDir || '');
  const [inspection, setInspection] = useState<SetupInspection | null>(null);
  const [isInspecting, setIsInspecting] = useState<boolean>(false);

  // Cấu hình cài đặt
  const [forceReinstall, setForceReinstall] = useState<boolean>(false);
  const [syncDatabase, setSyncDatabase] = useState<boolean>(true);

  // Trạng thái chạy
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [steps, setSteps] = useState<SetupStep[]>([
    { id: 'check_runtime', title: '1. Kiểm tra môi trường Node.js & npm', status: 'PENDING' },
    { id: 'prepare_env', title: '2. Chuẩn bị cấu hình máy chủ', status: 'PENDING' },
    { id: 'install_shared', title: '3. Cài đặt phân hệ chia sẻ (@vandao/shared)', status: 'PENDING' },
    { id: 'install_server', title: '4. Cài đặt thư viện máy chủ Backend (server/node_modules)', status: 'PENDING' },
    { id: 'install_client', title: '5. Cài đặt thư viện giao diện Web Client (client/node_modules)', status: 'PENDING' },
    { id: 'setup_database', title: '6. Khởi tạo Prisma Client & Cơ sở dữ liệu', status: 'PENDING' },
    { id: 'final_verify', title: '7. Kiểm tra tổng thể tính sẵn sàng', status: 'PENDING' },
  ]);
  const [logs, setLogs] = useState<SetupLogPayload[]>([]);
  const [isComplete, setIsComplete] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const terminalRef = useRef<HTMLDivElement>(null);

  // Tự động cuộn xuống cuối terminal khi có log mới
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  // Khởi tạo quét môi trường khi mở tab
  useEffect(() => {
    if (!window.launcherAPI) return;

    // Lắng nghe tiến trình cài đặt từ Main process
    const unsubProgress = window.launcherAPI.onSetupProgress((payload) => {
      setSteps(payload.steps);
      if (payload.isComplete) {
        setIsRunning(false);
        setIsComplete(true);
        setIsSuccess(!payload.hasError && payload.isReadyToPlay === true);
        setErrorMessage(payload.errorMessage || null);
      }
    });

    const unsubLog = window.launcherAPI.onSetupLog((log) => {
      setLogs((prev) => [...prev.slice(-1500), log]);
    });

    // Quét môi trường lần đầu
    handleScanEnvironment();

    return () => {
      unsubProgress();
      unsubLog();
    };
  }, []);

  const handleScanEnvironment = async (dirToScan?: string) => {
    if (!window.launcherAPI) return;
    setIsInspecting(true);
    try {
      const target = dirToScan || projectDir || undefined;
      const res = await window.launcherAPI.inspectSetup(target);
      setInspection(res);
      setProjectDir(res.projectDir);
    } catch (e: any) {
      showToast(`Lỗi quét môi trường: ${e.message}`);
    } finally {
      setIsInspecting(false);
    }
  };

  const handleBrowseFolder = async () => {
    if (!window.launcherAPI) return;
    try {
      const selected = await window.launcherAPI.selectFolder();
      if (selected) {
        setProjectDir(selected);
        await handleScanEnvironment(selected);
      }
    } catch (e: any) {
      showToast(`Lỗi chọn thư mục: ${e.message}`);
    }
  };

  const handleStartSetup = async () => {
    if (!window.launcherAPI) return;
    setIsRunning(true);
    setIsComplete(false);
    setIsSuccess(false);
    setErrorMessage(null);
    setLogs([]);

    const options: SetupRunOptions = {
      projectDir,
      forceReinstall,
      syncDatabase,
    };

    try {
      const result = await window.launcherAPI.runAutoSetup(options);
      setInspection(result.inspection);
      if (result.success) {
        showToast(`${result.inspection.isReadyToPlay ? '✅' : '⚠️'} ${result.message}`);
      } else {
        showToast(`❌ Cài đặt thất bại: ${result.message}`);
      }
    } catch (e: any) {
      setIsComplete(true);
      setErrorMessage(e.message);
      showToast(`Lỗi thực thi cài đặt: ${e.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleCancelSetup = async () => {
    if (!window.launcherAPI) return;
    try {
      const res = await window.launcherAPI.cancelAutoSetup();
      showToast(res.message);
    } catch (e: any) {
      showToast(`Lỗi hủy cài đặt: ${e.message}`);
    }
  };

  const handleCopyLogs = () => {
    const text = logs.map((l) => `[${l.timestamp}] [${l.stream.toUpperCase()}] ${l.text}`).join('\n');
    navigator.clipboard.writeText(text);
    showToast('Đã sao chép toàn bộ log cài đặt vào bộ nhớ tạm');
  };

  const handleClearTerminal = () => {
    setLogs([]);
    showToast('Đã xóa trắng khung nhật ký cài đặt');
  };

  const getStepBadge = (status: SetupStep['status']) => {
    switch (status) {
      case 'SUCCESS':
        return <span className="setup-badge badge-success">✅ Hoàn thành</span>;
      case 'RUNNING':
        return <span className="setup-badge badge-running">🔄 Đang cài...</span>;
      case 'SKIPPED':
        return <span className="setup-badge badge-skipped">⏭️ Đã có sẵn</span>;
      case 'WARNING':
        return <span className="setup-badge badge-warning">⚠️ Lưu ý</span>;
      case 'ERROR':
        return <span className="setup-badge badge-error">❌ Thất bại</span>;
      default:
        return <span className="setup-badge badge-pending">⏳ Chờ duyệt</span>;
    }
  };

  return (
    <div className="tab-setup-container">
      {/* 1. Header Giới thiệu */}
      <div className="setup-header">
        <div>
          <h2 className="setup-title">🛠️ THIẾT LẬP & CÀI ĐẶT DỰ ÁN TỰ ĐỘNG</h2>
          <p className="setup-subtitle">
            Dành cho đạo hữu vừa clone mã nguồn về máy tính. Hệ thống sẽ tự động quét, phát hiện các thành phần còn thiếu
            (thư viện Node, cấu hình .env, Prisma, CSDL) và tự động cài đặt trọn gói chỉ với 1 cú click!
          </p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={() => handleScanEnvironment()}
          disabled={isInspecting || isRunning}
          title="Rà soát lại toàn bộ môi trường và thư mục"
        >
          {isInspecting ? '🔄 Đang quét...' : '🔄 Quét lại môi trường'}
        </button>
      </div>

      {/* 2. Trỏ Thư Mục Dự Án (Project Directory Selector) */}
      <div className="setup-card">
        <div className="setup-card-title">📁 THƯ MỤC MÃ NGUỒN DỰ ÁN (PROJECT DIRECTORY)</div>
        <div className="folder-picker-row">
          <input
            type="text"
            className="input-folder"
            value={projectDir}
            onChange={(e) => setProjectDir(e.target.value)}
            placeholder="Đường dẫn đến thư mục chứa mã nguồn game (vd: E:\tutien_game)..."
            disabled={isRunning}
          />
          <button
            className="btn btn-primary"
            onClick={handleBrowseFolder}
            disabled={isRunning}
          >
            📂 Chọn Thư Mục...
          </button>
        </div>

        {/* Trạng thái hợp lệ của thư mục */}
        {inspection && (
          <div className="folder-status-indicator">
            {inspection.isValidProjectDir ? (
              <span className="status-valid">
                ✅ Nhận diện đúng thư mục Vạn Đạo Trường Sinh (gồm server/, client/, shared/ và package.json)
              </span>
            ) : (
              <span className="status-invalid">
                ⚠️ Thư mục này chưa đúng cấu trúc dự án Vạn Đạo Trường Sinh (thiếu server/ hoặc client/ hoặc package.json)
              </span>
            )}
          </div>
        )}
      </div>

      {/* 3. Bảng Kiểm Tra Nhanh Tình Trạng Hiện Tại */}
      {inspection && (
        <div className="setup-card">
          <div className="setup-card-title">🔍 TÌNH TRẠNG MÔI TRƯỜNG & THÀNH PHẦN HIỆN CÓ</div>
          <div className="inspection-grid">
            {/* Node.js */}
            <div className={`inspect-box ${inspection.nodeVersion ? 'box-pass' : 'box-fail'}`}>
              <div className="inspect-icon">{inspection.nodeVersion ? '⚡' : '❌'}</div>
              <div className="inspect-info">
                <div className="inspect-label">Node.js Runtime</div>
                <div className="inspect-val">{inspection.nodeVersion || 'Chưa cài đặt!'}</div>
              </div>
            </div>

            {/* npm */}
            <div className={`inspect-box ${inspection.npmVersion ? 'box-pass' : 'box-fail'}`}>
              <div className="inspect-icon">{inspection.npmVersion ? '📦' : '❌'}</div>
              <div className="inspect-info">
                <div className="inspect-label">Trình Gói npm</div>
                <div className="inspect-val">{inspection.npmVersion || 'Chưa cài đặt!'}</div>
              </div>
            </div>

            {/* Cấu hình backend */}
            <div className={`inspect-box ${inspection.hasServerEnv ? 'box-pass' : 'box-warn'}`}>
              <div className="inspect-icon">{inspection.hasServerEnv ? '📄' : '📝'}</div>
              <div className="inspect-info">
                <div className="inspect-label">Cấu Hình Máy Chủ</div>
                <div className="inspect-val">{inspection.configurationSource ?? 'Chưa có cấu hình'}</div>
              </div>
            </div>

            {/* Mã nguồn Shared */}
            <div className={`inspect-box ${inspection.hasSharedFolder ? 'box-pass' : 'box-warn'}`}>
              <div className="inspect-icon">{inspection.hasSharedFolder ? '⚙️' : '⏳'}</div>
              <div className="inspect-info">
                <div className="inspect-label">Thư Viện Shared</div>
                <div className="inspect-val">{inspection.hasSharedFolder ? 'Có mã nguồn' : 'Thiếu thư mục shared/'}</div>
              </div>
            </div>

            {/* Server node_modules */}
            <div className={`inspect-box ${inspection.hasServerModules ? 'box-pass' : 'box-warn'}`}>
              <div className="inspect-icon">{inspection.hasServerModules ? '🖥️' : '⏳'}</div>
              <div className="inspect-info">
                <div className="inspect-label">Thư Viện Backend</div>
                <div className="inspect-val">{inspection.hasServerModules ? 'Đã cài đặt' : 'Cần cài đặt'}</div>
              </div>
            </div>

            {/* Client node_modules */}
            <div className={`inspect-box ${inspection.hasClientModules ? 'box-pass' : 'box-warn'}`}>
              <div className="inspect-icon">{inspection.hasClientModules ? '🌐' : '⏳'}</div>
              <div className="inspect-info">
                <div className="inspect-label">Thư Viện Web Client</div>
                <div className="inspect-val">{inspection.hasClientModules ? 'Đã cài đặt' : 'Cần cài đặt'}</div>
              </div>
            </div>

            {/* Cổng TCP từ DATABASE_URL */}
            <div className={`inspect-box ${inspection.isDbRunning ? 'box-pass' : 'box-warn'}`}>
              <div className="inspect-icon">{inspection.isDbRunning ? '🐘' : '⚠️'}</div>
              <div className="inspect-info">
                <div className="inspect-label">Cổng TCP PostgreSQL</div>
                <div className="inspect-val">
                  {inspection.databaseEndpoint
                    ? `${inspection.databaseEndpoint.host}:${inspection.databaseEndpoint.port} · ${inspection.isDbRunning ? 'Có phản hồi' : 'Chưa phản hồi'}`
                    : 'Cần cấu hình máy chủ hợp lệ'}
                </div>
              </div>
            </div>
          </div>

          {/* Danh sách thành phần còn thiếu */}
          {inspection.missingItems.length > 0 ? (
            <div className="missing-summary-box">
              <span className="missing-title">🔔 Các mục cần kiểm tra:</span>
              <ul className="missing-list">
                {inspection.missingItems.map((item, idx) => (
                  <li key={idx}>🔸 {item}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="all-ready-box">
              ✨ Kiểm tra cấu hình, thư viện và cổng TCP đã đạt.
            </div>
          )}
        </div>
      )}

      {/* 4. Tùy Chọn & Nút Thực Thi */}
      <div className="setup-card action-card">
        <div className="options-row">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={!forceReinstall}
              onChange={(e) => setForceReinstall(!e.target.checked)}
              disabled={isRunning}
            />
            <span>
              <strong>Tự động kiểm tra và chỉ cài đặt phần còn thiếu</strong> (Rất nhanh, tránh tải lại thư viện đã có)
            </span>
          </label>

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={syncDatabase}
              onChange={(e) => setSyncDatabase(e.target.checked)}
              disabled={isRunning}
            />
            <span>
              Đồng bộ bảng và nạp dữ liệu mẫu vào CSDL phát triển trên máy này (NODE_ENV=development)
            </span>
          </label>
        </div>

        <div className="action-buttons-row">
          {!isRunning ? (
            <button
              className="btn btn-setup-action btn-setup-start"
              onClick={handleStartSetup}
              disabled={!inspection?.isValidProjectDir}
            >
              🚀 BẮT ĐẦU CÀI ĐẶT TỰ ĐỘNG
            </button>
          ) : (
            <button
              className="btn btn-setup-action btn-setup-cancel"
              onClick={handleCancelSetup}
            >
              ⏹️ HỦY CÀI ĐẶT
            </button>
          )}

          <button
            className="btn btn-secondary"
            onClick={onNavigateToOverview}
            disabled={isRunning}
          >
            📊 Quay lại Màn Hình Tổng Quan
          </button>
        </div>
      </div>

      {/* 5. Thông Báo Hoàn Thành Mỹ Mãn */}
      {isComplete && isSuccess && (
        <div className="setup-success-card">
          <div className="success-icon">🎉</div>
          <div className="success-body">
            <h3 className="success-title">CHÚC MỪNG ĐẠO HỮU! THIẾT LẬP THÀNH CÔNG</h3>
            <p className="success-desc">
              Toàn bộ phụ thuộc, file cấu hình và cơ sở dữ liệu đã sẵn sàng phục vụ con đường tu tiên đắc đạo.
            </p>
            <div className="success-actions">
              <button
                className="btn btn-primary btn-play-now"
                onClick={() => {
                  if (onStartAllAndPlay) {
                    onStartAllAndPlay();
                  } else {
                    onNavigateToOverview();
                  }
                }}
              >
                ⚔️ KHỞI ĐỘNG VÀ VÀO GAME NGAY!
              </button>
              <button
                className="btn btn-secondary"
                onClick={onNavigateToOverview}
              >
                Về Bảng Điều Khiển Tổng Quan
              </button>
            </div>
          </div>
        </div>
      )}

      {isComplete && !isSuccess && !errorMessage && (
        <div className="missing-summary-box setup-warning-card" role="status">
          <span className="missing-title">⚠️ Cài đặt hoàn tất với lưu ý</span>
          <p>{steps.find((step) => step.id === 'final_verify')?.message}</p>
        </div>
      )}

      {/* Thông Báo Lỗi */}
      {isComplete && !isSuccess && errorMessage && (
        <div className="setup-error-card">
          <div className="error-icon">❌</div>
          <div className="error-body">
            <h4 className="error-title">TIẾN TRÌNH CÀI ĐẶT GẶP SỰ CỐ</h4>
            <p className="error-desc">{errorMessage}</p>
            <p className="error-help">
              💡 Hãy kiểm tra nhật ký dòng lệnh bên dưới hoặc bấm nút "Xuất log cho AI" ở góc trên để được hỗ trợ phân tích nguyên nhân.
            </p>
          </div>
        </div>
      )}

      {/* 6. Danh Sách Các Bước Cài Đặt (Steps Checklist) */}
      <div className="setup-card">
        <div className="setup-card-title">📋 TIẾN TRÌNH CÁC BƯỚC THIẾT LẬP</div>
        <div className="steps-list">
          {steps.map((st) => (
            <div key={st.id} className={`step-item step-${st.status.toLowerCase()}`}>
              <div className="step-main">
                <span className="step-title">{st.title}</span>
                {getStepBadge(st.status)}
              </div>
              {st.message && <div className="step-message">{st.message}</div>}
              {st.durationMs !== undefined && st.durationMs > 0 && (
                <div className="step-time">⏱️ Hoàn tất trong {(st.durationMs / 1000).toFixed(1)}s</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 7. Khung Terminal Hiển Thị Log Trực Tiếp (Live Terminal Console) */}
      <div className="setup-card terminal-card">
        <div className="terminal-header">
          <div className="terminal-title">💻 NHẬT KÝ CÀI ĐẶT THỜI GIAN THỰC (LIVE TERMINAL)</div>
          <div className="terminal-actions">
            <button className="btn-terminal" onClick={handleCopyLogs} title="Sao chép log">
              📋 Sao chép
            </button>
            <button className="btn-terminal" onClick={handleClearTerminal} title="Xóa màn hình">
              🧹 Xóa trắng
            </button>
          </div>
        </div>
        <div className="terminal-body" ref={terminalRef}>
          {logs.length === 0 ? (
            <div className="terminal-empty">
              Nhật ký cài đặt npm / prisma / thiết lập sẽ được truyền trực tiếp vào đây khi bạn bấm "Bắt đầu cài đặt tự động"...
            </div>
          ) : (
            logs.map((l, index) => (
              <div key={index} className={`terminal-line line-${l.stream}`}>
                <span className="log-time">[{l.timestamp}]</span>{' '}
                <span className="log-text">{l.text}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
