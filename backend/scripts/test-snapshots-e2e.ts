import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import { WebSocket } from 'ws';
import { server } from '../src/index.js';
import { prisma } from '../src/config/database.js';
import { env } from '../src/config/env.js';

function createYjsWsClient(url: string) {
  const ydoc = new Y.Doc();
  const ws = new WebSocket(url);

  ws.on('open', () => {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, 0);
    syncProtocol.writeSyncStep1(encoder, ydoc);
    ws.send(encoding.toUint8Array(encoder));
  });

  ws.on('message', (data: Buffer) => {
    const uint8 = new Uint8Array(data);
    const decoder = decoding.createDecoder(uint8);
    const msgType = decoding.readVarUint(decoder);

    if (msgType === 0) {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, 0);
      syncProtocol.readSyncMessage(decoder, encoder, ydoc, ws);
      if (encoding.length(encoder) > 1) {
        ws.send(encoding.toUint8Array(encoder));
      }
    }
  });

  ydoc.on('update', (update: Uint8Array, origin: any) => {
    if (origin !== ws && ws.readyState === WebSocket.OPEN) {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, 0);
      encoding.writeVarUint(encoder, 2);
      encoding.writeVarUint8Array(encoder, update);
      ws.send(encoding.toUint8Array(encoder));
    }
  });

  return { ws, ydoc };
}

async function runSnapshotsE2E() {
  console.log('🚀 [STARTING E2E VERSION SNAPSHOTS & RESTORE TEST]\n');

  let port = env.PORT || 5000;
  if (!server.listening) {
    await new Promise<void>((resolve) => server.listen(port, resolve));
  } else {
    const addr = server.address();
    if (typeof addr === 'object' && addr) port = addr.port;
  }

  const BASE_URL = `http://localhost:${port}`;
  const WS_URL = `ws://localhost:${port}`;

  // 1. Tạo User & Document
  const email = `snap_${Date.now()}@example.com`;
  const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'password123', name: 'SnapTester' }),
  });
  const { token } = await regRes.json();

  const docRes = await fetch(`${BASE_URL}/api/documents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ title: 'Snapshot Test Doc' }),
  });
  const doc = await docRes.json();
  console.log(`✅ 1. Created Document ID: ${doc.id}`);

  // 2. Mở kết nối WebSocket
  const client1 = createYjsWsClient(`${WS_URL}/collab/${doc.id}?token=${token}`);
  await new Promise((r) => setTimeout(r, 500));

  // 3. Viết Version 1
  console.log('✍️  2. Client 1 types Version 1: "Version 1: Original text."');
  client1.ydoc.getText('content').insert(0, 'Version 1: Original text.');
  await new Promise((r) => setTimeout(r, 600));

  // 4. Tạo Snapshot 1
  const snap1Res = await fetch(`${BASE_URL}/api/documents/${doc.id}/snapshots`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const snap1 = await snap1Res.json();
  console.log(`📸 3. Created Snapshot 1 ID: ${snap1.id}`);

  // 5. Viết tiếp Version 2
  console.log('✍️  4. Client 1 types Version 2: " -> Version 2: Edited text."');
  const yText = client1.ydoc.getText('content');
  yText.insert(yText.length, ' -> Version 2: Edited text.');
  await new Promise((r) => setTimeout(r, 600));

  // 6. Tạo Snapshot 2
  const snap2Res = await fetch(`${BASE_URL}/api/documents/${doc.id}/snapshots`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const snap2 = await snap2Res.json();
  console.log(`📸 5. Created Snapshot 2 ID: ${snap2.id}`);

  // 7. Lấy danh sách Snapshots
  const listRes = await fetch(`${BASE_URL}/api/documents/${doc.id}/snapshots`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const snapList = await listRes.json();
  console.log(`📋 6. Snapshot list count: ${snapList.length} (Expected: 2)`);
  if (snapList.length !== 2) throw new Error('❌ List count mismatch');

  // 8. Xem chi tiết Snapshot 1 Preview
  const detailRes = await fetch(`${BASE_URL}/api/documents/${doc.id}/snapshots/${snap1.id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const snapDetail = await detailRes.json();
  console.log(`🔍 7. Snapshot 1 Preview Text: "${snapDetail.previewText}"`);
  if (snapDetail.previewText !== 'Version 1: Original text.') {
    throw new Error('❌ Preview text mismatch');
  }

  // 9. Khôi phục về Snapshot 1 (Restore)
  console.log('\n⏪ 8. Restoring document back to Snapshot 1...');
  const restoreRes = await fetch(`${BASE_URL}/api/documents/${doc.id}/snapshots/${snap1.id}/restore`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const restoreResult = await restoreRes.json();
  console.log('✅ Restore response:', restoreResult.message);

  // Đợi WS nhận delta update vừa revert
  await new Promise((r) => setTimeout(r, 600));

  // 10. Kiểm tra text realtime trên Client 1 sau khi restore
  const clientTextAfterRestore = client1.ydoc.getText('content').toString();
  console.log(`👀 9. Client 1 live text after restore: "${clientTextAfterRestore}"`);
  if (clientTextAfterRestore !== 'Version 1: Original text.') {
    throw new Error(`❌ Client text did not restore. Got: "${clientTextAfterRestore}"`);
  }

  // 11. Xóa Snapshot 2
  console.log('\n🗑️  10. Deleting Snapshot 2...');
  await fetch(`${BASE_URL}/api/documents/${doc.id}/snapshots/${snap2.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  const listAfterDelete = await (await fetch(`${BASE_URL}/api/documents/${doc.id}/snapshots`, {
    headers: { Authorization: `Bearer ${token}` },
  })).json();
  console.log(`📋 11. Snapshot count after deletion: ${listAfterDelete.length} (Expected: 1)`);
  if (listAfterDelete.length !== 1) throw new Error('❌ Delete failed');

  client1.ws.close();
  await new Promise((r) => setTimeout(r, 600));

  console.log('\n🎉 ========================================================');
  console.log('🎉 [100% GREEN] Version Snapshots & Realtime Restore VERIFIED!');
  console.log('🎉 ========================================================\n');

  await prisma.$disconnect();
  server.close();
  process.exit(0);
}

runSnapshotsE2E().catch(async (err) => {
  console.error('\n💥 TEST ERROR:', err);
  await prisma.$disconnect();
  server.close();
  process.exit(1);
});
