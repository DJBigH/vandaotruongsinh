// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Launcher Auto-Setup Manager
// Quản lý kiểm tra, phát hiện thành phần còn thiếu và cài đặt tự động
// Dành cho người mới clone mã nguồn về máy tính.
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { ChildProcess, spawn, exec } from 'node:child_process';
import { StringDecoder } from 'node:string_decoder';
import { promisify } from 'node:util';
import { BrowserWindow } from 'electron';
import {
  IPC_CHANNELS,
  SetupInspection,
  SetupProgressPayload,
  SetupStep,
  SetupStepStatus,
  SetupLogPayload,
  SetupRunOptions,
} from '../shared/types';
import { SettingsManager } from './settings-manager';
import { LauncherLogger } from './logger';

const execAsync = promisify(exec);

export class SetupManager {
  private static instance: SetupManager;
  private logger: LauncherLogger;
  private settingsManager: SettingsManager;

  private isRunning: boolean = false;
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

    const isValidProjectDir = hasRootPackage && hasServerFolder && hasClientFolder;

    // 3. Kiểm tra các module phụ thuộc (node_modules)
    const hasSharedModules = fs.existsSync(path.join(projectDir, 'shared', 'node_modules'));
    const hasServerModules = fs.existsSync(path.join(projectDir, 'server', 'node_modules'));
    const hasClientModules = fs.existsSync(path.join(projectDir, 'client', 'node_modules'));

    // 4. Kiểm tra file cấu hình môi trường (.env)
    const hasServerEnv = fs.existsSync(path.join(projectDir, 'server', '.env'));

    // 5. Kiểm tra kết nối CSDL PostgreSQL (cổng 5432)
    const settings = this.settingsManager.getSettings();
    let isDbRunning = await this.probeTcpPort(settings.dbHost || '127.0.0.1', settings.dbPort || 5432, 2000);
    if (!isDbRunning && process.platform === 'win32') {
      try {
        const { execSync } = require('child_process');
        execSync('wsl -d Ubuntu -u root service postgresql start', { timeout: 6000, stdio: 'ignore' });
        await new Promise(r => setTimeout(r, 1200));
        isDbRunning = await this.probeTcpPort(settings.dbHost || '127.0.0.1', settings.dbPort || 5432, 2000);
      } catch (e) {}
    }

    // 6. Kiểm tra Prisma Client
    const hasPrismaClient = fs.existsSync(path.join(projectDir, 'server', 'node_modules', '.prisma', 'client')) ||
      fs.existsSync(path.join(projectDir, 'server', 'node_modules', '@prisma', 'client'));

    // 7. Tổng hợp danh sách thiếu
    const missingItems: string[] = [];
    if (!nodeVersion) missingItems.push('Môi trường Node.js (chưa cài hoặc chưa nhận trong PATH)');
    if (!npmVersion) missingItems.push('Trình quản lý gói npm');
    if (!isValidProjectDir) missingItems.push('Cấu trúc thư mục dự án Vạn Đạo Trường Sinh không hợp lệ');
    if (!hasServerEnv) missingItems.push('Tệp cấu hình máy chủ server/.env');
    if (!hasSharedModules && hasSharedFolder) missingItems.push('Thư viện Shared (shared/node_modules)');
    if (!hasServerModules) missingItems.push('Thư viện Backend (server/node_modules)');
    if (!hasClientModules) missingItems.push('Thư viện Web Client (client/node_modules)');
    if (!hasPrismaClient && hasServerModules) missingItems.push('Thư viện Prisma Client (chưa sinh mã generate)');
    if (!isDbRunning) missingItems.push('Cơ sở dữ liệu PostgreSQL (cổng 5432 chưa phản hồi)');

    // Có thể chơi ngay nếu có Node, server/.env, server node_modules, client node_modules và DB
    const isReadyToPlay =
      Boolean(nodeVersion) &&
      isValidProjectDir &&
      hasServerEnv &&
      hasServerModules &&
      hasClientModules &&
      isDbRunning;

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
      isDbRunning,
      missingItems,
      isReadyToPlay,
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
    const projectDir = options.projectDir || this.settingsManager.getSettings().projectDir;
    const forceReinstall = Boolean(options.forceReinstall);
    const syncDatabase = options.syncDatabase !== false; // Mặc định bật

    this.logger.logAction('CHẠY_CÀI_ĐẶT_TỰ_ĐỘNG', `Thư mục: ${projectDir}, Force: ${forceReinstall}`);
    this.sendInfoLog(`🚀 Bắt đầu quy trình kiểm tra và cài đặt tự động cho Vạn Đạo Trường Sinh...`);
    this.sendInfoLog(`📁 Thư mục dự án: ${projectDir}`);

    // Khởi tạo danh sách các bước
    this.currentSteps = [
      { id: 'check_runtime', title: '1. Kiểm tra môi trường Node.js & npm', status: 'PENDING' },
      { id: 'prepare_env', title: '2. Chuẩn bị tệp cấu hình máy chủ (server/.env)', status: 'PENDING' },
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
      // BƯỚC 2: Chuẩn bị server/.env
      // ----------------------------------------------------
      await this.runStep('prepare_env', async (step) => {
        const serverEnvPath = path.join(projectDir, 'server', '.env');
        const exampleEnvPath = path.join(projectDir, 'server', '.env.example');
        const rootExampleEnvPath = path.join(projectDir, '.env.example');

        if (fs.existsSync(serverEnvPath) && !forceReinstall) {
          step.status = 'SKIPPED';
          step.message = 'server/.env đã có sẵn, bảo lưu cấu hình hiện tại';
          this.sendInfoLog('ℹ️ server/.env đã tồn tại. Giữ nguyên tệp cấu hình hiện tại.');
          return;
        }

        this.sendInfoLog('Đang khởi tạo tệp cấu hình server/.env...');
        if (fs.existsSync(exampleEnvPath)) {
          fs.copyFileSync(exampleEnvPath, serverEnvPath);
          step.message = 'Đã tự động sao chép từ server/.env.example';
          this.sendInfoLog('✅ Đã sao chép cấu hình từ server/.env.example sang server/.env');
        } else if (fs.existsSync(rootExampleEnvPath)) {
          fs.copyFileSync(rootExampleEnvPath, serverEnvPath);
          step.message = 'Đã tự động sao chép từ .env.example';
          this.sendInfoLog('✅ Đã sao chép cấu hình từ .env.example sang server/.env');
        } else {
          // Tự tạo cấu hình chuẩn mặc định
          const defaultEnvContent = [
            '# VẠN ĐẠO TRƯỜNG SINH - Cấu hình máy chủ tự động khởi tạo',
            'DB_NAME=vandao',
            'DB_USER=vandao_user',
            'DB_PASSWORD=vandao_dev_password',
            'DB_HOST=127.0.0.1',
            'DB_PORT=5432',
            'DATABASE_URL=postgresql://vandao_user:vandao_dev_password@127.0.0.1:5432/vandao',
            'JWT_SECRET=vandao_truong_sinh_secret_key_dev_2026',
            'JWT_EXPIRES_IN=7d',
            'SERVER_PORT=3001',
            'SERVER_HOST=0.0.0.0',
            'NODE_ENV=development',
            'VITE_API_URL=http://localhost:3001',
            '',
          ].join('\n');
          fs.writeFileSync(serverEnvPath, defaultEnvContent, 'utf8');
          step.message = 'Đã tạo mới server/.env với cấu hình phát triển mặc định';
          this.sendInfoLog('✅ Đã tạo mới file server/.env chuẩn phát triển.');
        }
      });

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
        await this.runCommandWithStreaming('npm', ['install'], serverDir);
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
      await this.runStep('setup_database', async (step) => {
        const serverDir = path.join(projectDir, 'server');
        const settings = this.settingsManager.getSettings();

        // 6.1. Luôn cố gắng sinh Prisma Client (không cần DB trực tuyến)
        this.sendInfoLog('Đang sinh mã Prisma Client (npx prisma generate)...');
        try {
          await this.runCommandWithStreaming('npx', ['prisma', 'generate'], serverDir);
          this.sendInfoLog('✅ Đã sinh mã Prisma Client thành công.');
        } catch (genErr: any) {
          this.sendInfoLog(`⚠️ Cảnh báo sinh mã Prisma: ${genErr.message}`);
        }

        // 6.2. Kiểm tra xem PostgreSQL cổng 5432 có mở không (tự động thử bật WSL nếu có)
        let isDbUp = await this.probeTcpPort(settings.dbHost || '127.0.0.1', settings.dbPort || 5432, 2500);
        if (!isDbUp && process.platform === 'win32') {
          try {
            const { execSync } = require('child_process');
            this.sendInfoLog('Đang tự động đánh thức PostgreSQL trong WSL Ubuntu...');
            execSync('wsl -d Ubuntu -u root service postgresql start', { timeout: 6000, stdio: 'ignore' });
            await new Promise(r => setTimeout(r, 1200));
            isDbUp = await this.probeTcpPort(settings.dbHost || '127.0.0.1', settings.dbPort || 5432, 2500);
          } catch (e) {}
        }

        if (!isDbUp) {
          step.status = 'WARNING';
          step.message = 'PostgreSQL (5432) chưa bật. Đã sinh Prisma Client; hãy bật PostgreSQL rồi bấm Chẩn đoán để kiểm tra.';
          this.sendInfoLog('⚠️ CSDL PostgreSQL chưa mở cổng 5432. Bỏ qua bước đồng bộ schema và seed data.');
          this.sendInfoLog('💡 Hướng dẫn: Khởi động PostgreSQL qua Docker ("docker-compose up -d") hoặc WSL/Windows Service khi bạn sẵn sàng vào chơi!');
          return;
        }

        // 6.3. Nếu PostgreSQL đang mở và người dùng bật syncDatabase
        if (syncDatabase) {
          this.sendInfoLog('Cơ sở dữ liệu đang mở! Đang đồng bộ cấu trúc bảng (npx prisma db push)...');
          try {
            await this.runCommandWithStreaming('npx', ['prisma', 'db', 'push', '--skip-generate'], serverDir);
            this.sendInfoLog('✅ Đã đồng bộ lược đồ CSDL thành công.');

            // Seed dữ liệu
            this.sendInfoLog('Đang nạp dữ liệu mẫu ban đầu (npm run seed)...');
            try {
              await this.runCommandWithStreaming('npm', ['run', 'seed'], serverDir);
              this.sendInfoLog('✅ Đã nạp dữ liệu mẫu thành công!');
              step.message = 'Đã sinh Prisma Client, đẩy cấu trúc bảng và nạp seed data thành công!';
            } catch (seedErr: any) {
              this.sendInfoLog(`ℹ️ Seed dữ liệu đã có sẵn hoặc báo: ${seedErr.message}`);
              step.message = 'Đã sinh Prisma Client và đồng bộ cấu trúc bảng thành công';
            }
          } catch (dbPushErr: any) {
            step.status = 'WARNING';
            step.message = `Lỗi kết nối hoặc đồng bộ CSDL: ${dbPushErr.message}`;
            this.sendInfoLog(`⚠️ Không thể hoàn thành db push: ${dbPushErr.message}`);
          }
        } else {
          step.message = 'Đã sinh Prisma Client (Bỏ qua đồng bộ CSDL theo tùy chọn)';
        }
      });

      // ----------------------------------------------------
      // BƯỚC 7: Kiểm tra tổng thể & Hoàn tất
      // ----------------------------------------------------
      const finalInspection = await this.inspectEnvironment(projectDir);

      await this.runStep('final_verify', async (step) => {
        if (finalInspection.missingItems.length === 0) {
          step.message = 'Mọi thành phần đã đầy đủ 100%! Sẵn sàng vào game.';
          this.sendInfoLog('🎉 Chúc mừng Đạo hữu! Dự án Vạn Đạo Trường Sinh đã hoàn tất cài đặt trọn gói.');
        } else {
          step.status = 'WARNING';
          step.message = `Cài đặt hoàn tất với lưu ý: ${finalInspection.missingItems.join(', ')}`;
          this.sendInfoLog(`ℹ️ Cài đặt xong nhưng còn một số điểm lưu ý: ${finalInspection.missingItems.join('; ')}`);
        }
      });

      // Lưu cập nhật projectDir vào Settings nếu khác
      this.settingsManager.updateSettings({ projectDir });

      this.isRunning = false;
      this.activeStepId = null;
      this.broadcastProgress(null, true, false, undefined, finalInspection.isReadyToPlay);

      return {
        success: true,
        message: 'Hoàn thành quy trình cài đặt tự động!',
        inspection: finalInspection,
      };
    } catch (error: any) {
      this.isRunning = false;
      const errorMsg = error.message || 'Lỗi không xác định trong quá trình cài đặt';
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

      this.broadcastProgress(this.activeStepId, true, true, errorMsg);

      return {
        success: false,
        message: errorMsg,
        inspection: await this.inspectEnvironment(projectDir),
      };
    }
  }

  /**
   * Hủy tiến trình cài đặt đang chạy dở
   */
  public async cancelAutoSetup(): Promise<{ success: boolean; message: string }> {
    if (!this.isRunning) {
      return { success: true, message: 'Không có tiến trình cài đặt nào đang chạy.' };
    }

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

    this.isRunning = false;
    if (this.activeStepId) {
      const step = this.currentSteps.find((s) => s.id === this.activeStepId);
      if (step) {
        step.status = 'ERROR';
        step.message = 'Người dùng đã hủy tiến trình';
      }
    }

    this.broadcastProgress(this.activeStepId, true, true, 'Người dùng đã bấm hủy');
    return { success: true, message: 'Đã hủy tiến trình cài đặt.' };
  }

  // ============================================================
  // CÁC HÀM TRỢ GIÚP NỘI BỘ
  // ============================================================

  private async runStep(
    stepId: string,
    action: (step: SetupStep) => Promise<void>
  ): Promise<void> {
    const step = this.currentSteps.find((s) => s.id === stepId);
    if (!step) return;

    this.activeStepId = stepId;
    step.status = 'RUNNING';
    const startTime = Date.now();
    this.broadcastProgress(stepId, false, false);

    try {
      await action(step);
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
    cwd: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const isWin = process.platform === 'win32';
      const fullCmd = `${command} ${args.join(' ')}`;

      this.sendInfoLog(`> [${path.basename(cwd)}] ${fullCmd}`);

      const childEnv = {
        ...process.env,
        LANG: 'vi_VN.UTF-8',
        LC_ALL: 'vi_VN.UTF-8',
        PYTHONIOENCODING: 'utf-8',
      };

      const child = isWin
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
            this.sendLog(line, 'stdout');
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
            this.sendLog(line, isError ? 'stderr' : 'stdout');
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
        if (remStdout.trim()) this.sendLog(remStdout.trim(), 'stdout');
        const remStderr = stderrBuffer + stderrDecoder.end();
        if (remStderr.trim()) this.sendLog(remStderr.trim(), 'stderr');

        this.activeChildProcess = null;

        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Lệnh kết thúc với mã lỗi ${code}: ${command} ${args.join(' ')}`));
        }
      });
    });
  }

  private probeTcpPort(host: string, port: number, timeoutMs: number = 2000): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      let resolved = false;

      socket.setTimeout(timeoutMs);

      socket.on('connect', () => {
        if (!resolved) {
          resolved = true;
          socket.destroy();
          resolve(true);
        }
      });

      socket.on('timeout', () => {
        if (!resolved) {
          resolved = true;
          socket.destroy();
          resolve(false);
        }
      });

      socket.on('error', () => {
        if (!resolved) {
          resolved = true;
          socket.destroy();
          resolve(false);
        }
      });

      socket.connect(port, host);
    });
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
      text,
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
