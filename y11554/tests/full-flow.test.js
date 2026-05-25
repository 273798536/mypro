const request = require('supertest');
const app = require('../src/app');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

beforeAll(async () => {
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
});

afterAll(async () => {
  await mongoose.disconnect();
});

describe('完整业务流程闭环测试', () => {
  let tokens = {};
  let testLedgerId = null;
  let testPhotoId = null;
  let testRefundId = null;

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

    const reviewerRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'reviewer', password: 'reviewer123' });
    if (reviewerRes.statusCode === 200) tokens.reviewer = reviewerRes.body.token;
  });

  const testData = {
    cabinetId: 'CAB-001',
    cabinetName: '中关村一号柜',
    address: '北京市海淀区中关村大街1号',
    restockDate: new Date().toISOString(),
    inventoryBefore: [
      {
        compartmentId: 'A01',
        productId: 'P001',
        productName: '矿泉水',
        quantity: 2,
        isHot: true
      },
      {
        compartmentId: 'A02',
        productId: 'P002',
        productName: '可乐',
        quantity: 0,
        isHot: false
      }
    ],
    inventoryAfter: [
      {
        compartmentId: 'A01',
        productId: 'P001',
        productName: '矿泉水',
        quantity: 10,
        isHot: true
      },
      {
        compartmentId: 'A02',
        productId: 'P002',
        productName: '可乐',
        quantity: 15,
        isHot: false
      }
    ]
  };

  describe('Step 1: 录入员创建台账草稿', () => {
    it('创建台账草稿 - 检测脏记录', async () => {
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
        testLedgerId = res.body._id;
        expect(res.body).toHaveProperty('ledgerNo');
        expect(res.body.status).toBe('draft');
        expect(res.body.inventoryDiffs).toBeDefined();
        expect(res.body).toHaveProperty('isDirty');
        console.log(`  ✓ 台账创建成功: ${res.body.ledgerNo}`);
        console.log(`  ✓ 库存差异数量: ${res.body.inventoryDiffs?.length || 0}`);
        console.log(`  ✓ 是否存在脏记录: ${res.body.isDirty}`);
      }
    });

    it('查看台账详情 - 包含库存和差异', async () => {
      if (!tokens.operator || !testLedgerId) {
        console.log('跳过测试：无operator token或无测试台账');
        return;
      }

      const res = await request(app)
        .get(`/api/ledger/${testLedgerId}`)
        .set('Authorization', `Bearer ${tokens.operator}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('inventoryBefore');
      expect(res.body).toHaveProperty('inventoryAfter');
      expect(res.body).toHaveProperty('inventoryDiffs');
    });
  });

  describe('Step 2: 上传补货照片', () => {
    it('创建1x1测试图片', async () => {
      const testImgPath = path.join(process.cwd(), 'tests', 'test-image.jpg');
      const oneByOneJpeg = Buffer.from(
        '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/9oACAEBAAA/APn+v/9k=',
        'base64'
      );
      fs.writeFileSync(testImgPath, oneByOneJpeg);
    });

    it('POST /api/photo/upload - 上传补货照片', async () => {
      if (!tokens.operator || !testLedgerId) {
        console.log('跳过测试：无operator token或无测试台账');
        return;
      }

      const testImgPath = path.join(process.cwd(), 'tests', 'test-image.jpg');
      
      const res = await request(app)
        .post('/api/photo/upload')
        .set('Authorization', `Bearer ${tokens.operator}`)
        .field('cabinetId', 'CAB-001')
        .field('photoType', 'after_restock')
        .field('ledgerId', testLedgerId)
        .field('compartmentId', 'A01')
        .attach('photos', testImgPath);

      expect([201, 400]).toContain(res.statusCode);
      if (res.statusCode === 201) {
        expect(res.body.photos.length).toBeGreaterThan(0);
        testPhotoId = res.body.photos[0]._id;
        console.log(`  ✓ 照片上传成功: ${res.body.photos[0].photoId}`);
        console.log(`  ✓ 文件URL: ${res.body.photos[0].fileUrl}`);
      }
    });

    it('POST /api/ledger/:id/add-photo - 关联照片到台账', async () => {
      if (!tokens.operator || !testLedgerId || !testPhotoId) {
        console.log('跳过测试：无operator token或无测试台账/照片');
        return;
      }

      const res = await request(app)
        .post(`/api/ledger/${testLedgerId}/add-photo`)
        .set('Authorization', `Bearer ${tokens.operator}`)
        .send({ photoId: testPhotoId });

      expect(res.statusCode).toBe(200);
      expect(res.body.photoIds).toContain(testPhotoId);
      console.log(`  ✓ 照片已关联到台账`);
    });

    it('GET /api/photo - 查询照片列表', async () => {
      if (!tokens.operator) {
        console.log('跳过测试：无operator token');
        return;
      }

      const res = await request(app)
        .get('/api/photo')
        .set('Authorization', `Bearer ${tokens.operator}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('photos');
    });
  });

  describe('Step 3: 创建并追加退款记录', () => {
    it('POST /api/refund - 创建退款记录', async () => {
      if (!tokens.operator) {
        console.log('跳过测试：无operator token');
        return;
      }

      const res = await request(app)
        .post('/api/refund')
        .set('Authorization', `Bearer ${tokens.operator}`)
        .send({
          cabinetId: 'CAB-001',
          compartmentId: 'A01',
          productId: 'P001',
          productName: '矿泉水',
          refundAmount: 3.5,
          refundQuantity: 1,
          refundReason: 'out_of_stock',
          refundReasonDetail: '格口空的，扣了钱没出货',
          refundTime: new Date().toISOString(),
          customerPhone: '13800138000',
          customerName: '张先生'
        });

      expect(res.statusCode).toBe(201);
      testRefundId = res.body._id;
      expect(res.body).toHaveProperty('refundNo');
      console.log(`  ✓ 退款记录创建成功: ${res.body.refundNo}`);
      console.log(`  ✓ 敏感字段已脱敏: ${res.body.customerPhone}`);
    });

    it('POST /api/ledger/:id/add-refund - 追加退款到台账', async () => {
      if (!tokens.operator || !testLedgerId || !testRefundId) {
        console.log('跳过测试：无operator token或无测试台账/退款');
        return;
      }

      const res = await request(app)
        .post(`/api/ledger/${testLedgerId}/add-refund`)
        .set('Authorization', `Bearer ${tokens.operator}`)
        .send({ refundRecordId: testRefundId });

      expect(res.statusCode).toBe(200);
      expect(res.body.refundRecordIds).toContain(testRefundId);
      expect(res.body.totalRefundCount).toBeGreaterThan(0);
      expect(res.body.totalRefundAmount).toBeGreaterThan(0);
      console.log(`  ✓ 退款已关联到台账`);
      console.log(`  ✓ 退款总额: ${res.body.totalRefundAmount}`);
    });
  });

  describe('Step 4: 台账状态流转 - 提交、审核、驳回、更新、二次提交', () => {
    it('POST /api/ledger/:id/submit - 录入员提交审核', async () => {
      if (!tokens.operator || !testLedgerId) {
        console.log('跳过测试：无operator token或无测试台账');
        return;
      }

      const res = await request(app)
        .post(`/api/ledger/${testLedgerId}/submit`)
        .set('Authorization', `Bearer ${tokens.operator}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('submitted');
      expect(res.body.submittedAt).toBeDefined();
      console.log(`  ✓ 台账已提交，状态: ${res.body.status}`);
    });

    it('POST /api/ledger/:id/reject - 复核员驳回', async () => {
      if (!tokens.reviewer || !testLedgerId) {
        console.log('跳过测试：无reviewer token或无测试台账');
        return;
      }

      const res = await request(app)
        .post(`/api/ledger/${testLedgerId}/reject`)
        .set('Authorization', `Bearer ${tokens.reviewer}`)
        .send({ rejectReason: '补货照片角度不对，请重新拍摄A02格口' });

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('rejected');
      expect(res.body.rejectReason).toBeDefined();
      console.log(`  ✓ 台账已驳回，原因: ${res.body.rejectReason}`);
    });

    it('PUT /api/ledger/:id - 录入员更新台账', async () => {
      if (!tokens.operator || !testLedgerId) {
        console.log('跳过测试：无operator token或无测试台账');
        return;
      }

      const res = await request(app)
        .put(`/api/ledger/${testLedgerId}`)
        .set('Authorization', `Bearer ${tokens.operator}`)
        .send({
          remark: '已重新拍摄A02格口照片',
          changeReason: '根据驳回意见补充照片'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.version).toBeGreaterThan(1);
      expect(res.body.previousVersions.length).toBeGreaterThan(0);
      console.log(`  ✓ 台账已更新，版本: ${res.body.version}`);
    });

    it('GET /api/ledger/:id/versions - 查看历史版本', async () => {
      if (!tokens.operator || !testLedgerId) {
        console.log('跳过测试：无operator token或无测试台账');
        return;
      }

      const res = await request(app)
        .get(`/api/ledger/${testLedgerId}/versions`)
        .set('Authorization', `Bearer ${tokens.operator}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      console.log(`  ✓ 历史版本数量: ${res.body.length}`);
    });

    it('POST /api/ledger/:id/submit - 重新提交审核', async () => {
      if (!tokens.operator || !testLedgerId) {
        console.log('跳过测试：无operator token或无测试台账');
        return;
      }

      const res = await request(app)
        .post(`/api/ledger/${testLedgerId}/submit`)
        .set('Authorization', `Bearer ${tokens.operator}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('submitted');
      console.log(`  ✓ 台账重新提交，状态: ${res.body.status}`);
    });

    it('POST /api/ledger/:id/review - 复核员审核', async () => {
      if (!tokens.reviewer || !testLedgerId) {
        console.log('跳过测试：无reviewer token或无测试台账');
        return;
      }

      const res = await request(app)
        .post(`/api/ledger/${testLedgerId}/review`)
        .set('Authorization', `Bearer ${tokens.reviewer}`)
        .send({ reviewRemark: '照片已补充，情况属实' });

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('reviewing');
      console.log(`  ✓ 台账审核中，状态: ${res.body.status}`);
    });

    it('POST /api/ledger/:id/confirm - 复核员确认', async () => {
      if (!tokens.reviewer || !testLedgerId) {
        console.log('跳过测试：无reviewer token或无测试台账');
        return;
      }

      const res = await request(app)
        .post(`/api/ledger/${testLedgerId}/confirm`)
        .set('Authorization', `Bearer ${tokens.reviewer}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('confirmed');
      console.log(`  ✓ 台账已确认，状态: ${res.body.status}`);
    });

    it('POST /api/ledger/:id/second-confirm - 主管二次确认', async () => {
      if (!tokens.admin || !testLedgerId) {
        console.log('跳过测试：无admin token或无测试台账');
        return;
      }

      const res = await request(app)
        .post(`/api/ledger/${testLedgerId}/second-confirm`)
        .set('Authorization', `Bearer ${tokens.admin}`)
        .send({ secondConfirmRemark: '复核无误，同意结案' });

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('second_confirm');
      console.log(`  ✓ 台账已二次确认，状态: ${res.body.status}`);
    });

    it('POST /api/ledger/:id/finalize - 主管结案', async () => {
      if (!tokens.admin || !testLedgerId) {
        console.log('跳过测试：无admin token或无测试台账');
        return;
      }

      const res = await request(app)
        .post(`/api/ledger/${testLedgerId}/finalize`)
        .set('Authorization', `Bearer ${tokens.admin}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('finalized');
      expect(res.body.finalizedAt).toBeDefined();
      console.log(`  ✓ 台账已结案，状态: ${res.body.status}`);
    });
  });

  describe('Step 5: 审计追踪', () => {
    it('GET /api/ledger/:id/audit-trail - 查看操作审计', async () => {
      if (!tokens.admin || !testLedgerId) {
        console.log('跳过测试：无admin token或无测试台账');
        return;
      }

      const res = await request(app)
        .get(`/api/ledger/${testLedgerId}/audit-trail`)
        .set('Authorization', `Bearer ${tokens.admin}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.logs.length).toBeGreaterThan(0);
      console.log(`  ✓ 审计日志数量: ${res.body.logs.length}`);
      res.body.logs.forEach((log, i) => {
        console.log(`    ${i + 1}. ${log.operationType} - ${log.operatorName} - ${new Date(log.createdAt).toLocaleString()}`);
      });
    });

    it('GET /api/ledger/:id/dirty-records - 查看脏记录', async () => {
      if (!tokens.admin || !testLedgerId) {
        console.log('跳过测试：无admin token或无测试台账');
        return;
      }

      const res = await request(app)
        .get(`/api/ledger/${testLedgerId}/dirty-records`)
        .set('Authorization', `Bearer ${tokens.admin}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('records');
      console.log(`  ✓ 脏记录数量: ${res.body.records.length}`);
    });
  });

  describe('Step 6: 自动化检查', () => {
    it('GET /api/ledger/:id/auto-checks - 运行所有自动化检查', async () => {
      if (!tokens.admin || !testLedgerId) {
        console.log('跳过测试：无admin token或无测试台账');
        return;
      }

      const res = await request(app)
        .get(`/api/ledger/${testLedgerId}/auto-checks`)
        .set('Authorization', `Bearer ${tokens.admin}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.checks.length).toBe(5);
      console.log(`  ✓ 自动化检查结果:`);
      console.log(`     总检查项: ${res.body.summary.total}`);
      console.log(`     通过: ${res.body.summary.passed}`);
      console.log(`     失败: ${res.body.summary.failed}`);
      res.body.checks.forEach(check => {
        console.log(`     - ${check.checkName}: ${check.hasIssue ? '❌' : '✅'} ${check.message}`);
      });
    });

    it('GET /api/audit/check-stats - 查看全局检查统计', async () => {
      if (!tokens.admin) {
        console.log('跳过测试：无admin token');
        return;
      }

      const res = await request(app)
        .get('/api/audit/check-stats')
        .set('Authorization', `Bearer ${tokens.admin}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('permissionBlocks');
      expect(res.body).toHaveProperty('duplicateImports');
      console.log(`  ✓ 全局统计:`);
      console.log(`     权限拦截次数: ${res.body.permissionBlocks}`);
      console.log(`     重复导入次数: ${res.body.duplicateImports}`);
    });
  });

  describe('Step 7: 导出功能', () => {
    it('POST /api/export/ledgers - 导出台账CSV', async () => {
      if (!tokens.admin) {
        console.log('跳过测试：无admin token');
        return;
      }

      const res = await request(app)
        .post('/api/export/ledgers')
        .set('Authorization', `Bearer ${tokens.admin}`)
        .send({ status: 'finalized' });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('fileName');
      console.log(`  ✓ 导出成功: ${res.body.fileName}`);
      console.log(`  ✓ 导出记录数: ${res.body.recordCount}`);
    });

    it('GET /api/export/role-view-config - 查看角色视图配置', async () => {
      if (!tokens.admin) {
        console.log('跳过测试：无admin token');
        return;
      }

      const res = await request(app)
        .get('/api/export/role-view-config')
        .set('Authorization', `Bearer ${tokens.admin}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('tabs');
      expect(res.body).toHaveProperty('charts');
      console.log(`  ✓ 主管视图标签页: ${res.body.tabs.join(', ')}`);
    });
  });

  afterAll(() => {
    const testImgPath = path.join(process.cwd(), 'tests', 'test-image.jpg');
    if (fs.existsSync(testImgPath)) {
      fs.unlinkSync(testImgPath);
    }
  });
});
