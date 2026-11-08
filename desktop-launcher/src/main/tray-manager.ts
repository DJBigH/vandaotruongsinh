// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Launcher System Tray Manager
// Quản lý biểu tượng khay hệ thống, menu ngữ cảnh & thu nhỏ cửa sổ
// ============================================================

import path from 'node:path';
import { app, Tray, Menu, BrowserWindow, nativeImage, Notification, NativeImage } from 'electron';
import { ProcessSupervisor } from './process-supervisor';
import { SettingsManager } from './settings-manager';

export class TrayManager {
  private static instance: TrayManager;
  private tray: Tray | null = null;
  private mainWindow: BrowserWindow | null = null;
  private hasShownTrayNotification: boolean = false;

  private constructor() {}

  public static getInstance(): TrayManager {
    if (!TrayManager.instance) {
      TrayManager.instance = new TrayManager();
    }
    return TrayManager.instance;
  }

  public init(mainWindow: BrowserWindow, iconPath?: string): void {
    this.mainWindow = mainWindow;

    // Tạo icon khay hệ thống (nếu không có file icon, tạo icon 16x16 pixel màu xanh ngọc)
    let trayIcon: NativeImage;
    if (iconPath && require('fs').existsSync(iconPath)) {
      trayIcon = nativeImage.createFromPath(iconPath);
    } else {
      // 16x16 cyan dot
      trayIcon = nativeImage.createFromBuffer(
        Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYPj/n4EAYGQgEjDOMIomgGkcbQA7H4yGAYMRMPABo2EwGgYgYMCUBgCskA/l4Xq67AAAAABJRU5ErkJggg==',
          'base64'
        )
      );
    }

    this.tray = new Tray(trayIcon);
    this.tray.setToolTip('Vạn Đạo Trường Sinh Launcher');

    this.updateContextMenu();

    // Nhấp đúp vào tray icon để mở lại cửa sổ
    this.tray.on('double-click', () => {
      this.showWindow();
    });
  }

  public updateContextMenu(): void {
    if (!this.tray) return;

    const supervisor = ProcessSupervisor.getInstance();
    const status = supervisor.getStatusSnapshot();

    const contextMenu = Menu.buildFromTemplate([
      {
        label: '⚔️ VẠN ĐẠO TRƯỜNG SINH',
        enabled: false,
      },
      { type: 'separator' },
      {
        label: `Server: ${status.services.server.state}`,
        enabled: false,
      },
      {
        label: `Client: ${status.services.client.state}`,
        enabled: false,
      },
      { type: 'separator' },
      {
        label: '🖥️ Mở Cửa Sổ Launcher',
        click: () => this.showWindow(),
      },
      {
        label: '🎮 Vào Game',
        click: () => supervisor.openGame(),
      },
      {
        label: '🛑 Dừng Tất Cả Dịch Vụ',
        click: () => supervisor.stopAll(),
      },
      { type: 'separator' },
      {
        label: '❌ Thoát Hoàn Toàn',
        click: async () => {
          await supervisor.stopAll();
          app.exit(0);
        },
      },
    ]);

    this.tray.setContextMenu(contextMenu);
  }

  public showWindow(): void {
    if (this.mainWindow) {
      if (this.mainWindow.isMinimized()) this.mainWindow.restore();
      this.mainWindow.show();
      this.mainWindow.focus();
    }
  }

  public handleWindowClose(event: Electron.Event): void {
    const settings = SettingsManager.getInstance().getSettings();
    const supervisor = ProcessSupervisor.getInstance();
    const status = supervisor.getStatusSnapshot();

    const isRunning =
      status.services.server.state === 'READY' ||
      status.services.server.state === 'STARTING' ||
      status.services.client.state === 'READY' ||
      status.services.client.state === 'STARTING';

    // Nếu dịch vụ đang chạy và bật minimizeToTrayOnClose
    if (isRunning && settings.minimizeToTrayOnClose) {
      event.preventDefault();
      this.mainWindow?.hide();

      if (!this.hasShownTrayNotification) {
        this.hasShownTrayNotification = true;
        if (Notification.isSupported()) {
          new Notification({
            title: 'Vạn Đạo Trường Sinh Launcher',
            body: 'Trình khởi chạy đã được thu nhỏ xuống khay hệ thống. Dịch vụ Game vẫn đang tiếp tục chạy ngầm.',
          }).show();
        }
      }
    }
  }

  public destroy(): void {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
  }
}
