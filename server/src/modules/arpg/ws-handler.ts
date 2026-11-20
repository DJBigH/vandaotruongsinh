// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Real-Time ARPG WebSocket Handler
// Bảo mật: Chống CSWSH, Giới hạn dung lượng, Chống Spam Rate-limit,
// Kiểm tra Tài khoản bị khóa (Ban), Xác thực Ô nhân vật kích hoạt,
// Chống Race-condition USE_ITEM, Lọc tọa độ NaN/Infinity.
// ============================================================

import { FastifyInstance, FastifyRequest } from 'fastify';
import { WebSocket } from 'ws';
import { PrismaClient } from '@prisma/client';
import { ArpgSessionManager, ArpgGameSession } from '../../engine/realtime-arpg-engine';
import { ARPG_CLOSE, WsClientMessage, WsServerMessage } from '@shared';
import { consumeInventoryItem } from '../inventory/routes';

const activeSockets = new Map<string, WebSocket>(); // characterId -> WebSocket
const characterAccountMap = new Map<string, string>(); // characterId -> accountId

// Slot changes and the whole authenticated bind share one order per account.
const slotOperations = new Map<string, Promise<unknown>>();
export async function withAccountSlot<T>(accountId: string, operation: () => Promise<T>): Promise<T> {
  const previous = slotOperations.get(accountId);
  const current = previous ? previous.then(operation, operation) : operation();
  slotOperations.set(accountId, current);
  try { return await current; }
  finally { if (slotOperations.get(accountId) === current) slotOperations.delete(accountId); }
}

export async function retireOtherSlots(accountId: string, activeId: string) {
  const manager = ArpgSessionManager.getInstance();
  for (const [id, owner] of characterAccountMap) {
    if (owner !== accountId || id === activeId) continue;
    const socket = activeSockets.get(id);
    activeSockets.delete(id);
    characterAccountMap.delete(id);
    const session = manager.getSession(id);
    if (session) {
      session.sendSnapshotCallback = null;
      session.pause();
    }
    socket?.close(ARPG_CLOSE.SLOT_CHANGED, 'Active character changed');
    if (session) await manager.persistPosition(id);
  }
}

/**
 * Ngắt kết nối socket của nhân vật/tài khoản ngay lập tức khi bị Admin khóa
 */
export function disconnectCharacterSocket(characterId: string, reason = 'Phiên chơi đã bị máy chủ chấm dứt!') {
  const socket = activeSockets.get(characterId);
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: 'ERROR', error: reason }));
    socket.close();
  }
}

export function disconnectAccountSockets(accountId: string, reason = 'Tài khoản đã bị phong ấn vĩnh viễn do vi phạm quy tắc!') {
  for (const [charId, accId] of characterAccountMap.entries()) {
    if (accId === accountId) {
      disconnectCharacterSocket(charId, reason);
      characterAccountMap.delete(charId);
    }
  }
}

export async function arpgWebSocketRoutes(fastify: FastifyInstance, options: { prisma: PrismaClient }) {
  const { prisma } = options;
  const sessionManager = ArpgSessionManager.getInstance();

  fastify.get('/ws/game', { websocket: true }, (socket: WebSocket, req: FastifyRequest) => {
    // 1. Kiểm tra CSWSH (Cross-Site WebSocket Hijacking)
    const origin = req.headers.origin;
    if (origin) {
      const allowedOrigins = [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3001',
      ];
      const host = req.headers.host;
      const originHost = origin.replace(/^https?:\/\//, '');
      const isAllowed = allowedOrigins.includes(origin) || (host && originHost === host);
      if (!isAllowed) {
        socket.send(JSON.stringify({ type: 'ERROR', error: 'Nguồn gốc kết nối WebSocket không hợp lệ (CSWSH rejected)' }));
        socket.close();
        return;
      }
    }

    let activeCharacterId: string | null = null;
    let currentSession: ArpgGameSession | null = null;
    let authPending = false;

    // Rate limiting: tối đa 40 gói tin / giây
    let messageCount = 0;
    let rateLimitWindowStart = Date.now();

    async function bindActiveSlot(accountId: string, requestedId?: string) {
      // Kiểm tra xem tài khoản có bị phong ấn (Banned) không
      const account = await prisma.account.findUnique({
        where: { id: accountId },
        select: { id: true, isBanned: true },
      });

      if (!account || account.isBanned) {
        socket.send(JSON.stringify({ type: 'ERROR', error: 'Tài khoản đã bị phong ấn vĩnh viễn do vi phạm quy tắc!' }));
        socket.close();
        return;
      }

      // Fetch active character (đảm bảo chỉ nhân vật đang kích hoạt isActive: true mới được tham gia game)
      const character = await prisma.character.findFirst({
        where: {
          accountId,
          isActive: true,
          ...(requestedId ? { id: requestedId } : {}),
        },
        select: { id: true },
      });

      if (!character) {
        socket.close(ARPG_CLOSE.SLOT_CHANGED, 'Character is no longer active');
        return;
      }

      if (socket.readyState !== WebSocket.OPEN) return;
      const session = await sessionManager.openSession(character.id, accountId);
      if (socket.readyState !== WebSocket.OPEN) {
        if (!activeSockets.has(character.id)) session?.pause();
        return;
      }
      if (!session) {
        socket.close(ARPG_CLOSE.SLOT_CHANGED, 'Character is no longer active');
        return;
      }

      activeCharacterId = character.id;
      characterAccountMap.set(character.id, accountId);
      const existingSocket = activeSockets.get(character.id);
      activeSockets.set(character.id, socket);
      currentSession = session;
      session.sendSnapshotCallback = (serverMsg: WsServerMessage) => {
        if (activeSockets.get(character.id) === socket && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify(serverMsg));
        }
      };

      // The replacement owns the session before the former socket can emit its close event.
      if (existingSocket && existingSocket !== socket && existingSocket.readyState === WebSocket.OPEN) {
        existingSocket.send(JSON.stringify({
          type: 'ERROR',
          error: 'Phiên chơi đã được kết nối ở cửa sổ khác!',
        }));
        existingSocket.close(ARPG_CLOSE.WINDOW_REPLACED, 'Session opened in another window');
      }

      // Send INIT ACK
      socket.send(JSON.stringify({
        type: 'INIT',
        serverTime: Date.now(),
        currentMapId: currentSession.mapId,
        playerState: currentSession.createSnapshot(Date.now()).playerState,
      }));
    }

    socket.on('message', async (data: Buffer | string) => {
      try {
        const raw = data.toString();

        // 2. Chống DoS: Giới hạn độ dài payload tối đa 8KB
        if (raw.length > 8192) {
          socket.send(JSON.stringify({ type: 'ERROR', error: 'Gói tin vượt quá dung lượng tối đa 8KB' }));
          socket.close();
          return;
        }

        // 3. Rate Limiter
        const now = Date.now();
        if (now - rateLimitWindowStart > 1000) {
          rateLimitWindowStart = now;
          messageCount = 0;
        }
        messageCount++;
        if (messageCount > 40) {
          socket.send(JSON.stringify({ type: 'ERROR', error: 'Thao tác quá nhanh, vui lòng giảm tần suất gửi gói tin!' }));
          return;
        }

        const msg: WsClientMessage = JSON.parse(raw);

        // 4. Authentication & Session Binding
        if (msg.type === 'AUTH') {
          if (authPending || activeCharacterId) return;
          authPending = true;
          let userId: string | null = null;

          // Authenticate via token payload or cookie
          if (msg.token) {
            try {
              const decoded = fastify.jwt.verify<{ userId: string }>(msg.token);
              userId = decoded.userId;
            } catch (e) {
              // Token invalid
            }
          }

          if (!userId) {
            // Try extracting from cookies in handshake req
            const cookieToken = req.cookies?.token;
            if (cookieToken) {
              try {
                const decoded = fastify.jwt.verify<{ userId: string }>(cookieToken);
                userId = decoded.userId;
              } catch (e) {}
            }
          }

          if (!userId) {
            socket.send(JSON.stringify({ type: 'ERROR', error: 'Chưa xác thực danh tính' }));
            socket.close();
            return;
          }

          const accountId = userId;
          await withAccountSlot(accountId, () => bindActiveSlot(accountId, msg.characterId));
          return;
        }

        if (!currentSession || !activeCharacterId ||
            activeSockets.get(activeCharacterId) !== socket || socket.readyState !== WebSocket.OPEN ||
            sessionManager.getSession(activeCharacterId) !== currentSession) return;

        // 5. Input Handling (Lọc sạch tọa độ NaN / Infinity)
        if (msg.type === 'INPUT' && msg.input) {
          const input = msg.input;
          if (!Number.isFinite(input.moveX) || !Number.isFinite(input.moveY) || !Number.isFinite(input.angle)) {
            return; // Loại bỏ payload độc hại gây hư hỏng tọa độ player
          }
          if (input.targetX !== undefined && !Number.isFinite(input.targetX)) {
            input.targetX = undefined;
          }
          if (input.targetY !== undefined && !Number.isFinite(input.targetY)) {
            input.targetY = undefined;
          }

          currentSession.handleInput(input);
        }

        // 6. Heartbeat
        else if (msg.type === 'HEARTBEAT') {
          currentSession.receiveHeartbeat();
          socket.send(JSON.stringify({
            type: 'HEARTBEAT_ACK',
            serverTime: Date.now(),
          }));
        }

        // 7. Use the same committed item effect as HTTP inventory.
        else if (msg.type === 'USE_ITEM' && typeof msg.itemId === 'string' && msg.itemId) {
          const session = currentSession;
          await consumeInventoryItem(session.characterId, { templateId: msg.itemId }, () =>
            activeSockets.get(session.characterId) === socket && socket.readyState === WebSocket.OPEN &&
            sessionManager.getSession(session.characterId) === session,
          );
        }
      } catch (err) {
        req.log.error(err, 'Lỗi xử lý gói tin WebSocket ARPG');
        if (!activeCharacterId) {
          authPending = false;
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
              type: 'ERROR',
              error: 'Không thể mở thế giới. Hãy chạy Cài Đặt Tự Động trong Launcher để đồng bộ dữ liệu, rồi tải lại game.',
            }));
            socket.close(1011, 'World initialization failed');
          }
        }
      }
    });

    socket.on('close', () => {
      if (!activeCharacterId || activeSockets.get(activeCharacterId) !== socket) return;
      activeSockets.delete(activeCharacterId);
      characterAccountMap.delete(activeCharacterId);
      if (currentSession && sessionManager.getSession(activeCharacterId) === currentSession) {
        currentSession.sendSnapshotCallback = null;
        currentSession.pause();
        void sessionManager.persistPosition(activeCharacterId).catch((err) => req.log.error(err));
      }
    });

    socket.on('error', (err) => {
      console.error('Lỗi kết nối WebSocket:', err);
    });
  });
}
