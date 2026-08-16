import { server } from '../src/index.js';
import { prisma } from '../src/config/database.js';
import { env } from '../src/config/env.js';

async function registerUser(baseUrl: string, tag: string) {
  const email = `perm_${tag}_${Date.now()}@example.com`;
  const res = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'password123', name: `User ${tag}` }),
  });
  return res.json();
}

async function runPermissionsE2E() {
  console.log('🚀 [STARTING E2E PERMISSIONS & USER SEARCH TEST]\n');

  let port = env.PORT || 5000;
  if (!server.listening) {
    await new Promise<void>((resolve) => server.listen(port, resolve));
  } else {
    const addr = server.address();
    if (typeof addr === 'object' && addr) port = addr.port;
  }

  const BASE_URL = `http://localhost:${port}`;

  // Sinh unique tag cho session test này để tránh trùng lặp dữ liệu cũ trong Postgres
  const sessionSalt = Math.random().toString(36).substring(2, 7);
  const bobTag = `bob_${sessionSalt}`;
  const aliceTag = `alice_${sessionSalt}`;

  // 1. Tạo 3 User: User A (Owner), User B (Editor), User C (Viewer)
  const userA = await registerUser(BASE_URL, `owner_${sessionSalt}`);
  const userB = await registerUser(BASE_URL, bobTag);
  const userC = await registerUser(BASE_URL, aliceTag);
  console.log(`✅ 1. Registered:`);
  console.log(`   - Owner: ${userA.user.email}`);
  console.log(`   - Collab B: ${userB.user.email}`);
  console.log(`   - Collab C: ${userC.user.email}`);

  // 2. Test User Search API (Case-insensitive + Self-exclusion)
  console.log('\n🔍 2. Testing User Search Autocomplete...');
  const searchKeyword = bobTag.toUpperCase(); // Test tìm kiếm bằng CHỮ HOA
  const searchRes = await fetch(`${BASE_URL}/api/users/search?q=${searchKeyword}`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  const searchResults = await searchRes.json();
  console.log(`   Found ${searchResults.length} match(es) for keyword "${searchKeyword}"`);
  if (searchResults.length !== 1 || searchResults[0].email !== userB.user.email) {
    throw new Error('❌ Search failed: Expected to find User B exclusively');
  }

  // Tự search chính mình -> Bắt buộc không được xuất hiện trong list
  const selfSearchRes = await fetch(`${BASE_URL}/api/users/search?q=${userA.user.email}`, {
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  const selfSearchResults = await selfSearchRes.json();
  if (selfSearchResults.length !== 0) {
    throw new Error('❌ Search failed: Self-exclusion not working');
  }
  console.log('✅ PASS: User Search (Case-insensitive & Self-exclusion) verified!');

  // 3. User A tạo Document Private
  const docRes = await fetch(`${BASE_URL}/api/documents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
    body: JSON.stringify({ title: 'Top Secret Document' }),
  });
  const doc = await docRes.json();
  console.log(`\n📄 3. Created Private Document ID: ${doc.id}`);

  // 4. User B cố truy cập -> Phải bị 403 Forbidden
  console.log('🔒 4. User B attempts unauthorized access...');
  const unauthorizedRes = await fetch(`${BASE_URL}/api/documents/${doc.id}`, {
    headers: { Authorization: `Bearer ${userB.token}` },
  });
  console.log(`   Status code: ${unauthorizedRes.status} (Expected: 403)`);
  if (unauthorizedRes.status !== 403) throw new Error('❌ RBAC failed: User B should be forbidden');

  // 5. User A cấp quyền EDITOR cho User B (bằng userId)
  console.log('\n🤝 5. Owner grants EDITOR role to User B (via userId)...');
  const grantBRes = await fetch(`${BASE_URL}/api/documents/${doc.id}/permissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
    body: JSON.stringify({ userId: userB.user.id, role: 'EDITOR' }),
  });
  const grantB = await grantBRes.json();
  console.log(`   Granted: ${grantB.role} to ${grantB.user.email}`);

  // 6. User B giờ đây có thể đọc và sửa tài liệu
  console.log('✍️  6. User B edits document title...');
  const editRes = await fetch(`${BASE_URL}/api/documents/${doc.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userB.token}` },
    body: JSON.stringify({ title: 'Updated by Editor Bob' }),
  });
  const editedDoc = await editRes.json();
  if (editedDoc.title !== 'Updated by Editor Bob') throw new Error('❌ User B failed to edit doc');
  console.log('✅ PASS: User B successfully edited doc as EDITOR!');

  // 7. User A cấp quyền VIEWER cho User C (bằng email)
  console.log('\n🤝 7. Owner grants VIEWER role to User C (via email)...');
  const grantCRes = await fetch(`${BASE_URL}/api/documents/${doc.id}/permissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
    body: JSON.stringify({ email: userC.user.email, role: 'VIEWER' }),
  });
  const grantC = await grantCRes.json();
  console.log(`   Granted: ${grantC.role} to ${grantC.user.email}`);

  // 8. User C chỉ có thể đọc, cố sửa -> Bị 403
  console.log('👀 8. User C attempts to edit document...');
  const viewerEditRes = await fetch(`${BASE_URL}/api/documents/${doc.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userC.token}` },
    body: JSON.stringify({ title: 'Hacked by Viewer' }),
  });
  console.log(`   Status code: ${viewerEditRes.status} (Expected: 403)`);
  if (viewerEditRes.status !== 403) throw new Error('❌ RBAC failed: VIEWER should not be allowed to edit');

  // 9. Lấy danh sách ma trận phân quyền của document
  console.log('\n📋 9. Fetching document permission matrix...');
  const permListRes = await fetch(`${BASE_URL}/api/documents/${doc.id}/permissions`, {
    headers: { Authorization: `Bearer ${userC.token}` },
  });
  const permList = await permListRes.json();
  console.log(`   Owner: ${permList.owner.email}`);
  console.log(`   Collaborators: ${permList.permissions.length}`);
  if (permList.permissions.length !== 2) throw new Error('❌ Expected 2 collaborators');

  // 10. Chặn leo quyền (User B là EDITOR cố xóa quyền của User C -> Bị 403)
  console.log('\n🛡️  10. Testing Privilege Escalation: Non-owner tries to revoke permission...');
  const illegalRevoke = await fetch(`${BASE_URL}/api/documents/${doc.id}/permissions/${userC.user.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${userB.token}` },
  });
  console.log(`   Status code: ${illegalRevoke.status} (Expected: 403)`);
  if (illegalRevoke.status !== 403) throw new Error('❌ Privilege Escalation vulnerability!');

  // 11. Owner thu hồi quyền của User B
  console.log('\n🚫 11. Owner revokes User B permission...');
  const revokeRes = await fetch(`${BASE_URL}/api/documents/${doc.id}/permissions/${userB.user.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${userA.token}` },
  });
  const revokeResult = await revokeRes.json();
  console.log('   Response:', revokeResult.message);

  // User B kiểm tra lại quyền -> Bị 403 ngay lập tức
  const checkRevoked = await fetch(`${BASE_URL}/api/documents/${doc.id}`, {
    headers: { Authorization: `Bearer ${userB.token}` },
  });
  if (checkRevoked.status !== 403) throw new Error('❌ Revocation failed: User B still has access');
  console.log('✅ PASS: Permission revocation verified!');

  console.log('\n🎉 ========================================================');
  console.log('🎉 [100% GREEN] Permissions & User Search APIs VERIFIED!');
  console.log('🎉 ========================================================\n');

  await prisma.$disconnect();
  server.close();
  process.exit(0);
}

runPermissionsE2E().catch(async (err) => {
  console.error('\n💥 TEST ERROR:', err);
  await prisma.$disconnect();
  server.close();
  process.exit(1);
});
