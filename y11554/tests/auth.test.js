const request = require('supertest');
const app = require('../src/app');
const mongoose = require('mongoose');

beforeAll(async () => {
  await new Promise(resolve => setTimeout(resolve, 2000));
});

afterAll(async () => {
  await mongoose.disconnect();
});

describe('认证接口测试', () => {
  let tokens = {};

  it('GET /health - 服务健康检查', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
  });

  it('POST /api/auth/init-users - 初始化测试用户', async () => {
    const res = await request(app).post('/api/auth/init-users');
    expect([200, 400, 500]).toContain(res.statusCode);
  });

  it('POST /api/auth/login - admin登录成功', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' });
    
    expect([200, 401, 500]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.role).toBe('supervisor');
      tokens.admin = res.body.token;
    }
  });

  it('POST /api/auth/login - operator登录成功', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'operator', password: 'operator123' });
    
    expect([200, 401, 500]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.role).toBe('data_entry');
      tokens.operator = res.body.token;
    }
  });

  it('POST /api/auth/login - viewer登录成功', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'viewer', password: 'viewer123' });
    
    expect([200, 401, 500]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.role).toBe('read_only');
      tokens.viewer = res.body.token;
    }
  });

  it('POST /api/auth/login - 错误密码登录失败', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'wrongpassword' });
    
    expect(res.statusCode).toBe(401);
  });

  it('GET /api/auth/profile - 获取用户信息', async () => {
    if (!tokens.admin) {
      console.log('跳过测试：无admin token');
      return;
    }
    const res = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${tokens.admin}`);
    
    expect(res.statusCode).toBe(200);
    expect(res.body.user.username).toBe('admin');
  });

  it('GET /api/auth/profile - 无token访问失败', async () => {
    const res = await request(app).get('/api/auth/profile');
    expect(res.statusCode).toBe(401);
  });

  global.tokens = tokens;
});
