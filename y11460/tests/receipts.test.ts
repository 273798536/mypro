import request from 'supertest'
import app from '../src/app'
import { testReceiptData, tokens } from './utils'
import { prisma } from '../src/lib/prisma'

describe('口腔门诊材料异常回执状态机 - 验收测试', () => {
  describe('1. 正常链路测试', () => {
    it('完整流程：创建批次 -> 提交复核 -> 复核通过 -> 冻结结算 -> 归档', async () => {
      let receiptId: string

      const createRes = await request(app)
        .post('/api/receipts')
        .set('Authorization', `Bearer ${tokens.entry}`)
        .send(testReceiptData)

      expect(createRes.status).toBe(201)
      expect(createRes.body.status).toBe('DRAFT')
      receiptId = createRes.body.id

      const submitRes = await request(app)
        .post(`/api/receipts/${receiptId}/submit`)
        .set('Authorization', `Bearer ${tokens.entry}`)

      expect(submitRes.status).toBe(200)
      expect(submitRes.body.status).toBe('SUBMITTED')

      const reviewRes = await request(app)
        .post(`/api/receipts/${receiptId}/review`)
        .set('Authorization', `Bearer ${tokens.reviewer}`)
        .send({ approved: true, reason: '数据核对无误' })

      expect(reviewRes.status).toBe(200)
      expect(reviewRes.body.status).toBe('APPROVED')

      const freezeRes = await request(app)
        .post(`/api/receipts/${receiptId}/freeze`)
        .set('Authorization', `Bearer ${tokens.supervisor}`)
        .send({ reason: '患者反馈型号不符，暂停结算' })

      expect(freezeRes.status).toBe(200)
      expect(freezeRes.body.status).toBe('FROZEN')
      expect(freezeRes.body.freezeReason).toBe('患者反馈型号不符，暂停结算')

      const unfreezeRes = await request(app)
        .post(`/api/receipts/${receiptId}/unfreeze`)
        .set('Authorization', `Bearer ${tokens.supervisor}`)
        .send({ reason: '已核实，恢复正常流程' })

      expect(unfreezeRes.status).toBe(200)
      expect(unfreezeRes.body.status).toBe('APPROVED')

      const settleRes = await request(app)
        .post(`/api/receipts/${receiptId}/settle`)
        .set('Authorization', `Bearer ${tokens.supervisor}`)

      expect(settleRes.status).toBe(200)
      expect(settleRes.body.status).toBe('SETTLED')

      const archiveRes = await request(app)
        .post(`/api/receipts/${receiptId}/archive`)
        .set('Authorization', `Bearer ${tokens.supervisor}`)

      expect(archiveRes.status).toBe(200)
      expect(archiveRes.body.status).toBe('ARCHIVED')

      const logsRes = await request(app)
        .get(`/api/receipts/${receiptId}/change-logs`)
        .set('Authorization', `Bearer ${tokens.supervisor}`)

      expect(logsRes.status).toBe(200)
      expect(logsRes.body.length).toBeGreaterThanOrEqual(7)
    })

    it('撤回功能：已提交的回执可以撤回至草稿状态', async () => {
      const createRes = await request(app)
        .post('/api/receipts')
        .set('Authorization', `Bearer ${tokens.entry}`)
        .send({ ...testReceiptData, batchNo: 'CANCEL-TEST-001' })

      expect(createRes.status).toBe(201)
      const receiptId = createRes.body.id

      const submitRes = await request(app)
        .post(`/api/receipts/${receiptId}/submit`)
        .set('Authorization', `Bearer ${tokens.entry}`)

      expect(submitRes.status).toBe(200)
      expect(submitRes.body.status).toBe('SUBMITTED')

      const cancelRes = await request(app)
        .post(`/api/receipts/${receiptId}/cancel`)
        .set('Authorization', `Bearer ${tokens.entry}`)
        .send({ reason: '需要补充信息' })

      expect(cancelRes.status).toBe(200)
      expect(cancelRes.body.status).toBe('DRAFT')
    })

    it('撤回功能：驳回的回执可以撤回至草稿状态', async () => {
      const createRes = await request(app)
        .post('/api/receipts')
        .set('Authorization', `Bearer ${tokens.entry}`)
        .send({ ...testReceiptData, batchNo: 'CANCEL-REJECTED-001' })

      expect(createRes.status).toBe(201)
      const receiptId = createRes.body.id

      await request(app)
        .post(`/api/receipts/${receiptId}/submit`)
        .set('Authorization', `Bearer ${tokens.entry}`)

      const rejectRes = await request(app)
        .post(`/api/receipts/${receiptId}/review`)
        .set('Authorization', `Bearer ${tokens.reviewer}`)
        .send({ approved: false, reason: '资料不完整' })

      expect(rejectRes.status).toBe(200)
      expect(rejectRes.body.status).toBe('REJECTED')

      const cancelRes = await request(app)
        .post(`/api/receipts/${receiptId}/cancel`)
        .set('Authorization', `Bearer ${tokens.entry}`)
        .send({ reason: '重新准备资料' })

      expect(cancelRes.status).toBe(200)
      expect(cancelRes.body.status).toBe('DRAFT')
    })
  })

  describe('2. 重复提交和坏数据测试', () => {
    it('重复批次号应该返回错误', async () => {
      await request(app)
        .post('/api/receipts')
        .set('Authorization', `Bearer ${tokens.entry}`)
        .send(testReceiptData)

      const duplicateRes = await request(app)
        .post('/api/receipts')
        .set('Authorization', `Bearer ${tokens.entry}`)
        .send(testReceiptData)

      expect(duplicateRes.status).toBe(400)
      expect(duplicateRes.body.error).toContain('批次号已存在')
    })

    it('缺字段应该创建脏记录', async () => {
      const badData = {
        batchNo: 'BAD-BATCH-001',
        clinicId: 'test-clinic-001',
        implantBatchNumber: '',
        appointmentRecordNo: '',
        supplierInvoiceNo: 'INV-001'
      }

      const res = await request(app)
        .post('/api/receipts')
        .set('Authorization', `Bearer ${tokens.entry}`)
        .send(badData)

      expect(res.status).toBe(201)

      const receipt = await prisma.materialReceipt.findUnique({
        where: { id: res.body.id },
        include: { dirtyRecords: true }
      })

      expect(receipt?.dirtyRecords.length).toBeGreaterThan(0)
      expect(receipt?.dirtyRecords.some(d => d.type === 'MISSING_FIELD')).toBe(true)
    })

    it('金额冲突应该创建脏记录', async () => {
      const conflictData = {
        ...testReceiptData,
        batchNo: 'CONFLICT-BATCH-001',
        unitPrice: 5000,
        implantQuantity: 2,
        totalAmount: 15000
      }

      const res = await request(app)
        .post('/api/receipts')
        .set('Authorization', `Bearer ${tokens.entry}`)
        .send(conflictData)

      expect(res.status).toBe(201)

      const receipt = await prisma.materialReceipt.findUnique({
        where: { id: res.body.id },
        include: { dirtyRecords: true }
      })

      expect(receipt?.dirtyRecords.some(d => d.type === 'AMOUNT_CONFLICT')).toBe(true)
    })

    it('数量为负数应该创建数量冲突脏记录', async () => {
      const conflictData = {
        ...testReceiptData,
        batchNo: 'QUANTITY-NEG-001',
        implantQuantity: -1
      }

      const res = await request(app)
        .post('/api/receipts')
        .set('Authorization', `Bearer ${tokens.entry}`)
        .send(conflictData)

      expect(res.status).toBe(201)

      const receipt = await prisma.materialReceipt.findUnique({
        where: { id: res.body.id },
        include: { dirtyRecords: true }
      })

      expect(receipt?.dirtyRecords.some(d => d.type === 'QUANTITY_CONFLICT')).toBe(true)
    })

    it('数量异常偏大应该创建数量冲突脏记录', async () => {
      const conflictData = {
        ...testReceiptData,
        batchNo: 'QUANTITY-LARGE-001',
        implantQuantity: 99
      }

      const res = await request(app)
        .post('/api/receipts')
        .set('Authorization', `Bearer ${tokens.entry}`)
        .send(conflictData)

      expect(res.status).toBe(201)

      const receipt = await prisma.materialReceipt.findUnique({
        where: { id: res.body.id },
        include: { dirtyRecords: true }
      })

      expect(receipt?.dirtyRecords.some(d => d.type === 'QUANTITY_CONFLICT')).toBe(true)
    })

    it('跨日记录应该创建CROSS_DAY脏记录', async () => {
      const oldDateData = {
        ...testReceiptData,
        batchNo: 'CROSS-DAY-001',
        receiptDate: '2020-01-01'
      }

      const res = await request(app)
        .post('/api/receipts')
        .set('Authorization', `Bearer ${tokens.entry}`)
        .send(oldDateData)

      expect(res.status).toBe(201)

      const receipt = await prisma.materialReceipt.findUnique({
        where: { id: res.body.id },
        include: { dirtyRecords: true }
      })

      expect(receipt?.dirtyRecords.some(d => d.type === 'CROSS_DAY')).toBe(true)
    })

    it('患者改名应该创建NAME_CHANGED脏记录', async () => {
      const createRes = await request(app)
        .post('/api/receipts')
        .set('Authorization', `Bearer ${tokens.entry}`)
        .send({ ...testReceiptData, batchNo: 'NAME-CHANGE-001', patientName: '张三' })

      expect(createRes.status).toBe(201)

      const updateRes = await request(app)
        .patch(`/api/receipts/${createRes.body.id}`)
        .set('Authorization', `Bearer ${tokens.entry}`)
        .send({ patientName: '李四' })

      expect(updateRes.status).toBe(200)

      const receipt = await prisma.materialReceipt.findUnique({
        where: { id: createRes.body.id },
        include: { dirtyRecords: true }
      })

      expect(receipt?.dirtyRecords.some(d => d.type === 'NAME_CHANGED')).toBe(true)
      expect(receipt?.dirtyRecords.find(d => d.type === 'NAME_CHANGED')?.originalValue).toBe('张三')
      expect(receipt?.dirtyRecords.find(d => d.type === 'NAME_CHANGED')?.correctedValue).toBe('李四')
    })
  })

  describe('3. 权限控制测试', () => {
    let receiptId: string

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/receipts')
        .set('Authorization', `Bearer ${tokens.entry}`)
        .send(testReceiptData)
      receiptId = res.body.id
    })

    it('只读用户不能创建回执', async () => {
      const res = await request(app)
        .post('/api/receipts')
        .set('Authorization', `Bearer ${tokens.viewer}`)
        .send({ ...testReceiptData, batchNo: 'VIEWER-TEST' })

      expect(res.status).toBe(403)
    })

    it('复核员不能创建回执', async () => {
      const res = await request(app)
        .post('/api/receipts')
        .set('Authorization', `Bearer ${tokens.reviewer}`)
        .send({ ...testReceiptData, batchNo: 'REVIEWER-TEST' })

      expect(res.status).toBe(403)
    })

    it('录入员不能执行冻结操作', async () => {
      const res = await request(app)
        .post(`/api/receipts/${receiptId}/freeze`)
        .set('Authorization', `Bearer ${tokens.entry}`)
        .send({ reason: '测试冻结' })

      expect(res.status).toBe(403)
    })

    it('复核员不能执行结算操作', async () => {
      const res = await request(app)
        .post(`/api/receipts/${receiptId}/settle`)
        .set('Authorization', `Bearer ${tokens.reviewer}`)

      expect(res.status).toBe(403)
    })

    it('不同角色看到的字段数量不同', async () => {
      const entryRes = await request(app)
        .get(`/api/receipts/${receiptId}`)
        .set('Authorization', `Bearer ${tokens.entry}`)

      const supervisorRes = await request(app)
        .get(`/api/receipts/${receiptId}`)
        .set('Authorization', `Bearer ${tokens.supervisor}`)

      expect(Object.keys(supervisorRes.body).length).toBeGreaterThan(
        Object.keys(entryRes.body).length
      )
    })
  })

  describe('4. 院区主任视图测试', () => {
    beforeEach(async () => {
      for (let i = 0; i < 3; i++) {
        const res = await request(app)
          .post('/api/receipts')
          .set('Authorization', `Bearer ${tokens.entry}`)
          .send({ ...testReceiptData, batchNo: `DIR-BATCH-${i}` })

        if (i === 0) {
          await request(app)
            .post(`/api/receipts/${res.body.id}/freeze`)
            .set('Authorization', `Bearer ${tokens.supervisor}`)
            .send({ reason: '待核查' })
        }
      }
    })

    it('院区主任视图可以看到汇总统计', async () => {
      const res = await request(app)
        .get('/api/receipts/director-view')
        .set('Authorization', `Bearer ${tokens.supervisor}`)

      expect(res.status).toBe(200)
      expect(res.body.summary).toBeDefined()
      expect(res.body.summary.total).toBe(3)
      expect(res.body.summary.frozenCount).toBe(1)
      expect(res.body.receipts).toBeDefined()
    })

    it('非主管不能访问院区主任视图', async () => {
      const res = await request(app)
        .get('/api/receipts/director-view')
        .set('Authorization', `Bearer ${tokens.entry}`)

      expect(res.status).toBe(403)
    })

    it('可以查看冻结列表', async () => {
      const res = await request(app)
        .get('/api/receipts/frozen')
        .set('Authorization', `Bearer ${tokens.supervisor}`)

      expect(res.status).toBe(200)
      expect(res.body.length).toBe(1)
    })
  })

  describe('5. 变更历史可追溯', () => {
    it('每一步操作都记录变更日志', async () => {
      const createRes = await request(app)
        .post('/api/receipts')
        .set('Authorization', `Bearer ${tokens.entry}`)
        .send(testReceiptData)

      const receiptId = createRes.body.id

      await request(app)
        .post(`/api/receipts/${receiptId}/submit`)
        .set('Authorization', `Bearer ${tokens.entry}`)

      const logsRes = await request(app)
        .get(`/api/receipts/${receiptId}/change-logs`)
        .set('Authorization', `Bearer ${tokens.supervisor}`)

      expect(logsRes.status).toBe(200)
      expect(logsRes.body.length).toBeGreaterThanOrEqual(2)

      const createLog = logsRes.body.find((l: any) => l.action === 'CREATE_BATCH')
      const submitLog = logsRes.body.find((l: any) => l.action === 'SUBMIT')

      expect(createLog).toBeDefined()
      expect(submitLog).toBeDefined()
      expect(submitLog.beforeStatus).toBe('DRAFT')
      expect(submitLog.afterStatus).toBe('SUBMITTED')
    })
  })

  describe('6. 附件上传测试', () => {
    it('可以上传二次确认单作为附件', async () => {
      const createRes = await request(app)
        .post('/api/receipts')
        .set('Authorization', `Bearer ${tokens.entry}`)
        .send(testReceiptData)

      const receiptId = createRes.body.id

      const uploadRes = await request(app)
        .post(`/api/receipts/${receiptId}/attachments`)
        .set('Authorization', `Bearer ${tokens.entry}`)
        .attach('file', Buffer.from('二次确认单内容'), {
          filename: 'confirmation.pdf',
          contentType: 'application/pdf'
        })
        .field('type', 'SECONDARY_CONFIRMATION')
        .field('description', '患者签字的二次确认单')

      expect(uploadRes.status).toBe(201)
      expect(uploadRes.body.type).toBe('SECONDARY_CONFIRMATION')

      const listRes = await request(app)
        .get(`/api/receipts/${receiptId}/attachments`)
        .set('Authorization', `Bearer ${tokens.entry}`)

      expect(listRes.status).toBe(200)
      expect(listRes.body.length).toBe(1)
    })
  })

  describe('7. 服务重启后历史数据持久化', () => {
    it('创建的回执在查询时仍然存在', async () => {
      const batchNo = 'PERSIST-TEST-001'
      const createRes = await request(app)
        .post('/api/receipts')
        .set('Authorization', `Bearer ${tokens.entry}`)
        .send({ ...testReceiptData, batchNo })

      expect(createRes.status).toBe(201)
      const receiptId = createRes.body.id

      const listRes = await request(app)
        .get('/api/receipts')
        .set('Authorization', `Bearer ${tokens.entry}`)

      const found = listRes.body.items.find((r: any) => r.batchNo === batchNo)
      expect(found).toBeDefined()
      expect(found.id).toBe(receiptId)
    })
  })

  describe('8. 冲突锁机制测试', () => {
    it('可以获取和释放锁', async () => {
      const createRes = await request(app)
        .post('/api/receipts')
        .set('Authorization', `Bearer ${tokens.entry}`)
        .send({ ...testReceiptData, batchNo: 'LOCK-TEST-001' })

      expect(createRes.status).toBe(201)
      const receiptId = createRes.body.id

      const acquireRes = await request(app)
        .post(`/api/receipts/${receiptId}/acquire-lock`)
        .set('Authorization', `Bearer ${tokens.entry}`)

      expect(acquireRes.status).toBe(200)
      expect(acquireRes.body.success).toBe(true)

      const statusRes = await request(app)
        .get(`/api/receipts/${receiptId}/lock-status`)
        .set('Authorization', `Bearer ${tokens.entry}`)

      expect(statusRes.status).toBe(200)
      expect(statusRes.body.isLocked).toBe(true)

      const releaseRes = await request(app)
        .post(`/api/receipts/${receiptId}/release-lock`)
        .set('Authorization', `Bearer ${tokens.entry}`)

      expect(releaseRes.status).toBe(200)
      expect(releaseRes.body.success).toBe(true)
    })

    it('其他人不能获取已被锁定的回执', async () => {
      const createRes = await request(app)
        .post('/api/receipts')
        .set('Authorization', `Bearer ${tokens.entry}`)
        .send({ ...testReceiptData, batchNo: 'LOCK-TEST-002' })

      const receiptId = createRes.body.id

      await request(app)
        .post(`/api/receipts/${receiptId}/acquire-lock`)
        .set('Authorization', `Bearer ${tokens.entry}`)

      const acquireRes = await request(app)
        .post(`/api/receipts/${receiptId}/acquire-lock`)
        .set('Authorization', `Bearer ${tokens.reviewer}`)

      expect(acquireRes.status).toBe(409)
    })
  })

  describe('9. 脱敏导出测试', () => {
    it('院区主任视图中患者姓名已脱敏', async () => {
      await request(app)
        .post('/api/receipts')
        .set('Authorization', `Bearer ${tokens.entry}`)
        .send({ ...testReceiptData, batchNo: 'MASK-TEST-001', patientName: '王大锤' })

      const viewRes = await request(app)
        .get('/api/receipts/director-view')
        .set('Authorization', `Bearer ${tokens.supervisor}`)

      expect(viewRes.status).toBe(200)
      const receipt = viewRes.body.receipts.find((r: any) => r.batchNo === 'MASK-TEST-001')
      expect(receipt).toBeDefined()
      expect(receipt.patientName).toBe('王**')
    })

    it('院区主任视图中供应商发票号已脱敏', async () => {
      await request(app)
        .post('/api/receipts')
        .set('Authorization', `Bearer ${tokens.entry}`)
        .send({ ...testReceiptData, batchNo: 'MASK-TEST-002', supplierInvoiceNo: 'INV-2024-ABCDE-0001' })

      const viewRes = await request(app)
        .get('/api/receipts/director-view')
        .set('Authorization', `Bearer ${tokens.supervisor}`)

      expect(viewRes.status).toBe(200)
      const receipt = viewRes.body.receipts.find((r: any) => r.batchNo === 'MASK-TEST-002')
      expect(receipt).toBeDefined()
      expect(receipt.supplierInvoiceNo).not.toContain('ABCDE')
    })
  })

  describe('10. 重试队列机制测试', () => {
    it('主管可以查看重试队列', async () => {
      const res = await request(app)
        .get('/api/receipts/retry-queue/list')
        .set('Authorization', `Bearer ${tokens.supervisor}`)

      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('total')
      expect(res.body).toHaveProperty('tasks')
    })

    it('非主管不能查看重试队列', async () => {
      const res = await request(app)
        .get('/api/receipts/retry-queue/list')
        .set('Authorization', `Bearer ${tokens.entry}`)

      expect(res.status).toBe(403)
    })
  })

  describe('11. 脏记录修正数据同步测试', () => {
    it('脏记录金额修正后回写主表', async () => {
      const conflictData = {
        ...testReceiptData,
        batchNo: 'DIRTY-SYNC-001',
        unitPrice: 5000,
        implantQuantity: 2,
        totalAmount: 15000
      }

      const createRes = await request(app)
        .post('/api/receipts')
        .set('Authorization', `Bearer ${tokens.entry}`)
        .send(conflictData)

      expect(createRes.status).toBe(201)
      const receiptId = createRes.body.id

      const dirtyRecord = await prisma.dirtyRecord.findFirst({
        where: { receiptId, type: 'AMOUNT_CONFLICT' }
      })
      expect(dirtyRecord).not.toBeNull()

      const fixRes = await request(app)
        .patch(`/api/receipts/dirty-records/${dirtyRecord!.id}`)
        .set('Authorization', `Bearer ${tokens.supervisor}`)
        .send({ 
          handleOpinion: '已核实，按修正值更新',
          correctedValue: '10000'
        })

      expect(fixRes.status).toBe(200)
      expect(fixRes.body.handled).toBe(true)

      const receiptRes = await request(app)
        .get(`/api/receipts/${receiptId}`)
        .set('Authorization', `Bearer ${tokens.supervisor}`)

      expect(receiptRes.body.totalAmount).toBe('10000')
    })

    it('脏记录数量修正后回写主表', async () => {
      const conflictData = {
        ...testReceiptData,
        batchNo: 'DIRTY-SYNC-002',
        implantQuantity: 99
      }

      const createRes = await request(app)
        .post('/api/receipts')
        .set('Authorization', `Bearer ${tokens.entry}`)
        .send(conflictData)

      expect(createRes.status).toBe(201)
      const receiptId = createRes.body.id

      const dirtyRecord = await prisma.dirtyRecord.findFirst({
        where: { receiptId, type: 'QUANTITY_CONFLICT' }
      })
      expect(dirtyRecord).not.toBeNull()

      const fixRes = await request(app)
        .patch(`/api/receipts/dirty-records/${dirtyRecord!.id}`)
        .set('Authorization', `Bearer ${tokens.supervisor}`)
        .send({ 
          handleOpinion: '已核实，特殊种植手术',
          correctedValue: '3'
        })

      expect(fixRes.status).toBe(200)

      const receiptRes = await request(app)
        .get(`/api/receipts/${receiptId}`)
        .set('Authorization', `Bearer ${tokens.supervisor}`)

      expect(receiptRes.body.implantQuantity).toBe(3)
    })

    it('院区主任视图只统计未处理的脏记录', async () => {
      const conflictData = {
        ...testReceiptData,
        batchNo: 'DIRTY-SYNC-003',
        implantQuantity: 99
      }

      const createRes = await request(app)
        .post('/api/receipts')
        .set('Authorization', `Bearer ${tokens.entry}`)
        .send(conflictData)

      expect(createRes.status).toBe(201)
      const receiptId = createRes.body.id

      const viewBefore = await request(app)
        .get('/api/receipts/director-view')
        .set('Authorization', `Bearer ${tokens.supervisor}`)

      const receiptBefore = viewBefore.body.receipts.find((r: any) => r.batchNo === 'DIRTY-SYNC-003')
      const unhandledCountBefore = receiptBefore.dirtyRecordCount
      const handledCountBefore = receiptBefore.handledDirtyRecordCount || 0
      expect(unhandledCountBefore).toBeGreaterThan(0)

      const dirtyRecord = await prisma.dirtyRecord.findFirst({
        where: { receiptId, type: 'QUANTITY_CONFLICT' }
      })

      await request(app)
        .patch(`/api/receipts/dirty-records/${dirtyRecord!.id}`)
        .set('Authorization', `Bearer ${tokens.supervisor}`)
        .send({ 
          handleOpinion: '已核实',
          correctedValue: '2'
        })

      const viewAfter = await request(app)
        .get('/api/receipts/director-view')
        .set('Authorization', `Bearer ${tokens.supervisor}`)

      const receiptAfter = viewAfter.body.receipts.find((r: any) => r.batchNo === 'DIRTY-SYNC-003')
      expect(receiptAfter.dirtyRecordCount).toBe(unhandledCountBefore - 1)
      expect(receiptAfter.handledDirtyRecordCount).toBe(handledCountBefore + 1)
      expect(viewAfter.body.summary.handledDirtyRecords).toBeGreaterThanOrEqual(1)
    })

    it('脏记录修正后汇总金额使用新值', async () => {
      const conflictData = {
        ...testReceiptData,
        batchNo: 'DIRTY-SYNC-004',
        unitPrice: 5000,
        implantQuantity: 2,
        totalAmount: 20000
      }

      const createRes = await request(app)
        .post('/api/receipts')
        .set('Authorization', `Bearer ${tokens.entry}`)
        .send(conflictData)

      expect(createRes.status).toBe(201)
      const receiptId = createRes.body.id

      const dirtyRecord = await prisma.dirtyRecord.findFirst({
        where: { receiptId, type: 'AMOUNT_CONFLICT' }
      })

      await request(app)
        .patch(`/api/receipts/dirty-records/${dirtyRecord!.id}`)
        .set('Authorization', `Bearer ${tokens.supervisor}`)
        .send({ 
          handleOpinion: '修正金额',
          correctedValue: '10000'
        })

      const viewRes = await request(app)
        .get('/api/receipts/director-view')
        .set('Authorization', `Bearer ${tokens.supervisor}`)

      const receipt = viewRes.body.receipts.find((r: any) => r.batchNo === 'DIRTY-SYNC-004')
      expect(parseFloat(receipt.totalAmount)).toBe(10000)
    })

    it('脏记录修正后记录变更日志', async () => {
      const conflictData = {
        ...testReceiptData,
        batchNo: 'DIRTY-SYNC-005',
        implantQuantity: 99
      }

      const createRes = await request(app)
        .post('/api/receipts')
        .set('Authorization', `Bearer ${tokens.entry}`)
        .send(conflictData)

      const receiptId = createRes.body.id
      const dirtyRecord = await prisma.dirtyRecord.findFirst({
        where: { receiptId, type: 'QUANTITY_CONFLICT' }
      })

      await request(app)
        .patch(`/api/receipts/dirty-records/${dirtyRecord!.id}`)
        .set('Authorization', `Bearer ${tokens.supervisor}`)
        .send({ 
          handleOpinion: '已核实修正',
          correctedValue: '2'
        })

      const logsRes = await request(app)
        .get(`/api/receipts/${receiptId}/change-logs`)
        .set('Authorization', `Bearer ${tokens.supervisor}`)

      const fixLog = logsRes.body.find((l: any) => l.reason?.includes('处理脏记录'))
      expect(fixLog).toBeDefined()
      expect(fixLog.action).toBe('REVIEW_OVERRULE')
    })
  })

  describe('12. 附件上传权限测试', () => {
    it('只读用户不能上传附件', async () => {
      const createRes = await request(app)
        .post('/api/receipts')
        .set('Authorization', `Bearer ${tokens.entry}`)
        .send({ ...testReceiptData, batchNo: 'ATTACH-PERM-001' })

      expect(createRes.status).toBe(201)
      const receiptId = createRes.body.id

      const uploadRes = await request(app)
        .post(`/api/receipts/${receiptId}/attachments`)
        .set('Authorization', `Bearer ${tokens.viewer}`)
        .attach('file', Buffer.from('test content'), {
          filename: 'test.pdf',
          contentType: 'application/pdf'
        })
        .field('type', 'SECONDARY_CONFIRMATION')

      expect(uploadRes.status).toBe(403)
    })

    it('复核员不能上传附件', async () => {
      const createRes = await request(app)
        .post('/api/receipts')
        .set('Authorization', `Bearer ${tokens.entry}`)
        .send({ ...testReceiptData, batchNo: 'ATTACH-PERM-002' })

      expect(createRes.status).toBe(201)
      const receiptId = createRes.body.id

      const uploadRes = await request(app)
        .post(`/api/receipts/${receiptId}/attachments`)
        .set('Authorization', `Bearer ${tokens.reviewer}`)
        .attach('file', Buffer.from('test content'), {
          filename: 'test.pdf',
          contentType: 'application/pdf'
        })
        .field('type', 'SECONDARY_CONFIRMATION')

      expect(uploadRes.status).toBe(403)
    })

    it('录入员可以上传附件', async () => {
      const createRes = await request(app)
        .post('/api/receipts')
        .set('Authorization', `Bearer ${tokens.entry}`)
        .send({ ...testReceiptData, batchNo: 'ATTACH-PERM-003' })

      expect(createRes.status).toBe(201)
      const receiptId = createRes.body.id

      const uploadRes = await request(app)
        .post(`/api/receipts/${receiptId}/attachments`)
        .set('Authorization', `Bearer ${tokens.entry}`)
        .attach('file', Buffer.from('test content'), {
          filename: 'test.pdf',
          contentType: 'application/pdf'
        })
        .field('type', 'SECONDARY_CONFIRMATION')

      expect(uploadRes.status).toBe(201)
    })
  })

  describe('13. 局部更新脏记录检测测试', () => {
    it('草稿局部更新备注不会产生MISSING_FIELD脏记录', async () => {
      const createRes = await request(app)
        .post('/api/receipts')
        .set('Authorization', `Bearer ${tokens.entry}`)
        .send({ ...testReceiptData, batchNo: 'PARTIAL-UPDATE-001' })

      expect(createRes.status).toBe(201)
      const receiptId = createRes.body.id

      const dirtyBefore = await prisma.dirtyRecord.count({
        where: { receiptId, type: 'MISSING_FIELD' }
      })

      const updateRes = await request(app)
        .patch(`/api/receipts/${receiptId}`)
        .set('Authorization', `Bearer ${tokens.entry}`)
        .send({ remark: '更新备注信息' })

      expect(updateRes.status).toBe(200)

      const dirtyAfter = await prisma.dirtyRecord.count({
        where: { receiptId, type: 'MISSING_FIELD' }
      })

      expect(dirtyAfter).toBe(dirtyBefore)
    })

    it('草稿局部更新患者姓名只检测NAME_CHANGED', async () => {
      const createRes = await request(app)
        .post('/api/receipts')
        .set('Authorization', `Bearer ${tokens.entry}`)
        .send({ ...testReceiptData, batchNo: 'PARTIAL-UPDATE-002', patientName: '张三' })

      expect(createRes.status).toBe(201)
      const receiptId = createRes.body.id

      const dirtyBefore = await prisma.dirtyRecord.findMany({
        where: { receiptId }
      })

      const updateRes = await request(app)
        .patch(`/api/receipts/${receiptId}`)
        .set('Authorization', `Bearer ${tokens.entry}`)
        .send({ patientName: '李四' })

      expect(updateRes.status).toBe(200)

      const dirtyAfter = await prisma.dirtyRecord.findMany({
        where: { receiptId }
      })

      const newDirtyRecords = dirtyAfter.filter(
        d => !dirtyBefore.some(b => b.id === d.id)
      )

      const hasMissingField = newDirtyRecords.some(d => d.type === 'MISSING_FIELD')
      const hasNameChanged = newDirtyRecords.some(d => d.type === 'NAME_CHANGED')

      expect(hasMissingField).toBe(false)
      expect(hasNameChanged).toBe(true)
    })

    it('草稿局部更新数量只检测QUANTITY_CONFLICT', async () => {
      const createRes = await request(app)
        .post('/api/receipts')
        .set('Authorization', `Bearer ${tokens.entry}`)
        .send({ ...testReceiptData, batchNo: 'PARTIAL-UPDATE-003' })

      expect(createRes.status).toBe(201)
      const receiptId = createRes.body.id

      const updateRes = await request(app)
        .patch(`/api/receipts/${receiptId}`)
        .set('Authorization', `Bearer ${tokens.entry}`)
        .send({ implantQuantity: 99 })

      expect(updateRes.status).toBe(200)

      const dirtyRecords = await prisma.dirtyRecord.findMany({
        where: { receiptId }
      })

      const hasMissingField = dirtyRecords.some(d => d.type === 'MISSING_FIELD')
      const hasQuantityConflict = dirtyRecords.some(d => d.type === 'QUANTITY_CONFLICT')

      expect(hasMissingField).toBe(false)
      expect(hasQuantityConflict).toBe(true)
    })
  })
})
