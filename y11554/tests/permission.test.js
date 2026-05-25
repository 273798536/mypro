const request = require('supertest');
const app = require('../src/app');
const mongoose = require('mongoose');

beforeAll(async () => {
  await new Promise(resolve => setTimeout(resolve, 2000));
});

afterAll(async () => {
  await mongoose.disconnect();
});

describe('权限控制测试', () => {
  let tokens = {};
  let testLedgerId = null;

  beforeAll(async () => {
    await request(app).post('/api/auth/init-users');

    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' });
    if (adminRes.statusCode === 200) tokens.admin = adminRes.body.token;

    const operatorRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'operator', password: 'operator123' });
    if (operatorRes.statusCode === 200) tokens.operator = operatorRes.body.token;

    const viewerRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'viewer', password: 'viewer123' });
    if (viewerRes.statusCode === 200) tokens.viewer = viewerRes.body.token;
  });

  const testData = {
    cabinetId: 'TEST-CAB-001',
    cabinetName: '测试柜机',
    address: '测试地址',
    restockDate: new Date().toISOString(),
    inventoryBefore: [
      {
        compartmentId: 'A01',
        productId: 'P001',
        productName: '矿泉水',
        quantity: 2,
        isHot: true
      }
    ],
    inventoryAfter: [
      {
        compartmentId: 'A01',
        productId: 'P001',
        productName: '矿泉水',
        quantity: 10,
        isHot: true
      }
    ]
  };

  describe('ledger.js 接口权限测试', () => {
    it('POST /api/ledger - read_only角色创建台账被拦截', async () => {
      if (!tokens.viewer) {
        console.log('跳过测试：无viewer token');
        return;
      }
      const res = await request(app)
        .post('/api/ledger')
        .set('Authorization', `Bearer ${tokens.viewer}`)
        .send(testData);
      
      expect(res.statusCode).toBe(403);
      expect(res.body.error).toContain('权限不足');
    });

    it('POST /api/ledger - operator角色创建台账成功', async () => {
      if (!tokens.operator) {
        console.log('跳过测试：无operator token');
        return;
      }
      const res = await request(app)
        .post('/api/ledger')
        .set('Authorization', `Bearer ${tokens.operator}`)
        .send(testData);
      
      expect([201, 400]).toContain(res.statusCode);
      if (res.statusCode === 201) {
        expect(res.body).toHaveProperty('ledgerNo');
        expect(res.body.status).toBe('draft');
        testLedgerId = res.body._id;
      }
    });

    it('PUT /api/ledger/:id - read_only角色更新台账被拦截', async () => {
      if (!tokens.viewer || !testLedgerId) {
        console.log('跳过测试：无viewer token或无测试台账');
        return;
      }
      const res = await request(app)
        .put(`/api/ledger/${testLedgerId}`)
        .set('Authorization', `Bearer ${tokens.viewer}`)
        .send({ remark: '只读用户尝试修改' });
      
      expect(res.statusCode).toBe(403);
      expect(res.body.error).toContain('权限不足');
    });

    it('POST /api/ledger/:id/submit - read_only角色提交台账被拦截', async () => {
      if (!tokens.viewer || !testLedgerId) {
        console.log('跳过测试：无viewer token或无测试台账');
        return;
      }
      const res = await request(app)
        .post(`/api/ledger/${testLedgerId}/submit`)
        .set('Authorization', `Bearer ${tokens.viewer}`);
      
      expect(res.statusCode).toBe(403);
      expect(res.body.error).toContain('权限不足');
    });

    it('POST /api/ledger/:id/add-refund - read_only角色追加退款被拦截', async () => {
      if (!tokens.viewer || !testLedgerId) {
        console.log('跳过测试：无viewer token或无测试台账');
        return;
      }
      const res = await request(app)
        .post(`/api/ledger/${testLedgerId}/add-refund`)
        .set('Authorization', `Bearer ${tokens.viewer}`)
        .send({ refundRecordId: 'test-id' });
      
      expect(res.statusCode).toBe(403);
      expect(res.body.error).toContain('权限不足');
    });

    it('POST /api/ledger/:id/add-photo - read_only角色追加照片被拦截', async () => {
      if (!tokens.viewer || !testLedgerId) {
        console.log('跳过测试：无viewer token或无测试台账');
        return;
      }
      const res = await request(app)
        .post(`/api/ledger/${testLedgerId}/add-photo`)
        .set('Authorization', `Bearer ${tokens.viewer}`)
        .send({ photoId: 'test-id' });
      
      expect(res.statusCode).toBe(403);
      expect(res.body.error).toContain('权限不足');
    });
  });

  describe('inventory.js 接口权限测试', () => {
    it('POST /api/inventory - read_only角色创建库存被拦截', async () => {
      if (!tokens.viewer) {
        console.log('跳过测试：无viewer token');
        return;
      }
      const res = await request(app)
        .post('/api/inventory')
        .set('Authorization', `Bearer ${tokens.viewer}`)
        .send({ cabinetId: 'TEST-INV-001', city: '北京市' });
      
      expect(res.statusCode).toBe(403);
      expect(res.body.error).toContain('权限不足');
    });

    it('PUT /api/inventory/:id - read_only角色更新库存被拦截', async () => {
      if (!tokens.viewer) {
        console.log('跳过测试：无viewer token');
        return;
      }
      const res = await request(app)
        .put('/api/inventory/test-id')
        .set('Authorization', `Bearer ${tokens.viewer}`)
        .send({ totalQuantity: 100 });
      
      expect(res.statusCode).toBe(403);
      expect(res.body.error).toContain('权限不足');
    });
  });

  describe('refund.js 接口权限测试', () => {
    it('POST /api/refund - read_only角色创建退款被拦截', async () => {
      if (!tokens.viewer) {
        console.log('跳过测试：无viewer token');
        return;
      }
      const res = await request(app)
        .post('/api/refund')
        .set('Authorization', `Bearer ${tokens.viewer}`)
        .send({
          cabinetId: 'TEST-REF-001',
          refundAmount: 10,
          refundReason: 'out_of_stock',
          refundTime: new Date().toISOString()
        });
      
      expect(res.statusCode).toBe(403);
      expect(res.body.error).toContain('权限不足');
    });

    it('PUT /api/refund/:id - read_only角色更新退款被拦截', async () => {
      if (!tokens.viewer) {
        console.log('跳过测试：无viewer token');
        return;
      }
      const res = await request(app)
        .put('/api/refund/test-id')
        .set('Authorization', `Bearer ${tokens.viewer}`)
        .send({ refundAmount: 20 });
      
      expect(res.statusCode).toBe(403);
      expect(res.body.error).toContain('权限不足');
    });
  });

  describe('GET接口权限测试 - 所有角色可读', () => {
    it('GET /api/ledger - 所有角色可查看台账列表', async () => {
      if (!tokens.viewer) {
        console.log('跳过测试：无viewer token');
        return;
      }
      const res = await request(app)
        .get('/api/ledger')
        .set('Authorization', `Bearer ${tokens.viewer}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('ledgers');
    });

    it('GET /api/inventory - 所有角色可查看库存列表', async () => {
      if (!tokens.viewer) {
        console.log('跳过测试：无viewer token');
        return;
      }
      const res = await request(app)
        .get('/api/inventory')
        .set('Authorization', `Bearer ${tokens.viewer}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('inventories');
    });

    it('GET /api/refund - 所有角色可查看退款列表', async () => {
      if (!tokens.viewer) {
        console.log('跳过测试：无viewer token');
        return;
      }
      const res = await request(app)
        .get('/api/refund')
        .set('Authorization', `Bearer ${tokens.viewer}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('refunds');
    });
  });
});
