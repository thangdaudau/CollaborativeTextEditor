import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { server } from '../src/index.js';
import { getOrCreateUser, type TestUser } from './helpers.js';

describe('UC_DOC_02: Phân quyền & Chia sẻ Tài liệu (5 Test Cases)', () => {
  let owner: TestUser;
  let userB: TestUser;
  let userC: TestUser;
  let docId: string;

  beforeAll(async () => {
    // Khởi tạo 3 user theo đúng kịch bản
    owner = await getOrCreateUser('owner_doc@test.com', 'password123', 'Document Owner');
    userB = await getOrCreateUser('user_b@gmail.com', 'password123', 'User B');
    userC = await getOrCreateUser('user_c@gmail.com', 'password123', 'User C');

    // Owner tạo một document mới
    const docRes = await request(server)
      .post('/api/documents')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ title: 'Tài liệu Kiểm thử Phân quyền' });

    expect(docRes.status).toBe(201);
    docId = docRes.body.id;
  });

  // TC 1: Owner cấp quyền EDITOR cho email hợp lệ -> 200 OK
  it('TC_PERM_01: Owner cấp quyền EDITOR cho user_b@gmail.com thành công', async () => {
    const res = await request(server)
      .post(`/api/documents/${docId}/permissions`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({
        email: userB.email,
        role: 'EDITOR',
      });

    expect(res.status).toBe(200);
    expect(res.body.role).toBe('EDITOR');
    expect(res.body.userId).toBe(userB.id);
  });

  // TC 2: Email không tồn tại trong hệ thống -> 400 Bad Request
  it('TC_PERM_02: Cấp quyền cho email không tồn tại (notfound@gmail.com) -> Báo lỗi', async () => {
    const res = await request(server)
      .post(`/api/documents/${docId}/permissions`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({
        email: 'notfound@gmail.com',
        role: 'VIEWER',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Target user not found');
  });

  // TC 3: Email rỗng -> 400 Bad Request (Validate Schema Zod chặn)
  it('TC_PERM_03: Email rỗng ("") -> Bị Middleware Validate chặn', async () => {
    const res = await request(server)
      .post(`/api/documents/${docId}/permissions`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({
        email: '',
        role: 'EDITOR',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  // TC 4: User chỉ có role EDITOR cố tình cấp quyền cho người khác -> 403 Forbidden
  it('TC_PERM_04: User B (EDITOR) cố tình cấp quyền cho User C -> 403 Forbidden', async () => {
    const res = await request(server)
      .post(`/api/documents/${docId}/permissions`)
      .set('Authorization', `Bearer ${userB.token}`)
      .send({
        email: userC.email,
        role: 'VIEWER',
      });

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Forbidden');
  });

  // TC 5: Gán lại quyền cho User B từ EDITOR sang VIEWER -> 200 OK (Upsert)
  it('TC_PERM_05: Cập nhật quyền của User B từ EDITOR sang VIEWER -> Thành công', async () => {
    const res = await request(server)
      .post(`/api/documents/${docId}/permissions`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({
        email: userB.email,
        role: 'VIEWER',
      });

    expect(res.status).toBe(200);
    expect(res.body.role).toBe('VIEWER');
    expect(res.body.userId).toBe(userB.id);
  });
});