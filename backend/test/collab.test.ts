import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { WebSocket } from 'ws';
import * as Y from 'yjs';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import type { AddressInfo } from 'node:net';
import { server } from '../src/index.js';
import { getOrCreateUser, type TestUser } from './helpers.js';
import { CollabMessageType, SyncSubType } from '../src/shared/types/collab.js';
import * as syncProtocol from 'y-protocols/sync';

describe('Kiểm thử Chức năng 2: Soạn thảo Đồng thời & Đồng bộ Real-time (UC_COLLAB_02)', () => {
  let wsPort: number;
  let owner: TestUser;
  let viewerUser: TestUser;
  let docId: string;

  beforeAll(async () => {
    if (!server.listening) {
      await new Promise<void>((resolve) => server.listen(0, resolve));
    }
    wsPort = (server.address() as AddressInfo).port;

    owner = await getOrCreateUser('collab_owner@test.com', 'password123');
    viewerUser = await getOrCreateUser('collab_viewer@test.com', 'password123');

    const docRes = await request(server)
      .post('/api/documents')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ title: 'Collab E2E Test Document' });
    docId = docRes.body.id;

    await request(server)
      .post(`/api/documents/${docId}/permissions`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ email: viewerUser.email, role: 'VIEWER' });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  const connectWs = (token: string): Promise<WebSocket> => {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://localhost:${wsPort}/collab/${docId}?token=${token}`);
      ws.on('open', () => resolve(ws));
      ws.on('error', (err) => reject(err));
    });
  };

  // Khớp STT 1 - Bảng trang 41
  it('STT 1: User A gửi binary update chèn chuỗi ký tự qua WebSocket', async () => {
    const wsA = await connectWs(owner.token);
    const wsB = await connectWs(owner.token);

    const docB = new Y.Doc();

    const receivedUpdatePromise = new Promise<void>((resolve) => {
      wsB.on('message', (data: Buffer) => {
        const uint8Msg = new Uint8Array(data);
        const decoder = decoding.createDecoder(uint8Msg);
        const msgType = decoding.readVarUint(decoder);

        if (msgType === CollabMessageType.SYNC) {
          const subType = decoding.readVarUint(decoder);
          if (subType === SyncSubType.SYNC_UPDATE) {
            const update = decoding.readVarUint8Array(decoder);
            Y.applyUpdate(docB, update);
            if (docB.getText('content').toString() === 'HELLO WORLD') {
              resolve();
            }
          }
        }
      });
    });

    const docA = new Y.Doc();
    const textA = docA.getText('content');
    docA.on('update', (update) => {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, CollabMessageType.SYNC);
      encoding.writeVarUint(encoder, 2);
      encoding.writeVarUint8Array(encoder, update);
      wsA.send(encoding.toUint8Array(encoder));
    });

    textA.insert(0, 'HELLO WORLD');

    await expect(receivedUpdatePromise).resolves.toBeUndefined();

    // DỌN SẠCH DỮ LIỆU: Xóa trắng toàn bộ text vừa gõ để không ô nhiễm STT 4
    textA.delete(0, textA.length);
    await new Promise((r) => setTimeout(r, 100)); // Chờ 100ms để server apply xong update xóa

    wsA.close();
    wsB.close();
  });

  // Khớp STT 2 - Bảng trang 41
  it('STT 2: User có role VIEWER cố tình inject gửi gói tin CRDT Update qua WebSocket', async () => {
    const wsViewer = await connectWs(viewerUser.token);
    const wsOwner = await connectWs(owner.token);

    let viewerUpdateLeaked = false;
    wsOwner.on('message', (data: Buffer) => {
      const uint8 = new Uint8Array(data);
      const dec = decoding.createDecoder(uint8);
      if (decoding.readVarUint(dec) === CollabMessageType.SYNC) {
        if (decoding.readVarUint(dec) === SyncSubType.SYNC_UPDATE) {
          const update = decoding.readVarUint8Array(dec);
          const tempDoc = new Y.Doc();
          Y.applyUpdate(tempDoc, update);
          if (tempDoc.getText('content').toString().includes('HACKED')) {
            viewerUpdateLeaked = true;
          }
        }
      }
    });

    const fakeDoc = new Y.Doc();
    fakeDoc.getText('content').insert(0, 'HACKED');
    const fakeUpdate = Y.encodeStateAsUpdate(fakeDoc);

    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, CollabMessageType.SYNC);
    encoding.writeVarUint(encoder, 2);
    encoding.writeVarUint8Array(encoder, fakeUpdate);

    wsViewer.send(encoding.toUint8Array(encoder));

    await new Promise((r) => setTimeout(r, 300));
    expect(viewerUpdateLeaked).toBe(false);

    wsViewer.close();
    wsOwner.close();
  });

  // Khớp STT 3 - Bảng trang 41
  it('STT 3: Client gửi frame dữ liệu rác (Corrupted/Non-Yjs binary data)', async () => {
    const ws = await connectWs(owner.token);
    const garbageBytes = Buffer.from([0xff, 0xfe, 0x01, 0x00, 0x99, 0x88]);

    ws.send(garbageBytes, { binary: true });

    await new Promise((r) => setTimeout(r, 200));

    const healthCheck = await request(server).get('/api');
    expect(healthCheck.status).toBe(200);
    expect(healthCheck.body.message).toBe('Server is healthy');

    ws.close();
  });

  // Khớp STT 4 - Bảng trang 41: Mô phỏng chuẩn 2 User, 1 người rớt mạng gõ tiếp rồi reconnect
  it('STT 4: User ngắt mạng 10 giây (gõ thêm chữ lúc offline), sau đó kết nối lại -> PASS', async () => {
    // 1. Tạo 2 cây Y.Doc đại diện cho Client A và Client B trên trình duyệt
    const docA = new Y.Doc();
    const docB = new Y.Doc();

    // Helper: Gắn giao thức đồng bộ Yjs 2 chiều giữa WebSocket và Y.Doc
    const bindSyncProtocol = (ws: WebSocket, doc: Y.Doc) => {
      // Khi Y.Doc local có thay đổi -> Bắn binary update lên server
      const onDocUpdate = (update: Uint8Array, origin: any) => {
        if (origin === 'network') return;
        if (ws.readyState === WebSocket.OPEN) {
          const encoder = encoding.createEncoder();
          encoding.writeVarUint(encoder, CollabMessageType.SYNC);
          encoding.writeVarUint(encoder, 2); // messageYjsUpdate
          encoding.writeVarUint8Array(encoder, update);
          ws.send(encoding.toUint8Array(encoder));
        }
      };
      doc.on('update', onDocUpdate);

      // Khi nhận message từ Server -> Áp dụng vào Y.Doc local
      ws.on('message', (data: Buffer) => {
        const uint8 = new Uint8Array(data);
        const decoder = decoding.createDecoder(uint8);
        const msgType = decoding.readVarUint(decoder);

        if (msgType === CollabMessageType.SYNC) {
          const subType = decoding.readVarUint(decoder);
          if (subType === 0) {
            // Server gửi SyncStep1 -> Client gửi lại SyncStep2 chứa những gì mình có
            const encoder = encoding.createEncoder();
            encoding.writeVarUint(encoder, CollabMessageType.SYNC);
            syncProtocol.readSyncStep1(decoder, encoder, doc);
            if (encoding.length(encoder) > 1) {
              ws.send(encoding.toUint8Array(encoder));
            }
          } else if (subType === 1) {
            // Server gửi SyncStep2 -> Nạp vào Doc
            syncProtocol.readSyncStep2(decoder, doc, 'network');
          } else if (subType === 2) {
            // Server broadcast SyncUpdate -> Nạp vào Doc
            syncProtocol.readUpdate(decoder, doc, 'network');
          }
        }
      });

      return () => doc.off('update', onDocUpdate);
    };

    // 2. Cả 2 User kết nối vào phòng lần đầu và đồng bộ ban đầu
    let wsA = await connectWs(owner.token);
    const wsB = await connectWs(owner.token);

    let unbindA = bindSyncProtocol(wsA, docA);
    const unbindB = bindSyncProtocol(wsB, docB);

    // Gửi SyncStep1 để khởi tạo bắt tay đồng bộ giữa Client và Server
    const startSync = (ws: WebSocket, doc: Y.Doc) => {
      const enc = encoding.createEncoder();
      encoding.writeVarUint(enc, CollabMessageType.SYNC);
      syncProtocol.writeSyncStep1(enc, doc);
      ws.send(encoding.toUint8Array(enc));
    };

    startSync(wsA, docA);
    startSync(wsB, docB);
    await new Promise((r) => setTimeout(r, 100));

    // 3. User A gõ câu mở đầu lúc cả 2 đang online
    docA.getText('content').insert(0, '[START] ');
    await new Promise((r) => setTimeout(r, 100));
    expect(docB.getText('content').toString()).toBe('[START] ');

    // 4. MÔ PHỎNG USER A BỊ RỚT MẠNG ĐỘT NGỘT
    unbindA();
    wsA.terminate(); // Đứt cáp / mất Wi-Fi

    // 5. TRONG LÚC MẤT MẠNG: Cả 2 bên vẫn tiếp tục gõ chữ độc lập
    // User A gõ tiếp vào docA offline trên máy mình
    docA.getText('content').insert(docA.getText('content').length, 'USER_A_OFFLINE_TEXT; ');

    // User B vẫn đang online gõ tiếp vào docB
    docB.getText('content').insert(docB.getText('content').length, 'USER_B_ONLINE_TEXT; ');

    // Đợi 200ms giả lập khoảng thời gian rớt mạng
    await new Promise((r) => setTimeout(r, 200));

    // 6. USER A CÓ MẠNG TRỞ LẠI: Reconnect WebSocket mới
    wsA = await connectWs(owner.token);
    unbindA = bindSyncProtocol(wsA, docA);

    // Bắt đầu quy trình Catch-up Sync: Gửi State Vector hiện tại của docA lên server
    startSync(wsA, docA);

    // Đợi CRDT trao đổi delta và hợp nhất trên cả 2 máy
    await new Promise((r) => setTimeout(r, 300));

    // 7. KIỂM CHỨNG TÍNH NHẤT QUÁN CUỐI CÙNG (Eventual Consistency)
    const textA = docA.getText('content').toString();
    const textB = docB.getText('content').toString();

    // Cả 2 client sau khi reconnect phải có nội dung GIỐNG HỆT NHAU 100%
    expect(textA).toBe(textB);

    // Nội dung cuối cùng phải chứa đủ cả 2 đoạn text mà 2 người đã gõ độc lập
    expect(textA).toContain('USER_A_OFFLINE_TEXT;');
    expect(textA).toContain('USER_B_ONLINE_TEXT;');

    // Dọn dẹp kết nối
    unbindA();
    unbindB();
    wsA.close();
    wsB.close();
  });

  // Khớp STT 5 - Bảng trang 41
  it('STT 5: Đóng tab trình duyệt đột ngột (Tắt kết nối socket)', async () => {
    const ws = await connectWs(owner.token);
    expect(ws.readyState).toBe(WebSocket.OPEN);

    ws.terminate();

    await new Promise((r) => setTimeout(r, 200));

    const nextWs = await connectWs(owner.token);
    expect(nextWs.readyState).toBe(WebSocket.OPEN);
    nextWs.close();
  });
});