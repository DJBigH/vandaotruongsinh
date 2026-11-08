// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Launcher System Diagnostics
// Kiểm tra 7 tiêu chí môi trường thực tế trước và trong khi vận hành
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import http from 'node:http';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { DiagnosticItem, DiagnosticReport } from '../shared/types';
import { SettingsManager } from './settings-manager';

const execAsync = promisify(exec);

export class SystemDiagnostics {
  public static async runAll(): Promise<DiagnosticReport> {
    const settings = SettingsManager.getInstance().getSettings();
    const items: DiagnosticItem[] = [];

    // 1. Kiểm tra Node.js & npm runtime
    items.push(await this.checkNodeRuntime());

    // 2. Kiểm tra thư mục dự án và file cấu hình
    items.push(await this.checkProjectFiles(settings.projectDir));

    // 3. Kiểm tra kết nối cơ sở dữ liệu PostgreSQL
    items.push(await this.checkDatabase(settings.dbHost, settings.dbPort));

    // 4. Kiểm tra cổng Backend (3001)
    items.push(await this.checkPortStatus('server', settings.serverPort, 'Cổng Máy Chủ (Server Port)'));

    // 5. Kiểm tra cổng Frontend (5173)
    items.push(await this.checkPortStatus('client', settings.clientPort, 'Cổng Giao Diện (Client Port)'));

    // 6. Kiểm tra quyền ghi thư mục nhật ký (Logs)
    items.push(await this.checkLogDirWritable());

    // 7. Kiểm tra phản hồi API Backend (nếu cổng 3001 đang mở)
    items.push(await this.checkServerApiReadiness(settings.serverPort));

    const allPassed = items.every(i => i.status === 'PASS' || i.status === 'WARN');
    return {
      timestamp: new Date().toISOString(),
      items,
      allPassed,
    };
  }

  private static async checkNodeRuntime(): Promise<DiagnosticItem> {
    try {
      const { stdout: nodeVer } = await execAsync('node -v');
      const { stdout: npmVer } = await execAsync('npm -v');
      return {
        id: 'diag_runtime',
        name: 'Môi Trường Node.js & npm',
        category: 'RUNTIME',
        status: 'PASS',
        message: `Node.js ${nodeVer.trim()} | npm ${npmVer.trim()} đã sẵn sàng trên hệ thống.`,
      };
    } catch (e: any) {
      return {
        id: 'diag_runtime',
        name: 'Môi Trường Node.js & npm',
        category: 'RUNTIME',
        status: 'WARN',
        message: 'Không tìm thấy Node.js/npm toàn cục (Chế độ đóng gói có thể dùng runtime riêng).',
        detail: e.message,
        recommendation: 'Cài đặt Node.js v20+ nếu bạn đang chạy mã nguồn ở chế độ phát triển.',
      };
    }
  }

  private static async checkProjectFiles(projectDir: string): Promise<DiagnosticItem> {
    const requiredDirs = ['server', 'client', 'shared'];
    const requiredFiles = ['package.json'];
    const missing: string[] = [];

    for (const d of requiredDirs) {
      if (!fs.existsSync(path.join(projectDir, d))) missing.push(`${d}/`);
    }
    for (const f of requiredFiles) {
      if (!fs.existsSync(path.join(projectDir, f))) missing.push(f);
    }

    if (missing.length === 0) {
      return {
        id: 'diag_files',
        name: 'Cấu Trúc Tệp Tin Dự Án',
        category: 'FILESYSTEM',
        status: 'PASS',
        message: 'Thư mục dự án đầy đủ: server/, client/, shared/, package.json.',
        detail: `Đường dẫn: ${projectDir}`,
      };
    }

    return {
      id: 'diag_files',
      name: 'Cấu Trúc Tệp Tin Dự Án',
      category: 'FILESYSTEM',
      status: 'FAIL',
      message: `Thiếu các thư mục/tệp tin bắt buộc: ${missing.join(', ')}`,
      detail: `Đường dẫn hiện tại: ${projectDir}`,
      recommendation: 'Vào Cài Đặt và chọn lại Thư mục dự án chứa mã nguồn Vạn Đạo Trường Sinh.',
    };
  }

  public static checkDatabase(host: string, port: number): Promise<DiagnosticItem> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(2000);

      socket.once('connect', () => {
        socket.destroy();
        resolve({
          id: 'diag_db',
          name: 'Cơ Sở Dữ Liệu PostgreSQL',
          category: 'DATABASE',
          status: 'PASS',
          message: `PostgreSQL đang hoạt động và chấp nhận kết nối tại ${host}:${port}.`,
        });
      });

      socket.once('timeout', () => {
        socket.destroy();
        resolve({
          id: 'diag_db',
          name: 'Cơ Sở Dữ Liệu PostgreSQL',
          category: 'DATABASE',
          status: 'FAIL',
          message: `Hết thời gian chờ khi kết nối tới PostgreSQL ${host}:${port}.`,
          recommendation: 'Đảm bảo dịch vụ PostgreSQL đang chạy (ví dụ trong WSL: sudo service postgresql start hoặc docker-compose up -d).',
        });
      });

      socket.once('error', (err: any) => {
        socket.destroy();
        resolve({
          id: 'diag_db',
          name: 'Cơ Sở Dữ Liệu PostgreSQL',
          category: 'DATABASE',
          status: 'FAIL',
          message: `Không thể kết nối cổng PostgreSQL (${host}:${port}): ${err.message}`,
          recommendation: 'Kiểm tra xem PostgreSQL đã được bật chưa trước khi khởi động Game Server.',
        });
      });

      socket.connect(port, host);
    });
  }

  private static checkPortStatus(id: string, port: number, name: string): Promise<DiagnosticItem> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(1200);

      socket.once('connect', () => {
        socket.destroy();
        resolve({
          id: `diag_port_${id}`,
          name,
          category: 'NETWORK',
          status: 'WARN',
          message: `Cổng ${port} hiện ĐANG CÓ TIẾN TRÌNH LẮNG NGHE.`,
          detail: 'Nếu dịch vụ game đang chạy sẵn thì bình thường; nếu bị chiếm bởi phần mềm khác có thể gây xung đột.',
          recommendation: 'Kiểm tra thẻ Server/Client trên Launcher để nhận diện trạng thái tiến trình.',
        });
      });

      socket.once('timeout', () => {
        socket.destroy();
        resolve({
          id: `diag_port_${id}`,
          name,
          category: 'NETWORK',
          status: 'PASS',
          message: `Cổng ${port} hoàn toàn trống và sẵn sàng sử dụng.`,
        });
      });

      socket.once('error', () => {
        socket.destroy();
        resolve({
          id: `diag_port_${id}`,
          name,
          category: 'NETWORK',
          status: 'PASS',
          message: `Cổng ${port} hoàn toàn trống và sẵn sàng sử dụng.`,
        });
      });

      socket.connect(port, '127.0.0.1');
    });
  }

  private static async checkLogDirWritable(): Promise<DiagnosticItem> {
    try {
      const logDir = SettingsManager.getInstance().getLogDir();
      const testFile = path.join(logDir, `.write_test_${Date.now()}`);
      fs.writeFileSync(testFile, 'test', 'utf8');
      fs.unlinkSync(testFile);
      return {
        id: 'diag_log_dir',
        name: 'Quyền Ghi Nhật Ký (Log Directory)',
        category: 'FILESYSTEM',
        status: 'PASS',
        message: `Thư mục AppData ghi chép nhật ký bình thường: ${logDir}`,
      };
    } catch (e: any) {
      return {
        id: 'diag_log_dir',
        name: 'Quyền Ghi Nhật Ký (Log Directory)',
        category: 'FILESYSTEM',
        status: 'FAIL',
        message: 'Không thể ghi tệp tin vào thư mục nhật ký của người dùng.',
        detail: e.message,
        recommendation: 'Kiểm tra quyền truy cập thư mục %APPDATA% hoặc ổ đĩa hệ thống.',
      };
    }
  }

  private static checkServerApiReadiness(serverPort: number): Promise<DiagnosticItem> {
    return new Promise((resolve) => {
      const req = http.get(`http://127.0.0.1:${serverPort}/api/game/maps`, { timeout: 1500 }, (res) => {
        if (res.statusCode === 200 || res.statusCode === 401) {
          resolve({
            id: 'diag_api',
            name: 'API Khám Phá Bản Đồ (Readiness Check)',
            category: 'API',
            status: 'PASS',
            message: `Fastify Backend tại cổng ${serverPort} phản hồi thành công (HTTP ${res.statusCode}).`,
          });
        } else {
          resolve({
            id: 'diag_api',
            name: 'API Khám Phá Bản Đồ (Readiness Check)',
            category: 'API',
            status: 'WARN',
            message: `Fastify Backend phản hồi mã trạng thái bất thường: HTTP ${res.statusCode}.`,
          });
        }
      });

      req.once('error', () => {
        resolve({
          id: 'diag_api',
          name: 'API Khám Phá Bản Đồ (Readiness Check)',
          category: 'API',
          status: 'PASS',
          message: `Backend hiện chưa bật (Sẽ phản hồi khi bạn nhấn Bật Server).`,
        });
      });

      req.once('timeout', () => {
        req.destroy();
        resolve({
          id: 'diag_api',
          name: 'API Khám Phá Bản Đồ (Readiness Check)',
          category: 'API',
          status: 'WARN',
          message: 'Hết thời gian chờ phản hồi từ API Backend.',
        });
      });
    });
  }
}
