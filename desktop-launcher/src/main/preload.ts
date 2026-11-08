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
  DiagnosticReport,
  SystemStatusSnapshot,
  ExportLogResult,
  LogEntry,
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
};

contextBridge.exposeInMainWorld('launcherAPI', api);

export type LauncherAPI = typeof api;
