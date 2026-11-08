// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Launcher Settings Manager
// Quản lý lưu trữ cài đặt người dùng trong %APPDATA%
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { app } from 'electron';
import { LauncherSettings } from '../shared/types';

function resolveAppDataDir(): string {
  if (app && typeof app.getPath === 'function') {
    try {
      return app.getPath('appData');
    } catch {}
  }
  return process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
}

function resolveProjectDir(): string {
  if (app && typeof app.getAppPath === 'function') {
    try {
      return path.resolve(app.getAppPath(), '..');
    } catch {}
  }
  return path.resolve(__dirname, '../../..');
}

export class SettingsManager {
  private static instance: SettingsManager;
  private settingsFilePath: string;
  private settings: LauncherSettings;

  private constructor() {
    // Thư mục dữ liệu ứng dụng chuẩn ngoài Program Files: %APPDATA%/VanDaoTruongSinh
    const userDataDir = path.join(resolveAppDataDir(), 'VanDaoTruongSinh');
    if (!fs.existsSync(userDataDir)) {
      fs.mkdirSync(userDataDir, { recursive: true });
    }
    this.settingsFilePath = path.join(userDataDir, 'launcher-settings.json');

    // Xác định thư mục dự án mặc định (thư mục cha của desktop-launcher)
    const defaultProjectDir = resolveProjectDir();

    this.settings = {
      autoOpenBrowser: false,
      minimizeToTrayOnClose: true,
      projectDir: defaultProjectDir,
      serverPort: 3001,
      clientPort: 5173,
      dbHost: '127.0.0.1',
      dbPort: 5432,
      startTimeoutSec: 30,
      stopTimeoutSec: 10,
      desktopNotifications: true,
      maxLogLines: 2000,
      secretRedactionEnabled: true,
      theme: 'dark',
    };

    this.loadSettings();
  }

  public static getInstance(): SettingsManager {
    if (!SettingsManager.instance) {
      SettingsManager.instance = new SettingsManager();
    }
    return SettingsManager.instance;
  }

  public getSettings(): LauncherSettings {
    return { ...this.settings };
  }

  public updateSettings(newSettings: Partial<LauncherSettings>): LauncherSettings {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
    return this.getSettings();
  }

  public getLogDir(): string {
    const logDir = path.join(resolveAppDataDir(), 'VanDaoTruongSinh', 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    return logDir;
  }

  private loadSettings(): void {
    try {
      if (fs.existsSync(this.settingsFilePath)) {
        const data = fs.readFileSync(this.settingsFilePath, 'utf8');
        const parsed = JSON.parse(data);
        this.settings = { ...this.settings, ...parsed };
      } else {
        this.saveSettings();
      }
    } catch (err) {
      console.error('Không thể đọc file cài đặt launcher, sử dụng mặc định:', err);
    }
  }

  private saveSettings(): void {
    try {
      fs.writeFileSync(this.settingsFilePath, JSON.stringify(this.settings, null, 2), 'utf8');
    } catch (err) {
      console.error('Không thể lưu file cài đặt launcher:', err);
    }
  }
}
