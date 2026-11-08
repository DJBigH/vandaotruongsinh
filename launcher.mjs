import { spawn, exec, execSync } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SERVER_DIR = path.join(__dirname, 'server');
const CLIENT_DIR = path.join(__dirname, 'client');
const DB_HOST = '127.0.0.1';
const DB_PORT = 5432;
const SERVER_PORT = 3001;
const CLIENT_PORT = 5173;

let serverProcess = null;
let clientProcess = null;
let isShuttingDown = false;

// ANSI Colors & Styles
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  gold: '\x1b[38;5;220m',
  cyan: '\x1b[38;5;51m',
  green: '\x1b[38;5;82m',
  yellow: '\x1b[38;5;226m',
  red: '\x1b[38;5;196m',
  purple: '\x1b[38;5;141m',
  gray: '\x1b[38;5;245m',
};

function banner() {
  try {
    console.clear();
  } catch (e) {}
  console.log(`${c.gold}${c.bold}========================================================================${c.reset}`);
  console.log(`${c.gold}${c.bold}    ⚔️   VẠN ĐẠO TRƯỜNG SINH (萬道長生) — TRÌNH KHỞI CHẠY GAME   ⚔️    ${c.reset}`);
  console.log(`${c.gold}${c.bold}========================================================================${c.reset}`);
  console.log(`${c.purple}    Cổ phong Tu Tiên 2D | Máy chủ quyết định | Khám phá tự do | Không P2W${c.reset}\n`);
}

function logStep(icon, message, color = c.cyan) {
  console.log(`${color}${icon} ${message}${c.reset}`);
}

// Tự động giải phóng cổng bị chiếm dụng bởi tiến trình zombie cũ (nếu có)
function freePort(port) {
  if (process.platform !== 'win32') return;
  try {
    const stdout = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const lines = stdout.split('\n');
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 5 && parts[1].endsWith(`:${port}`) && parts[3] === 'LISTENING') {
        const pid = parseInt(parts[4], 10);
        if (pid && pid !== process.pid) {
          try {
            execSync(`taskkill /pid ${pid} /F /T`, { stdio: 'ignore' });
            logStep('🧹', `Đã dọn dẹp tiến trình cũ (PID: ${pid}) đang chiếm cổng ${port}.`, c.gray);
          } catch (e) {}
        }
      }
    }
  } catch (e) {
    // Cổng không bị chiếm hoặc không tìm thấy, hoàn toàn bình thường
  }
}

function checkPort(host, port, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let isConnected = false;

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => {
      isConnected = true;
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

    socket.connect(port, host);
  });
}

async function waitForPort(host, port, maxWaitMs = 25000, intervalMs = 600) {
  const startTime = Date.now();
  while (Date.now() - startTime < maxWaitMs) {
    const ok = await checkPort(host, port, 800);
    if (ok) return true;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return false;
}

async function ensurePostgres() {
  logStep('🔍', 'Kiểm tra cơ sở dữ liệu PostgreSQL (cổng 5432)...');
  const isUp = await checkPort(DB_HOST, DB_PORT, 1500);

  if (isUp) {
    logStep('✅', 'Cơ sở dữ liệu PostgreSQL đã sẵn sàng!', c.green);
    return true;
  }

  logStep('⚡', 'PostgreSQL chưa chạy. Đang tự động kích hoạt dịch vụ...', c.yellow);

  // Thử kích hoạt qua WSL trước
  try {
    execSync('wsl -u root systemctl start postgresql@16-main', { stdio: 'ignore', timeout: 6000 });
  } catch (e) {
    // Nếu WSL không chạy, thử qua docker compose
    try {
      execSync('docker compose up -d postgres', { cwd: __dirname, stdio: 'ignore', timeout: 10000 });
    } catch (e2) {}
  }

  const ok = await waitForPort(DB_HOST, DB_PORT, 12000);
  if (ok) {
    logStep('✅', 'Đã khởi động PostgreSQL thành công!', c.green);
    return true;
  } else {
    logStep('⚠️', 'Không thể tự động kết nối PostgreSQL (cổng 5432).', c.red);
    logStep('👉', 'Đạo hữu vui lòng đảm bảo Docker Compose hoặc dịch vụ PostgreSQL đang chạy.', c.yellow);
    return false;
  }
}

let clientReadyFlag = false;
let serverReadyFlag = false;

function startBackend() {
  logStep('🚀', 'Đang khởi động Máy chủ Game Backend (Fastify API)...');

  serverProcess = spawn('cmd.exe', ['/c', 'npm', 'run', 'dev'], {
    cwd: SERVER_DIR,
    env: { ...process.env, FORCE_COLOR: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  serverProcess.stdout.on('data', (chunk) => {
    const text = chunk.toString();
    if (text.includes('Máy chủ đang hoạt động') || text.includes('Server listening')) {
      serverReadyFlag = true;
    }
    if (process.env.DEBUG) {
      process.stdout.write(`${c.gray}[Server] ${text}${c.reset}`);
    }
  });

  serverProcess.stderr.on('data', (chunk) => {
    const text = chunk.toString();
    if (!text.includes('DeprecationWarning') && !text.includes('EXPERIMENTAL')) {
      if (process.env.DEBUG) {
        process.stderr.write(`${c.yellow}[Server] ${text}${c.reset}`);
      }
    }
  });

  serverProcess.on('exit', (code) => {
    if (!isShuttingDown && code !== 0 && code !== null) {
      logStep('❌', `Máy chủ Backend dừng đột ngột với mã thoát ${code}`, c.red);
    }
  });
}

function startFrontend() {
  logStep('🌐', 'Đang khởi động Giao diện Web Game (Vite + React)...');

  clientProcess = spawn('cmd.exe', ['/c', 'npm', 'run', 'dev'], {
    cwd: CLIENT_DIR,
    env: { ...process.env, FORCE_COLOR: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  clientProcess.stdout.on('data', (chunk) => {
    const text = chunk.toString();
    if (text.includes('Local:') || text.includes('ready in')) {
      clientReadyFlag = true;
    }
    if (process.env.DEBUG) {
      process.stdout.write(`${c.gray}[Client] ${text}${c.reset}`);
    }
  });

  clientProcess.stderr.on('data', (chunk) => {
    if (process.env.DEBUG) {
      process.stderr.write(`${c.gray}[Client Err] ${chunk.toString()}${c.reset}`);
    }
  });

  clientProcess.on('exit', (code) => {
    if (!isShuttingDown && code !== 0 && code !== null) {
      logStep('❌', `Giao diện Web dừng đột ngột với mã thoát ${code}`, c.red);
    }
  });
}

function openBrowser(url) {
  const startCmd = process.platform === 'win32' ? `start "" "${url}"` :
                   process.platform === 'darwin' ? `open "${url}"` :
                   `xdg-open "${url}"`;
  exec(startCmd);
}

function killTree(proc) {
  if (!proc || !proc.pid) return;
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /pid ${proc.pid} /T /F`, { stdio: 'ignore' });
    } else {
      proc.kill('SIGKILL');
    }
  } catch (e) {}
}

function shutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`\n${c.yellow}🛑 Đang đóng tất cả tiến trình máy chủ game...${c.reset}`);
  
  if (serverProcess) {
    killTree(serverProcess);
    serverProcess = null;
  }
  if (clientProcess) {
    killTree(clientProcess);
    clientProcess = null;
  }

  // Quét sạch cổng một lần nữa để tránh tiến trình sót
  freePort(SERVER_PORT);
  freePort(CLIENT_PORT);

  console.log(`${c.green}✅ Đã tắt game hoàn toàn. Chúc đạo hữu vạn sự như ý!${c.reset}\n`);
  process.exit(0);
}

function setupKeyboardControls() {
  if (process.stdin.isTTY) {
    try {
      readline.emitKeypressEvents(process.stdin);
      process.stdin.setRawMode(true);
      process.stdin.on('keypress', (str, key) => {
        if (!key) return;
        if (key.ctrl && key.name === 'c') {
          shutdown();
        } else if (key.name === 'q') {
          shutdown();
        } else if (key.name === 'b') {
          console.log(`${c.cyan}🔗 Đang mở trình duyệt: http://localhost:${CLIENT_PORT}...${c.reset}`);
          openBrowser(`http://localhost:${CLIENT_PORT}`);
        } else if (key.name === 'a') {
          console.log(`${c.purple}👑 Đang mở Admin Panel: http://localhost:${CLIENT_PORT}/admin...${c.reset}`);
          openBrowser(`http://localhost:${CLIENT_PORT}/admin`);
        }
      });
    } catch (e) {}
  }
}

async function main() {
  banner();

  // 0. Dọn dẹp cổng cũ (nếu có phiên chạy trước bị ngắt ngang)
  freePort(SERVER_PORT);
  freePort(CLIENT_PORT);

  // 1. Kiểm tra PostgreSQL
  const dbOk = await ensurePostgres();
  if (!dbOk) {
    console.log(`\n${c.red}Không thể tiếp tục nếu không có cơ sở dữ liệu.${c.reset}`);
    console.log(`${c.yellow}Gợi ý: Mở Docker Desktop hoặc chạy lệnh 'docker compose up -d' rồi bật lại launcher.${c.reset}\n`);
    process.exit(1);
  }

  // 2. Bật Backend
  startBackend();
  let serverReady = false;
  const sStart = Date.now();
  while (Date.now() - sStart < 20000) {
    if (serverReadyFlag || await checkPort('127.0.0.1', SERVER_PORT, 500)) {
      serverReady = true;
      break;
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  if (!serverReady) {
    logStep('❌', `Máy chủ Backend chưa phản hồi tại cổng ${SERVER_PORT}.`, c.red);
  } else {
    logStep('✅', `Máy chủ Game Backend đã hoạt động tại: http://localhost:${SERVER_PORT}`, c.green);
  }

  // 3. Bật Frontend
  startFrontend();
  let clientReady = false;
  const cStart = Date.now();
  while (Date.now() - cStart < 20000) {
    if (clientReadyFlag || await checkPort('127.0.0.1', CLIENT_PORT, 500) || await checkPort('localhost', CLIENT_PORT, 500)) {
      clientReady = true;
      break;
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  if (!clientReady) {
    logStep('❌', `Giao diện Web chưa phản hồi tại cổng ${CLIENT_PORT}.`, c.red);
  } else {
    logStep('✅', `Giao diện Web Game đã sẵn sàng tại: http://localhost:${CLIENT_PORT}`, c.green);
  }

  // 4. Mở trình duyệt web tự động
  logStep('🎉', 'Đang tự động mở trình duyệt web vào cõi Tiên Giới...', c.gold);
  openBrowser(`http://localhost:${CLIENT_PORT}`);

  // 5. In bảng thông tin và phím tắt
  console.log(`\n${c.gold}========================================================================${c.reset}`);
  console.log(`${c.green}${c.bold}✨ TRÒ CHƠI ĐÃ SẴN SÀNG! ĐẠO HỮU ĐÃ CÓ THỂ BẮT ĐẦU TU TIÊN! ✨${c.reset}`);
  console.log(`${c.gold}========================================================================${c.reset}`);
  console.log(`${c.cyan}🎮 Chơi game tại:${c.reset}       http://localhost:${CLIENT_PORT}`);
  console.log(`${c.purple}👑 Quản trị (Admin):${c.reset}    http://localhost:${CLIENT_PORT}/admin`);
  console.log(`${c.gray}   - Tài khoản Admin:${c.reset}  daochu`);
  console.log(`${c.gray}   - Mật khẩu:${c.reset}         Admin@123456\n`);
  console.log(`${c.yellow}${c.bold}⌨️  PHÍM ĐIỀU KHIỂN NHANH:${c.reset}`);
  console.log(`   ${c.bold}[B]${c.reset} : Mở lại trình duyệt Web Game`);
  console.log(`   ${c.bold}[A]${c.reset} : Mở trang Admin Panel quản trị`);
  console.log(`   ${c.bold}[Q]${c.reset} hoặc ${c.bold}[Ctrl + C]${c.reset} : TẮT TOÀN BỘ TIẾN TRÌNH GAME AN TOÀN`);
  console.log(`${c.gold}========================================================================${c.reset}`);
  console.log(`${c.dim}(Cửa sổ này đang giữ máy chủ hoạt động. Đừng đóng cửa sổ này khi đang chơi)${c.reset}\n`);

  // Thiết lập phím tắt
  setupKeyboardControls();

  // Bắt các sự kiện thoát
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  process.on('SIGHUP', shutdown);
}

main().catch((err) => {
  console.error(`${c.red}Lỗi trong trình khởi chạy:${c.reset}`, err);
  shutdown();
});
