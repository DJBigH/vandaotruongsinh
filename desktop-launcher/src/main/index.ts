// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Launcher Main Entry Point
// Quản lý cửa sổ Electron, Single-Instance Lock và các kênh IPC
// ============================================================

import path from 'node:path';
import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
import { IPC_CHANNELS, ServiceName, LogSource, LogLevel, LauncherSettings } from '../shared/types';
import { SettingsManager } from './settings-manager';
import { LauncherLogger } from './logger';
import { ProcessSupervisor } from './process-supervisor';
import { TrayManager } from './tray-manager';
import { SystemDiagnostics } from './system-diagnostics';
import { AiLogExporter } from './ai-log-exporter';
import { SetupManager } from './setup-manager';

let mainWindow: BrowserWindow | null = null;
let isQuitting = false;

// 1. Single Instance Lock (Chỉ một phiên launcher duy nhất hoạt động)
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    // Khởi tạo các module lõi
    const settingsManager = SettingsManager.getInstance();
    const logger = LauncherLogger.getInstance();
    const supervisor = ProcessSupervisor.getInstance();

    logger.info('launcher', 'Khởi động ứng dụng Vạn Đạo Trường Sinh Launcher');

    // Xác định đường dẫn Icon ứng dụng
    const iconPath = (() => {
      const fs = require('fs');
      const candidates = [
        path.join(__dirname, '../../build/icon.ico'),
        path.join(process.resourcesPath, 'build/icon.ico'),
        path.join(__dirname, '../../build/icon.png'),
        path.join(process.resourcesPath, 'build/icon.png')
      ];
      for (const p of candidates) {
        if (fs.existsSync(p)) return p;
      }
      return undefined;
    })();

    // Tạo cửa sổ chính
    mainWindow = new BrowserWindow({
      width: 1040,
      height: 720,
      minWidth: 920,
      minHeight: 620,
      title: 'Vạn Đạo Trường Sinh Launcher',
      backgroundColor: '#080f1d',
      autoHideMenuBar: true,
      icon: iconPath,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
    });

    // Xác định đường dẫn Tray Icon chuyên dụng (16x16 / 32x32 độ tương phản cao)
    const trayIconPath = (() => {
      const fs = require('fs');
      const candidates = [
        path.join(__dirname, '../../build/tray-icon.png'),
        path.join(process.resourcesPath, 'build/tray-icon.png'),
        path.join(__dirname, '../../build/tray_icon_16.png'),
        path.join(process.resourcesPath, 'build/tray_icon_16.png'),
        iconPath
      ];
      for (const p of candidates) {
        if (p && fs.existsSync(p)) return p;
      }
      return undefined;
    })();

    // Khởi tạo Tray Icon
    TrayManager.getInstance().init(mainWindow, trayIconPath);

    // Xử lý sự kiện đóng cửa sổ (thu xuống khay hệ thống nếu bật tùy chọn)
    mainWindow.on('close', (event) => {
      if (!isQuitting) {
        TrayManager.getInstance().handleWindowClose(event);
      }
    });

    mainWindow.on('closed', () => {
      mainWindow = null;
    });

    // Đăng ký toàn bộ IPC Handlers
    registerIpcHandlers(supervisor, logger, settingsManager);

    // Tải giao diện Renderer
    const devServerUrl = process.env.VITE_DEV_SERVER_URL;
    if (devServerUrl) {
      await mainWindow.loadURL(devServerUrl);
    } else {
      await mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    }
  });

  app.on('before-quit', async () => {
    isQuitting = true;
    try {
      const supervisor = ProcessSupervisor.getInstance();
      await supervisor.stopAll();
      TrayManager.getInstance().destroy();
    } catch (e) {}
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      const settings = SettingsManager.getInstance().getSettings();
      const status = ProcessSupervisor.getInstance().getStatusSnapshot();
      const isRunning =
        status.services.server.state === 'READY' ||
        status.services.server.state === 'STARTING' ||
        status.services.client.state === 'READY' ||
        status.services.client.state === 'STARTING';

      // Nếu không có dịch vụ nào chạy và không thu nhỏ vào tray, thoát
      if (!isRunning || !settings.minimizeToTrayOnClose) {
        app.quit();
      }
    }
  });
}

function registerIpcHandlers(
  supervisor: ProcessSupervisor,
  logger: LauncherLogger,
  settingsManager: SettingsManager
): void {
  // Trạng thái
  ipcMain.handle(IPC_CHANNELS.GET_STATUS, () => {
    return supervisor.getStatusSnapshot();
  });

  // Điều khiển tiến trình
  ipcMain.handle(IPC_CHANNELS.START_SERVICE, async (_, name: ServiceName) => {
    return supervisor.startService(name);
  });

  ipcMain.handle(IPC_CHANNELS.STOP_SERVICE, async (_, name: ServiceName, force: boolean) => {
    return supervisor.stopService(name, force);
  });

  ipcMain.handle(IPC_CHANNELS.RESTART_SERVICE, async (_, name: ServiceName) => {
    return supervisor.restartService(name);
  });

  ipcMain.handle(IPC_CHANNELS.START_ALL, async () => {
    return supervisor.startAll();
  });

  ipcMain.handle(IPC_CHANNELS.STOP_ALL, async () => {
    return supervisor.stopAll();
  });

  // Mở trình duyệt (Vào game / Mở Admin)
  ipcMain.on(IPC_CHANNELS.OPEN_GAME, () => {
    supervisor.openGame();
  });

  ipcMain.on(IPC_CHANNELS.OPEN_ADMIN, () => {
    supervisor.openAdmin();
  });

  // Cài đặt
  ipcMain.handle(IPC_CHANNELS.GET_SETTINGS, () => {
    return settingsManager.getSettings();
  });

  ipcMain.handle(IPC_CHANNELS.SAVE_SETTINGS, (_, newSettings: Partial<LauncherSettings>) => {
    logger.logAction('LƯU_CÀI_ĐẶT');
    return settingsManager.updateSettings(newSettings);
  });

  // Chẩn đoán
  ipcMain.handle(IPC_CHANNELS.RUN_DIAGNOSTICS, async () => {
    logger.logAction('CHẠY_CHẨN_ĐOÁN_HỆ_THỐNG');
    return SystemDiagnostics.runAll();
  });

  // Nhật ký (Logs)
  ipcMain.handle(IPC_CHANNELS.GET_LOGS, (_, source?: LogSource, level?: LogLevel) => {
    return logger.getEntries(source, level);
  });

  ipcMain.handle(IPC_CHANNELS.CLEAR_LOGS, () => {
    logger.clearMemoryLogs();
  });

  ipcMain.handle(IPC_CHANNELS.OPEN_LOG_FOLDER, () => {
    const logDir = settingsManager.getLogDir();
    shell.openPath(logDir);
  });

  // Xuất log cho AI
  ipcMain.handle(IPC_CHANNELS.EXPORT_LOG_AI_TXT, async () => {
    return AiLogExporter.exportTxt();
  });

  ipcMain.handle(IPC_CHANNELS.EXPORT_LOG_AI_ZIP, async () => {
    return AiLogExporter.exportZip();
  });

  ipcMain.handle(IPC_CHANNELS.SHOW_ITEM_IN_FOLDER, async (_, filePath: string) => {
    if (filePath) {
      shell.showItemInFolder(filePath);
    }
  });

  ipcMain.handle(IPC_CHANNELS.SELECT_FOLDER, async () => {
    if (!mainWindow) return null;
    const res = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Chọn Thư Mục Dự Án Vạn Đạo Trường Sinh',
    });
    if (res.canceled || res.filePaths.length === 0) return null;
    return res.filePaths[0];
  });

  // Cài Đặt Tự Động (Auto-Setup Wizard)
  const setupManager = SetupManager.getInstance();

  ipcMain.handle(IPC_CHANNELS.INSPECT_SETUP, async (_, targetDir?: string) => {
    return setupManager.inspectEnvironment(targetDir);
  });

  ipcMain.handle(IPC_CHANNELS.RUN_AUTO_SETUP, async (_, options) => {
    return setupManager.runAutoSetup(options);
  });

  ipcMain.handle(IPC_CHANNELS.CANCEL_AUTO_SETUP, async () => {
    return setupManager.cancelAutoSetup();
  });
}
