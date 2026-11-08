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
  const isCandidate = (dir: string) => {
    try {
      return (
        Boolean(dir) &&
        fs.existsSync(path.join(dir, 'server')) &&
        fs.existsSync(path.join(dir, 'client'))
      );
    } catch {
      return false;
    }
  };

  const candidates: string[] = [];

  // 1. Thư mục thực thi hiện tại (CWD khi chạy từ script .bat hoặc terminal)
  candidates.push(process.cwd());

  // 2. Thư mục Portable Executable nếu chạy bản portable VanDaoLauncher.exe
  if (process.env.PORTABLE_EXECUTABLE_DIR) {
    candidates.push(path.resolve(process.env.PORTABLE_EXECUTABLE_DIR, '../..'));
    candidates.push(path.resolve(process.env.PORTABLE_EXECUTABLE_DIR, '..'));
    candidates.push(process.env.PORTABLE_EXECUTABLE_DIR);
  }

  // 3. Thư mục chứa file exe thực thi (vd: dist-packaged/win-unpacked)
  if (process.execPath) {
    const exeDir = path.dirname(process.execPath);
    candidates.push(path.resolve(exeDir, '../../..'));
    candidates.push(path.resolve(exeDir, '../..'));
    candidates.push(path.resolve(exeDir, '..'));
  }

  // 4. Thư mục Electron app path
  if (app && typeof app.getAppPath === 'function') {
    try {
      const appPath = app.getAppPath();
      candidates.push(path.resolve(appPath, '../../../..'));
      candidates.push(path.resolve(appPath, '../../..'));
      candidates.push(path.resolve(appPath, '../..'));
      candidates.push(path.resolve(appPath, '..'));
    } catch {}
  }

  // 5. Thư mục tương đối với code __dirname (src/main hoặc dist/main)
  candidates.push(path.resolve(__dirname, '../../..'));
  candidates.push(path.resolve(__dirname, '../..'));

  for (const c of candidates) {
    if (isCandidate(c)) return c;
  }

  return process.cwd();
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

        // Nếu projectDir đã lưu không còn tồn tại hoặc thiếu server/client, tự động nhận diện lại
        if (!fs.existsSync(path.join(this.settings.projectDir, 'server'))) {
          this.settings.projectDir = resolveProjectDir();
          this.saveSettings();
        }
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
