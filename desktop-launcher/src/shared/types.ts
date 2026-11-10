// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Launcher Shared Types
// Định nghĩa trạng thái dịch vụ, cấu hình, sự kiện và log schema
// ============================================================

export type ServiceName = 'server' | 'client';

export type ServiceState =
  | 'STOPPED'            // Đã dừng
  | 'STARTING'           // Đang khởi động
  | 'READY'              // Sẵn sàng
  | 'RUNNING_UNREADY'    // Đang chạy nhưng chưa sẵn sàng
  | 'STOPPING'           // Đang dừng
  | 'ERROR'              // Lỗi
  | 'EXTERNAL_RUNNING';  // Đang chạy bên ngoài launcher

export interface ServiceInfo {
  name: ServiceName;
  displayName: string;
  state: ServiceState;
  port: number;
  url: string;
  pid: number | null;
  isManagedByLauncher: boolean;
  startTime: number | null;
  uptimeSec: number;
  lastReadyTime: number | null;
  lastError: string | null;
  lastErrorTime: number | null;
}

export interface DatabaseInfo {
  host: string;
  port: number;
  state: 'CONNECTED' | 'DISCONNECTED' | 'UNCHECKED' | 'CHECKING';
  lastCheckedTime: number | null;
  message: string;
}

export type LogSource = 'launcher' | 'server' | 'client';
export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

export interface LogEntry {
  id: string;
  runId: string;
  timestamp: string;      // ISO string
  source: LogSource;
  level: LogLevel;
  event?: string;
  message: string;
  pid?: number;
  errorCode?: string;
  exitCode?: number;
  stack?: string;
  observedAt?: string;
}

export interface UserActionRecord {
  timestamp: string;
  action: string;
  details?: string;
}

export interface LauncherSettings {
  autoOpenBrowser: boolean;
  minimizeToTrayOnClose: boolean;
  projectDir: string;
  serverPort: number;
  clientPort: number;
  dbHost: string;
  dbPort: number;
  startTimeoutSec: number;
  stopTimeoutSec: number;
  desktopNotifications: boolean;
  maxLogLines: number;
  secretRedactionEnabled: boolean;
  theme: 'dark' | 'light';
}

export interface DiagnosticItem {
  id: string;
  name: string;
  category: 'RUNTIME' | 'NETWORK' | 'FILESYSTEM' | 'DATABASE' | 'API';
  status: 'PASS' | 'WARN' | 'FAIL' | 'CHECKING';
  message: string;
  detail?: string;
  recommendation?: string;
}

export interface DiagnosticReport {
  timestamp: string;
  items: DiagnosticItem[];
  allPassed: boolean;
}

export interface ExportLogResult {
  success: boolean;
  filePath?: string;
  fileName?: string;
  error?: string;
}

export interface SystemStatusSnapshot {
  launcherVersion: string;
  gameVersion: string;
  isPackaged: boolean;
  osInfo: {
    platform: string;
    release: string;
    arch: string;
  };
  runId: string;
  services: {
    server: ServiceInfo;
    client: ServiceInfo;
  };
  database: DatabaseInfo;
  recentActions: UserActionRecord[];
  lastErrorSummary: {
    firstError: string | null;
    latestError: string | null;
    errorCount: number;
  };
}

// ============================================================
// AUTO-SETUP WIZARD TYPES (Cài Đặt Tự Động Cho Người Mới Clone)
// ============================================================

export interface SetupInspection {
  projectDir: string;
  isValidProjectDir: boolean;
  nodeVersion: string | null;
  npmVersion: string | null;
  hasSharedFolder: boolean;
  hasServerFolder: boolean;
  hasClientFolder: boolean;
  hasSharedModules: boolean;
  hasServerModules: boolean;
  hasClientModules: boolean;
  hasServerEnv: boolean;
  isDbRunning: boolean;
  missingItems: string[];
  isReadyToPlay: boolean;
}

export type SetupStepStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'SKIPPED';

export interface SetupStep {
  id: string;
  title: string;
  status: SetupStepStatus;
  message?: string;
  durationMs?: number;
}

export interface SetupProgressPayload {
  activeStepId: string | null;
  steps: SetupStep[];
  isComplete: boolean;
  hasError: boolean;
  errorMessage?: string;
  isReadyToPlay?: boolean;
}

export interface SetupLogPayload {
  text: string;
  stream: 'stdout' | 'stderr' | 'info';
  timestamp: string;
}

export interface SetupRunOptions {
  projectDir?: string;
  forceReinstall?: boolean;
  syncDatabase?: boolean;
}

// IPC Channel Names
export const IPC_CHANNELS = {
  GET_STATUS: 'launcher:get-status',
  STATUS_UPDATE: 'launcher:status-update',
  START_SERVICE: 'launcher:start-service',
  STOP_SERVICE: 'launcher:stop-service',
  RESTART_SERVICE: 'launcher:restart-service',
  FORCE_STOP_SERVICE: 'launcher:force-stop-service',
  START_ALL: 'launcher:start-all',
  STOP_ALL: 'launcher:stop-all',
  OPEN_GAME: 'launcher:open-game',
  OPEN_ADMIN: 'launcher:open-admin',
  GET_SETTINGS: 'launcher:get-settings',
  SAVE_SETTINGS: 'launcher:save-settings',
  RUN_DIAGNOSTICS: 'launcher:run-diagnostics',
  GET_LOGS: 'launcher:get-logs',
  NEW_LOG_ENTRY: 'launcher:new-log-entry',
  CLEAR_LOGS: 'launcher:clear-logs',
  OPEN_LOG_FOLDER: 'launcher:open-log-folder',
  EXPORT_LOG_AI_TXT: 'launcher:export-log-ai-txt',
  EXPORT_LOG_AI_ZIP: 'launcher:export-log-ai-zip',
  SHOW_ITEM_IN_FOLDER: 'launcher:show-item-in-folder',
  SELECT_FOLDER: 'launcher:select-folder',
  CHECK_DATABASE: 'launcher:check-database',
  // Kênh IPC mới cho Cài Đặt Tự Động (Auto-Setup)
  INSPECT_SETUP: 'launcher:inspect-setup',
  RUN_AUTO_SETUP: 'launcher:run-auto-setup',
  CANCEL_AUTO_SETUP: 'launcher:cancel-auto-setup',
  SETUP_PROGRESS: 'launcher:setup-progress',
  SETUP_LOG: 'launcher:setup-log',
} as const;
