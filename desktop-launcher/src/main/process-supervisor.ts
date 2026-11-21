// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Launcher Process Supervisor
// Quản lý an toàn vòng đời tiến trình Server (3001) & Client (5173)
// Đảm bảo chỉ dừng tiến trình thuộc quyền quản lý của Launcher.
// ============================================================

import { ChildProcess, spawn, exec } from 'node:child_process';
import { probeGameService } from './game-readiness';
import net from 'node:net';
import path from 'node:path';
import { StringDecoder } from 'node:string_decoder';
import { promisify } from 'node:util';
import { app, BrowserWindow, shell } from 'electron';
import { parse } from 'dotenv';
import { readBackendEnvironment } from '../shared/backend-environment';
import {
  ServiceName,
  ServiceState,
  ServiceInfo,
  DatabaseInfo,
  SystemStatusSnapshot,
  IPC_CHANNELS,
} from '../shared/types';
import { SettingsManager } from './settings-manager';
import { LauncherLogger } from './logger';
import { SystemDiagnostics } from './system-diagnostics';

const execAsync = promisify(exec);

export class ProcessSupervisor {
  private static instance: ProcessSupervisor;
  private logger: LauncherLogger;
  private settingsManager: SettingsManager;

  // Tiến trình con thuộc quyền sở hữu của launcher
  private serverProc: ChildProcess | null = null;
  private clientProc: ChildProcess | null = null;
  private wslKeepaliveProc: ChildProcess | null = null;

  // Thông tin trạng thái
  private serverInfo: ServiceInfo;
  private clientInfo: ServiceInfo;
  private databaseInfo: DatabaseInfo;

  // Khóa ngăn chặn thao tác trùng lặp (Concurrency Mutex)
  private isStartingAll: boolean = false;
  private isStoppingAll: boolean = false;

  // Timer kiểm tra định kỳ (Watchdog / Health Check)
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private uptimeTimer: NodeJS.Timeout | null = null;
  private databaseWarmupTimer: NodeJS.Timeout | null = null;

  private constructor() {
    this.logger = LauncherLogger.getInstance();
    this.settingsManager = SettingsManager.getInstance();
    const settings = this.settingsManager.getSettings();

    this.serverInfo = {
      name: 'server',
      displayName: 'Máy Chủ Backend (API & WebSocket)',
      state: 'STOPPED',
      port: settings.serverPort,
      url: `http://127.0.0.1:${settings.serverPort}`,
      pid: null,
      isManagedByLauncher: false,
      startTime: null,
      uptimeSec: 0,
      lastReadyTime: null,
      lastError: null,
      lastErrorTime: null,
    };

    this.clientInfo = {
      name: 'client',
      displayName: 'Giao Diện Trò Chơi (Vite Web Client)',
      state: 'STOPPED',
      port: settings.clientPort,
      url: `http://127.0.0.1:${settings.clientPort}`,
      pid: null,
      isManagedByLauncher: false,
      startTime: null,
      uptimeSec: 0,
      lastReadyTime: null,
      lastError: null,
      lastErrorTime: null,
    };

    this.databaseInfo = {
      host: settings.dbHost,
      port: settings.dbPort,
      state: 'UNCHECKED',
      lastCheckedTime: null,
      message: 'Chưa kiểm tra (Sẽ tự động thăm dò khi khởi động hoặc chẩn đoán)',
    };

    // Bắt đầu vòng lặp theo dõi
    this.startWatchdog();

    // Tự động kiểm tra và đánh thức PostgreSQL ngay khi Launcher khởi động
    this.databaseWarmupTimer = setTimeout(() => {
      this.ensureDatabaseRunning().catch(() => {});
    }, 500);
  }

  public static getInstance(): ProcessSupervisor {
    if (!ProcessSupervisor.instance) {
      ProcessSupervisor.instance = new ProcessSupervisor();
    }
    return ProcessSupervisor.instance;
  }

  // ============================================================
  // PUBLIC API THAO TÁC TIẾN TRÌNH
  // ============================================================

  public async startService(name: ServiceName): Promise<{ success: boolean; message: string }> {
    this.logger.logAction(`BẬT_${name.toUpperCase()}`);

    if (name === 'server') {
      return this.doStartServer();
    } else {
      return this.doStartClient();
    }
  }

  public async stopService(name: ServiceName, force: boolean = false): Promise<{ success: boolean; message: string }> {
    this.logger.logAction(`TẮT_${name.toUpperCase()}${force ? '_BUỘC_DỪNG' : ''}`);

    if (name === 'server') {
      return this.doStopServer(force);
    } else {
      return this.doStopClient(force);
    }
  }

  public async restartService(name: ServiceName): Promise<{ success: boolean; message: string }> {
    this.logger.logAction(`KHỞI_ĐỘNG_LẠI_${name.toUpperCase()}`);
    await this.stopService(name, false);
    // Chờ 1.5 giây để cổng hoàn toàn giải phóng
    await new Promise(r => setTimeout(r, 1500));
    return this.startService(name);
  }

  public async startAll(): Promise<{ success: boolean; message: string }> {
    if (this.isStartingAll) {
      return { success: false, message: 'Đang trong quá trình khởi động, xin vui lòng đợi...' };
    }
    this.isStartingAll = true;
    this.logger.logAction('KHỞI_ĐỘNG_TẤT_CẢ');

    try {
      // 1. Kiểm tra cơ sở dữ liệu trước
      await this.checkDatabaseState();
      if (this.databaseInfo.state === 'DISCONNECTED') {
        this.logger.warn('launcher', 'Cơ sở dữ liệu PostgreSQL chưa phản hồi cổng 5432. Vẫn tiến hành thử bật Backend...');
      }

      // 2. Khởi động Backend trước
      if (this.serverInfo.state !== 'READY' && this.serverInfo.state !== 'EXTERNAL_RUNNING') {
        const sRes = await this.doStartServer();
        if (!sRes.success) {
          this.isStartingAll = false;
          return {
            success: false,
            message: `Khởi động Máy chủ thất bại: ${sRes.message}. Giao diện Client chưa được bật.`,
          };
        }
      }

      // 3. Khởi động Frontend
      if (this.clientInfo.state !== 'READY' && this.clientInfo.state !== 'EXTERNAL_RUNNING') {
        const cRes = await this.doStartClient();
        if (!cRes.success) {
          this.isStartingAll = false;
          return {
            success: false,
            message: `Máy chủ đã sẵn sàng nhưng Giao diện Client gặp sự cố: ${cRes.message}`,
          };
        }
      }

      // 4. Mở trình duyệt nếu bật tùy chọn autoOpenBrowser
      const settings = this.settingsManager.getSettings();
      if (settings.autoOpenBrowser) {
        await this.openGame();
      }

      this.isStartingAll = false;
      return { success: true, message: 'Cả Server và Client đã khởi động thành công và sẵn sàng!' };
    } catch (err: any) {
      this.isStartingAll = false;
      return { success: false, message: `Lỗi bất ngờ khi khởi động tất cả: ${err.message}` };
    }
  }

  public async stopAll(): Promise<{ success: boolean; message: string }> {
    if (this.isStoppingAll) {
      return { success: false, message: 'Đang trong quá trình dừng dịch vụ...' };
    }
    this.isStoppingAll = true;
    this.logger.logAction('DỪNG_TẤT_CẢ');

    try {
      await Promise.all([
        this.doStopClient(false),
        this.doStopServer(false),
      ]);
      this.isStoppingAll = false;
      return { success: true, message: 'Đã dừng an toàn toàn bộ các dịch vụ do Launcher quản lý.' };
    } catch (err: any) {
      this.isStoppingAll = false;
      return { success: false, message: `Lỗi khi dừng dịch vụ: ${err.message}` };
    }
  }

  public openGame(): Promise<boolean> { return this.openClientPage(''); }

  public openAdmin(): Promise<boolean> { return this.openClientPage('/admin'); }

  private async openClientPage(route: string): Promise<boolean> {
    const port = this.settingsManager.getSettings().clientPort;
    if (!await this.probeClientReadiness(port)) {
      this.logger.warn('client', `Không tìm thấy giao diện Vạn Đạo Trường Sinh tại cổng ${port}.`);
      return false;
    }
    const url = `http://127.0.0.1:${port}${route}`;
    this.logger.logAction(route ? 'MỞ_ADMIN' : 'VÀO_GAME', url);
    try { await shell.openExternal(url); return true; }
    catch { this.logger.warn('client', 'Không thể mở trình duyệt.'); return false; }
  }

  public getStatusSnapshot(): SystemStatusSnapshot {
    return {
      launcherVersion: '1.0.5',
      gameVersion: '1.0.5',
      isPackaged: app?.isPackaged ?? false,
      osInfo: {
        platform: process.platform,
        release: process.release?.name || 'win32',
        arch: process.arch,
      },
      runId: this.logger.getRunId(),
      services: {
        server: { ...this.serverInfo },
        client: { ...this.clientInfo },
      },
      database: { ...this.databaseInfo },
      recentActions: this.logger.getRecentActions(),
      lastErrorSummary: this.logger.getErrorSummary(),
    };
  }

  // ============================================================
  // LOGIC KHỞI ĐỘNG VÀ DỪNG CHI TIẾT
  // ============================================================

  private async doStartServer(): Promise<{ success: boolean; message: string }> {
    const settings = this.settingsManager.getSettings();
    const port = settings.serverPort;
    if (this.serverProc && this.serverInfo.port !== port) {
      return { success: false, message: 'Hãy dừng dịch vụ đang quản lý trước khi đổi cổng.' };
    }
    this.serverInfo.port = port;
    this.serverInfo.url = `http://127.0.0.1:${port}`;

    // Kiểm tra xem cổng cấu hình đã có tiến trình nào đang lắng nghe chưa
    const isPortOpen = await this.probePort(port);
    if (isPortOpen) {
      // Kiểm tra xem có phải server game của mình đang chạy ngoài launcher không
      const isOurServer = await this.probeServerReadiness(port);
      if (isOurServer) {
        if (this.serverProc && this.serverInfo.isManagedByLauncher) {
          this.serverInfo.state = 'READY';
          return { success: true, message: 'Dịch vụ đang chạy dưới quyền quản lý của launcher.' };
        }
        this.serverInfo.state = 'EXTERNAL_RUNNING';
        this.serverInfo.isManagedByLauncher = false;
        this.serverInfo.lastReadyTime = Date.now();
        this.broadcastStatus();
        this.logger.info('server', `Máy chủ game đã được phát hiện đang chạy bên ngoài launcher tại cổng ${port}.`);
        return { success: true, message: 'Máy chủ đang chạy sẵn bên ngoài launcher.' };
      } else {
        this.serverInfo.state = 'ERROR';
        this.serverInfo.lastError = `Cổng ${port} đã bị chiếm bởi một ứng dụng khác!`;
        this.broadcastStatus();
        return { success: false, message: `Cổng ${port} đang bị chiếm bởi một ứng dụng khác. Vui lòng đổi cổng trong Cài Đặt!` };
      }
    }

    // Đánh dấu đang khởi động
    this.serverInfo.state = 'STARTING';
    this.serverInfo.startTime = Date.now();
    this.serverInfo.lastError = null;
    this.broadcastStatus();

    try {
      const projectDir = settings.projectDir;
      const serverDir = path.join(projectDir, 'server');
      const configuration = readBackendEnvironment(projectDir, parse);
      if ('error' in configuration) throw new Error(configuration.error);
      await this.ensureDatabaseRunning();

      // Khởi chạy an toàn bằng npm run dev hoặc npx tsx
      this.logger.info('launcher', `Khởi tạo tiến trình máy chủ Backend tại: ${serverDir}`);

      // Windows cần shell: true để thực thi file .cmd mà không bị lỗi spawn EINVAL
      const isWin = process.platform === 'win32';
      const childEnv = {
        ...process.env,
        DATABASE_URL: configuration.env.DATABASE_URL,
        SERVER_PORT: port.toString(),
        SERVER_HOST: '127.0.0.1',
        LANG: 'vi_VN.UTF-8',
        LC_ALL: 'vi_VN.UTF-8',
        PYTHONIOENCODING: 'utf-8',
      };

      const child = isWin
        ? spawn('npm run dev', {
            cwd: serverDir,
            env: childEnv,
            shell: true,
            stdio: ['ignore', 'pipe', 'pipe'],
          })
        : spawn('npm', ['run', 'dev'], {
            cwd: serverDir,
            env: childEnv,
            shell: false,
            stdio: ['ignore', 'pipe', 'pipe'],
          });

      this.serverProc = child;
      this.serverInfo.pid = child.pid || null;
      this.serverInfo.isManagedByLauncher = true;

      // Pipe stdout & stderr vào logger với stateful StringDecoder bảo vệ tiếng Việt
      this.pipeStream(child.stdout, 'server', false, child.pid);
      this.pipeStream(child.stderr, 'server', true, child.pid);

      child.on('error', (err) => {
        this.serverInfo.state = 'ERROR';
        this.serverInfo.lastError = `Không thể khởi động tiến trình: ${err.message}`;
        this.serverInfo.lastErrorTime = Date.now();
        this.logger.error('server', `Lỗi tiến trình Backend: ${err.message}`, 'PROCESS_ERROR', child.pid, err.stack);
        this.broadcastStatus();
      });

      child.on('exit', (code, signal) => {
        this.logger.info('server', `Tiến trình Backend kết thúc với mã thoát: ${code}, tín hiệu: ${signal}`, 'PROCESS_EXIT', child.pid);
        this.serverProc = null;
        this.serverInfo.pid = null;
        this.serverInfo.isManagedByLauncher = false;
        this.serverInfo.uptimeSec = 0;
        if (this.serverInfo.state !== 'STOPPED' && this.serverInfo.state !== 'STOPPING') {
          this.serverInfo.state = code === 0 ? 'STOPPED' : 'ERROR';
          if (code !== 0) {
            this.serverInfo.lastError = `Máy chủ bị thoát đột ngột (Mã thoát: ${code})`;
            this.serverInfo.lastErrorTime = Date.now();
          }
        } else {
          this.serverInfo.state = 'STOPPED';
        }
        this.broadcastStatus();
      });

      // Chờ readiness kiểm tra phản hồi thật từ máy chủ
      const ready = await this.waitForServerReady(port, settings.startTimeoutSec * 1000);
      if (ready) {
        this.serverInfo.state = 'READY';
        this.serverInfo.lastReadyTime = Date.now();
        this.broadcastStatus();
        this.logger.info('server', `Máy chủ Backend Fastify đã sẵn sàng tại http://127.0.0.1:${port}`);
        return { success: true, message: `Máy chủ Backend đã sẵn sàng tại cổng ${port}` };
      } else {
        this.serverInfo.state = 'RUNNING_UNREADY';
        this.serverInfo.lastError = 'Hết thời gian chờ phản hồi từ API Backend.';
        this.broadcastStatus();
        return { success: false, message: 'Tiến trình máy chủ đã bật nhưng chưa phản hồi API trong thời gian chờ.' };
      }
    } catch (err: any) {
      this.serverInfo.state = 'ERROR';
      this.serverInfo.lastError = err.message;
      this.broadcastStatus();
      return { success: false, message: `Lỗi khởi chạy máy chủ: ${err.message}` };
    }
  }

  private async doStartClient(): Promise<{ success: boolean; message: string }> {
    const settings = this.settingsManager.getSettings();
    const port = settings.clientPort;
    if (this.clientProc && this.clientInfo.port !== port) {
      return { success: false, message: 'Hãy dừng dịch vụ đang quản lý trước khi đổi cổng.' };
    }
    this.clientInfo.port = port;
    this.clientInfo.url = `http://127.0.0.1:${port}`;

    // Kiểm tra cổng cấu hình
    const isPortOpen = await this.probePort(port);
    if (isPortOpen) {
      const isOurClient = await this.probeClientReadiness(port);
      if (isOurClient) {
        if (this.clientProc && this.clientInfo.isManagedByLauncher) {
          this.clientInfo.state = 'READY';
          return { success: true, message: 'Dịch vụ đang chạy dưới quyền quản lý của launcher.' };
        }
        this.clientInfo.state = 'EXTERNAL_RUNNING';
        this.clientInfo.isManagedByLauncher = false;
        this.clientInfo.lastReadyTime = Date.now();
        this.broadcastStatus();
        this.logger.info('client', `Giao diện Web Game đã được phát hiện đang chạy bên ngoài tại cổng ${port}.`);
        return { success: true, message: 'Giao diện Web Game đang chạy sẵn bên ngoài launcher.' };
      } else {
        this.clientInfo.state = 'ERROR';
        this.clientInfo.lastError = `Cổng ${port} đã bị chiếm bởi một ứng dụng khác!`;
        this.broadcastStatus();
        return { success: false, message: `Cổng ${port} đang bị chiếm bởi một ứng dụng khác.` };
      }
    }

    this.clientInfo.state = 'STARTING';
    this.clientInfo.startTime = Date.now();
    this.clientInfo.lastError = null;
    this.broadcastStatus();

    try {
      const projectDir = settings.projectDir;
      const clientDir = path.join(projectDir, 'client');

      this.logger.info('launcher', `Khởi tạo tiến trình Vite Web Client tại: ${clientDir}`);

      const isWin = process.platform === 'win32';
      const clientEnv = {
        ...process.env,
        SERVER_PORT: settings.serverPort.toString(),
        LANG: 'vi_VN.UTF-8',
        LC_ALL: 'vi_VN.UTF-8',
      };

      const child = isWin
        ? spawn(`npm run dev -- --port ${port} --host 127.0.0.1`, {
            cwd: clientDir,
            env: clientEnv,
            shell: true,
            stdio: ['ignore', 'pipe', 'pipe'],
          })
        : spawn('npm', ['run', 'dev', '--', '--port', port.toString(), '--host', '127.0.0.1'], {
            cwd: clientDir,
            env: clientEnv,
            shell: false,
            stdio: ['ignore', 'pipe', 'pipe'],
          });

      this.clientProc = child;
      this.clientInfo.pid = child.pid || null;
      this.clientInfo.isManagedByLauncher = true;

      // Pipe stdout & stderr vào logger với stateful StringDecoder bảo vệ tiếng Việt
      this.pipeStream(child.stdout, 'client', false, child.pid);
      this.pipeStream(child.stderr, 'client', true, child.pid);

      child.on('error', (err) => {
        this.clientInfo.state = 'ERROR';
        this.clientInfo.lastError = err.message;
        this.clientInfo.lastErrorTime = Date.now();
        this.logger.error('client', `Lỗi tiến trình Client: ${err.message}`, 'PROCESS_ERROR', child.pid, err.stack);
        this.broadcastStatus();
      });

      child.on('exit', (code, signal) => {
        this.logger.info('client', `Tiến trình Client kết thúc với mã: ${code}, tín hiệu: ${signal}`, 'PROCESS_EXIT', child.pid);
        this.clientProc = null;
        this.clientInfo.pid = null;
        this.clientInfo.isManagedByLauncher = false;
        this.clientInfo.uptimeSec = 0;
        this.clientInfo.state = 'STOPPED';
        this.broadcastStatus();
      });

      const ready = await this.waitForClientReady(port, settings.startTimeoutSec * 1000);
      if (ready) {
        this.clientInfo.state = 'READY';
        this.clientInfo.lastReadyTime = Date.now();
        this.broadcastStatus();
        this.logger.info('client', `Giao diện Web Game Vite đã sẵn sàng phục vụ tại http://127.0.0.1:${port}`);
        return { success: true, message: `Client Web Game đã sẵn sàng tại cổng ${port}` };
      } else {
        this.clientInfo.state = 'RUNNING_UNREADY';
        this.clientInfo.lastError = 'Hết thời gian chờ phản hồi từ Vite Server.';
        this.broadcastStatus();
        return { success: false, message: 'Client đã bật nhưng chưa sẵn sàng phục vụ giao diện.' };
      }
    } catch (err: any) {
      this.clientInfo.state = 'ERROR';
      this.clientInfo.lastError = err.message;
      this.broadcastStatus();
      return { success: false, message: `Lỗi khởi chạy client: ${err.message}` };
    }
  }

  private async doStopServer(force: boolean = false): Promise<{ success: boolean; message: string }> {
    if (this.serverInfo.state === 'EXTERNAL_RUNNING') {
      return { success: false, message: 'Máy chủ đang chạy ngoài launcher - không thuộc quyền quản lý để dừng.' };
    }

    if (!this.serverProc || !this.serverInfo.pid) {
      this.serverInfo.state = 'STOPPED';
      this.serverInfo.uptimeSec = 0;
      this.broadcastStatus();
      return { success: true, message: 'Máy chủ đã ở trạng thái dừng.' };
    }

    this.serverInfo.state = 'STOPPING';
    this.broadcastStatus();

    const pid = this.serverInfo.pid;
    this.logger.info('server', `Bắt đầu dừng tiến trình Máy chủ (PID: ${pid}, Force: ${force})...`);

    try {
      if (process.platform === 'win32') {
        // Trên Windows, kill cả cây tiến trình con (npm -> node -> tsx)
        await execAsync(`taskkill /pid ${pid} /T /F`);
      } else {
        this.serverProc.kill(force ? 'SIGKILL' : 'SIGTERM');
      }

      this.serverProc = null;
      this.serverInfo.pid = null;
      this.serverInfo.state = 'STOPPED';
      this.serverInfo.isManagedByLauncher = false;
      this.serverInfo.uptimeSec = 0;
      this.broadcastStatus();

      this.logger.info('server', 'Máy chủ đã dừng an toàn.');
      return { success: true, message: 'Đã dừng máy chủ Backend an toàn.' };
    } catch (err: any) {
      this.logger.warn('server', `Thông báo khi dừng tiến trình PID ${pid}: ${err.message}`);
      this.serverInfo.state = 'STOPPED';
      this.serverInfo.pid = null;
      this.serverProc = null;
      this.broadcastStatus();
      return { success: true, message: 'Máy chủ đã dừng.' };
    }
  }

  private async doStopClient(force: boolean = false): Promise<{ success: boolean; message: string }> {
    if (this.clientInfo.state === 'EXTERNAL_RUNNING') {
      return { success: false, message: 'Giao diện đang chạy ngoài launcher - không thuộc quyền quản lý.' };
    }

    if (!this.clientProc || !this.clientInfo.pid) {
      this.clientInfo.state = 'STOPPED';
      this.clientInfo.uptimeSec = 0;
      this.broadcastStatus();
      return { success: true, message: 'Client đã ở trạng thái dừng.' };
    }

    this.clientInfo.state = 'STOPPING';
    this.broadcastStatus();

    const pid = this.clientInfo.pid;
    this.logger.info('client', `Bắt đầu dừng tiến trình Client (PID: ${pid}, Force: ${force})...`);

    try {
      if (process.platform === 'win32') {
        await execAsync(`taskkill /pid ${pid} /T /F`);
      } else {
        this.clientProc.kill(force ? 'SIGKILL' : 'SIGTERM');
      }

      this.clientProc = null;
      this.clientInfo.pid = null;
      this.clientInfo.state = 'STOPPED';
      this.clientInfo.isManagedByLauncher = false;
      this.clientInfo.uptimeSec = 0;
      this.broadcastStatus();

      this.logger.info('client', 'Client đã dừng an toàn.');
      return { success: true, message: 'Đã dừng Client web game.' };
    } catch (err: any) {
      this.clientInfo.state = 'STOPPED';
      this.clientInfo.pid = null;
      this.clientProc = null;
      this.broadcastStatus();
      return { success: true, message: 'Client đã dừng.' };
    }
  }

  // ============================================================
  // STREAM DECODING VỚI STATEFUL STRINGDECODER (UTF-8 AN TOÀN)
  // ============================================================

  private pipeStream(
    stream: NodeJS.ReadableStream | null | undefined,
    source: ServiceName,
    isError: boolean,
    pid?: number
  ): void {
    if (!stream) return;
    const decoder = new StringDecoder('utf8');
    let lineBuffer = '';

    stream.on('data', (chunk: Buffer) => {
      lineBuffer += decoder.write(chunk);
      const lines = lineBuffer.split(/\r?\n/);
      lineBuffer = lines.pop() || '';
      for (const line of lines) {
        if (line.trim()) {
          if (isError) {
            this.logger.warn(source, line, undefined, pid);
          } else {
            this.logger.info(source, line, undefined, pid);
          }
        }
      }
    });

    stream.on('end', () => {
      lineBuffer += decoder.end();
      if (lineBuffer.trim()) {
        if (isError) {
          this.logger.warn(source, lineBuffer, undefined, pid);
        } else {
          this.logger.info(source, lineBuffer, undefined, pid);
        }
      }
      lineBuffer = '';
    });
  }

  // ============================================================
  // READINESS CHECKS & PROBING
  // ============================================================

  private probePort(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(800);
      socket.once('connect', () => {
        socket.destroy();
        resolve(true);
      });
      socket.once('timeout', () => {
        socket.destroy();
        resolve(false);
      });
      socket.once('error', () => {
        resolve(false);
      });
      socket.connect(port, '127.0.0.1');
    });
  }

  private async probeServerReadiness(port: number): Promise<boolean> {
    return await probeGameService('server', port) === 'identified';
  }

  private async probeClientReadiness(port: number): Promise<boolean> {
    return await probeGameService('client', port) === 'identified';
  }

  private async waitForServerReady(port: number, maxWaitMs: number): Promise<boolean> {
    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
      const ok = await this.probeServerReadiness(port);
      if (ok) return true;
      await new Promise(r => setTimeout(r, 600));
    }
    return false;
  }

  private async waitForClientReady(port: number, maxWaitMs: number): Promise<boolean> {
    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
      const ok = await this.probeClientReadiness(port);
      if (ok) return true;
      await new Promise(r => setTimeout(r, 600));
    }
    return false;
  }

  private ensureWslKeepalive(): void {
    if (process.platform !== 'win32') return;
    try {
      if (!this.wslKeepaliveProc || this.wslKeepaliveProc.exitCode !== null) {
        const { spawn } = require('child_process');
        this.wslKeepaliveProc = spawn('wsl', ['-d', 'Ubuntu', '--exec', 'sleep', 'infinity'], {
          detached: true,
          stdio: 'ignore',
          windowsHide: true,
        });
        this.wslKeepaliveProc.unref();
      }
    } catch {}
  }

  public async ensureDatabaseRunning(): Promise<DatabaseInfo> {
    const settings = this.settingsManager.getSettings();
    const configuration = readBackendEnvironment(settings.projectDir, parse);
    if ('error' in configuration) {
      this.databaseInfo.state = 'DISCONNECTED';
      this.databaseInfo.lastCheckedTime = Date.now();
      this.databaseInfo.message = configuration.error;
      this.broadcastStatus();
      return { ...this.databaseInfo };
    }

    const { host, port } = configuration.database;
    this.databaseInfo.host = host;
    this.databaseInfo.port = port;
    this.databaseInfo.state = 'CHECKING';
    this.databaseInfo.message = 'Đang thăm dò cổng TCP PostgreSQL...';
    this.broadcastStatus();

    let diag = await SystemDiagnostics.checkDatabase(host, port);

    // Tự động phát hiện và kích hoạt PostgreSQL trong WSL Ubuntu nếu bị từ chối kết nối
    if (diag.status !== 'PASS' && process.platform === 'win32' &&
      port === 5432 && ['localhost', '127.0.0.1', '::1'].includes(host)) {
      try {
        const { execSync } = require('child_process');
        this.logger.info('launcher', 'Đang tự động đánh thức dịch vụ PostgreSQL trong WSL Ubuntu...');
        execSync('wsl -d Ubuntu -u root service postgresql start', { timeout: 15000, stdio: 'ignore' });
        this.ensureWslKeepalive();

        // Đợi và thăm dò lại tối đa 8 lần (mỗi lần 1s) để dịch vụ PostgreSQL và cổng 5432 sẵn sàng hoàn toàn
        for (let attempt = 0; attempt < 8; attempt++) {
          await new Promise(r => setTimeout(r, 1000));
          diag = await SystemDiagnostics.checkDatabase(host, port);
          if (diag.status === 'PASS') break;
        }
      } catch (err: any) {
        this.logger.warn('launcher', `Không thể kích hoạt tự động PostgreSQL qua WSL: ${err.message}`);
      }
    }

    if (diag.status === 'PASS' && process.platform === 'win32') {
      this.ensureWslKeepalive();
    }

    this.databaseInfo.lastCheckedTime = Date.now();

    this.databaseInfo.state = diag.status === 'PASS' ? 'CONNECTED' : 'DISCONNECTED';
    this.databaseInfo.message = diag.message;
    if (diag.status === 'PASS') this.logger.info('launcher', diag.message);

    this.broadcastStatus();
    return { ...this.databaseInfo };
  }

  public async checkDatabaseState(): Promise<DatabaseInfo> {
    return this.ensureDatabaseRunning();
  }

  // ============================================================
  // WATCHDOG VÀ CẬP NHẬT TRẠNG THÁI
  // ============================================================

  private startWatchdog(): void {
    // 1. Cập nhật uptime mỗi giây
    this.uptimeTimer = setInterval(() => {
      const now = Date.now();
      if (this.serverInfo.startTime && (this.serverInfo.state === 'READY' || this.serverInfo.state === 'STARTING')) {
        this.serverInfo.uptimeSec = Math.floor((now - this.serverInfo.startTime) / 1000);
      }
      if (this.clientInfo.startTime && (this.clientInfo.state === 'READY' || this.clientInfo.state === 'STARTING')) {
        this.clientInfo.uptimeSec = Math.floor((now - this.clientInfo.startTime) / 1000);
      }
    }, 1000);

    // 2. Định kỳ 5 giây thăm dò trạng thái các cổng và nhận diện tiến trình bên ngoài
    this.healthCheckTimer = setInterval(async () => {
      const settings = this.settingsManager.getSettings();

      // Kiểm tra Server
      if (this.serverInfo.state === 'STOPPED' || this.serverInfo.state === 'EXTERNAL_RUNNING') {
        const isServerUp = await this.probeServerReadiness(settings.serverPort);
        if (isServerUp) {
          if (!this.serverProc) {
            this.serverInfo.port = settings.serverPort;
            this.serverInfo.url = `http://127.0.0.1:${settings.serverPort}`;
            this.serverInfo.state = 'EXTERNAL_RUNNING';
            this.serverInfo.isManagedByLauncher = false;
          }
        } else if (!isServerUp && this.serverInfo.state === 'EXTERNAL_RUNNING') {
          this.serverInfo.state = 'STOPPED';
        }
      }

      // Kiểm tra Client
      if (this.clientInfo.state === 'STOPPED' || this.clientInfo.state === 'EXTERNAL_RUNNING') {
        const isClientUp = await this.probeClientReadiness(settings.clientPort);
        if (isClientUp) {
          if (!this.clientProc) {
            this.clientInfo.port = settings.clientPort;
            this.clientInfo.url = `http://127.0.0.1:${settings.clientPort}`;
            this.clientInfo.state = 'EXTERNAL_RUNNING';
            this.clientInfo.isManagedByLauncher = false;
          }
        } else if (!isClientUp && this.clientInfo.state === 'EXTERNAL_RUNNING') {
          this.clientInfo.state = 'STOPPED';
        }
      }

      // 3. Tự động kiểm tra và phục hồi kết nối Database nếu đang DISCONNECTED
      if (this.databaseInfo.state === 'DISCONNECTED') {
        const conf = readBackendEnvironment(settings.projectDir, parse);
        if (!('error' in conf)) {
          const dbDiag = await SystemDiagnostics.checkDatabase(conf.database.host, conf.database.port);
          if (dbDiag.status === 'PASS') {
            this.databaseInfo.state = 'CONNECTED';
            this.databaseInfo.message = dbDiag.message;
            this.databaseInfo.lastCheckedTime = Date.now();
            this.ensureWslKeepalive();
            this.logger.info('launcher', `PostgreSQL đã tự động kết nối lại thành công trên cổng ${conf.database.port}.`);
          }
        }
      }

      this.broadcastStatus();
    }, 5000);
  }

  private broadcastStatus(): void {
    try {
      if (!BrowserWindow || typeof BrowserWindow.getAllWindows !== 'function') return;
      const snapshot = this.getStatusSnapshot();
      const windows = BrowserWindow.getAllWindows();
      for (const win of windows) {
        if (!win.isDestroyed()) {
          win.webContents.send(IPC_CHANNELS.STATUS_UPDATE, snapshot);
        }
      }
    } catch {}
  }

  public cleanup(): void {
    if (this.healthCheckTimer) clearInterval(this.healthCheckTimer);
    if (this.uptimeTimer) clearInterval(this.uptimeTimer);
    if (this.databaseWarmupTimer) clearTimeout(this.databaseWarmupTimer);
  }
}
