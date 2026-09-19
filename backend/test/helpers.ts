import request from 'supertest';
import { server } from '../src/index.js';

export interface TestUser {
  id: string;
  email: string;
  token: string;
}

/**
 * Tự động đăng ký, nếu trùng email thì tự động đăng nhập lấy Token
 */
export async function getOrCreateUser(email: string, password = 'password123', name = 'Test User'): Promise<TestUser> {
  const loginRes = await request(server)
    .post('/api/auth/login')
    .send({ email, password });

  if (loginRes.status === 200 && loginRes.body.token) {
    return {
      id: loginRes.body.user.id,
      email: loginRes.body.user.email,
      token: loginRes.body.token,
    };
  }

  const registerRes = await request(server)
    .post('/api/auth/register')
    .send({ email, password, name });

  if (registerRes.status === 201 && registerRes.body.token) {
    return {
      id: registerRes.body.user.id,
      email: registerRes.body.user.email,
      token: registerRes.body.token,
    };
  }

  throw new Error(`Failed to authenticate user ${email}: ${JSON.stringify(registerRes.body || loginRes.body)}`);
}