// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - AI Log Exporter
// Tạo báo cáo chẩn đoán .txt chuẩn hóa cho AI & Gói chẩn đoán .zip
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import AdmZip from 'adm-zip';
import { app, dialog } from 'electron';
import { LauncherLogger } from './logger';
import { SettingsManager } from './settings-manager';
import { ProcessSupervisor } from './process-supervisor';
import { ExportLogResult, LogEntry } from '../shared/types';

export class AiLogExporter {
  public static async exportTxt(customFilePath?: string): Promise<ExportLogResult> {
    try {
      const logger = LauncherLogger.getInstance();
      const supervisor = ProcessSupervisor.getInstance();
      const status = supervisor.getStatusSnapshot();

      const now = new Date();
      const dateStr = now.toISOString().replace(/[-:]/g, '').replace('T', '_').slice(0, 15);
      const defaultFileName = `VanDao_Log_AI_${dateStr}.txt`;

      let targetPath = customFilePath;
      if (!targetPath) {
        const dialogRes = await dialog.showSaveDialog({
          title: 'Xuất Nhật Ký Chẩn Đoán Cho AI (UTF-8 .txt)',
          defaultPath: path.join(app.getPath('downloads'), defaultFileName),
          filters: [{ name: 'Text Document (*.txt)', extensions: ['txt'] }],
        });

        if (dialogRes.canceled || !dialogRes.filePath) {
          return { success: false, error: 'Người dùng đã hủy xuất file' };
        }
        targetPath = dialogRes.filePath;
      }

      // Xây dựng nội dung file TXT theo 6 phần chuẩn hóa
      const content = logger.redactSecrets(this.buildTxtReportContent(status, logger));
      fs.writeFileSync(targetPath, content, 'utf8');

      logger.logAction('XUẤT_LOG_AI_TXT', targetPath);
      return {
        success: true,
        filePath: targetPath,
        fileName: path.basename(targetPath),
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Lỗi không xác định khi xuất log TXT' };
    }
  }

  public static async exportZip(customFilePath?: string): Promise<ExportLogResult> {
    try {
      const logger = LauncherLogger.getInstance();
      const supervisor = ProcessSupervisor.getInstance();
      const status = supervisor.getStatusSnapshot();
      const logDir = SettingsManager.getInstance().getLogDir();

      const now = new Date();
      const dateStr = now.toISOString().replace(/[-:]/g, '').replace('T', '_').slice(0, 15);
      const defaultFileName = `VanDao_Diagnostics_${dateStr}.zip`;

      let targetPath = customFilePath;
      if (!targetPath) {
        const dialogRes = await dialog.showSaveDialog({
          title: 'Xuất Gói Chẩn Đoán Chi Tiết (.zip)',
          defaultPath: path.join(app.getPath('downloads'), defaultFileName),
          filters: [{ name: 'Zip Archive (*.zip)', extensions: ['zip'] }],
        });

        if (dialogRes.canceled || !dialogRes.filePath) {
          return { success: false, error: 'Người dùng đã hủy xuất file' };
        }
        targetPath = dialogRes.filePath;
      }

      const zip = new AdmZip();

      // 1. summary.md
      const summaryMd = logger.redactSecrets(this.buildMarkdownSummary(status, logger));
      zip.addFile('summary.md', Buffer.from(summaryMd, 'utf8'));

      // 2. manifest.json
      const manifest = {
        manifestVersion: '1.7.0',
        gameTitle: 'VẠN ĐẠO TRƯỜNG SINH (萬道長生)',
        launcherVersion: status.launcherVersion,
        gameVersion: status.gameVersion,
        createdAt: new Date().toISOString(),
        runId: status.runId,
        environment: {
          isPackaged: status.isPackaged,
          os: `${status.osInfo.platform} ${status.osInfo.release} (${status.osInfo.arch})`,
          nodeVersion: process.version,
        },
        filesIncluded: [
          'summary.md',
          'manifest.json',
          'events.jsonl',
          'launcher.log',
          'server.log',
          'client.log',
        ],
        uncollectedScope: [
          '.env (bảo mật credentials)',
          'PostgreSQL database cluster (ngoài phạm vi chẩn đoán)',
          'Save files người chơi (bảo vệ quyền riêng tư)',
        ],
      };
      zip.addFile('manifest.json', Buffer.from(JSON.stringify(manifest, null, 2), 'utf8'));

      // 3. events.jsonl
      const allEntries = logger.getEntries();
      const jsonlLines = allEntries.map(e => JSON.stringify({
        timestamp: e.timestamp,
        source: e.source,
        level: e.level,
        event: e.event || 'LOG',
        message: e.message,
        run_id: e.runId,
        process_id: e.pid || null,
        error_code: e.errorCode || null,
        exit_code: e.exitCode !== undefined ? e.exitCode : null,
        stack: e.stack || null,
        observed_at: e.observedAt || e.timestamp,
      })).join('\n');
      zip.addFile('events.jsonl', Buffer.from(jsonlLines, 'utf8'));

      // 4. File logs (đã lọc secrets)
      const logFiles = ['launcher.log', 'server.log', 'client.log'];
      for (const lf of logFiles) {
        const fullPath = path.join(logDir, lf);
        if (fs.existsSync(fullPath)) {
          const raw = fs.readFileSync(fullPath, 'utf8');
          const clean = logger.redactSecrets(raw);
          zip.addFile(`logs/${lf}`, Buffer.from(clean, 'utf8'));
        } else {
          zip.addFile(`logs/${lf}`, Buffer.from(`[THÔNG BÁO] Nguồn log ${lf} chưa phát sinh dữ liệu trong phiên này.\n`, 'utf8'));
        }
      }

      zip.writeZip(targetPath);
      logger.logAction('XUẤT_GOI_CHAN_DOAN_ZIP', targetPath);

      return {
        success: true,
        filePath: targetPath,
        fileName: path.basename(targetPath),
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Lỗi khi tạo gói chẩn đoán ZIP' };
    }
  }

  private static buildTxtReportContent(status: any, logger: LauncherLogger): string {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const nowIso = new Date().toISOString();
    const actions = logger.getRecentActions();
    const errorSummary = logger.getErrorSummary();
    const allEntries = logger.getEntries();

    const launcherLogs = allEntries.filter(e => e.source === 'launcher');
    const serverLogs = allEntries.filter(e => e.source === 'server');
    const clientLogs = allEntries.filter(e => e.source === 'client');

    const errorEntries = allEntries.filter(e => e.level === 'ERROR');

    let out = '';
    out += '================================================================================\n';
    out += '      BÁO CÁO NHẬT KÝ & CHẨN ĐOÁN HỆ THỐNG CHO AI PHÂN TÍCH (AI REPORT)       \n';
    out += '                DỰ ÁN: VẠN ĐẠO TRƯỜNG SINH (萬道長生)                          \n';
    out += '================================================================================\n\n';

    // 1. THÔNG TIN BÁO CÁO & MÔI TRƯỜNG LAUNCHER
    out += 'PHẦN 1: THÔNG TIN BÁO CÁO & MÔI TRƯỜNG LAUNCHER\n';
    out += '--------------------------------------------------------------------------------\n';
    out += `• Thời gian xuất file: ${nowIso} (Múi giờ: ${timezone})\n`;
    out += `• Mã định danh phiên chạy (run_id): ${status.runId}\n`;
    out += `• Phiên bản Launcher: ${status.launcherVersion}\n`;
    out += `• Phiên bản Game: ${status.gameVersion}\n`;
    out += `• Hệ điều hành: ${os.type()} ${os.release()} (${os.arch()}) - ${os.platform()}\n`;
    out += `• Chế độ vận hành: ${status.isPackaged ? 'Bản Đóng Gói Sản Phẩm (Production Packaged)' : 'Bản Phát Triển Mã Nguồn (Development Mode)'}\n`;
    out += `• Tổng số sự kiện log đã ghi nhận: ${allEntries.length} dòng\n\n`;

    // 2. TỔNG QUAN TRẠNG THÁI DỊCH VỤ
    out += 'PHẦN 2: TỔNG QUAN TRẠNG THÁI DỊCH VỤ\n';
    out += '--------------------------------------------------------------------------------\n';
    out += `[MÁY CHỦ - SERVER]\n`;
    out += `  - Trạng thái: ${status.services.server.state}\n`;
    out += `  - Cổng: ${status.services.server.port} | URL: ${status.services.server.url}\n`;
    out += `  - Tiến trình PID: ${status.services.server.pid || 'Chưa xác định'}\n`;
    out += `  - Quyền quản lý tiến trình: ${status.services.server.isManagedByLauncher ? 'Do Launcher quản lý' : 'Đang chạy ngoài launcher / Không quản lý'}\n`;
    out += `  - Thời gian hoạt động: ${status.services.server.uptimeSec}s\n`;
    out += `  - Lần sẵn sàng gần nhất: ${status.services.server.lastReadyTime ? new Date(status.services.server.lastReadyTime).toISOString() : 'Chưa ghi nhận'}\n`;
    out += `  - Lỗi gần nhất: ${status.services.server.lastError || 'Không có'}\n\n`;

    out += `[GIAO DIỆN - CLIENT]\n`;
    out += `  - Trạng thái: ${status.services.client.state}\n`;
    out += `  - Cổng: ${status.services.client.port} | URL: ${status.services.client.url}\n`;
    out += `  - Tiến trình PID: ${status.services.client.pid || 'Chưa xác định'}\n`;
    out += `  - Quyền quản lý tiến trình: ${status.services.client.isManagedByLauncher ? 'Do Launcher quản lý' : 'Đang chạy ngoài launcher / Không quản lý'}\n`;
    out += `  - Thời gian hoạt động: ${status.services.client.uptimeSec}s\n`;
    out += `  - Lỗi gần nhất: ${status.services.client.lastError || 'Không có'}\n\n`;

    out += `[CƠ SỞ DỮ LIỆU - DATABASE]\n`;
    out += `  - Địa chỉ: ${status.database.host}:${status.database.port}\n`;
    out += `  - Trạng thái kết nối: ${status.database.state}\n`;
    out += `  - Lần kiểm tra: ${status.database.lastCheckedTime ? new Date(status.database.lastCheckedTime).toISOString() : 'Chưa kiểm tra'}\n`;
    out += `  - Thông điệp: ${status.database.message}\n`;
    out += `  - Lưu ý: Database là phụ thuộc hạ tầng ngoài (PostgreSQL), Launcher chỉ kiểm tra TCP readiness, không tự quản lý tiến trình DB.\n\n`;

    // 3. TÓM TẮT HÀNH VI GẦN NHẤT
    out += 'PHẦN 3: TÓM TẮT HÀNH VI GẦN NHẤT\n';
    out += '--------------------------------------------------------------------------------\n';
    if (actions.length === 0) {
      out += 'Chưa có thao tác người dùng nào được ghi nhận.\n';
    } else {
      actions.forEach((act, idx) => {
        out += `${idx + 1}. [${act.timestamp}] ${act.action}${act.details ? ` -> ${act.details}` : ''}\n`;
      });
    }
    out += '\n';

    // 4. DANH SÁCH LỖI & BỐI CẢNH PHÁT SINH
    out += 'PHẦN 4: DANH SÁCH LỖI & BỐI CẢNH PHÁT SINH\n';
    out += '--------------------------------------------------------------------------------\n';
    out += `• Tổng số lỗi đã phát hiện: ${errorSummary.errorCount}\n`;
    out += `• Lỗi đầu tiên: ${errorSummary.firstError || 'Không có'}\n`;
    out += `• Lỗi gần nhất: ${errorSummary.latestError || 'Không có'}\n\n`;

    if (errorEntries.length > 0) {
      out += 'Chi tiết các sự kiện lỗi gần nhất:\n';
      errorEntries.slice(-10).forEach((err, i) => {
        out += `--- Lỗi #${i + 1} [${err.source.toUpperCase()}] [${err.timestamp}] ---\n`;
        out += `Nội dung: ${err.message}\n`;
        if (err.stack) out += `Stack trace:\n${err.stack}\n`;
      });
    } else {
      out += 'Hệ thống vận hành bình thường, không có lỗi nghiêm trọng nào được ghi nhận.\n';
    }
    out += '\n';

    // 5. TOÀN BỘ NHẬT KÝ THEO NGUỒN
    out += 'PHẦN 5: TOÀN BỘ NHẬT KÝ THEO NGUỒN (ĐÃ CHE THÔNG TIN BẢO MẬT)\n';
    out += '--------------------------------------------------------------------------------\n\n';

    out += '=== [NGUỒN 1: LAUNCHER] ===\n';
    if (launcherLogs.length === 0) out += '(Trống)\n';
    else {
      launcherLogs.slice(-150).forEach(l => {
        out += `[${l.timestamp}] [${l.level}] ${l.event ? `[${l.event}] ` : ''}${l.message}\n`;
      });
    }
    out += '\n';

    out += '=== [NGUỒN 2: SERVER (BACKEND)] ===\n';
    if (serverLogs.length === 0) out += '(Trống - Server chưa bật hoặc chưa xuất dữ liệu ra stdout/stderr)\n';
    else {
      serverLogs.slice(-250).forEach(l => {
        out += `[${l.timestamp}] [${l.level}] ${l.message}\n`;
      });
    }
    out += '\n';

    out += '=== [NGUỒN 3: CLIENT (FRONTEND)] ===\n';
    if (clientLogs.length === 0) out += '(Trống - Client chưa bật hoặc chưa xuất dữ liệu ra stdout/stderr)\n';
    else {
      clientLogs.slice(-200).forEach(l => {
        out += `[${l.timestamp}] [${l.level}] ${l.message}\n`;
      });
    }
    out += '\n';

    // 6. PHẠM VI DỮ LIỆU & GIỚI HẠN KỸ THUẬT
    out += 'PHẦN 6: PHẠM VI DỮ LIỆU & GIỚI HẠN KỸ THUẬT\n';
    out += '--------------------------------------------------------------------------------\n';
    out += '• Giới hạn dung lượng: Giữ tối đa 2000 dòng log gần nhất để đảm bảo hiệu năng và không vượt ngưỡng token của AI.\n';
    out += '• Danh mục thông tin đã được tự động che dấu (Redacted):\n';
    out += '  - Mật khẩu tài khoản, passwordHash trong body/logs\n';
    out += '  - JWT tokens và Bearer Authorization headers\n';
    out += '  - Thông tin xác thực trong Database Connection URL\n';
    out += '  - Đường dẫn thư mục cá nhân người dùng Windows (chuyển thành <USER_DIR>)\n';
    out += '• Nguồn ngoài phạm vi: Dữ liệu bảng nội bộ PostgreSQL không được đính kèm vào báo cáo này.\n';
    out += '================================================================================\n';
    out += '                       HẾT NỘI DUNG BÁO CÁO CHẨN ĐOÁN                           \n';
    out += '================================================================================\n';

    return out;
  }

  private static buildMarkdownSummary(status: any, logger: LauncherLogger): string {
    const errorSummary = logger.getErrorSummary();
    return `# BÁO CÁO TÓM TẮT CHẨN ĐOÁN VẠN ĐẠO TRƯỜNG SINH
**Thời gian tạo:** ${new Date().toISOString()}  
**Mã phiên (run_id):** \`${status.runId}\`  
**Hệ điều hành:** ${os.type()} ${os.release()} (${os.arch()})  
**Trạng thái chung:** ${errorSummary.errorCount > 0 ? '⚠️ CÓ LỖI PHÁT SINH' : '✅ VẬN HÀNH ỔN ĐỊNH'}

---

## 1. Tình Trạng Dịch Vụ
- **Server (Backend API/WS):** \`${status.services.server.state}\` (Cổng ${status.services.server.port}, PID: ${status.services.server.pid || 'N/A'})
- **Client (Frontend Web):** \`${status.services.client.state}\` (Cổng ${status.services.client.port}, PID: ${status.services.client.pid || 'N/A'})
- **Database (PostgreSQL):** \`${status.database.state}\` (${status.database.message})

## 2. Lỗi Phát Hiện
- **Tổng số lỗi:** ${errorSummary.errorCount}
- **Lỗi đầu tiên:** ${errorSummary.firstError || 'None'}
- **Lỗi gần nhất:** ${errorSummary.latestError || 'None'}

## 3. Các File Đính Kèm Trong Gói
- \`manifest.json\`: Cấu hình phiên và danh sách file
- \`events.jsonl\`: Chi tiết toàn bộ sự kiện có cấu trúc (Machine-readable)
- \`launcher.log\`: Nhật ký tiến trình điều khiển Launcher
- \`server.log\`: Nhật ký máy chủ Fastify & WebSocket Engine
- \`client.log\`: Nhật ký Vite Development / Preview Server
`;
  }
}
