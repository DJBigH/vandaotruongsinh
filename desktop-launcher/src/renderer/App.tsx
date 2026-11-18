import React, { useState, useEffect } from 'react';
import {
  SystemStatusSnapshot,
  LogEntry,
  LauncherSettings,
  DiagnosticReport,
  ServiceName,
} from '../shared/types';
import { Header } from './components/Header';
import { TabOverview } from './components/TabOverview';
import { TabSetup } from './components/TabSetup';
import { TabLogs } from './components/TabLogs';
import { TabDiagnostics } from './components/TabDiagnostics';
import { TabSettings } from './components/TabSettings';
import { ExportModal } from './components/ExportModal';

declare global {
  interface Window {
    launcherAPI: import('../main/preload').LauncherAPI;
  }
}

export const App: React.FC = () => {
  const [status, setStatus] = useState<SystemStatusSnapshot | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [settings, setSettings] = useState<LauncherSettings | null>(null);
  const [diagnostics, setDiagnostics] = useState<DiagnosticReport | null>(null);

  const [activeTab, setActiveTab] = useState<'overview' | 'setup' | 'logs' | 'diagnostics' | 'settings'>('overview');
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isCheckingDb, setIsCheckingDb] = useState<boolean>(false);
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleStartAllAndPlay = async () => {
    setActiveTab('overview');
    await handleStartAll();
  };

  useEffect(() => {
    if (!window.launcherAPI) return;

    // 1. Tải trạng thái ban đầu
    window.launcherAPI.getStatus().then(setStatus).catch(console.error);
    window.launcherAPI.getSettings().then(setSettings).catch(console.error);
    window.launcherAPI.getLogs().then(setLogs).catch(console.error);

    // 2. Đăng ký lắng nghe sự kiện thời gian thực từ Main Process
    const unsubStatus = window.launcherAPI.onStatusUpdate((newStatus) => {
      setStatus(newStatus);
    });

    const unsubLogs = window.launcherAPI.onNewLogEntry((entry) => {
      setLogs((prev) => [...prev.slice(-1999), entry]);
    });

    return () => {
      unsubStatus();
      unsubLogs();
    };
  }, []);

  // Handlers
  const handleStartService = async (name: ServiceName) => {
    setIsProcessing(true);
    try {
      const res = await window.launcherAPI.startService(name);
      showToast(res.message);
    } catch (e: any) {
      showToast(`Lỗi: ${e.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStopService = async (name: ServiceName, force: boolean = false) => {
    setIsProcessing(true);
    try {
      const res = await window.launcherAPI.stopService(name, force);
      showToast(res.message);
    } catch (e: any) {
      showToast(`Lỗi: ${e.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestartService = async (name: ServiceName) => {
    setIsProcessing(true);
    try {
      const res = await window.launcherAPI.restartService(name);
      showToast(res.message);
    } catch (e: any) {
      showToast(`Lỗi: ${e.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartAll = async () => {
    setIsProcessing(true);
    try {
      const res = await window.launcherAPI.startAll();
      showToast(res.message);
    } catch (e: any) {
      showToast(`Lỗi: ${e.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStopAll = async () => {
    setIsProcessing(true);
    try {
      const res = await window.launcherAPI.stopAll();
      showToast(res.message);
    } catch (e: any) {
      showToast(`Lỗi: ${e.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenGame = () => {
    window.launcherAPI.openGame();
  };

  const handleOpenAdmin = () => {
    window.launcherAPI.openAdmin();
  };

  const handleCheckDatabase = async () => {
    setIsCheckingDb(true);
    try {
      const dbInfo = await window.launcherAPI.checkDatabase();
      if (dbInfo.state === 'CONNECTED') {
        showToast(`✓ ${dbInfo.message}`);
      } else {
        showToast(`✕ Chưa thể kết nối: ${dbInfo.message}`);
      }
    } catch (e: any) {
      showToast(`Lỗi: ${e.message}`);
    } finally {
      setIsCheckingDb(false);
    }
  };

  const handleRunDiagnostics = async () => {
    setIsRunningDiagnostics(true);
    try {
      const report = await window.launcherAPI.runDiagnostics();
      setDiagnostics(report);
      showToast(report.allPassed ? 'Tất cả tiêu chí hệ thống đều đạt!' : 'Phát hiện một số cảnh báo/lỗi hệ thống');
    } catch (e: any) {
      showToast(`Lỗi chẩn đoán: ${e.message}`);
    } finally {
      setIsRunningDiagnostics(false);
    }
  };

  const handleSaveSettings = async (newSettings: Partial<LauncherSettings>) => {
    try {
      const updated = await window.launcherAPI.saveSettings(newSettings);
      setSettings(updated);
      showToast('Đã lưu cấu hình cài đặt thành công');
    } catch (e: any) {
      showToast(`Lỗi lưu cài đặt: ${e.message}`);
    }
  };

  const handleSelectProjectFolder = async () => {
    try {
      const selected = await window.launcherAPI.selectFolder();
      if (selected && settings) {
        handleSaveSettings({ ...settings, projectDir: selected });
      }
    } catch (e: any) {
      showToast(`Lỗi chọn thư mục: ${e.message}`);
    }
  };

  const handleClearLogs = async () => {
    await window.launcherAPI.clearLogs();
    setLogs([]);
    showToast('Đã xóa nội dung hiển thị nhật ký');
  };

  const handleOpenLogFolder = () => {
    window.launcherAPI.openLogFolder();
  };

  const handleCopyLogs = () => {
    const text = logs
      .map((l) => `[${l.timestamp}] [${l.source.toUpperCase()}] [${l.level}] ${l.message}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    showToast('Đã sao chép nhật ký vào Clipboard');
  };

  return (
    <div className="launcher-container">
      {/* Header Bar */}
      <Header
        status={status}
        onStartAll={handleStartAll}
        onStopAll={handleStopAll}
        onOpenGame={handleOpenGame}
        onOpenAdmin={handleOpenAdmin}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        isProcessing={isProcessing}
      />

      {/* Tabs Navigation */}
      <nav className="tabs-nav">
        <button
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Tổng Quan
        </button>
        <button
          className={`tab-btn tab-btn-setup ${activeTab === 'setup' ? 'active' : ''}`}
          onClick={() => setActiveTab('setup')}
        >
          🛠️ Cài Đặt Tự Động
        </button>
        <button
          className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          📜 Nhật Ký Trực Tiếp ({logs.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'diagnostics' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('diagnostics');
            if (!diagnostics) handleRunDiagnostics();
          }}
        >
          🩺 Chẩn Đoán Hệ Thống
        </button>
        <button
          className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          ⚙️ Cài Đặt
        </button>
      </nav>

      {/* Tab Content Body */}
      <main className="tab-content">
        {activeTab === 'overview' && (
          <TabOverview
            status={status}
            onStartService={handleStartService}
            onStopService={handleStopService}
            onRestartService={handleRestartService}
            onCheckDatabase={handleCheckDatabase}
            onOpenExportModal={() => setIsExportModalOpen(true)}
            onNavigateToSetup={() => setActiveTab('setup')}
            isProcessing={isProcessing}
            isCheckingDb={isCheckingDb}
          />
        )}

        {activeTab === 'setup' && (
          <TabSetup
            initialProjectDir={settings?.projectDir}
            onNavigateToOverview={() => setActiveTab('overview')}
            onStartAllAndPlay={handleStartAllAndPlay}
            showToast={showToast}
          />
        )}

        {activeTab === 'logs' && (
          <TabLogs
            logs={logs}
            onClearLogs={handleClearLogs}
            onOpenLogFolder={handleOpenLogFolder}
            onCopyLogs={handleCopyLogs}
          />
        )}

        {activeTab === 'diagnostics' && (
          <TabDiagnostics
            report={diagnostics}
            onRunDiagnostics={handleRunDiagnostics}
            isRunning={isRunningDiagnostics}
          />
        )}

        {activeTab === 'settings' && (
          <TabSettings
            settings={settings}
            onSaveSettings={handleSaveSettings}
            onSelectProjectFolder={handleSelectProjectFolder}
            onOpenLogFolder={handleOpenLogFolder}
          />
        )}
      </main>

      {/* Export Log for AI Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onExportTxt={() => window.launcherAPI.exportLogAiTxt()}
        onExportZip={() => window.launcherAPI.exportLogAiZip()}
        onShowInFolder={(p) => window.launcherAPI.showItemInFolder(p)}
      />

      {/* Floating Toast Notification */}
      {toastMessage && <div className="toast">🔔 {toastMessage}</div>}
    </div>
  );
};
