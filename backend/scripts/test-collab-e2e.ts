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
    // Bước 1: Gửi Sync Step 1
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

async function runE2ETest() {
  console.log('🚀 [STARTING E2E COLLABORATION ENGINE TEST]\n');

  let port = env.PORT || 5000;
  if (!server.listening) {
    await new Promise<void>((resolve) => server.listen(port, resolve));
  } else {
    const addr = server.address();
    if (typeof addr === 'object' && addr) {
      port = addr.port;
    }
  }

  const BASE_URL = `http://localhost:${port}`;
  const WS_URL = `ws://localhost:${port}`;
  console.log(`✅ 1. Test Server ready at ${BASE_URL}`);

  // 1. Đăng ký User
  const testEmail = `tester_${Date.now()}@example.com`;
  const registerRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: 'password123', name: 'Tester' }),
  });
  const { token, user } = await registerRes.json();
  console.log(`✅ 2. Registered Owner User: ${user.email}`);

  // 2. Tạo Document
  const docRes = await fetch(`${BASE_URL}/api/documents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ title: 'CRDT E2E Doc' }),
  });
  const doc = await docRes.json();
  console.log(`✅ 3. Created Document ID: ${doc.id}`);

  // 3. Mở Public Document với quyền EDITOR
  await fetch(`${BASE_URL}/api/documents/${doc.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ isPublic: true, publicRole: 'EDITOR' }),
  });
  console.log('✅ 4. Updated Doc to Public with EDITOR role');

  // 4. Mở 2 kết nối WS
  console.log('\n🔄 5. Connecting Client 1 (Owner with JWT) & Client 2 (Guest)...');
  const client1 = createYjsWsClient(`${WS_URL}/collab/${doc.id}?token=${token}`);
  const client2 = createYjsWsClient(`${WS_URL}/collab/${doc.id}`);

  await new Promise((r) => setTimeout(r, 600));

  // 5. Client 1 gõ chữ
  console.log('✍️  6. Client 1 types: "Hello from Owner! "');
  const yText1 = client1.ydoc.getText('content');
  yText1.insert(0, 'Hello from Owner! ');

  await new Promise((r) => setTimeout(r, 600));

  const yText2 = client2.ydoc.getText('content');
  console.log(`👀 Client 2 text after Sync: "${yText2.toString()}"`);
  if (yText2.toString() !== 'Hello from Owner! ') {
    throw new Error('❌ Test Failed: Client 2 did not receive Owner edits');
  }
  console.log('✅ PASS: Realtime Sync from Owner -> Guest verified!');

  // 6. Client 2 gõ nối tiếp
  console.log('✍️  7. Client 2 (Guest) appends: "Hello from Guest!"');
  yText2.insert(yText2.length, 'Hello from Guest!');

  await new Promise((r) => setTimeout(r, 600));

  console.log(`👀 Client 1 text after Sync: "${yText1.toString()}"`);
  if (yText1.toString() !== 'Hello from Owner! Hello from Guest!') {
    throw new Error('❌ Test Failed: Client 1 did not receive Guest edits');
  }
  console.log('✅ PASS: Realtime 2-way Sync verified!');

  // 7. Ngắt kết nối để kích hoạt Room Clean & Auto Flush Postgres
  console.log('\n🔌 8. Disconnecting all clients to trigger Room Clean & Immediate DB Flush...');
  client1.ws.close();
  client2.ws.close();

  await new Promise((r) => setTimeout(r, 1200));

  // 8. Đối soát trực tiếp Database
  console.log('🔍 9. Querying PostgreSQL directly to verify Binary State persistence...');
  const persistedDoc = await prisma.document.findUnique({
    where: { id: doc.id },
  });

  if (!persistedDoc?.currentState) {
    throw new Error('❌ Test Failed: Document currentState in PostgreSQL is NULL');
  }

  const verifyDoc = new Y.Doc();
  Y.applyUpdate(verifyDoc, new Uint8Array(persistedDoc.currentState));
  const persistedText = verifyDoc.getText('content').toString();

  console.log(`📦 Database BYTEA Content decoded: "${persistedText}"`);

  if (persistedText === 'Hello from Owner! Hello from Guest!') {
    console.log('\n🎉 ========================================================');
    console.log('🎉 [100% GREEN] CRDT Engine, Realtime Sync & Postgres Auto-Save VERIFIED!');
    console.log('🎉 ========================================================\n');
  } else {
    throw new Error(`❌ Test Failed: Expected text mismatch in DB. Got: "${persistedText}"`);
  }

  await prisma.$disconnect();
  server.close();
  process.exit(0);
}

runE2ETest().catch(async (err) => {
  console.error('\n💥 TEST ERROR:', err);
  await prisma.$disconnect();
  server.close();
  process.exit(1);
});
