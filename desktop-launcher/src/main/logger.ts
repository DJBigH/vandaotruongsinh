// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Launcher Logger & Secret Redactor
// Ghi nhận log đa luồng, làm sạch mã ANSI, che dấu thông tin nhạy cảm
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { BrowserWindow } from 'electron';
import { LogEntry, LogSource, LogLevel, UserActionRecord, IPC_CHANNELS } from '../shared/types';
import { SettingsManager } from './settings-manager';

// ANSI escape code regex pattern
const ANSI_REGEX = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;

const QUOTED_LOG_VALUE = /"(?:[^"\\\r\n]|\\.)*"|'(?:[^'\\\r\n]|\\.)*'/.source;
const LOG_COOKIE_FIELD = new RegExp(
  String.raw`(["'](?:set-cookie|cookie)["']\s*:\s*)(?:\[\s*(?:(?:${QUOTED_LOG_VALUE})\s*(?:,\s*(?:${QUOTED_LOG_VALUE})\s*)*)?\]|${QUOTED_LOG_VALUE})`,
  'gi',
);
const LOG_PASSWORD_FIELD = new RegExp(
  String.raw`(\b(?:password|passwordHash|DB_PASSWORD|JWT_SECRET|mật[ \t]+khẩu)["']?[ \t]*[:=][ \t]*)(${QUOTED_LOG_VALUE}|[^\s"']+)`,
  'gi',
);

export class LauncherLogger {
  private static instance: LauncherLogger;
  private runId: string;
  private logEntries: LogEntry[] = [];
  private userActions: UserActionRecord[] = [];
  private logDir: string;
  private maxMemoryEntries: number = 2000;
  private nextEntryId: number = 1;
  private userHomeRegex: RegExp;

  private firstError: string | null = null;
  private latestError: string | null = null;
  private errorCount: number = 0;

  private constructor() {
    this.runId = `run_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.logDir = SettingsManager.getInstance().getLogDir();

    // Regex che thư mục cá nhân người dùng Windows (C:\Users\Username)
    const homeDir = os.homedir();
    const escapedHome = homeDir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    this.userHomeRegex = new RegExp(escapedHome, 'gi');

    // Khởi tạo các file log
    this.ensureLogFiles();
  }

  public static getInstance(): LauncherLogger {
    if (!LauncherLogger.instance) {
      LauncherLogger.instance = new LauncherLogger();
    }
    return LauncherLogger.instance;
  }

  public getRunId(): string {
    return this.runId;
  }

  public logAction(action: string, details?: string): void {
    const record: UserActionRecord = {
      timestamp: new Date().toISOString(),
      action: this.redactSecrets(action),
      details: details ? this.redactSecrets(details) : details,
    };
    this.userActions.push(record);
    if (this.userActions.length > 50) {
      this.userActions.shift();
    }
    this.info('launcher', `[THAO TÁC] ${action}${details ? ` (${details})` : ''}`, 'USER_ACTION');
  }

  public info(source: LogSource, message: string, event?: string, pid?: number): void {
    this.appendEntry(source, 'INFO', message, event, pid);
  }

  public warn(source: LogSource, message: string, event?: string, pid?: number): void {
    this.appendEntry(source, 'WARN', message, event, pid);
  }

  public error(source: LogSource, message: string, event?: string, pid?: number, stack?: string, errorCode?: string): void {
    this.errorCount++;
    const cleanMsg = this.redactSecrets(message);
    if (!this.firstError) {
      this.firstError = cleanMsg;
    }
    this.latestError = cleanMsg;
    this.appendEntry(source, 'ERROR', message, event, pid, stack, errorCode);
  }

  public debug(source: LogSource, message: string, event?: string, pid?: number): void {
    this.appendEntry(source, 'DEBUG', message, event, pid);
  }

  public getEntries(sourceFilter?: LogSource, levelFilter?: LogLevel): LogEntry[] {
    return this.logEntries.filter(entry => {
      if (sourceFilter && entry.source !== sourceFilter) return false;
      if (levelFilter && entry.level !== levelFilter) return false;
      return true;
    });
  }

  public getMemoryLogs(): LogEntry[] {
    return this.getEntries();
  }

  public getRecentActions(): UserActionRecord[] {
    return [...this.userActions];
  }

  public getErrorSummary() {
    return {
      firstError: this.firstError,
      latestError: this.latestError,
      errorCount: this.errorCount,
    };
  }

  public clearMemoryLogs(): void {
    this.logEntries = [];
  }

  /**
   * Che dấu thông tin nhạy cảm: Password, JWT, Cookie, Token, Database URL, User Dir
   */
  public sanitize(input: string): string {
    return this.redactSecrets(input);
  }

  public redactSecrets(input: string): string {
    if (!input) return input;

    let text = input.replace(ANSI_REGEX, '');

    // 1. Che thư mục cá nhân người dùng
    text = text.replace(this.userHomeRegex, '<USER_DIR>');

    // Apostrophes are valid in user info. After the authority they can delimit a quoted URL.
    text = text.replace(/postgres(?:ql)?:\/\/(?:[^:\s"<>/?#]*:[^\s"<>/?#]*@)?[^\s"'<>]+/gi, (value) => {
      try {
        const url = new URL(value);
        if (!url.password) return value;
        url.password = '***';
        return url.toString();
      } catch {
        return '<POSTGRES_URL_REDACTED>';
      }
    });

    // 3. Che Bearer Authorization header
    text = text.replace(/Bearer\s+[A-Za-z0-9._~+/-]+/gi, 'Bearer ***');

    // 4. Che JWT tokens (3 phần base64 phân cách bởi dấu chấm)
    text = text.replace(/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g, '***JWT***');

    // Redact quoted and unquoted passwords and configuration secrets.
    text = text.replace(LOG_PASSWORD_FIELD, (_match, field: string, value: string) => {
      const quote = value.startsWith('"') || value.startsWith("'") ? value[0] : '';
      return `${field}${quote}***REDACTED***${quote}`;
    });

    // Redact complete Cookie/Set-Cookie headers, including structured log fields.
    text = text.replace(LOG_COOKIE_FIELD, '$1"<COOKIE_REDACTED>"');
    text = text.replace(/(\b(?:set-cookie|cookie)\s*:[ \t]*)[^\r\n]+/gi, '$1<COOKIE_REDACTED>');
    text = text.replace(/(token=)([^;,\s]+)/gi, '$1<COOKIE_TOKEN_REDACTED>');

    return text;
  }

  private appendEntry(
    source: LogSource,
    level: LogLevel,
    rawMessage: string,
    event?: string,
    pid?: number,
    stack?: string,
    errorCode?: string,
    exitCode?: number
  ): void {
    const cleanMessage = this.redactSecrets(rawMessage);
    const cleanStack = stack ? this.redactSecrets(stack) : undefined;
    const nowIso = new Date().toISOString();

    const entry: LogEntry = {
      id: `log_${this.nextEntryId++}`,
      runId: this.runId,
      timestamp: nowIso,
      source,
      level,
      event,
      message: cleanMessage,
      pid,
      errorCode,
      exitCode,
      stack: cleanStack,
      observedAt: nowIso,
    };

    // Lưu vào buffer bộ nhớ
    this.logEntries.push(entry);
    if (this.logEntries.length > this.maxMemoryEntries) {
      this.logEntries.shift();
    }

    // Ghi vào file log đĩa cứng
    this.writeToFile(source, entry);

    // Gửi sự kiện real-time sang renderer
    this.broadcastLogEntry(entry);
  }

  private broadcastLogEntry(entry: LogEntry): void {
    try {
      if (!BrowserWindow || typeof BrowserWindow.getAllWindows !== 'function') return;
      const windows = BrowserWindow.getAllWindows();
      for (const win of windows) {
        if (!win.isDestroyed()) {
          win.webContents.send(IPC_CHANNELS.NEW_LOG_ENTRY, entry);
        }
      }
    } catch {}
  }

  private writeToFile(source: LogSource, entry: LogEntry): void {
    try {
      const fileName = `${source}.log`;
      const filePath = path.join(this.logDir, fileName);

      // Định dạng dòng log chuẩn UTF-8
      const logLine = `[${entry.timestamp}] [${entry.level}] ${entry.event ? `[${entry.event}] ` : ''}${entry.message}${entry.stack ? `\n${entry.stack}` : ''}\n`;

      // Kiểm tra dung lượng file để xoay vòng (rotation nếu > 10MB)
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        if (stats.size > 10 * 1024 * 1024) {
          const rotatedPath = path.join(this.logDir, `${source}.1.log`);
          if (fs.existsSync(rotatedPath)) {
            fs.unlinkSync(rotatedPath);
          }
          fs.renameSync(filePath, rotatedPath);
        }
      }

      fs.appendFileSync(filePath, logLine, 'utf8');
    } catch (err) {
      // Bỏ qua lỗi ghi file để không làm sập tiến trình
    }
  }

  private ensureLogFiles(): void {
    const sources: LogSource[] = ['launcher', 'server', 'client'];
    for (const src of sources) {
      const filePath = path.join(this.logDir, `${src}.log`);
      if (!fs.existsSync(filePath)) {
        try {
          fs.writeFileSync(filePath, `--- VẠN ĐẠO TRƯỜNG SINH [${src.toUpperCase()}] NHẬT KÝ KHỞI TẠO [${new Date().toISOString()}] ---\n`, 'utf8');
        } catch (e) {}
      }
    }
  }
}
