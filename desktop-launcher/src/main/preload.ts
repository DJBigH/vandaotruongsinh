// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Launcher Preload Script
// Cầu nối bảo mật (Context Bridge) giữa Main và Renderer
// Không cấp quyền nodeIntegration, chỉ expose API an toàn
// ============================================================

import { contextBridge, ipcRenderer } from 'electron';
import {
  IPC_CHANNELS,
  ServiceName,
  LogSource,
  LogLevel,
  LauncherSettings,
  DatabaseInfo,
  DiagnosticReport,
  SystemStatusSnapshot,
  ExportLogResult,
  LogEntry,
  SetupInspection,
  SetupProgressPayload,
  SetupLogPayload,
  SetupRunOptions,
} from '../shared/types';

const api = {
  // Trạng thái hệ thống
  getStatus: (): Promise<SystemStatusSnapshot> => {
    return ipcRenderer.invoke(IPC_CHANNELS.GET_STATUS);
  },
  onStatusUpdate: (callback: (status: SystemStatusSnapshot) => void) => {
    const handler = (_: any, status: SystemStatusSnapshot) => callback(status);
    ipcRenderer.on(IPC_CHANNELS.STATUS_UPDATE, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.STATUS_UPDATE, handler);
  },

  // Điều khiển dịch vụ
  startService: (name: ServiceName): Promise<{ success: boolean; message: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.START_SERVICE, name);
  },
  stopService: (name: ServiceName, force?: boolean): Promise<{ success: boolean; message: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.STOP_SERVICE, name, force);
  },
  restartService: (name: ServiceName): Promise<{ success: boolean; message: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.RESTART_SERVICE, name);
  },
  startAll: (): Promise<{ success: boolean; message: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.START_ALL);
  },
  stopAll: (): Promise<{ success: boolean; message: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.STOP_ALL);
  },

  // Vào game & Mở Admin
  openGame: (): void => {
    ipcRenderer.send(IPC_CHANNELS.OPEN_GAME);
  },
  openAdmin: (): void => {
    ipcRenderer.send(IPC_CHANNELS.OPEN_ADMIN);
  },

  // Cài đặt
  getSettings: (): Promise<LauncherSettings> => {
    return ipcRenderer.invoke(IPC_CHANNELS.GET_SETTINGS);
  },
  saveSettings: (settings: Partial<LauncherSettings>): Promise<LauncherSettings> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SAVE_SETTINGS, settings);
  },

  // Chẩn đoán hệ thống
  runDiagnostics: (): Promise<DiagnosticReport> => {
    return ipcRenderer.invoke(IPC_CHANNELS.RUN_DIAGNOSTICS);
  },
  checkDatabase: (): Promise<DatabaseInfo> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CHECK_DATABASE);
  },

  // Nhật ký (Logs)
  getLogs: (source?: LogSource, level?: LogLevel): Promise<LogEntry[]> => {
    return ipcRenderer.invoke(IPC_CHANNELS.GET_LOGS, source, level);
  },
  onNewLogEntry: (callback: (entry: LogEntry) => void) => {
    const handler = (_: any, entry: LogEntry) => callback(entry);
    ipcRenderer.on(IPC_CHANNELS.NEW_LOG_ENTRY, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.NEW_LOG_ENTRY, handler);
  },
  clearLogs: (): Promise<void> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CLEAR_LOGS);
  },
  openLogFolder: (): Promise<void> => {
    return ipcRenderer.invoke(IPC_CHANNELS.OPEN_LOG_FOLDER);
  },

  // Xuất log cho AI
  exportLogAiTxt: (): Promise<ExportLogResult> => {
    return ipcRenderer.invoke(IPC_CHANNELS.EXPORT_LOG_AI_TXT);
  },
  exportLogAiZip: (): Promise<ExportLogResult> => {
    return ipcRenderer.invoke(IPC_CHANNELS.EXPORT_LOG_AI_ZIP);
  },
  showItemInFolder: (filePath: string): Promise<void> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SHOW_ITEM_IN_FOLDER, filePath);
  },
  selectFolder: (): Promise<string | null> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SELECT_FOLDER);
  },

  // Cài Đặt Tự Động (Auto-Setup Wizard)
  inspectSetup: (projectDir?: string): Promise<SetupInspection> => {
    return ipcRenderer.invoke(IPC_CHANNELS.INSPECT_SETUP, projectDir);
  },
  runAutoSetup: (
    options: SetupRunOptions
  ): Promise<{ success: boolean; message: string; inspection: SetupInspection }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.RUN_AUTO_SETUP, options);
  },
  cancelAutoSetup: (): Promise<{ success: boolean; message: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CANCEL_AUTO_SETUP);
  },
  onSetupProgress: (callback: (payload: SetupProgressPayload) => void) => {
    const handler = (_: any, payload: SetupProgressPayload) => callback(payload);
    ipcRenderer.on(IPC_CHANNELS.SETUP_PROGRESS, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.SETUP_PROGRESS, handler);
  },
  onSetupLog: (callback: (log: SetupLogPayload) => void) => {
    const handler = (_: any, log: SetupLogPayload) => callback(log);
    ipcRenderer.on(IPC_CHANNELS.SETUP_LOG, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.SETUP_LOG, handler);
  },
};

contextBridge.exposeInMainWorld('launcherAPI', api);

export type LauncherAPI = typeof api;
