// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Launcher Auto-Setup Manager
// Quản lý kiểm tra, phát hiện thành phần còn thiếu và cài đặt tự động
// Dành cho người mới clone mã nguồn về máy tính.
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import { ChildProcess, spawn, exec, execSync } from 'node:child_process';
import { StringDecoder } from 'node:string_decoder';
import { promisify } from 'node:util';
import { BrowserWindow } from 'electron';
import { parse } from 'dotenv';
import { readBackendEnvironment, type DatabaseEndpoint } from '../shared/backend-environment';
import {
  IPC_CHANNELS,
  SetupInspection,
  SetupProgressPayload,
  SetupStep,
  SetupLogPayload,
  SetupRunOptions,
} from '../shared/types';
import { SettingsManager } from './settings-manager';
import { LauncherLogger } from './logger';
import { SystemDiagnostics } from './system-diagnostics';

const execAsync = promisify(exec);
const loopbackHosts = new Set(['localhost', '127.0.0.1', '::1']);

export class SetupManager {
  private static instance: SetupManager;
  private logger: LauncherLogger;
  private settingsManager: SettingsManager;

  private isRunning = false;
  private cancelRequested = false;
  private activeChildProcess: ChildProcess | null = null;
  private currentSteps: SetupStep[] = [];
  private activeStepId: string | null = null;

  private constructor() {
    this.logger = LauncherLogger.getInstance();
    this.settingsManager = SettingsManager.getInstance();
  }

  public static getInstance(): SetupManager {
    if (!SetupManager.instance) {
      SetupManager.instance = new SetupManager();
    }
    return SetupManager.instance;
  }

  /**
   * Kiểm tra và rà soát toàn diện môi trường dự án
   * Phát hiện chính xác những gì đã có và những gì còn thiếu
   */
  public async inspectEnvironment(targetProjectDir?: string): Promise<SetupInspection> {
    const projectDir = targetProjectDir || this.settingsManager.getSettings().projectDir;

    // 1. Kiểm tra Node.js & npm runtime
    let nodeVersion: string | null = null;
    let npmVersion: string | null = null;

    try {
      const { stdout: nOut } = await execAsync('node -v');
      nodeVersion = nOut.trim();
    } catch {}

    try {
      const { stdout: npmOut } = await execAsync('npm -v');
      npmVersion = npmOut.trim();
    } catch {}

    // 2. Kiểm tra các thư mục cốt lõi
    const hasSharedFolder = fs.existsSync(path.join(projectDir, 'shared'));
    const hasServerFolder = fs.existsSync(path.join(projectDir, 'server'));
    const hasClientFolder = fs.existsSync(path.join(projectDir, 'client'));
    const hasRootPackage = fs.existsSync(path.join(projectDir, 'package.json'));

    const isValidProjectDir = hasRootPackage && hasSharedFolder && hasServerFolder && hasClientFolder;

    // 3. Kiểm tra các module phụ thuộc (node_modules)
    const hasSharedModules = fs.existsSync(path.join(projectDir, 'shared', 'node_modules'));
    const hasServerModules = fs.existsSync(path.join(projectDir, 'server', 'node_modules'));
    const hasClientModules = fs.existsSync(path.join(projectDir, 'client', 'node_modules'));

    const configuration = readBackendEnvironment(projectDir, parse);
    const hasServerEnv = 'env' in configuration;
    const databaseEndpoint = 'database' in configuration ? configuration.database : null;
    const isDbRunning = databaseEndpoint
      ? (await SystemDiagnostics.checkDatabase(databaseEndpoint.host, databaseEndpoint.port)).status === 'PASS'
      : false;
    const prismaClientDir = path.join(projectDir, 'server', 'node_modules', '.prisma', 'client');
    const hasPrismaClient = fs.existsSync(path.join(prismaClientDir, 'index.js')) &&
      fs.existsSync(path.join(prismaClientDir, 'schema.prisma'));

    const missingItems: string[] = [];
    if (!nodeVersion) missingItems.push('Môi trường Node.js (chưa cài hoặc chưa nhận trong PATH)');
    if (!npmVersion) missingItems.push('Trình quản lý gói npm');
    if (!isValidProjectDir) missingItems.push('Cấu trúc thư mục dự án Vạn Đạo Trường Sinh không hợp lệ');
    if ('error' in configuration) missingItems.push(configuration.error);
    if (!hasServerModules) missingItems.push('Thư viện Backend (server/node_modules)');
    if (!hasClientModules) missingItems.push('Thư viện Web Client (client/node_modules)');
    if (!hasPrismaClient && hasServerModules) missingItems.push('Thư viện Prisma Client (chưa sinh mã generate)');
    if (databaseEndpoint && !isDbRunning) {
      missingItems.push(`Cổng TCP PostgreSQL ${databaseEndpoint.host}:${databaseEndpoint.port} chưa phản hồi.`);
    }

    return {
      projectDir,
      isValidProjectDir,
      nodeVersion,
      npmVersion,
      hasSharedFolder,
      hasServerFolder,
      hasClientFolder,
      hasSharedModules,
      hasServerModules,
      hasClientModules,
      hasServerEnv,
      configurationSource: configuration.file ?? (hasServerEnv ? 'Biến môi trường' : null),
      databaseEndpoint,
      isDbRunning,
      missingItems,
      isReadyToPlay: missingItems.length === 0,
    };
  }

  /**
   * Thực hiện cài đặt tự động từng bước
   * Chỉ cài những thành phần còn thiếu trừ khi forceReinstall = true
   */
  public async runAutoSetup(options: SetupRunOptions = {}): Promise<{
    success: boolean;
    message: string;
    inspection: SetupInspection;
  }> {
    if (this.isRunning) {
      return {
        success: false,
        message: 'Đang có một tiến trình cài đặt đang chạy. Vui lòng đợi hoặc bấm Hủy.',
        inspection: await this.inspectEnvironment(options.projectDir),
      };
    }

    this.isRunning = true;
    this.cancelRequested = false;
    const projectDir = options.projectDir || this.settingsManager.getSettings().projectDir;
    const forceReinstall = Boolean(options.forceReinstall);
    const syncDatabase = options.syncDatabase !== false; // Mặc định bật

    this.logger.logAction('CHẠY_CÀI_ĐẶT_TỰ_ĐỘNG', `Thư mục: ${projectDir}, Force: ${forceReinstall}`);
    this.sendInfoLog(`🚀 Bắt đầu quy trình kiểm tra và cài đặt tự động cho Vạn Đạo Trường Sinh...`);
    this.sendInfoLog(`📁 Thư mục dự án: ${projectDir}`);

    // Khởi tạo danh sách các bước
    this.currentSteps = [
      { id: 'check_runtime', title: '1. Kiểm tra môi trường Node.js & npm', status: 'PENDING' },
      { id: 'prepare_env', title: '2. Chuẩn bị cấu hình máy chủ', status: 'PENDING' },
      { id: 'install_shared', title: '3. Cài đặt phân hệ chia sẻ (@vandao/shared)', status: 'PENDING' },
      { id: 'install_server', title: '4. Cài đặt thư viện máy chủ Backend (server/node_modules)', status: 'PENDING' },
      { id: 'install_client', title: '5. Cài đặt thư viện giao diện Web Client (client/node_modules)', status: 'PENDING' },
      { id: 'setup_database', title: '6. Khởi tạo Prisma Client & Cơ sở dữ liệu', status: 'PENDING' },
      { id: 'final_verify', title: '7. Kiểm tra tổng thể tính sẵn sàng', status: 'PENDING' },
    ];

    this.broadcastProgress(null, false, false);

    try {
      // ----------------------------------------------------
      // BƯỚC 1: Kiểm tra Node.js & npm runtime
      // ----------------------------------------------------
      await this.runStep('check_runtime', async (step) => {
        this.sendInfoLog('Đang kiểm tra phiên bản Node.js và npm...');
        let nodeVer = '';
        let npmVer = '';
        try {
          const { stdout: nOut } = await execAsync('node -v');
          nodeVer = nOut.trim();
          const { stdout: npmOut } = await execAsync('npm -v');
          npmVer = npmOut.trim();
        } catch (e: any) {
          throw new Error('Không tìm thấy Node.js hoặc npm trong PATH hệ thống. Hãy cài đặt Node.js từ https://nodejs.org/!');
        }

        step.message = `Node.js ${nodeVer} | npm ${npmVer}`;
        this.sendInfoLog(`✅ Đã nhận diện môi trường: Node.js ${nodeVer}, npm ${npmVer}`);
      });

      // ----------------------------------------------------
      // BƯỚC 2: Chuẩn bị cấu hình máy chủ
      // ----------------------------------------------------
      let configuration = readBackendEnvironment(projectDir, parse);
      await this.runStep('prepare_env', async (step) => {
        if (configuration.file || 'env' in configuration) {
          if ('error' in configuration) throw new Error(configuration.error);
          step.status = 'SKIPPED';
          step.message = `Giữ nguyên cấu hình hiện tại (${configuration.file ?? 'biến môi trường'}).`;
          return;
        }

        const serverEnvPath = path.join(projectDir, 'server', '.env');
        const template = ['server/.env.example', '.env.example'].find((file) => fs.existsSync(path.join(projectDir, file)));
        if (template) {
          fs.copyFileSync(path.join(projectDir, template), serverEnvPath, fs.constants.COPYFILE_EXCL);
          step.message = `Đã tạo server/.env từ ${template}.`;
        } else {
          const defaultEnvContent = [
            '# VẠN ĐẠO TRƯỜNG SINH - Cấu hình máy chủ tự động khởi tạo',
            'DB_NAME=vandao',
            'DB_USER=vandao_user',
            'DB_PASSWORD=vandao_dev_password',
            'DB_HOST=127.0.0.1',
            'DB_PORT=5432',
            'DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}',
            'JWT_SECRET=vandao_truong_sinh_secret_key_dev_2026',
            'JWT_EXPIRES_IN=7d',
            'SERVER_PORT=3001',
            'SERVER_HOST=0.0.0.0',
            'NODE_ENV=development',
            'VITE_API_URL=http://localhost:3001',
            '',
          ].join('\n');
          fs.writeFileSync(serverEnvPath, defaultEnvContent, { encoding: 'utf8', flag: 'wx' });
          step.message = 'Đã tạo server/.env với cấu hình phát triển mặc định.';
        }
        configuration = readBackendEnvironment(projectDir, parse);
        if ('error' in configuration) throw new Error(configuration.error);
        this.sendInfoLog(step.message);
      });
      if ('error' in configuration) throw new Error(configuration.error);
      const { env, database, fileNodeEnv } = configuration;

      // ----------------------------------------------------
      // BƯỚC 3: Cài đặt Shared modules
      // ----------------------------------------------------
      await this.runStep('install_shared', async (step) => {
        const sharedDir = path.join(projectDir, 'shared');
        const sharedModules = path.join(sharedDir, 'node_modules');

        if (!fs.existsSync(sharedDir)) {
          step.status = 'SKIPPED';
          step.message = 'Không có thư mục shared, bỏ qua';
          return;
        }

        // Shared package không có dependencies nặng, nếu đã có node_modules thì bỏ qua
        if (fs.existsSync(sharedModules) && !forceReinstall) {
          step.status = 'SKIPPED';
          step.message = 'Thư viện shared đã có sẵn';
          this.sendInfoLog('ℹ️ Thư viện shared đã sẵn sàng, không cần cài lại.');
          return;
        }

        this.sendInfoLog('Đang chuẩn bị phân hệ @vandao/shared...');
        await this.runCommandWithStreaming('npm', ['install'], sharedDir);
        step.message = 'Đã cài đặt phân hệ shared thành công';
        this.sendInfoLog('✅ Hoàn tất thiết lập phân hệ shared.');
      });

      // ----------------------------------------------------
      // BƯỚC 4: Cài đặt Server node_modules
      // ----------------------------------------------------
      await this.runStep('install_server', async (step) => {
        const serverDir = path.join(projectDir, 'server');
        const serverModules = path.join(serverDir, 'node_modules');

        if (fs.existsSync(serverModules) && !forceReinstall) {
          step.status = 'SKIPPED';
          step.message = 'Thư viện server đã có sẵn';
          this.sendInfoLog('ℹ️ Thư mục server/node_modules đã tồn tại, bỏ qua bước cài đặt lại.');
          return;
        }

        this.sendInfoLog('⏳ Đang chạy "npm install" trong server/ (Quá trình này có thể mất 30-90 giây)...');
        await this.runCommandWithStreaming('npm', ['install'], serverDir, env);
        step.message = 'Đã cài đặt đầy đủ thư viện Backend';
        this.sendInfoLog('✅ Đã cài đặt thành công thư viện Backend (Fastify, Prisma, WebSocket...).');
      });

      // ----------------------------------------------------
      // BƯỚC 5: Cài đặt Client node_modules
      // ----------------------------------------------------
      await this.runStep('install_client', async (step) => {
        const clientDir = path.join(projectDir, 'client');
        const clientModules = path.join(clientDir, 'node_modules');

        if (fs.existsSync(clientModules) && !forceReinstall) {
          step.status = 'SKIPPED';
          step.message = 'Thư viện client đã có sẵn';
          this.sendInfoLog('ℹ️ Thư mục client/node_modules đã tồn tại, bỏ qua bước cài đặt lại.');
          return;
        }

        this.sendInfoLog('⏳ Đang chạy "npm install" trong client/ (Quá trình này có thể mất 30-90 giây)...');
        await this.runCommandWithStreaming('npm', ['install'], clientDir);
        step.message = 'Đã cài đặt đầy đủ thư viện Frontend';
        this.sendInfoLog('✅ Đã cài đặt thành công thư viện Frontend (React, Phaser, Vite...).');
      });

      // ----------------------------------------------------
      // BƯỚC 6: Khởi tạo Prisma Client & Database
      // ----------------------------------------------------
      let databaseWarning: string | undefined;
      await this.runStep('setup_database', async (step) => {
        const serverDir = path.join(projectDir, 'server');
        this.sendInfoLog('Đang sinh mã Prisma Client (npx prisma generate)...');
        await this.runCommandWithStreaming('npx', ['prisma', 'generate'], serverDir, env);
        this.sendInfoLog('✅ Đã sinh mã Prisma Client thành công.');

        if (!syncDatabase) {
          databaseWarning = 'Đã bỏ qua đồng bộ lược đồ và seed dữ liệu theo tùy chọn.';
        } else if (
          env.NODE_ENV !== 'development' ||
          fileNodeEnv === 'production' ||
          !loopbackHosts.has(database.host.toLowerCase()) ||
          [...new URL(env.DATABASE_URL).searchParams.keys()].some((key) => ['host', 'hostaddr'].includes(key.toLowerCase()))
        ) {
          databaseWarning = 'Đã bỏ qua đồng bộ lược đồ và seed. Cài đặt tự động chỉ ghi CSDL khi NODE_ENV=development và DATABASE_URL trỏ trực tiếp tới địa chỉ loopback. Cấu hình production luôn được bỏ qua.';
        } else if (!(await this.checkDatabaseForSetup(database))) {
          databaseWarning = `Cổng TCP PostgreSQL ${database.host}:${database.port} chưa phản hồi. Hãy khởi động PostgreSQL và chạy lại cài đặt để đồng bộ lược đồ.`;
        }

        if (databaseWarning) {
          step.status = 'WARNING';
          step.message = databaseWarning;
          this.sendInfoLog(`⚠️ ${databaseWarning}`);
          return;
        }

        this.sendInfoLog('Đang đồng bộ cấu trúc bảng (npx prisma db push)...');
        await this.runCommandWithStreaming('npx', ['prisma', 'db', 'push', '--skip-generate'], serverDir, env);
        this.sendInfoLog('Đang nạp dữ liệu mẫu ban đầu (npm run seed)...');
        await this.runCommandWithStreaming('npm', ['run', 'seed'], serverDir, env);
        step.message = 'Đã sinh Prisma Client, đồng bộ lược đồ và nạp dữ liệu mẫu.';
      });

      // ----------------------------------------------------
      // BƯỚC 7: Kiểm tra tổng thể & Hoàn tất
      // ----------------------------------------------------
      const finalInspection = await this.inspectEnvironment(projectDir);
      if (databaseWarning) {
        finalInspection.missingItems.push(databaseWarning);
        finalInspection.isReadyToPlay = false;
      }

      await this.runStep('final_verify', async (step) => {
        if (finalInspection.isReadyToPlay) {
          step.message = 'Các bước thiết lập đã hoàn tất. Sẵn sàng vào game.';
          this.sendInfoLog('🎉 Chúc mừng Đạo hữu! Dự án Vạn Đạo Trường Sinh đã hoàn tất cài đặt trọn gói.');
        } else {
          step.status = 'WARNING';
          step.message = `Cài đặt hoàn tất với lưu ý: ${finalInspection.missingItems.join(', ')}`;
          this.sendInfoLog(`ℹ️ Cài đặt xong nhưng còn một số điểm lưu ý: ${finalInspection.missingItems.join('; ')}`);
        }
      });

      // Lưu cập nhật projectDir vào Settings nếu khác
      this.settingsManager.updateSettings({ projectDir });

      this.broadcastProgress(null, true, false, undefined, finalInspection.isReadyToPlay);

      return {
        success: true,
        message: finalInspection.isReadyToPlay ? 'Cài đặt tự động đã hoàn tất.' : 'Cài đặt tự động hoàn tất với lưu ý.',
        inspection: finalInspection,
      };
    } catch (error: any) {
      const errorMsg = (this.cancelRequested ? 'Người dùng đã hủy tiến trình.' : error.message) || 'Lỗi không xác định trong quá trình cài đặt';
      this.logger.error('launcher', `Lỗi cài đặt tự động: ${errorMsg}`);
      this.sendInfoLog(`❌ [LỖI DỪNG] ${errorMsg}`, 'stderr');

      // Đánh dấu bước hiện tại là ERROR
      if (this.activeStepId) {
        const step = this.currentSteps.find((s) => s.id === this.activeStepId);
        if (step) {
          step.status = 'ERROR';
          step.message = errorMsg;
        }
      }

      this.broadcastProgress(this.activeStepId, true, true, errorMsg, false);
      const inspection = await this.inspectEnvironment(projectDir);
      if (!inspection.missingItems.includes(errorMsg)) inspection.missingItems.push(errorMsg);
      inspection.isReadyToPlay = false;
      return { success: false, message: errorMsg, inspection };
    } finally {
      this.isRunning = false;
      this.activeStepId = null;
    }
  }

  /**
   * Hủy tiến trình cài đặt đang chạy dở
   */
  public async cancelAutoSetup(): Promise<{ success: boolean; message: string }> {
    if (!this.isRunning) {
      return { success: true, message: 'Không có tiến trình cài đặt nào đang chạy.' };
    }

    this.cancelRequested = true;
    this.sendInfoLog('⏹️ Đang gửi tín hiệu dừng tiến trình cài đặt theo yêu cầu người dùng...', 'stderr');

    if (this.activeChildProcess && this.activeChildProcess.pid) {
      try {
        if (process.platform === 'win32') {
          // Buộc dừng cây tiến trình trên Windows
          exec(`taskkill /pid ${this.activeChildProcess.pid} /T /F`);
        } else {
          this.activeChildProcess.kill('SIGKILL');
        }
      } catch {}
    }

    return { success: true, message: 'Đã gửi yêu cầu hủy tiến trình cài đặt.' };
  }

  // ============================================================
  // CÁC HÀM TRỢ GIÚP NỘI BỘ
  // ============================================================

  private async runStep(
    stepId: string,
    action: (step: SetupStep) => Promise<void>
  ): Promise<void> {
    if (this.cancelRequested) throw new Error('Người dùng đã hủy tiến trình.');
    const step = this.currentSteps.find((s) => s.id === stepId);
    if (!step) return;

    this.activeStepId = stepId;
    step.status = 'RUNNING';
    const startTime = Date.now();
    this.broadcastProgress(stepId, false, false);

    try {
      await action(step);
      if (this.cancelRequested) throw new Error('Người dùng đã hủy tiến trình.');
      if (step.status === 'RUNNING') {
        step.status = 'SUCCESS';
      }
    } catch (err: any) {
      step.status = 'ERROR';
      step.message = err.message;
      step.durationMs = Date.now() - startTime;
      this.broadcastProgress(stepId, false, true, err.message);
      throw err;
    }

    step.durationMs = Date.now() - startTime;
    this.broadcastProgress(stepId, false, false);
  }

  private runCommandWithStreaming(
    command: string,
    args: string[],
    cwd: string,
    env: NodeJS.ProcessEnv = process.env,
  ): Promise<void> {
    if (this.cancelRequested) return Promise.reject(new Error('Người dùng đã hủy tiến trình.'));
    return new Promise((resolve, reject) => {
      const isWin = process.platform === 'win32';
      const fullCmd = `${command} ${args.join(' ')}`;

      this.sendInfoLog(`> [${path.basename(cwd)}] ${fullCmd}`);

      const childEnv = {
        ...process.env,
        ...(env.DATABASE_URL ? { DATABASE_URL: env.DATABASE_URL } : {}),
        LANG: 'vi_VN.UTF-8',
        LC_ALL: 'vi_VN.UTF-8',
        PYTHONIOENCODING: 'utf-8',
      };

      const needsShell = isWin && (command === 'npm' || command === 'npx');
      const child = needsShell
        ? spawn(fullCmd, {
            cwd,
            env: childEnv,
            shell: true,
            stdio: ['ignore', 'pipe', 'pipe'],
          })
        : spawn(command, args, {
            cwd,
            env: childEnv,
            shell: false,
            stdio: ['ignore', 'pipe', 'pipe'],
          });

      this.activeChildProcess = child;

      const secrets = [env.DATABASE_URL, env.DB_PASSWORD, env.JWT_SECRET].filter(Boolean);
      const sendCommandLog = (line: string, stream: 'stdout' | 'stderr') => {
        for (const secret of secrets) line = line.replaceAll(secret, '***');
        this.sendLog(line, stream);
      };

      const stdoutDecoder = new StringDecoder('utf8');
      const stderrDecoder = new StringDecoder('utf8');
      let stdoutBuffer = '';
      let stderrBuffer = '';

      child.stdout.on('data', (chunk: Buffer) => {
        stdoutBuffer += stdoutDecoder.write(chunk);
        const lines = stdoutBuffer.split(/\r?\n/);
        stdoutBuffer = lines.pop() || '';
        for (const line of lines) {
          if (line.trim()) {
            sendCommandLog(line, 'stdout');
          }
        }
      });

      child.stderr.on('data', (chunk: Buffer) => {
        stderrBuffer += stderrDecoder.write(chunk);
        const lines = stderrBuffer.split(/\r?\n/);
        stderrBuffer = lines.pop() || '';
        for (const line of lines) {
          if (line.trim()) {
            // npm thường in progress ra stderr, nếu không phải error nghiêm trọng thì log bình thường
            const isError = line.toLowerCase().includes('npm err!') || line.toLowerCase().includes('error:');
            sendCommandLog(line, isError ? 'stderr' : 'stdout');
          }
        }
      });

      child.on('error', (err) => {
        this.activeChildProcess = null;
        reject(err);
      });

      child.on('close', (code) => {
        // Xả nốt buffer còn lại
        const remStdout = stdoutBuffer + stdoutDecoder.end();
        if (remStdout.trim()) sendCommandLog(remStdout.trim(), 'stdout');
        const remStderr = stderrBuffer + stderrDecoder.end();
        if (remStderr.trim()) sendCommandLog(remStderr.trim(), 'stderr');

        this.activeChildProcess = null;

        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Lệnh kết thúc với mã lỗi ${code}: ${command} ${args.join(' ')}`));
        }
      });
    });
  }

  private async checkDatabaseForSetup({ host, port }: DatabaseEndpoint): Promise<boolean> {
    if ((await SystemDiagnostics.checkDatabase(host, port)).status === 'PASS') return true;
    if (process.platform !== 'win32' || port !== 5432 || !loopbackHosts.has(host.toLowerCase())) return false;
    try {
      this.sendInfoLog('Đang thử khởi động PostgreSQL trong WSL Ubuntu...');
      execSync('wsl -d Ubuntu -u root service postgresql start', { timeout: 15000, stdio: 'ignore' });
      for (let attempt = 0; attempt < 6; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        if ((await SystemDiagnostics.checkDatabase(host, port)).status === 'PASS') return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  private broadcastProgress(
    activeStepId: string | null,
    isComplete: boolean,
    hasError: boolean,
    errorMessage?: string,
    isReadyToPlay?: boolean
  ): void {
    const payload: SetupProgressPayload = {
      activeStepId,
      steps: [...this.currentSteps],
      isComplete,
      hasError,
      errorMessage,
      isReadyToPlay,
    };

    try {
      if (!BrowserWindow || typeof BrowserWindow.getAllWindows !== 'function') return;
      const windows = BrowserWindow.getAllWindows();
      for (const win of windows) {
        if (!win.isDestroyed()) {
          win.webContents.send(IPC_CHANNELS.SETUP_PROGRESS, payload);
        }
      }
    } catch {}
  }

  private sendLog(text: string, stream: 'stdout' | 'stderr' | 'info'): void {
    const payload: SetupLogPayload = {
      text: this.logger.sanitize(text),
      stream,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour12: false }),
    };

    try {
      if (!BrowserWindow || typeof BrowserWindow.getAllWindows !== 'function') return;
      const windows = BrowserWindow.getAllWindows();
      for (const win of windows) {
        if (!win.isDestroyed()) {
          win.webContents.send(IPC_CHANNELS.SETUP_LOG, payload);
        }
      }
    } catch {}
  }

  private sendInfoLog(text: string, stream: 'stdout' | 'stderr' | 'info' = 'info'): void {
    this.logger.info('launcher', text);
    this.sendLog(text, stream);
  }
}
